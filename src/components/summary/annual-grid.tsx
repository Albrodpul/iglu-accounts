"use client";

import { MONTHS } from "@/lib/format";
import { Amount } from "@/components/ui/amount";
import { sumByCategoryAndMonth } from "@/lib/aggregations";
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

  // Build matrix: category × month, in one pass over the movements
  const byCategory = sumByCategoryAndMonth(expenses);
  const usedCategories = categories.filter((cat) => {
    if (transferCategoryId && cat.id === transferCategoryId) return false;
    if (cat.name.toLowerCase() === "traspaso") return false;
    return byCategory.has(cat.id);
  });

  const grid = usedCategories.map((cat) => {
    const monthlyTotals = byCategory.get(cat.id) ?? new Array<number>(12).fill(0);
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

  // Current month for highlighting
  const now = new Date();
  const currentMonth = now.getFullYear() === year ? now.getMonth() : -1;
  // Months that have not started only hold what was entered ahead of time:
  // shown faded, and left out of the averages.
  const isFuture = (i: number) => year > now.getFullYear() || (currentMonth >= 0 && i > currentMonth);
  const FUTURE = "opacity-45";

  // Averages run over the months lived so far: up to the current month this
  // year, or up to the last month with data in a past one.
  const lastMonthWithData = monthTotals.reduce((last, val, i) => (val !== 0 ? i + 1 : last), 0);
  const elapsedMonths = Math.max(currentMonth >= 0 ? currentMonth + 1 : lastMonthWithData, 1);
  const elapsedSum = (months: number[]) => months.slice(0, elapsedMonths).reduce((s, v) => s + v, 0);
  for (const row of grid) {
    row.avg = elapsedSum(row.months) / elapsedMonths;
  }

  return (
    <>
      {/* Desktop: category rows × month columns */}
      <div className="hidden overflow-x-auto md:-mx-6 md:block">
      <table className="w-full text-sm tabular-nums">
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
                } ${isFuture(i) ? FUTURE : ""}`}
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
              <td className="sticky left-0 z-10 whitespace-nowrap bg-card py-1.5 pl-5 pr-3 font-medium text-foreground after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border/30 md:pl-6">
                <span className="mr-1.5">{row.category.icon}</span>
                {row.category.name}
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
                  } ${i === currentMonth ? "bg-primary/5" : ""} ${isFuture(i) ? FUTURE : ""}`}
                >
                  <Amount value={val} compact whole />
                </td>
              ))}
              <td
                className={`py-1.5 px-1 text-right font-semibold border-l border-border/40 ${
                  row.total > 0 ? "text-income" : row.total < 0 ? "text-expense" : ""
                }`}
              >
                <Amount value={row.total} compact whole />
              </td>
              <td className="py-1.5 pl-1 pr-1 text-right text-muted-foreground">
                <Amount value={row.avg} compact whole />
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
                className={`py-2 px-1 text-right ${
                  isFuture(i) ? `text-muted-foreground ${FUTURE}` : val > 0 ? "text-income" : val < 0 ? "text-expense" : ""
                } ${i === currentMonth ? "bg-primary/5" : ""}`}
              >
                <Amount value={val} compact whole />
              </td>
            ))}
            <td
              className={`py-2 px-1.5 text-right border-l border-border/40 ${
                grandTotal > 0 ? "text-income" : grandTotal < 0 ? "text-expense" : ""
              }`}
            >
              <Amount value={grandTotal} compact whole />
            </td>
            <td className="py-2 pl-1.5 pr-1 text-right text-muted-foreground">
              <Amount value={elapsedSum(monthTotals) / elapsedMonths} compact whole />
            </td>
            <td className="py-2 pl-1 pr-5 md:pr-6">
              <Sparkline data={monthTotals} color="#64748b" />
            </td>
          </tr>
        </tfoot>
      </table>
      </div>

      {/* Mobile: transposed — month rows × category columns.
          A category lives in one column, so its whole year reads top-to-bottom
          without horizontal scrolling. */}
      <div className="-mx-5 overflow-x-auto md:hidden">
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr className="border-b border-border/60">
              <th className="sticky left-0 z-10 bg-card py-2 pl-5 pr-2 text-left align-bottom font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border/30">
                Mes
              </th>
              {grid.map((row) => (
                <th key={row.category.id} className="px-1.5 py-2 align-bottom">
                  <div className="flex min-w-[52px] flex-col items-center gap-0.5">
                    <span className="text-base leading-none">{row.category.icon}</span>
                    <span className="max-w-[64px] truncate text-[10px] font-medium text-muted-foreground">
                      {row.category.name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthAbbr.map((m, mi) => (
              <tr
                key={m}
                className={`border-b border-border/30 ${mi === currentMonth ? "bg-primary/5" : ""} ${isFuture(mi) ? "[&>td:not(:first-child)]:opacity-45" : ""}`}
              >
                <td className={`sticky left-0 z-10 bg-card py-1.5 pl-5 pr-2 font-medium after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border/30 ${mi === currentMonth ? "text-primary" : "text-muted-foreground"}`}>
                  {m}
                </td>
                {grid.map((row) => {
                  const val = row.months[mi];
                  return (
                    <td
                      key={row.category.id}
                      className={`px-1.5 py-1.5 text-right ${
                        val > 0 ? "text-income" : val < 0 ? "text-foreground" : "text-muted-foreground/30"
                      }`}
                    >
                      <Amount value={val} compact whole />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border/60 font-bold">
              <td className="sticky left-0 z-10 bg-card py-2 pl-5 pr-2 text-foreground after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border/30">
                Total
              </td>
              {grid.map((row) => (
                <td
                  key={row.category.id}
                  className={`px-1.5 py-2 text-right ${
                    row.total > 0 ? "text-income" : row.total < 0 ? "text-expense" : ""
                  }`}
                >
                  <Amount value={row.total} compact whole />
                </td>
              ))}
            </tr>
            <tr className="border-b border-border/30 text-muted-foreground">
              <td className="sticky left-0 z-10 bg-card py-1.5 pl-5 pr-2 font-medium after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border/30">
                Media
              </td>
              {grid.map((row) => (
                <td key={row.category.id} className="px-1.5 py-1.5 text-right">
                  <Amount value={row.avg} compact whole />
                </td>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 z-10 bg-card py-1.5 pl-5 pr-2 font-medium text-muted-foreground after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border/30">
                Tend.
              </td>
              {grid.map((row) => (
                <td key={row.category.id} className="px-1.5 py-1.5">
                  <div className="flex justify-center">
                    <Sparkline data={row.months} color={row.category.color || "#64748b"} />
                  </div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
