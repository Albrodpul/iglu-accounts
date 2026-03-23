"use client";

import { MONTHS } from "@/lib/format";
import { Amount } from "@/components/ui/amount";
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

    return {
      category: cat,
      months: monthlyTotals,
      total,
      avg: 0, // calculated below once we know elapsed months
    };
  });

  // Monthly totals row
  const monthTotals = Array.from({ length: 12 }, (_, i) =>
    grid.reduce((s, row) => s + row.months[i], 0)
  );
  const grandTotal = monthTotals.reduce((s, v) => s + v, 0);

  // Elapsed months = up to the last month with any data across all categories
  const lastMonthWithData = monthTotals.reduce(
    (last, val, i) => (val !== 0 ? i + 1 : last),
    0
  );
  const elapsedMonths = Math.max(lastMonthWithData, 1);

  // Now calculate averages using elapsed months
  for (const row of grid) {
    row.avg = row.total / elapsedMonths;
  }

  // Current month for highlighting
  const currentMonth = new Date().getFullYear() === year ? new Date().getMonth() : -1;

  return (
    <div className="overflow-x-auto -mx-5 md:-mx-6">
      <table className="w-full min-w-[800px] text-sm tabular-nums md:min-w-0">
        <thead>
          <tr className="border-b border-border/60">
            <th className="sticky left-0 z-10 bg-card py-2 pl-5 pr-3 text-left font-semibold text-muted-foreground min-w-[140px] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border/30 md:pl-6">
              Categoría
            </th>
            {monthAbbr.map((m, i) => (
              <th
                key={m}
                className={`py-2 px-1 text-right font-semibold ${
                  i === currentMonth
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {m}
              </th>
            ))}
            <th className="py-2 px-1 text-right font-semibold text-muted-foreground border-l border-border/40">
              Total
            </th>
            <th className="py-2 pl-1 pr-5 text-right font-semibold text-muted-foreground md:pr-6">
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
              <td className="sticky left-0 z-10 bg-card py-1.5 pl-5 pr-3 font-medium text-foreground after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border/30 md:pl-6">
                <span className="mr-1.5">{row.category.icon}</span>
                <span className="truncate">{row.category.name}</span>
              </td>
              {row.months.map((val, i) => (
                <td
                  key={i}
                  className={`py-1.5 px-1 text-right ${
                    val > 0
                      ? "text-income"
                      : val < 0
                        ? "text-foreground"
                        : "text-muted-foreground/30"
                  } ${i === currentMonth ? "bg-primary/5" : ""}`}
                >
                  <Amount value={val} compact />
                </td>
              ))}
              <td
                className={`py-1.5 px-1 text-right font-semibold border-l border-border/40 ${
                  row.total > 0 ? "text-income" : row.total < 0 ? "text-expense" : ""
                }`}
              >
                <Amount value={row.total} compact />
              </td>
              <td className="py-1.5 pl-1 pr-5 text-right text-muted-foreground md:pr-6">
                <Amount value={row.avg} compact />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border/60 font-bold">
            <td className="sticky left-0 z-10 bg-card py-2 pl-5 pr-3 text-foreground after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border/30 md:pl-6">
              Total
            </td>
            {monthTotals.map((val, i) => (
              <td
                key={i}
                className={`py-2 px-1.5 text-right ${
                  val > 0 ? "text-income" : val < 0 ? "text-expense" : ""
                } ${i === currentMonth ? "bg-primary/5" : ""}`}
              >
                <Amount value={val} compact />
              </td>
            ))}
            <td
              className={`py-2 px-1.5 text-right border-l border-border/40 ${
                grandTotal > 0 ? "text-income" : grandTotal < 0 ? "text-expense" : ""
              }`}
            >
              <Amount value={grandTotal} />
            </td>
            <td className="py-2 pl-1.5 pr-5 text-right text-muted-foreground md:pr-6">
              <Amount value={grandTotal / elapsedMonths} compact />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
