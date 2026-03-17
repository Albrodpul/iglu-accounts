"use client";

import { formatCurrency, MONTHS } from "@/lib/format";
import type { Category, ExpenseWithCategory } from "@/types";

type Props = {
  expenses: ExpenseWithCategory[];
  categories: Category[];
  year: number;
};

export function AnnualGrid({ expenses, categories, year }: Props) {
  const monthAbbr = MONTHS.map((m) => m.substring(0, 3));

  // Build matrix: category × month
  const usedCategories = categories.filter((cat) =>
    expenses.some((e) => e.category_id === cat.id)
  );

  const grid = usedCategories.map((cat) => {
    const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
      return expenses
        .filter((e) => {
          const d = new Date(e.expense_date);
          return e.category_id === cat.id && d.getMonth() === i;
        })
        .reduce((s, e) => s + e.amount, 0);
    });

    const total = monthlyTotals.reduce((s, v) => s + v, 0);
    const monthsWithData = monthlyTotals.filter((v) => v !== 0).length;
    const avg = monthsWithData > 0 ? total / monthsWithData : 0;

    return {
      category: cat,
      months: monthlyTotals,
      total,
      avg,
    };
  });

  // Monthly totals row
  const monthTotals = Array.from({ length: 12 }, (_, i) =>
    grid.reduce((s, row) => s + row.months[i], 0)
  );
  const grandTotal = monthTotals.reduce((s, v) => s + v, 0);

  // Current month for highlighting
  const currentMonth = new Date().getFullYear() === year ? new Date().getMonth() : -1;

  function formatCompact(amount: number): string {
    if (amount === 0) return "";
    return new Intl.NumberFormat("es-ES", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div className="overflow-x-auto -mx-5 px-5 md:-mx-6 md:px-6">
      <table className="w-full min-w-[900px] text-xs tabular-nums">
        <thead>
          <tr className="border-b border-border/60">
            <th className="sticky left-0 bg-card/95 backdrop-blur-sm py-2 pr-3 text-left font-semibold text-muted-foreground min-w-[120px]">
              Categoría
            </th>
            {monthAbbr.map((m, i) => (
              <th
                key={m}
                className={`py-2 px-1.5 text-right font-semibold min-w-[65px] ${
                  i === currentMonth
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {m}
              </th>
            ))}
            <th className="py-2 px-1.5 text-right font-semibold text-muted-foreground min-w-[75px] border-l border-border/40">
              Total
            </th>
            <th className="py-2 px-1.5 text-right font-semibold text-muted-foreground min-w-[65px]">
              Media
            </th>
          </tr>
        </thead>
        <tbody>
          {grid.map((row) => (
            <tr
              key={row.category.id}
              className="border-b border-border/30 hover:bg-muted/25 transition-colors"
            >
              <td className="sticky left-0 bg-card/95 backdrop-blur-sm py-1.5 pr-3 font-medium text-foreground">
                <span className="mr-1.5">{row.category.icon}</span>
                {row.category.name}
              </td>
              {row.months.map((val, i) => (
                <td
                  key={i}
                  className={`py-1.5 px-1.5 text-right ${
                    val > 0
                      ? "text-income"
                      : val < 0
                        ? "text-foreground"
                        : "text-muted-foreground/30"
                  } ${i === currentMonth ? "bg-primary/5" : ""}`}
                >
                  {formatCompact(val)}
                </td>
              ))}
              <td
                className={`py-1.5 px-1.5 text-right font-semibold border-l border-border/40 ${
                  row.total > 0 ? "text-income" : row.total < 0 ? "text-expense" : ""
                }`}
              >
                {formatCompact(row.total)}
              </td>
              <td className="py-1.5 px-1.5 text-right text-muted-foreground">
                {formatCompact(row.avg)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border/60 font-bold">
            <td className="sticky left-0 bg-card/95 backdrop-blur-sm py-2 pr-3 text-foreground">
              Total
            </td>
            {monthTotals.map((val, i) => (
              <td
                key={i}
                className={`py-2 px-1.5 text-right ${
                  val > 0 ? "text-income" : val < 0 ? "text-expense" : ""
                } ${i === currentMonth ? "bg-primary/5" : ""}`}
              >
                {formatCompact(val)}
              </td>
            ))}
            <td
              className={`py-2 px-1.5 text-right border-l border-border/40 ${
                grandTotal > 0 ? "text-income" : grandTotal < 0 ? "text-expense" : ""
              }`}
            >
              {formatCurrency(grandTotal)}
            </td>
            <td className="py-2 px-1.5 text-right text-muted-foreground">
              {formatCompact(grandTotal / 12)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
