import { describe, expect, it, vi } from "vitest";
import { fetchAllRows, PAGE_SIZE } from "@/lib/db/providers/supabase/fetch-all";

/** Fake table that, like Supabase, never returns more than one page per request. */
function table(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  return vi.fn(async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }));
}

describe("fetchAllRows", () => {
  it("makes a single request when everything fits in one page", async () => {
    const page = table(737);
    const { data } = await fetchAllRows(page);
    expect(data).toHaveLength(737);
    expect(page).toHaveBeenCalledTimes(1);
  });

  it("reads past the 1000-row cap, in order and without duplicates", async () => {
    const total = PAGE_SIZE * 20 + 123; // ~20 years of daily movements
    const { data, error } = await fetchAllRows(table(total));
    expect(error).toBeNull();
    expect(data).toHaveLength(total);
    expect(data.every((row, i) => row.id === i)).toBe(true);
  });

  it("handles a total that is an exact multiple of the page size", async () => {
    const { data } = await fetchAllRows(table(PAGE_SIZE * 2));
    expect(data).toHaveLength(PAGE_SIZE * 2);
  });

  it("stops and reports the error of a failed page", async () => {
    const page = vi.fn(async (from: number) =>
      from === 0
        ? { data: Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: i })), error: null }
        : { data: null, error: { message: "boom" } },
    );
    const { error } = await fetchAllRows(page);
    expect(error?.message).toBe("boom");
  });
});
