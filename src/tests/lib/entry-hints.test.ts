import { describe, expect, it } from "vitest";
import { buildEntryHints, type HintSourceRow } from "@/lib/entry-hints";

const row = (concept: string | null, category_id: string, amount: number, categoryName = "Comida"): HintSourceRow => ({
  concept,
  category_id,
  amount,
  categoryName,
});

describe("buildEntryHints", () => {
  it("ranks repeated concepts, case-insensitively, keeping the newest spelling and category", () => {
    const { concepts } = buildEntryHints([
      row("Mercadona", "cat-super", -40), // newest first
      row("mercadona", "cat-food", -35),
      row("MERCADONA", "cat-food", -20),
      row("Repsol", "cat-fuel", -60),
      row("Repsol", "cat-fuel", -55),
      row("Cine", "cat-ocio", -9), // one-off: no chip
    ]);

    expect(concepts.map((c) => [c.concept, c.count])).toEqual([
      ["Mercadona", 3],
      ["Repsol", 2],
    ]);
    expect(concepts[0].category_id).toBe("cat-super");
  });

  it("separates expense and income concepts", () => {
    const { concepts } = buildEntryHints([
      row("Bizum", "c", -10),
      row("Bizum", "c", -12),
      row("Bizum", "i", 50, "Ingreso"),
      row("Bizum", "i", 30, "Ingreso"),
    ]);
    expect(concepts.map((c) => c.kind).sort()).toEqual(["expense", "income"]);
  });

  it("ignores debts and transfers, and counts category usage", () => {
    const { concepts, categoryUsage } = buildEntryHints([
      row("Préstamo", "debt", 100, "Deuda"),
      row("Préstamo", "debt", 100, "Deuda"),
      row("Cajero", "tr", -50, "Traspaso"),
      row("Pan", "food", -1),
      row(null, "food", -2),
    ]);
    expect(concepts).toEqual([]);
    expect(categoryUsage).toEqual({ food: 2 });
  });
});
