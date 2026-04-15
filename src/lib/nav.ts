// Shared NAV (Valor Liquidativo) utilities used by both the GitHub Actions cron
// script and the manual refresh server action.
//
// NAV data sourced from fundinfo.com — plain JSON API, no browser required.
// Field OFDY901035 format: "{nav}|{date}|{currency}"  e.g. "84.600000|2026-04-13|EUR"

// Fetches the NAV for a given ISIN from fundinfo.com.
export async function fetchNavByIsin(isin: string): Promise<number | null> {
  try {
    const url = `https://www.fundinfo.com/es/ES-priv/LandingPage/Data?skip=0&query=${encodeURIComponent(isin)}&orderdirection=`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.fundinfo.com/",
      },
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

// Calculates the current market value of a fund given its contributions and a NAV.
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
