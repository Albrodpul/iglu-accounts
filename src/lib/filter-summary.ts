export type FilterSummary = { count: number; total: number };

/**
 * "8 movimientos · −241,30 €" for a filtered list.
 *
 * Debts and transfers aren't income or spending, so they are left out of the
 * total (like in the day headers) — unless the user is filtering by exactly
 * that category, where leaving them out would always show zero.
 */
export function summarizeMovements(
  rows: { amount: number; category_id: string | null }[],
  opts: { categoryId?: string | null; debtCategoryId?: string | null; transferCategoryId?: string | null },
): FilterSummary {
  const excluded = [opts.debtCategoryId, opts.transferCategoryId].filter(
    (id): id is string => Boolean(id) && id !== opts.categoryId,
  );
  const total = rows
    .filter((row) => !row.category_id || !excluded.includes(row.category_id))
    .reduce((sum, row) => sum + row.amount, 0);
  return { count: rows.length, total: Math.round(total * 100) / 100 };
}

export type CategoryTotal = { categoryId: string; count: number; total: number };

/**
 * Per-category totals of a set of movements, biggest first. Same exclusions as
 * `summarizeMovements`, so the rows add up to the total shown next to them.
 */
export function breakdownByCategory(
  rows: { amount: number; category_id: string | null }[],
  opts: { categoryId?: string | null; debtCategoryId?: string | null; transferCategoryId?: string | null },
): CategoryTotal[] {
  const excluded = [opts.debtCategoryId, opts.transferCategoryId].filter(
    (id): id is string => Boolean(id) && id !== opts.categoryId,
  );
  const byCategory = new Map<string, CategoryTotal>();
  for (const row of rows) {
    if (!row.category_id || excluded.includes(row.category_id)) continue;
    const entry = byCategory.get(row.category_id) ?? { categoryId: row.category_id, count: 0, total: 0 };
    entry.count += 1;
    entry.total += row.amount;
    byCategory.set(row.category_id, entry);
  }
  return [...byCategory.values()]
    .map((entry) => ({ ...entry, total: Math.round(entry.total * 100) / 100 }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}
