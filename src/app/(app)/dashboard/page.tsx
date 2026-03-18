import Link from "next/link";
import { getExpenses, getExpensesByYear, getAllTimeBalance } from "@/actions/expenses";
import { getCategories, getDebtCategoryId } from "@/actions/categories";
import { getRecurringExpenses } from "@/actions/recurring";
import { formatCurrency, MONTHS } from "@/lib/format";
import { ExpenseList } from "@/components/expenses/expense-list";
import { AddExpenseFab } from "@/components/expenses/add-expense-fab";
import { BalanceYear } from "@/components/shared/balance-year";
import { MonthSummary } from "@/components/shared/month-summary";
import { ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const debtCategoryId = await getDebtCategoryId();

  const [monthExpenses, yearExpenses, categories, recurring, allTime] =
    await Promise.all([
      getExpenses({ month, year }),
      getExpensesByYear(year),
      getCategories(),
      getRecurringExpenses(),
      getAllTimeBalance(debtCategoryId),
    ]);

  // Month stats
  const monthGastos = monthExpenses
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + e.amount, 0);
  const monthIngresos = monthExpenses
    .filter((e) => e.amount > 0 && e.category_id !== debtCategoryId)
    .reduce((s, e) => s + e.amount, 0);
  const monthDeudas = debtCategoryId
    ? monthExpenses.filter((e) => e.category_id === debtCategoryId).reduce((s, e) => s + e.amount, 0)
    : 0;
  const monthNeto = monthGastos + monthIngresos;

  // Year stats
  const yearGastos = yearExpenses
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + e.amount, 0);
  const yearIngresos = yearExpenses
    .filter((e) => e.amount > 0 && e.category_id !== debtCategoryId)
    .reduce((s, e) => s + e.amount, 0);
  const yearDeudas = debtCategoryId
    ? yearExpenses.filter((e) => e.category_id === debtCategoryId).reduce((s, e) => s + e.amount, 0)
    : 0;
  const yearNeto = yearGastos + yearIngresos;

  // Monthly average spending
  const avgMonthlySpend = yearGastos / month;

  // Fixed monthly totals
  const fixedExpenses = recurring.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);

  // Recent expenses (last 5)
  const recentExpenses = [...monthExpenses]
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
    .slice(0, 5);

  // Build KPIs for Balance year card
  const balanceKpis: { label: string; value: number; color: string }[] = [
    { label: "Ingresos", value: yearIngresos, color: "emerald" },
    { label: "Gastos", value: yearGastos, color: "rose" },
    { label: "Media/mes", value: avgMonthlySpend, color: "amber" },
  ];

  if (yearDeudas > 0) {
    balanceKpis.push({
      label: "Deudas",
      value: yearDeudas,
      color: "sky",
    });
  } else {
    balanceKpis.push({
      label: "Fijos/mes",
      value: fixedExpenses,
      color: "emerald",
    });
  }

  // Build KPIs for month summary
  const monthKpis = [
    {
      label: "Ingresos",
      value: monthIngresos,
      labelColor: "text-white/75",
      valueColor: "text-emerald-300",
    },
    {
      label: "Gastos",
      value: monthGastos,
      labelColor: "text-white/75",
      valueColor: "text-rose-300",
    },
  ];

  if (monthDeudas > 0 && debtCategoryId) {
    monthKpis.push({
      label: "Deudas",
      value: monthDeudas,
      labelColor: "text-white/75",
      valueColor: "text-sky-300",
      href: `/expenses?month=${month}&year=${year}&category=${debtCategoryId}`,
    } as typeof monthKpis[number]);
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        {/* Total acumulado */}
        <section className="hero-surface p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
            Total acumulado
          </p>
          <p
            className={`mt-2 text-4xl font-bold tracking-tight tabular-nums md:text-5xl ${
              allTime.total >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {formatCurrency(allTime.total)}
          </p>
          {allTime.years.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {allTime.years.map((y) => (
                <Link
                  key={y.year}
                  href={`/summary?year=${y.year}`}
                  className="kpi-chip flex-1 min-w-[80px] transition-colors hover:bg-white/25"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                    {y.year}
                  </p>
                  <p
                    className={`mt-0.5 text-base font-semibold tabular-nums ${
                      y.neto >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {formatCurrency(y.neto)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Balance año actual */}
        <BalanceYear year={year} neto={yearNeto} kpis={balanceKpis} />
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_1.5fr] md:gap-8">
        {/* Balance del mes */}
        <div>
          <h2 className="mb-4 text-xl font-bold md:text-2xl">
            {MONTHS[month - 1]} {year}
          </h2>
          <MonthSummary month={month} year={year} neto={monthNeto} kpis={monthKpis} />
        </div>

        {/* Últimos movimientos */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold md:text-2xl">Últimos movimientos</h2>
            <Link
              href={`/expenses?month=${month}&year=${year}`}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver todo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="glass-panel p-5 md:p-6">
            <ExpenseList expenses={recentExpenses} categories={categories} sortable={false} />
          </div>
        </section>
      </div>

      <AddExpenseFab categories={categories} />
    </div>
  );
}
