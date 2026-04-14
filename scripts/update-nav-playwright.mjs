/**
 * NAV update via Playwright — runs inside GitHub Actions.
 *
 * For each investment fund with an ISIN set (and show_negative_returns=true),
 * scrapes es.investing.com to get the latest NAV, then updates current_value
 * in Supabase using the service role key.
 *
 * Strategy per fund:
 *   1. Try direct URL: https://es.investing.com/funds/{isin_lowercase}
 *   2. If 404, search https://es.investing.com/search/?q={isin}&tab=funds
 *      and navigate to the first fund result.
 *   3. Extract NAV from page body text (appears after "Añadir a cartera").
 *
 * Required env vars:
 *   SUPABASE_URL            — e.g. https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { chromium } from "playwright";
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

// ─── NAV extraction from investing.com page body text ─────────────────────

// Parses European-format numbers: "44.134,28" → 44134.28, "12,686" → 12.686
function parseEuropeanNumber(s) {
  // Thousand-separator format: digits.digits.digits,decimals
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) {
    return parseFloat(s.replace(/\./g, "").replace(",", "."));
  }
  // Simple Spanish decimal with comma: "12,686"
  return parseFloat(s.replace(",", "."));
}

function extractNav(bodyText) {
  // Primary: match "price change% \n DD/MM - Info retrasada" structure.
  // This pattern is unique to the fund price header on investing.com.
  //
  // Examples:
  //   \n 12,686 +0,104    +0,82%\n 13/04 - Info retrasada
  //   \n 84,600 0,000    0,00%\n 13/04 - Info retrasada
  //   \n 44.144,630 +3,150    +0,01%\n 13/04 - Info retrasada
  const m = bodyText.match(
    /\n\s*([\d]{1,3}(?:\.[\d]{3})*[,][\d]{2,6})\s+[+-]?[\d][\d,.]*\s+[+-]?[\d][\d,.]*%\s*\n\s*\d{1,2}\/\d{1,2}\s*-\s*Info/,
  );
  if (m) {
    const v = parseEuropeanNumber(m[1]);
    if (!isNaN(v) && v > 0) return v;
  }

  // Fallback: first number after "a cartera" text (works when date pattern is absent).
  const cartIdx = bodyText.indexOf("a cartera");
  if (cartIdx !== -1) {
    const slice = bodyText.substring(cartIdx, cartIdx + 100);
    const m2 = slice.match(/([\d]{1,3}(?:\.[\d]{3})*[,.][\d]{2,6})/);
    if (m2) {
      const v = parseEuropeanNumber(m2[1]);
      if (!isNaN(v) && v > 0) return v;
    }
  }

  return null;
}

// ─── investing.com navigation helpers ────────────────────────────────────

// Accept OneTrust cookie consent if present (investing.com shows this on fresh sessions
// from non-EU IPs, e.g. GitHub Actions runners in US data centers).
async function acceptCookiesIfPresent(page) {
  try {
    const btn = page.locator("#onetrust-accept-btn-handler");
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
      await page.waitForTimeout(1000);
    }
  } catch {
    // No consent wall — continue
  }
}

async function getNavForIsin(context, isin) {
  const page = await context.newPage();

  try {
    // Step 1: try direct ISIN URL (works for funds indexed by ISIN on investing.com)
    const directUrl = `https://es.investing.com/funds/${isin.toLowerCase()}`;
    await page.goto(directUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForTimeout(3000);
    await acceptCookiesIfPresent(page);

    const title = await page.title();
    const isNotFound =
      title.includes("404") ||
      title.toLowerCase().includes("error") ||
      title.toLowerCase().includes("not found");

    if (isNotFound) {
      // Step 2: search by ISIN
      // investing.com shows popular Spanish funds first, then the actual ISIN result.
      // Real results are identified by having "Fondo -" / "ETF -" + country or a 0P... performance ID.
      await page.goto(
        `https://es.investing.com/search/?q=${encodeURIComponent(isin)}&tab=funds`,
        { waitUntil: "domcontentloaded", timeout: 20_000 },
      );
      await page.waitForTimeout(3000);
      await acceptCookiesIfPresent(page);

      const link = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a[href*="/funds/"], a[href*="/etfs/"]');
        for (const a of anchors) {
          const href = a.getAttribute("href") ?? "";
          const text = a.textContent ?? "";
          if (href.length <= 15) continue;
          // Skip navigation-only category links
          if (
            href.endsWith("/funds/") ||
            href.endsWith("/etfs/") ||
            [
              "/funds/world-funds",
              "/funds/major-funds",
              "/funds/spain-funds",
              "/etfs/major-etfs",
              "/etfs/world-etfs",
              "/etfs/spain-etfs",
            ].includes(href)
          ) continue;
          // Actual search results include "Fondo -" / "ETF -" + country name,
          // or a Morningstar performance ID (0P...) — popular filler funds don't.
          if (
            text.includes("Fondo -") ||
            text.includes("ETF -") ||
            /0P[0-9A-Z]{6,}/.test(text)
          ) {
            return href;
          }
        }
        return null;
      });

      if (!link) {
        return { nav: null, reason: "search_no_result" };
      }

      const fundUrl = `https://es.investing.com${link}`;
      await page.goto(fundUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
      await page.waitForTimeout(3000);
      await acceptCookiesIfPresent(page);
    }

    // Step 3: extract NAV from body text
    const bodyText = await page.evaluate(
      () => document.body.innerText.substring(0, 5000),
    );

    const nav = extractNav(bodyText);
    if (nav === null) {
      // Log first 300 chars to help diagnose what the page showed
      console.log(`[${isin}] body preview: ${bodyText.substring(0, 300).replace(/\n/g, "\\n")}`);
      return { nav: null, reason: "nav_not_found_in_page" };
    }

    return { nav, reason: null };
  } catch (err) {
    return { nav: null, reason: err.message };
  } finally {
    await page.close();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

const TOTAL_START = Date.now();
// Only block images and media — blocking CSS/fonts changes innerText layout
// and breaks the price pattern regex.
const BLOCK_TYPES = new Set(["image", "media"]);

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

console.log("[update-nav] Launching Chromium...");
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-background-networking",
    "--no-first-run",
    "--mute-audio",
  ],
});

const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  locale: "es-ES",
  timezoneId: "Europe/Madrid",
});

// Block heavy resources to speed up page loads
await context.route("**/*", (route) => {
  if (BLOCK_TYPES.has(route.request().resourceType())) return route.abort();
  return route.continue();
});

const results = await Promise.all(
  funds.map(async (fund) => {
    const start = Date.now();
    console.log(`[${fund.isin}] Fetching NAV...`);

    const { nav, reason } = await getNavForIsin(context, fund.isin);

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

    console.log(`[${fund.isin}] ✓ nav=${nav}  new_value=${rounded}  (${Date.now() - start}ms)`);
    return { isin: fund.isin, updated: true, nav, newValue: rounded };
  }),
);

await browser.close();

const updated = results.filter((r) => r.updated).length;
const skipped = results.filter((r) => !r.updated).length;
const totalMs = Date.now() - TOTAL_START;

console.log(`\n[update-nav] Done: ${updated} updated, ${skipped} skipped (${totalMs}ms total)`);
console.log(JSON.stringify({ updated, skipped, funds: results }, null, 2));

process.exit(updated === 0 && funds.length > 0 ? 1 : 0);
