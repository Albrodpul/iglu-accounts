/**
 * Supabase caps every request at 1000 rows ("Max rows" API setting) and
 * silently drops the rest. Queries meant to read a whole history — all-time
 * balance, a full year, backups — must therefore read in pages, or totals go
 * quietly wrong once an account passes 1000 movements.
 */
export const PAGE_SIZE = 1000;
/** Pages requested at once after the first; keeps long histories fast. */
const MAX_PARALLEL = 8;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Reads every row of a query. `page` must build a fresh query for the given
 * range, with a stable order (ties broken by a unique column) so pages never
 * overlap or skip rows.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = [];
  let next = 0;
  let width = 1;

  for (;;) {
    const batch = await Promise.all(
      Array.from({ length: width }, (_, i) => {
        const from = (next + i) * PAGE_SIZE;
        return page(from, from + PAGE_SIZE - 1);
      }),
    );
    for (const result of batch) {
      if (result.error) return { data: rows, error: result.error };
      rows.push(...(result.data ?? []));
      // A short page is the last one; later pages in the batch are empty.
      if ((result.data?.length ?? 0) < PAGE_SIZE) return { data: rows, error: null };
    }
    next += width;
    // Most accounts fit in one page: only fan out once we know there is more.
    width = Math.min(width * 2, MAX_PARALLEL);
  }
}
