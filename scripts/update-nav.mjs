/**
 * NAV update via fundinfo.com JSON API — runs inside GitHub Actions.
 *
 * For each investment fund with an ISIN set (and show_negative_returns=true),
 * fetches the latest NAV from fundinfo.com and updates current_value in Supabase.
 *
 * fundinfo.com returns a plain JSON response — no browser, no Cloudflare.
 * NAV field: OFDY901035 → "{nav}|{date}|{currency}"  e.g. "84.600000|2026-04-13|EUR"
 *
 * Required env vars:
 *   SUPABASE_URL            — e.g. https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── NAV calculation (mirrors src/lib/nav.ts) ──────────────────────────────

function calculateCurrentValue(contributions, nav) {
  const priced = contributions.filter(
    (c) => c.purchase_price != null && c.purchase_price > 0,
  );
  if (priced.length === 0) return null;

  const unpriced = contributions.filter(
    (c) => c.purchase_price == null || c.purchase_price <= 0,
  );

  const totalUnits = priced.reduce(
    (sum, c) => sum + c.amount / c.purchase_price,
    0,
  );

  return totalUnits * nav + unpriced.reduce((sum, c) => sum + c.amount, 0);
}

// ─── fundinfo.com NAV fetch ────────────────────────────────────────────────

async function getNavForIsin(isin) {
  const url =
    `https://www.fundinfo.com/es/ES-priv/LandingPage/Data?skip=0&query=${encodeURIComponent(isin)}&orderdirection=`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.fundinfo.com/",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return { nav: null, reason: `http_${res.status}` };

    const data = await res.json();
    const fund = data.Data?.[0];
    if (!fund) return { nav: null, reason: "not_found" };

    // OFDY901035 = "84.600000|2026-04-13|EUR"
    const navField = fund.S?.OFDY901035;
    if (!navField) return { nav: null, reason: "no_nav_field" };

    const [navStr, date] = navField.split("|");
    const nav = parseFloat(navStr);

    if (isNaN(nav) || nav <= 0) return { nav: null, reason: "invalid_nav" };

    return { nav, date, reason: null };
  } catch (err) {
    return { nav: null, reason: err.message };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

const TOTAL_START = Date.now();

console.log("[update-nav] Fetching funds from Supabase...");

const { data: funds, error: fetchError } = await supabase
  .from("investment_funds")
  .select(`
    id,
    account_id,
    isin,
    show_negative_returns,
    investment_contributions(amount, purchase_price)
  `)
  .not("isin", "is", null)
  .neq("isin", "")
  .eq("show_negative_returns", true);

if (fetchError) {
  console.error("[update-nav] Failed to fetch funds:", fetchError.message);
  process.exit(1);
}

if (!funds || funds.length === 0) {
  console.log("[update-nav] No funds with ISIN found. Nothing to update.");
  process.exit(0);
}

console.log(`[update-nav] Found ${funds.length} fund(s) to update.`);

const results = await Promise.all(
  funds.map(async (fund) => {
    const start = Date.now();
    console.log(`[${fund.isin}] Fetching NAV...`);

    const { nav, date, reason } = await getNavForIsin(fund.isin);

    if (nav === null) {
      console.log(`[${fund.isin}] ✗ Skipped (${reason})`);
      return { isin: fund.isin, updated: false, reason };
    }

    const contributions = fund.investment_contributions ?? [];
    const newValue = calculateCurrentValue(contributions, nav);

    if (newValue === null) {
      console.log(`[${fund.isin}] ✗ Skipped — no priced contributions (nav=${nav})`);
      return { isin: fund.isin, updated: false, reason: "no_priced_contributions" };
    }

    const rounded = Math.round(newValue * 100) / 100;

    const { error: updateError } = await supabase
      .from("investment_funds")
      .update({
        current_value: rounded,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fund.id)
      .eq("account_id", fund.account_id);

    if (updateError) {
      console.log(`[${fund.isin}] ✗ DB update failed: ${updateError.message}`);
      return { isin: fund.isin, updated: false, reason: updateError.message };
    }

    console.log(`[${fund.isin}] ✓ nav=${nav} (${date})  new_value=${rounded}  (${Date.now() - start}ms)`);
    return { isin: fund.isin, updated: true, nav, newValue: rounded, date };
  }),
);

const updated = results.filter((r) => r.updated).length;
const skipped = results.filter((r) => !r.updated).length;
const totalMs = Date.now() - TOTAL_START;

console.log(`\n[update-nav] Done: ${updated} updated, ${skipped} skipped (${totalMs}ms total)`);
console.log(JSON.stringify({ updated, skipped, funds: results }, null, 2));

process.exit(updated === 0 && funds.length > 0 ? 1 : 0);
