"use client";

import { MONTHS } from "@/lib/format";
import { Amount } from "@/components/ui/amount";
import type { Category, ExpenseWithCategory } from "@/types";

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 52;
  const h = 18;
  const pad = 1;
  const values = data.map(Math.abs);
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + (1 - v / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  const line = points.join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  return (
    <svg width={w} height={h}>
      <polygon points={area} fill={color} opacity={0.15} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

type Props = {
  expenses: ExpenseWithCategory[];
  categories: Category[];
  year: number;
  debtCategoryId?: string | null;
  transferCategoryId?: string | null;
};

export function AnnualGrid({ expenses, categories, year, debtCategoryId = null, transferCategoryId = null }: Props) {
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

  // Monthly totals row (debts and transfers are informational and excluded from totals)
  const monthTotals = Array.from({ length: 12 }, (_, i) =>
    grid.reduce((s, row) => {
      if (debtCategoryId && row.category.id === debtCategoryId) return s;
      if (transferCategoryId && row.category.id === transferCategoryId) return s;
      return s + row.months[i];
    }, 0)
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
      <table className="w-full min-w-[860px] text-sm tabular-nums md:min-w-0">
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
            <th className="py-2 pl-1 pr-1 text-right font-semibold text-muted-foreground">
              Media
            </th>
            <th className="py-2 pl-1 pr-5 md:pr-6"></th>
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
              <td className="py-1.5 pl-1 pr-1 text-right text-muted-foreground">
                <Amount value={row.avg} compact />
              </td>
              <td className="py-1.5 pl-1 pr-5 md:pr-6">
                <Sparkline data={row.months} color={row.category.color || "#64748b"} />
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
            <td className="py-2 pl-1.5 pr-1 text-right text-muted-foreground">
              <Amount value={grandTotal / elapsedMonths} compact />
            </td>
            <td className="py-2 pl-1 pr-5 md:pr-6">
              <Sparkline data={monthTotals} color="#64748b" />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
