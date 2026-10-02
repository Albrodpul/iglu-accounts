import { getExpensesByYear, getAvailablePeriods } from "@/actions/expenses";
import { getCategories, getDebtCategoryId, getTransferCategoryId } from "@/actions/categories";
import { getRecurringExpenses } from "@/actions/recurring";
import { hasInvestmentsEnabled } from "@/actions/accounts";
import { getInvestmentMonthlyReturns } from "@/actions/investments";
import { MONTHS } from "@/lib/format";
import { YearSelector } from "@/components/summary/year-selector";
import { MonthlyChart } from "@/components/summary/monthly-chart";
import { CategoryBreakdown } from "@/components/summary/category-breakdown";
import { AnnualGrid } from "@/components/summary/annual-grid";
import { YearComparison } from "@/components/summary/year-comparison";
import { PeriodCard } from "@/components/dashboard/period-card";
import { InvestmentReturnsTab } from "@/components/investments/investment-returns-tab";
import { TabsContent } from "@/components/ui/tabs";
import { SummaryTabs } from "@/components/summary/summary-tabs";
import { buildBalanceYearKpis, calculateFinancialTotals } from "@/lib/expense-metrics";
import { spentByCategory, sumCategory, summarizeMonths } from "@/lib/aggregations";

type Props = {
  searchParams: Promise<{ year?: string }>;
};

export default async function SummaryPage({ searchParams }: Props) {
  const params = await searchParams;
  const year = params.year ? parseInt(params.year) : new Date().getFullYear();

  const [expenses, categories, availablePeriods, debtCategoryId, recurring, transferCategoryId, hasInvestments] =
    await Promise.all([
      getExpensesByYear(year),
      getCategories(),
      getAvailablePeriods(),
      getDebtCategoryId(),
      getRecurringExpenses(),
      getTransferCategoryId(),
      hasInvestmentsEnabled(),
    ]);

  const monthlyReturns = hasInvestments ? await getInvestmentMonthlyReturns() : [];

  const specialCategories = { debtCategoryId, transferCategoryId };

  // Monthly totals (including debts as separate bar)
  const today = new Date();
  // Months that have not started yet only hold what was entered ahead of time.
  const isFutureMonth = (i: number) =>
    year > today.getFullYear() || (year === today.getFullYear() && i > today.getMonth());
  const monthlyData = summarizeMonths(expenses, specialCategories).map((m, i) => ({
    name: MONTHS[i].substring(0, 3),
    future: isFutureMonth(i),
    gastos: Math.abs(m.gastos),
    ingresos: m.ingresos,
    deudas: m.deudas,
    neto: m.gastos + m.ingresos,
  }));

  const hasAnyDebts = monthlyData.some((m) => m.deudas > 0);

  // Category breakdown
  const spent = spentByCategory(expenses);
  const categoryTotals = categories
    // A transfer between your own bank and cash moves money; it is not spending.
    .filter((cat) => cat.id !== transferCategoryId)
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      color: cat.color || "#64748b",
      icon: cat.icon || "",
      total: spent.get(cat.id) ?? 0,
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  // Include debts in category breakdown (positive amounts)
  const debtCat = debtCategoryId ? categories.find((c) => c.id === debtCategoryId) : undefined;
  if (debtCat) {
    const debtTotal = sumCategory(expenses, debtCat.id);
    if (debtTotal > 0) {
      categoryTotals.push({
        id: debtCat.id,
        name: debtCat.name,
        color: debtCat.color || "#f59e0b",
        icon: debtCat.icon || "🤝",
        total: debtTotal,
      });
    }
  }

  const totals = calculateFinancialTotals(expenses, debtCategoryId, transferCategoryId);

  const now = new Date();
  const monthsElapsed = year === now.getFullYear() ? now.getMonth() + 1 : 12;
  const avgMonthlyExpense = totals.totalExpenses / monthsElapsed;

  const fixedExpenses = recurring.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);

  const kpis = buildBalanceYearKpis({
    totalIncome: totals.totalIncome,
    totalExpenses: totals.totalExpenses,
    totalDebt: totals.totalDebt,
    avgMonthlyExpense,
    fixedExpenses,
  });

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">Resumen</h1>
        <YearSelector year={year} availableYears={availablePeriods.map((p) => p.year)} />
      </div>

      <SummaryTabs
        tabs={[
          { value: "resumen", label: "Resumen del año", short: "Resumen" },
          { value: "anual", label: "Tabla por categoría y mes", short: "Categoría × mes" },
          { value: "categorias", label: "Ranking de gasto por categoría", short: "Por categoría" },
          { value: "comparar", label: "Comparar dos periodos", short: "Comparar" },
          ...(hasInvestments
            ? [{ value: "inversiones", label: "Rentabilidad de inversiones", short: "Inversiones" }]
            : []),
        ]}
      >
        <TabsContent value="resumen" className="mt-4 space-y-4">
          <PeriodCard title={`Balance ${year}`} neto={totals.net} kpis={kpis} size="lg" />
          <section className="glass-panel p-5 md:p-6" aria-label="Ingresos y gastos por mes">
            <h2 className="mb-3 text-base font-bold">Mes a mes</h2>
            <MonthlyChart data={monthlyData} year={year} showDebts={hasAnyDebts} />
          </section>
        </TabsContent>

        <TabsContent value="anual" className="mt-4">
          <div className="rounded-lg border border-border/80 bg-card shadow-[0_10px_30px_-20px_rgba(28,35,45,0.38)] p-5 md:p-6">
            <AnnualGrid
              expenses={expenses}
              categories={categories}
              year={year}
              debtCategoryId={debtCategoryId}
              transferCategoryId={transferCategoryId}
            />
          </div>
        </TabsContent>

        <TabsContent value="categorias" className="mt-4">
          <div className="glass-panel max-w-2xl p-5 md:p-6">
            <CategoryBreakdown data={categoryTotals} year={year} />
          </div>
        </TabsContent>

        <TabsContent value="comparar" className="mt-4">
          <div className="glass-panel p-5 md:p-6">
            <YearComparison key={year} year={year} availableYears={availablePeriods.map((p) => p.year)} />
          </div>
        </TabsContent>

        {hasInvestments && (
          <TabsContent value="inversiones" className="mt-4">
            <InvestmentReturnsTab returns={monthlyReturns} />
          </TabsContent>
        )}
      </SummaryTabs>
    </div>
  );
}
