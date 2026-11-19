import { describe, expect, it } from "vitest";
import { countsInTotals } from "@/lib/excluded";
import { spentByCategory, sumByCategoryAndMonth, sumCategory, summarizeMonths } from "@/lib/aggregations";
import { breakdownByCategory, summarizeMovements } from "@/lib/filter-summary";
import { calculateFinancialTotals } from "@/lib/expense-metrics";

const rows = [
  { category_id: "food", amount: -40, expense_date: "2026-11-03" },
  { category_id: "food", amount: -500, expense_date: "2026-11-04", excluded: true }, // reimbursed
  { category_id: "salary", amount: 2000, expense_date: "2026-11-01" },
  { category_id: "salary", amount: 300, expense_date: "2026-11-15", excluded: true }, // one-off
];

describe("movements marked 'no contar'", () => {
  it("count by default, and stop counting when marked", () => {
    expect(countsInTotals({})).toBe(true);
    expect(countsInTotals({ excluded: false })).toBe(true);
    expect(countsInTotals({ excluded: null })).toBe(true);
    expect(countsInTotals({ excluded: true })).toBe(false);
  });

  it("are left out of the month and year figures", () => {
    const totals = calculateFinancialTotals(rows, null);
    expect(totals).toMatchObject({ totalExpenses: -40, totalIncome: 2000, net: 1960 });

    const november = summarizeMonths(rows)[10];
    expect(november).toEqual({ gastos: -40, ingresos: 2000, deudas: 0 });
  });

  it("are left out of the per-category figures", () => {
    expect(spentByCategory(rows).get("food")).toBe(40);
    expect(sumCategory(rows, "salary")).toBe(2000);
    expect(sumByCategoryAndMonth(rows).get("food")?.[10]).toBe(-40);
  });

  it("still show up in a filtered list's count, but not in its total", () => {
    const summary = summarizeMovements(rows, {});
    expect(summary).toEqual({ count: 4, total: 1960 });
    expect(breakdownByCategory(rows, {}).find((c) => c.categoryId === "food")).toEqual({
      categoryId: "food",
      count: 1,
      total: -40,
    });
  });
});
