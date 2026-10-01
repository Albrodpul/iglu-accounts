/**
 * Amount fields accept a plain number ("99", "12,5", "12.5") or a quick sum
 * ("12,50+8", "100-15,5"). Comma and dot both work as the decimal separator.
 */
const NUMBER = String.raw`(?:\d+(?:[.,]\d+)?|[.,]\d+)`;
const EXPRESSION = new RegExp(`^[+-]?${NUMBER}(?:[+-]${NUMBER})*$`);
const TERM = new RegExp(`[+-]?${NUMBER}`, "g");

function normalize(input: string): string {
  return input.replace(/[\s€]/g, "").replace(/−/g, "-");
}

/** True when the text adds or subtracts (a lone leading sign doesn't count). */
export function isSum(input: string): boolean {
  return /[+-]/.test(normalize(input).slice(1));
}

/** Result of the expression, or `null` when it's empty or not a valid amount. */
export function evaluateAmount(input: string): number | null {
  const text = normalize(input);
  if (!EXPRESSION.test(text)) return null;
  const total = (text.match(TERM) ?? []).reduce((sum, term) => sum + Number(term.replace(",", ".")), 0);
  // Trim float noise (0.1 + 0.2) while keeping the precision some amounts need.
  return Math.round(total * 1e9) / 1e9;
}

/**
 * How a number is written back into the field, following the app's rule:
 * whole amounts bare ("99"), cents with two digits ("20,50"), and never
 * "20.5" or "1e-7".
 */
export function toAmountText(value: number): string {
  const [whole, decimals = ""] = value.toFixed(9).replace(/\.?0+$/, "").split(".");
  return decimals ? `${whole},${decimals.padEnd(2, "0")}` : whole;
}
