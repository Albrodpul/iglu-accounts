import { getExpensesByYear, getAvailablePeriods } from "@/actions/expenses";
import { getCategories } from "@/actions/categories";
import { formatCurrency, MONTHS } from "@/lib/format";
import { YearSelector } from "@/components/summary/year-selector";
import { MonthlyChart } from "@/components/summary/monthly-chart";
import { CategoryBreakdown } from "@/components/summary/category-breakdown";
import { AnnualGrid } from "@/components/summary/annual-grid";

type Props = {
  searchParams: Promise<{ year?: string }>;
};

export default async function SummaryPage({ searchParams }: Props) {
  const params = await searchParams;
  const year = params.year ? parseInt(params.year) : new Date().getFullYear();

  const [expenses, categories, availablePeriods] = await Promise.all([
    getExpensesByYear(year),
    getCategories(),
    getAvailablePeriods(),
  ]);

  // Monthly totals
  const monthlyData = MONTHS.map((name, i) => {
    const monthExpenses = expenses.filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() === i;
    });

    const gastos = monthExpenses
      .filter((e) => e.amount < 0)
      .reduce((s, e) => s + e.amount, 0);
    const ingresos = monthExpenses
      .filter((e) => e.amount > 0)
      .reduce((s, e) => s + e.amount, 0);

    return {
      name: name.substring(0, 3),
      gastos: Math.abs(gastos),
      ingresos,
      neto: gastos + ingresos,
    };
  });

  // Category breakdown
  const categoryTotals = categories
    .map((cat) => {
      const total = expenses
        .filter((e) => e.category_id === cat.id && e.amount < 0)
        .reduce((s, e) => s + Math.abs(e.amount), 0);
      return { name: cat.name, color: cat.color || "#64748b", icon: cat.icon || "", total };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const totalExpenses = expenses
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + e.amount, 0);
  const totalIncome = expenses
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);
  const neto = totalExpenses + totalIncome;

  // Average monthly expenses
  const now = new Date();
  const monthsElapsed = year === now.getFullYear() ? now.getMonth() + 1 : 12;
  const avgMonthlyExpense = totalExpenses / monthsElapsed;

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">Resumen anual</h1>
        <YearSelector year={year} availableYears={availablePeriods.map((p) => p.year)} />
      </div>

      <section className="hero-surface p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
          Balance {year}
        </p>
        <p className={`mt-2 text-4xl font-bold tracking-tight tabular-nums md:text-5xl ${neto >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
          {formatCurrency(neto)}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="kpi-chip">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">Ingresos</p>
            <p className="mt-1 text-xl font-semibold text-emerald-300 tabular-nums md:text-2xl">
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="kpi-chip">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">Gastos</p>
            <p className="mt-1 text-xl font-semibold text-rose-300 tabular-nums md:text-2xl">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <div className="kpi-chip">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">Media/mes</p>
            <p className="mt-1 text-xl font-semibold text-amber-300 tabular-nums md:text-2xl">
              {formatCurrency(avgMonthlyExpense)}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold md:text-xl">Gastos vs Ingresos por mes</h2>
        <div className="glass-panel p-5 md:p-6">
          <MonthlyChart data={monthlyData} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold md:text-xl">Vista anual por categoría</h2>
        <div className="rounded-2xl border border-border/80 bg-card shadow-[0_10px_30px_-20px_rgba(28,35,45,0.38)] p-5 md:p-6">
          <AnnualGrid expenses={expenses} categories={categories} year={year} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold md:text-xl">Desglose por categoría</h2>
        <div className="glass-panel p-5 md:p-6">
          <CategoryBreakdown data={categoryTotals} />
        </div>
      </section>
    </div>
  );
}
