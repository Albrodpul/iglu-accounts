import { getExpenses, getExpensesByYear } from "@/actions/expenses";
import { getCategories } from "@/actions/categories";
import { formatCurrency, MONTHS } from "@/lib/format";
import { ExpenseList } from "@/components/expenses/expense-list";
import { AddExpenseFab } from "@/components/expenses/add-expense-fab";
import { TrendingDown, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [monthExpenses, yearExpenses, categories] = await Promise.all([
    getExpenses({ month, year }),
    getExpensesByYear(year),
    getCategories(),
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

  // Recent expenses (last 10)
  const recentExpenses = [...monthExpenses]
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
    .slice(0, 10);

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="hero-surface p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
          Balance neto {year}
        </p>
        <p className={`mt-2 text-4xl font-bold tracking-tight tabular-nums md:text-5xl ${yearNeto >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
          {formatCurrency(yearNeto)}
        </p>
        <div className="mt-3 flex items-center gap-2">
          {yearNeto >= 0 ? (
            <TrendingUp className="h-4 w-4 text-emerald-300" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-300" />
          )}
          <span className="text-sm text-white/65">
            {formatCurrency(yearIngresos)} ingresos · {formatCurrency(yearGastos)} gastos
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="kpi-chip">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Ingresos</p>
            <p className="mt-1 text-xl font-semibold text-emerald-200 tabular-nums md:text-2xl">
              {formatCurrency(yearIngresos)}
            </p>
          </div>
          <div className="kpi-chip">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Gastos</p>
            <p className="mt-1 text-xl font-semibold text-rose-200 tabular-nums md:text-2xl">
              {formatCurrency(yearGastos)}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold md:text-2xl">{MONTHS[month - 1]} {year}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="glass-panel p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">Gastos</p>
            <p className="mt-2 text-2xl font-bold text-rose-600 tabular-nums">
              {formatCurrency(monthGastos)}
            </p>
          </div>
          <div className="glass-panel p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">Ingresos</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600 tabular-nums">
              {formatCurrency(monthIngresos)}
            </p>
          </div>
          <div className="glass-panel p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Neto</p>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${monthNeto >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatCurrency(monthNeto)}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold md:text-2xl">Últimos movimientos</h2>
        <div className="glass-panel p-5 md:p-6">
          <ExpenseList expenses={recentExpenses} categories={categories} />
        </div>
      </section>

      <AddExpenseFab categories={categories} />
    </div>
  );
}
