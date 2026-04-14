// Shared NAV (Valor Liquidativo) utilities used by both the GitHub Actions cron
// endpoint and the manual refresh server action.
//
// NAV data sourced from quefondos.com — scraping the public fund page by ISIN.
// No authentication or API keys required.

// Fetches the NAV for a given ISIN from quefondos.com.
// HTML pattern: Valor liquidativo: </span><span class="floatright">84,600000 EUR</span>
export async function fetchNavByIsin(isin: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://www.quefondos.com/es/fondos/ficha/index.html?isin=${encodeURIComponent(isin)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html",
          "Accept-Language": "es-ES,es;q=0.9",
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) return null;

    const html = await res.text();

    // Match the NAV value in Spanish decimal format (comma separator, 6 decimals)
    const m = html.match(/Valor liquidativo:[^<]*<\/span><span[^>]*>([\d,]+)\s*EUR/);
    if (!m) return null;

    const nav = parseFloat(m[1].replace(",", "."));
    return isNaN(nav) || nav <= 0 ? null : nav;
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
