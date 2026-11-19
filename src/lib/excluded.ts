/**
 * A movement marked "no contar" stays in the journal but adds to no total,
 * summary or balance. Every aggregation over movements goes through this, so
 * the rule lives in one place (the database queries for totals filter the
 * same column).
 */
export function countsInTotals(movement: { excluded?: boolean | null }): boolean {
  return !movement.excluded;
}
