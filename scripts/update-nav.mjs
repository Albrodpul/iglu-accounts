/**
 * Price update script — runs inside GitHub Actions.
 *
 * For each investment fund with an ISIN or ticker set (and show_negative_returns=true),
 * fetches the latest price and updates current_value in Supabase.
 *
 * Data sources:
 *   - ticker set → Yahoo Finance (individual stocks, e.g. ITX.MC, AAPL)
 *   - isin set   → fundinfo.com (investment funds/ETFs)
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

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
};

// ─── Price calculation (mirrors src/lib/nav.ts) ────────────────────────────

function calculateCurrentValue(contributions, nav) {
  const priced = contributions.filter(
    (c) => (c.units != null && c.units > 0) || (c.purchase_price != null && c.purchase_price > 0),
  );
  if (priced.length === 0) return null;

  const unpriced = contributions.filter(
    (c) => (c.units == null || c.units <= 0) && (c.purchase_price == null || c.purchase_price <= 0),
  );

  const totalUnits = priced.reduce((sum, c) => {
    if (c.units != null && c.units > 0) return sum + c.units;
    return sum + c.amount / c.purchase_price;
  }, 0);

  return totalUnits * nav + unpriced.reduce((sum, c) => sum + c.amount, 0);
}

// ─── fundinfo.com NAV fetch ────────────────────────────────────────────────

async function getNavForIsin(isin) {
  const url =
    `https://www.fundinfo.com/es/ES-priv/LandingPage/Data?skip=0&query=${encodeURIComponent(isin)}&orderdirection=`;

  try {
    const res = await fetch(url, {
      headers: { ...BROWSER_HEADERS, "Referer": "https://www.fundinfo.com/" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return { price: null, date: null, reason: `http_${res.status}` };

    const data = await res.json();
    const fund = data.Data?.[0];
    if (!fund) return { price: null, date: null, reason: "not_found" };

    // OFDY901035 = "84.600000|2026-04-13|EUR"
    const navField = fund.S?.OFDY901035;
    if (!navField) return { price: null, date: null, reason: "no_nav_field" };

    const [navStr, date] = navField.split("|");
    const price = parseFloat(navStr);

    if (isNaN(price) || price <= 0) return { price: null, date: null, reason: "invalid_nav" };

    return { price, date, reason: null };
  } catch (err) {
    return { price: null, date: null, reason: err.message };
  }
}

// ─── Yahoo Finance exchange rate fetch ────────────────────────────────────

async function getExchangeRateToEur(fromCurrency) {
  const pair = `${fromCurrency}EUR=X`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(pair)}?interval=1d&range=1d`;
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof rate === "number" && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

// ─── Yahoo Finance price fetch (returns price in EUR) ─────────────────────

async function getPriceForTicker(ticker) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;

  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return { price: null, date: null, reason: `http_${res.status}` };

    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return { price: null, date: null, reason: "no_data" };

    const currency = meta.currency;
    const state = meta.marketState;
    const price =
      state === "PRE"  && meta.preMarketPrice  > 0 ? meta.preMarketPrice  :
      state === "POST" && meta.postMarketPrice > 0 ? meta.postMarketPrice :
      meta.regularMarketPrice;

    if (typeof price !== "number" || price <= 0) return { price: null, date: null, reason: "invalid_price" };

    const date = new Date(meta.regularMarketTime * 1000).toISOString().split("T")[0];

    if (currency && currency !== "EUR") {
      // GBp/GBX = pence → convert to GBP first
      const isGBX = currency === "GBp" || currency === "GBX";
      const normalizedPrice = isGBX ? price / 100 : price;
      const fromCurrency = isGBX ? "GBP" : currency;

      const rate = await getExchangeRateToEur(fromCurrency);
      if (rate === null) return { price: null, date: null, reason: `no_exchange_rate_${fromCurrency}` };

      console.log(`  [fx] ${fromCurrency}→EUR rate=${rate}  raw=${price}  eur=${(normalizedPrice * rate).toFixed(4)}`);
      return { price: normalizedPrice * rate, date, reason: null };
    }

    return { price, date, reason: null };
  } catch (err) {
    return { price: null, date: null, reason: err.message };
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
    ticker,
    show_negative_returns,
    invested_amount,
    investment_contributions(amount, purchase_price, units)
  `)
  .or("isin.not.is.null,ticker.not.is.null");

if (fetchError) {
  console.error("[update-nav] Failed to fetch funds:", fetchError.message);
  process.exit(1);
}

if (!funds || funds.length === 0) {
  console.log("[update-nav] No funds with ISIN or ticker found. Nothing to update.");
  process.exit(0);
}

console.log(`[update-nav] Found ${funds.length} fund(s) to update.`);

const results = await Promise.all(
  funds.map(async (fund) => {
    const start = Date.now();
    const usesTicker = !!fund.ticker;
    const symbol = fund.ticker ?? fund.isin;
    const source = usesTicker ? "ticker" : "isin";

    console.log(`[${symbol}] Fetching price (${source})...`);

    const { price, date, reason } = usesTicker
      ? await getPriceForTicker(fund.ticker)
      : await getNavForIsin(fund.isin);

    if (price === null) {
      console.log(`[${symbol}] ✗ Skipped (${reason})`);
      return { symbol, source, updated: false, reason };
    }

    const contributions = fund.investment_contributions ?? [];
    const newValue = calculateCurrentValue(contributions, price);

    if (newValue === null) {
      console.log(`[${symbol}] ✗ Skipped — no priced contributions (price=${price})`);
      return { symbol, source, updated: false, reason: "no_priced_contributions" };
    }

    const effectiveValue = (!fund.show_negative_returns && newValue < fund.invested_amount)
      ? fund.invested_amount
      : newValue;

    const rounded = Math.round(effectiveValue * 100) / 100;

    const { error: updateError } = await supabase
      .from("investment_funds")
      .update({
        current_value: rounded,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fund.id)
      .eq("account_id", fund.account_id);

    if (updateError) {
      console.log(`[${symbol}] ✗ DB update failed: ${updateError.message}`);
      return { symbol, source, updated: false, reason: updateError.message };
    }

    console.log(`[${symbol}] ✓ price=${price} (${date})  new_value=${rounded}  (${Date.now() - start}ms)`);
    return { symbol, source, updated: true, price, newValue: rounded, date };
  }),
);

const updated = results.filter((r) => r.updated).length;
const skipped = results.filter((r) => !r.updated).length;
const totalMs = Date.now() - TOTAL_START;

console.log(`\n[update-nav] Done: ${updated} updated, ${skipped} skipped (${totalMs}ms total)`);
console.log(JSON.stringify({ updated, skipped, funds: results }, null, 2));

process.exit(updated === 0 && funds.length > 0 ? 1 : 0);
