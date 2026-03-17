import { getExpenses, getAvailablePeriods } from "@/actions/expenses";
import { getCategories } from "@/actions/categories";
import { MonthSelector } from "@/components/expenses/month-selector";
import { AddExpenseFab } from "@/components/expenses/add-expense-fab";
import { formatCurrency, MONTHS } from "@/lib/format";
import { ExpenseListFiltered } from "@/components/expenses/expense-list-filtered";

type Props = {
  searchParams: Promise<{ month?: string; year?: string }>;
};

export default async function ExpensesPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;
  const year = params.year ? parseInt(params.year) : now.getFullYear();

  const [expenses, categories, availablePeriods] = await Promise.all([
    getExpenses({ month, year }),
    getCategories(),
    getAvailablePeriods(),
  ]);

  const totalExpenses = expenses
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + e.amount, 0);
  const totalIncome = expenses
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);
  const neto = totalExpenses + totalIncome;

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">Movimientos</h1>
        <MonthSelector month={month} year={year} availablePeriods={availablePeriods} />
      </div>

      <section className="hero-surface p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
          Neto {MONTHS[month - 1]} {year}
        </p>
        <p className={`mt-2 text-3xl font-bold tracking-tight tabular-nums md:text-4xl ${neto >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
          {formatCurrency(neto)}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="kpi-chip">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Ingresos</p>
            <p className="mt-1 text-xl font-semibold text-emerald-200 tabular-nums">
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="kpi-chip">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Gastos</p>
            <p className="mt-1 text-xl font-semibold text-rose-200 tabular-nums">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold md:text-xl">
          Detalle · {MONTHS[month - 1]}
        </h2>
        <div className="glass-panel p-5 md:p-6">
          <ExpenseListFiltered expenses={expenses} categories={categories} />
        </div>
      </section>

      <AddExpenseFab categories={categories} />
    </div>
  );
}
