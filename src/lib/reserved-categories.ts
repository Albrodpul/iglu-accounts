/**
 * Categories the app assigns by itself (income, debts, transfers between bank
 * and cash). They are never offered as a pick, and a movement filed under one
 * keeps it: its category is what makes it an income, a debt or a transfer.
 */
const RESERVED_NAMES = new Set(["ingreso", "deuda", "traspaso"]);

export function isReservedCategoryName(name: string): boolean {
  return RESERVED_NAMES.has(name.trim().toLowerCase());
}
