/**
 * Lets the movement search box find amounts as well as concepts.
 *
 * A query that looks like a number ("80", "80,1", "80.19", "-99") becomes a
 * range over the absolute amount, as precise as what was typed:
 *   "80"    → [80, 81)        "80,1" → [80.10, 80.20)        "80,19" → [80.19, 80.20)
 * so typing more digits narrows the result. The sign is ignored: "99" finds a
 * 99 € expense (stored as -99) and a 99 € income alike.
 */
export type AmountRange = { min: number; max: number };

const AMOUNT_QUERY = /^[-+−]?\s*(\d+)(?:[.,](\d{1,2}))?\s*€?$/;

export function parseAmountQuery(query: string): AmountRange | null {
  const match = AMOUNT_QUERY.exec(query.trim());
  if (!match) return null;
  const [, whole, decimals = ""] = match;
  const min = Number(`${whole}.${decimals || "0"}`);
  const step = decimals.length === 0 ? 1 : decimals.length === 1 ? 0.1 : 0.01;
  // Rounded to cents so 80.1 + 0.1 doesn't become 80.19999999999999.
  return { min, max: Math.round((min + step) * 100) / 100 };
}

export function amountInRange(amount: number, range: AmountRange): boolean {
  const abs = Math.round(Math.abs(amount) * 100) / 100;
  return abs >= range.min && abs < range.max;
}

/** Client-side match used by lists that already hold their movements. */
export function matchesSearch(expense: { concept: string | null; amount: number }, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  if (expense.concept?.toLowerCase().includes(q.toLowerCase())) return true;
  const range = parseAmountQuery(q);
  return range ? amountInRange(expense.amount, range) : false;
}
