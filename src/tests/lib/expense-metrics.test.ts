import { describe, expect, it } from "vitest";
import {
  buildBalanceYearKpis,
  buildMonthSummaryKpis,
  calculateFinancialTotals,
} from "@/lib/expense-metrics";

describe("expense metrics", () => {
  it("calculates totals separating debt category from income", () => {
    const totals = calculateFinancialTotals(
      [
        { amount: -100, category_id: "food" },
        { amount: 1000, category_id: "salary" },
        { amount: 200, category_id: "debt" },
      ],
      "debt",
    );

    expect(totals).toEqual({
      totalExpenses: -100,
      totalIncome: 1000,
      totalDebt: 200,
      net: 900,
    });
  });

  it("builds month kpis with debt link when debt exists", () => {
    const kpis = buildMonthSummaryKpis({
      totalIncome: 1000,
      totalExpenses: -200,
      totalDebt: 150,
      debtCategoryId: "debt",
      month: 1,
      year: 2026,
    });

    expect(kpis).toHaveLength(3);
    expect(kpis[2].href).toBe("/expenses?month=1&year=2026&category=debt");
  });

  it("builds balance kpis with fixed costs when no debt exists", () => {
    const kpis = buildBalanceYearKpis({
      totalIncome: 5000,
      totalExpenses: -2200,
      totalDebt: 0,
      avgMonthlyExpense: -183.33,
      fixedExpenses: -350,
    });

    expect(kpis[3]).toEqual({
      label: "Fijos/mes",
      value: -350,
      color: "emerald",
    });
  });
});
