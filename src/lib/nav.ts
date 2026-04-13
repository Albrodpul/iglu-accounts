// Shared NAV (Valor Liquidativo) utilities used by both the GitHub Actions cron
// endpoint and the manual refresh server action.

export async function fetchNavByIsin(isin: string): Promise<number | null> {
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
