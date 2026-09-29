import { monthIndexOf } from "./dates";

/** Minimal shape needed to aggregate movements. */
export type AggregatableMovement = {
  category_id: string;
  amount: number;
  expense_date: string;
};

type SpecialCategories = {
  debtCategoryId?: string | null;
  transferCategoryId?: string | null;
};

/**
 * Net amount per category and month (index 0–11), built in a single pass.
 * Replaces filtering the whole list once per category × month.
 */
export function sumByCategoryAndMonth(
  movements: AggregatableMovement[]
): Map<string, number[]> {
  const byCategory = new Map<string, number[]>();
  for (const m of movements) {
    let months = byCategory.get(m.category_id);
    if (!months) {
      months = new Array<number>(12).fill(0);
      byCategory.set(m.category_id, months);
    }
    months[monthIndexOf(m.expense_date)] += m.amount;
  }
  return byCategory;
}

export type MonthSummary = {
  /** Sum of outflows (negative). Includes negative debt movements. */
  gastos: number;
  /** Sum of inflows, excluding debts. */
  ingresos: number;
  /** Net of debt-category movements. */
  deudas: number;
};

/**
 * Per-month outflows / inflows / debts for the year, in a single pass.
 * Transfers between own accounts are ignored: they move money, not spend it.
 */
export function summarizeMonths(
  movements: AggregatableMovement[],
  { debtCategoryId, transferCategoryId }: SpecialCategories = {}
): MonthSummary[] {
  const months: MonthSummary[] = Array.from({ length: 12 }, () => ({
    gastos: 0,
    ingresos: 0,
    deudas: 0,
  }));
  for (const m of movements) {
    if (transferCategoryId && m.category_id === transferCategoryId) continue;
    const bucket = months[monthIndexOf(m.expense_date)];
    const isDebt = !!debtCategoryId && m.category_id === debtCategoryId;
    if (isDebt) bucket.deudas += m.amount;
    if (m.amount < 0) bucket.gastos += m.amount;
    else if (m.amount > 0 && !isDebt) bucket.ingresos += m.amount;
  }
  return months;
}

/** Total spent (absolute value of outflows) per category. */
export function spentByCategory(movements: AggregatableMovement[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const m of movements) {
    if (m.amount >= 0) continue;
    totals.set(m.category_id, (totals.get(m.category_id) ?? 0) - m.amount);
  }
  return totals;
}

/** Net sum of all movements in one category. */
export function sumCategory(movements: AggregatableMovement[], categoryId: string): number {
  let total = 0;
  for (const m of movements) if (m.category_id === categoryId) total += m.amount;
  return total;
}
