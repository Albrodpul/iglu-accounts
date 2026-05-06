// Shared price utilities used by both the GitHub Actions cron script and manual refresh.
//
// Two data sources:
//   - fundinfo.com  → investment funds, keyed by ISIN
//   - Yahoo Finance → individual stocks, keyed by ticker (e.g. ITX.MC, AAPL)
//
// Yahoo Finance: v8/finance/chart with includePrePost=true returns the current price
// including extended hours without requiring region-specific session cookies.
// The last non-null close in the 2-minute intraday series is the most recent price.
//
// fundinfo NAV field OFDY901035 format: "{nav}|{date}|{currency}"  e.g. "84.600000|2026-04-13|EUR"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const BROWSER_HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "application/json, text/plain, */*",
};

// Fetches the NAV for a given ISIN from fundinfo.com.
export async function fetchNavByIsin(isin: string): Promise<number | null> {
  try {
    const url = `https://www.fundinfo.com/es/ES-priv/LandingPage/Data?skip=0&query=${encodeURIComponent(isin)}&orderdirection=`;
    const res = await fetch(url, {
      headers: { ...BROWSER_HEADERS, "Referer": "https://www.fundinfo.com/" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
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

// Obtains a Yahoo Finance session cookie + crumb using finance.yahoo.com as the
// cookie source — same flow a real browser uses, grants extended hours data access.
async function getYahooSession(): Promise<{ cookie: string; crumb: string } | null> {
  try {
    const cookieRes = await fetch("https://finance.yahoo.com", {
      headers: { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,*/*" },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
      cache: "no-store",
    });
    const rawSetCookie = cookieRes.headers.getSetCookie?.() ?? [];
    const cookie = rawSetCookie.map((c) => c.split(";")[0]).join("; ");
    console.log(`[yahoo] finance.yahoo.com status=${cookieRes.status} cookies=${rawSetCookie.length}`);

    const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": USER_AGENT, "Cookie": cookie },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!crumbRes.ok) return null;

    const crumb = await crumbRes.text();
    if (!crumb || crumb.includes("<")) return null;

    console.log(`[yahoo] session OK crumb=${crumb} cookies=${rawSetCookie.length}`);
    return { cookie, crumb };
  } catch (err) {
    console.warn(`[yahoo] session failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

// Fetches the current price for a stock ticker from Yahoo Finance, always in EUR.
// Uses v7/finance/quote with session crumb to get marketState + pre/post-market prices.
// Falls back to v8/finance/chart (regular market only) if session unavailable.
export async function fetchPriceByTicker(ticker: string): Promise<number | null> {
  try {
    const session = await getYahooSession();
    let rawPrice: number;
    let currency: string;

    if (session) {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}&crumb=${encodeURIComponent(session.crumb)}&formatted=false&region=US`;
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, "Cookie": session.cookie, "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      if (!res.ok) return null;

      const data = await res.json();
      const q = data?.quoteResponse?.result?.[0];
      if (!q) return null;

      const state: string = q.marketState ?? "";
      rawPrice =
        state === "PRE"                       && q.preMarketPrice  > 0 ? q.preMarketPrice  :
        (state === "POST" || state === "PREPRE") && q.postMarketPrice > 0 ? q.postMarketPrice :
        q.regularMarketPrice;
      currency = q.currency ?? "";
      console.log(`[yahoo] ${ticker} marketState=${state} pre=${q.preMarketPrice} post=${q.postMarketPrice} → price=${rawPrice} currency=${currency}`);
    } else {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
      const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(10000), cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (!meta) return null;
      rawPrice = meta.regularMarketPrice;
      currency = meta.currency ?? "";
      console.log(`[yahoo] ${ticker} fallback price=${rawPrice} currency=${currency}`);
    }

    if (typeof rawPrice !== "number" || rawPrice <= 0) return null;
    if (!currency || currency === "EUR") return rawPrice;

    const normalizedPrice = (currency === "GBp" || currency === "GBX") ? rawPrice / 100 : rawPrice;
    const fromCurrency = (currency === "GBp" || currency === "GBX") ? "GBP" : currency;
    const rate = await fetchExchangeRateToEur(fromCurrency);
    if (rate === null) return null;
    console.log(`[yahoo] ${ticker} fx ${fromCurrency}→EUR rate=${rate} raw=${rawPrice} eur=${(normalizedPrice * rate).toFixed(4)}`);
    return normalizedPrice * rate;
  } catch (err) {
    console.warn(`[yahoo] ${ticker} failed: ${err instanceof Error ? err.message : String(err)}`);
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
      cache: "no-store",
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
