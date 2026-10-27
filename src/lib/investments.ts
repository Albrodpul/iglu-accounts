import { pieColor } from "@/lib/chart-colors";

/** Colour of the "Otros" slice, and of every position folded into it. */
export const OTHERS_COLOR = "#94a3b8";
/** Positions drawn as their own slice; the rest are grouped into "Otros". */
export const MAX_PIE_SLICES = 7;

type Position = { invested_amount: number; current_value: number };

/** What a position weighs in the portfolio: its value, or what was put in if it has no value yet. */
export function positionValue(fund: Position): number {
  return fund.current_value > 0 ? fund.current_value : fund.invested_amount;
}

/**
 * When the automatically priced positions (the ones with an ISIN or ticker)
 * were last refreshed, by the scheduled job or the manual button: the most
 * recent `updated_at` among them. `null` when nothing is priced automatically.
 */
export function lastPriceUpdate(
  funds: { isin: string | null; ticker: string | null; updated_at: string }[],
): string | null {
  const stamps = funds.filter((fund) => fund.isin || fund.ticker).map((fund) => fund.updated_at);
  return stamps.length > 0 ? stamps.reduce((latest, stamp) => (stamp > latest ? stamp : latest)) : null;
}

/**
 * Splits chart items into the slices drawn on their own and the ones grouped
 * as "Otros". Up to MAX_PIE_SLICES everything is drawn, in the given order;
 * beyond that, the biggest ones are.
 */
export function groupPieSlices<T extends { value: number }>(items: T[]): { visible: T[]; others: T[] } {
  if (items.length <= MAX_PIE_SLICES) return { visible: items, others: [] };
  const sorted = [...items].sort((a, b) => b.value - a.value);
  return { visible: sorted.slice(0, MAX_PIE_SLICES), others: sorted.slice(MAX_PIE_SLICES) };
}

/**
 * Colour of each fund in the "by fund" distribution chart, keyed by fund id,
 * so a list can mark each position with the colour of its slice. Positions
 * with nothing in them have no slice and no entry.
 */
export function fundColors(funds: (Position & { id: string })[]): Map<string, string> {
  const items = funds.map((fund) => ({ id: fund.id, value: positionValue(fund) })).filter((item) => item.value > 0);
  const { visible, others } = groupPieSlices(items);
  return new Map([
    ...visible.map((item, i) => [item.id, pieColor(i)] as const),
    ...others.map((item) => [item.id, OTHERS_COLOR] as const),
  ]);
}

type PricedContribution = { id: string; amount: number; units: number | null; purchase_price: number | null };

/** Units a contribution bought: the recorded ones, or the amount over the price paid. */
function boughtUnits(c: PricedContribution): number | null {
  if (c.units && c.units > 0) return c.units;
  if (c.purchase_price && c.purchase_price > 0) return c.amount / c.purchase_price;
  return null;
}

/**
 * What each contribution is worth now and what it has gained, by contribution
 * id. The price per unit comes from the position's value the same way the
 * price update builds it (priced units × price + the rest at cost), so the
 * parts add up to the whole. Contributions without units or price have no
 * entry: there is nothing to value them by.
 */
export function contributionReturns(
  contributions: PricedContribution[],
  positionValue: number,
): Map<string, { value: number; gain: number; pct: number }> {
  const result = new Map<string, { value: number; gain: number; pct: number }>();
  let pricedUnits = 0;
  let atCost = 0;
  for (const c of contributions) {
    const units = boughtUnits(c);
    if (units === null) atCost += c.amount;
    else pricedUnits += units;
  }
  const price = pricedUnits > 0 ? (positionValue - atCost) / pricedUnits : 0;
  if (!(price > 0)) return result;

  for (const c of contributions) {
    const units = boughtUnits(c);
    if (units === null || c.amount <= 0) continue;
    const value = Math.round(units * price * 100) / 100;
    const gain = Math.round((value - c.amount) * 100) / 100;
    result.set(c.id, { value, gain, pct: (gain / c.amount) * 100 });
  }
  return result;
}
