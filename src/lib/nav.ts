// Shared price utilities used by both the GitHub Actions cron script and manual refresh.
//
// Two data sources:
//   - fundinfo.com  → investment funds, keyed by ISIN
//   - Yahoo Finance → individual stocks, keyed by ticker (e.g. ITX.MC, AAPL)
//
// fundinfo NAV field OFDY901035 format: "{nav}|{date}|{currency}"  e.g. "84.600000|2026-04-13|EUR"

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
};

// Fetches the NAV for a given ISIN from fundinfo.com.
export async function fetchNavByIsin(isin: string): Promise<number | null> {
  try {
    const url = `https://www.fundinfo.com/es/ES-priv/LandingPage/Data?skip=0&query=${encodeURIComponent(isin)}&orderdirection=`;
    const res = await fetch(url, {
      headers: { ...BROWSER_HEADERS, "Referer": "https://www.fundinfo.com/" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const navField = data.Data?.[0]?.S?.OFDY901035 as string | undefined;
    if (!navField) return null;

    const nav = parseFloat(navField.split("|")[0]);
    return isNaN(nav) || nav <= 0 ? null : nav;
  } catch {
    return null;
  }
}

// Fetches the current price for a stock ticker from Yahoo Finance, always in EUR.
// ticker must be the Yahoo Finance symbol including exchange suffix (e.g. ITX.MC, SAN.MC, AAPL).
// If the stock trades in a non-EUR currency (e.g. USD), fetches the exchange rate from
// Yahoo Finance (e.g. USDEUR=X) and converts automatically.
export async function fetchPriceByTicker(ticker: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice as number | undefined;
    const currency = meta?.currency as string | undefined;

    if (typeof price !== "number" || price <= 0) return null;

    if (!currency || currency === "EUR") return price;

    // GBp/GBX = pence, convert to GBP first
    const normalizedPrice = (currency === "GBp" || currency === "GBX") ? price / 100 : price;
    const fromCurrency = (currency === "GBp" || currency === "GBX") ? "GBP" : currency;

    const rate = await fetchExchangeRateToEur(fromCurrency);
    if (rate === null) return null;

    return normalizedPrice * rate;
  } catch {
    return null;
  }
}

// Fetches the conversion rate from a given currency to EUR via Yahoo Finance (e.g. USDEUR=X).
async function fetchExchangeRateToEur(fromCurrency: string): Promise<number | null> {
  try {
    const pair = `${fromCurrency}EUR=X`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(pair)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const rate = data.chart?.result?.[0]?.meta?.regularMarketPrice as number | undefined;
    return typeof rate === "number" && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

// Calculates the current market value of a fund given its contributions and a price/NAV.
//
// Priority for unit count (per contribution):
//   1. `units` field — exact broker-reported participations
//   2. `amount / purchase_price` — derived fallback
//
// Contributions without units AND without purchase_price are treated at cost.
// Returns null if no contribution can be marked to market
// (fund skipped to avoid zeroing out a manual return).
export function calculateCurrentValue(
  contributions: Array<{ amount: number; purchase_price: number | null; units?: number | null }>,
  nav: number,
): number | null {
  const priced = contributions.filter(
    (c) => (c.units != null && c.units > 0) || (c.purchase_price != null && c.purchase_price > 0),
  );
  if (priced.length === 0) return null;

  const unpriced = contributions.filter(
    (c) => (c.units == null || c.units <= 0) && (c.purchase_price == null || c.purchase_price <= 0),
  );

  const totalUnits = priced.reduce((sum, c) => {
    if (c.units != null && c.units > 0) return sum + c.units;
    return sum + c.amount / c.purchase_price!;
  }, 0);

  return totalUnits * nav + unpriced.reduce((sum, c) => sum + c.amount, 0);
}
