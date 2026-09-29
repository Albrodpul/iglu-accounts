import { describe, expect, it } from "vitest";
import {
  spentByCategory,
  sumByCategoryAndMonth,
  sumCategory,
  summarizeMonths,
  type AggregatableMovement,
} from "@/lib/aggregations";

const mv = (category_id: string, amount: number, expense_date: string): AggregatableMovement => ({
  category_id,
  amount,
  expense_date,
});

describe("sumByCategoryAndMonth", () => {
  it("nets movements per category into 12 monthly buckets", () => {
    const result = sumByCategoryAndMonth([
      mv("food", -10, "2026-01-03"),
      mv("food", -5, "2026-01-20"),
      mv("food", 2, "2026-01-21"), // refund nets out
      mv("food", -7, "2026-03-01"),
      mv("salary", 1000, "2026-12-31"),
    ]);

    expect(result.get("food")).toEqual([-13, 0, -7, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(result.get("salary")?.[11]).toBe(1000);
    expect(result.has("rent")).toBe(false);
  });
});

describe("summarizeMonths", () => {
  const special = { debtCategoryId: "debt", transferCategoryId: "transfer" };

  it("splits outflows, inflows and debts per month", () => {
    const months = summarizeMonths(
      [
        mv("food", -100, "2026-02-01"),
        mv("salary", 2000, "2026-02-28"),
        mv("debt", 50, "2026-02-10"),
      ],
      special,
    );

    expect(months[1]).toEqual({ gastos: -100, ingresos: 2000, deudas: 50 });
    expect(months[0]).toEqual({ gastos: 0, ingresos: 0, deudas: 0 });
  });

  it("ignores transfers between own accounts", () => {
    const months = summarizeMonths(
      [mv("transfer", -300, "2026-05-01"), mv("transfer", 300, "2026-05-01")],
      special,
    );
    expect(months[4]).toEqual({ gastos: 0, ingresos: 0, deudas: 0 });
  });

  it("counts a negative debt movement as outflow but never a positive one as income", () => {
    const months = summarizeMonths(
      [mv("debt", -40, "2026-06-01"), mv("debt", 90, "2026-06-02")],
      special,
    );
    expect(months[5]).toEqual({ gastos: -40, ingresos: 0, deudas: 50 });
  });
});

describe("spentByCategory / sumCategory", () => {
  const movements = [
    mv("food", -10, "2026-01-01"),
    mv("food", -15, "2026-02-01"),
    mv("food", 5, "2026-02-02"),
    mv("salary", 1000, "2026-01-31"),
  ];

  it("sums only outflows, as positive amounts", () => {
    const spent = spentByCategory(movements);
    expect(spent.get("food")).toBe(25);
    expect(spent.has("salary")).toBe(false);
  });

  it("nets every movement of one category", () => {
    expect(sumCategory(movements, "food")).toBe(-20);
    expect(sumCategory(movements, "none")).toBe(0);
  });
});
