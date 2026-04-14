// Shared NAV (Valor Liquidativo) utilities used by both the GitHub Actions cron
// endpoint and the manual refresh server action.

// ─── Morningstar ──────────────────────────────────────────────────────────────

// Module-level token cache. Within a single serverless invocation (e.g. a cron
// run processing N funds) this avoids fetching a new token per fund.
let _msToken: { value: string; expiresAt: number } | null = null;

async function getMorningstarToken(): Promise<string | null> {
  const now = Date.now();
  if (_msToken && _msToken.expiresAt > now + 60_000) return _msToken.value;

  try {
    const res = await fetch("https://global.morningstar.com/api/v1/es/oauth/token/", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token = data.access_token as string | undefined;
    if (!token) return null;
    const expiresIn = (data.expires_in as number | undefined) ?? 86400;
    _msToken = { value: token, expiresAt: now + expiresIn * 1000 };
    return token;
  } catch {
    return null;
  }
}

async function getMorningstarSecId(isin: string): Promise<string | null> {
  try {
    // Minimal query: match by ISIN, restrict to European fund types
    const query =
      `((isin ~= "${isin}") AND (` +
      `(investmentType = "EQ") OR ` +
      `(investmentType = "FE") AND (exchangeCountry in ("AUT","BEL","CHE","DEU","ESP","FRA","GBR","IRL","ITA","LUX","NLD","PRT","DNK","FIN","NOR","SWE")) OR ` +
      `(investmentType = "FO") AND (countriesOfSale = "ESP") OR ` +
      `(investmentType = "FM") AND (countriesOfSale = "ESP") OR ` +
      `(investmentType = "FV") AND (countriesOfSale = "ESP") OR ` +
      `(investmentType = "XI")))`;

    const url = new URL("https://global.morningstar.com/api/v1/es/search/securities");
    url.searchParams.set("fields", "isin,name");
    url.searchParams.set("limit", "1");
    url.searchParams.set("page", "1");
    url.searchParams.set("query", query);
    url.searchParams.set("sort", "_score");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.results?.[0]?.meta?.securityID as string | undefined) ?? null;
  } catch {
    return null;
  }
}

async function fetchMorningstarNav(isin: string): Promise<number | null> {
  const [token, secId] = await Promise.all([
    getMorningstarToken(),
    getMorningstarSecId(isin),
  ]);
  if (!token || !secId) return null;

  try {
    const url = new URL(
      `https://api-global.morningstar.com/sal-service/v1/fund/quote/v7/${secId}/data`,
    );
    url.searchParams.set("region", "EEA");
    url.searchParams.set("locale", "es");
    url.searchParams.set("clientId", "INTLCOM");
    url.searchParams.set("benchmarkId", "mstarorcat");
    url.searchParams.set("version", "4.84.0");
    url.searchParams.set("access_token", token);
    url.searchParams.set("secId", secId);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const price = data.latestPrice as number | undefined;
    return typeof price === "number" && price > 0 ? price : null;
  } catch {
    return null;
  }
}

// ─── Yahoo Finance (fallback) ─────────────────────────────────────────────────

async function fetchYahooNav(isin: string): Promise<number | null> {
  try {
    // Step 1: resolve ISIN → Yahoo Finance ticker symbol
    const searchRes = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(isin)}&lang=en-US&region=US&quotesCount=1&newsCount=0`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const symbol: string | undefined = searchData?.quotes?.[0]?.symbol;
    if (!symbol) return null;

    // Step 2: fetch current price for that symbol
    const quoteRes = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!quoteRes.ok) return null;

    const quoteData = await quoteRes.json();
    const price: unknown = quoteData?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" && price > 0 ? price : null;
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Fetches the NAV for a given ISIN. Tries Morningstar first (more accurate for
// European UCITS funds), falls back to Yahoo Finance.
export async function fetchNavByIsin(isin: string): Promise<number | null> {
  const nav = await fetchMorningstarNav(isin);
  if (nav !== null) return nav;
  return fetchYahooNav(isin);
}

// Calculates the current market value of a fund given its contributions and a NAV.
//
// - Contributions WITH purchase_price → units = amount / purchase_price
//   current value = units × nav
// - Contributions WITHOUT purchase_price → treated at cost (no mark-to-market)
//
// Returns null if no contribution has a purchase_price
// (fund should be skipped to avoid zeroing out a manual return).
export function calculateCurrentValue(
  contributions: Array<{ amount: number; purchase_price: number | null }>,
  nav: number,
): number | null {
  const priced = contributions.filter(
    (c) => c.purchase_price != null && c.purchase_price > 0,
  );
  if (priced.length === 0) return null;

  const unpriced = contributions.filter(
    (c) => c.purchase_price == null || c.purchase_price <= 0,
  );

  const totalUnits = priced.reduce(
    (sum, c) => sum + c.amount / c.purchase_price!,
    0,
  );

  return totalUnits * nav + unpriced.reduce((sum, c) => sum + c.amount, 0);
}
