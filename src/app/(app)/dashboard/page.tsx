import Link from "next/link";
import { getExpenses, getExpensesByYear, getAllTimeBalance } from "@/actions/expenses";
import { getCategories } from "@/actions/categories";
import { getRecurringExpenses } from "@/actions/recurring";
import { formatCurrency, MONTHS } from "@/lib/format";
import { ExpenseList } from "@/components/expenses/expense-list";
import { AddExpenseFab } from "@/components/expenses/add-expense-fab";
import { ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [monthExpenses, yearExpenses, categories, recurring, allTime] = await Promise.all([
    getExpenses({ month, year }),
    getExpensesByYear(year),
    getCategories(),
    getRecurringExpenses(),
    getAllTimeBalance(),
  ]);

  // Month stats
  const monthGastos = monthExpenses
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + e.amount, 0);
  const monthIngresos = monthExpenses
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);
  const monthNeto = monthGastos + monthIngresos;

  // Year stats
  const yearGastos = yearExpenses
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + e.amount, 0);
  const yearIngresos = yearExpenses
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);
  const yearNeto = yearGastos + yearIngresos;

  // Monthly average spending
  const monthsElapsed = month;
  const avgMonthlySpend = yearGastos / monthsElapsed;

  // Fixed expenses
  const totalFixedMonthly = recurring.reduce((s, r) => s + r.amount, 0);

  // Recent expenses (last 5)
  const recentExpenses = [...monthExpenses]
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
    .slice(0, 5);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Desktop: 2-column layout for key info above the fold */}
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        {/* Total acumulado */}
        <section className="hero-surface p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
            Total acumulado
          </p>
          <p className={`mt-2 text-4xl font-bold tracking-tight tabular-nums md:text-5xl ${allTime.total >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
            {formatCurrency(allTime.total)}
          </p>
          {allTime.years.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {allTime.years.map((y) => (
                <div key={y.year} className="kpi-chip flex-1 min-w-[80px]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/55">{y.year}</p>
                  <p className={`mt-0.5 text-base font-semibold tabular-nums ${y.neto >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                    {formatCurrency(y.neto)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Balance año actual */}
        <section className="hero-surface p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
            Balance {year}
          </p>
          <p className={`mt-2 text-4xl font-bold tracking-tight tabular-nums md:text-5xl ${yearNeto >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
            {formatCurrency(yearNeto)}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="kpi-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Ingresos</p>
              <p className="mt-1 text-lg font-semibold text-emerald-200 tabular-nums md:text-xl">
                {formatCurrency(yearIngresos)}
              </p>
            </div>
            <div className="kpi-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Gastos</p>
              <p className="mt-1 text-lg font-semibold text-rose-200 tabular-nums md:text-xl">
                {formatCurrency(yearGastos)}
              </p>
            </div>
            <div className="kpi-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Media/mes</p>
              <p className="mt-1 text-lg font-semibold text-amber-200 tabular-nums md:text-xl">
                {formatCurrency(avgMonthlySpend)}
              </p>
            </div>
            <div className="kpi-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Fijos/mes</p>
              <p className="mt-1 text-lg font-semibold text-sky-200 tabular-nums md:text-xl">
                {formatCurrency(totalFixedMonthly)}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Desktop: month balance + recent movements side by side */}
      <div className="grid gap-6 md:grid-cols-[1fr_1.5fr] md:gap-8">
        {/* Balance del mes */}
        <section>
          <h2 className="mb-4 text-xl font-bold md:text-2xl">{MONTHS[month - 1]} {year}</h2>
          <div className="grid grid-cols-1 gap-3">
            <div className="glass-panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Neto</p>
              <p className={`mt-2 text-2xl font-bold tabular-nums ${monthNeto >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCurrency(monthNeto)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-panel p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">Gastos</p>
                <p className="mt-2 text-xl font-bold text-rose-600 tabular-nums">
                  {formatCurrency(monthGastos)}
                </p>
              </div>
              <div className="glass-panel p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">Ingresos</p>
                <p className="mt-2 text-xl font-bold text-emerald-600 tabular-nums">
                  {formatCurrency(monthIngresos)}
                </p>
              </div>
            </div>
          </div>
        </section>

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
