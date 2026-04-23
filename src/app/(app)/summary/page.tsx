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
import { BalanceYear } from "@/components/shared/balance-year";
import { InvestmentReturnsTab } from "@/components/investments/investment-returns-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildBalanceYearKpis, calculateFinancialTotals } from "@/lib/expense-metrics";

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

  // Monthly totals (including debts as separate bar)
  const monthlyData = MONTHS.map((name, i) => {
    const monthExpenses = expenses.filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() === i;
    });

    const isTransfer = (e: { category_id: string }) => transferCategoryId && e.category_id === transferCategoryId;
    const gastos = monthExpenses
      .filter((e) => e.amount < 0 && !isTransfer(e))
      .reduce((s, e) => s + e.amount, 0);
    const ingresos = monthExpenses
      .filter((e) => e.amount > 0 && e.category_id !== debtCategoryId && !isTransfer(e))
      .reduce((s, e) => s + e.amount, 0);
    const deudas = debtCategoryId
      ? monthExpenses
          .filter((e) => e.category_id === debtCategoryId)
          .reduce((s, e) => s + e.amount, 0)
      : 0;

    return {
      name: name.substring(0, 3),
      gastos: Math.abs(gastos),
      ingresos,
      deudas,
      neto: gastos + ingresos,
    };
  });

  const hasAnyDebts = monthlyData.some((m) => m.deudas > 0);

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

  // Include debts in category breakdown (positive amounts)
  if (debtCategoryId) {
    const debtCat = categories.find((c) => c.id === debtCategoryId);
    if (debtCat) {
      const debtTotal = expenses
        .filter((e) => e.category_id === debtCategoryId)
        .reduce((s, e) => s + e.amount, 0);
      if (debtTotal > 0) {
        categoryTotals.push({
          name: debtCat.name,
          color: debtCat.color || "#f59e0b",
          icon: debtCat.icon || "🤝",
          total: debtTotal,
        });
      }
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

      <Tabs defaultValue="resumen">
        <TabsList className="h-auto w-full overflow-x-auto justify-start rounded-lg p-1">
          <TabsTrigger value="resumen">Resumen Anual</TabsTrigger>
          <TabsTrigger value="mensual">Evolución Mensual</TabsTrigger>
          <TabsTrigger value="anual">Tabla Anual</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="comparar">Comparar</TabsTrigger>
          {hasInvestments && (
            <TabsTrigger value="inversiones">Inversiones</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          <BalanceYear year={year} neto={totals.net} kpis={kpis} />
        </TabsContent>

        <TabsContent value="mensual" className="mt-4">
          <div className="glass-panel p-5 md:p-6">
            <MonthlyChart data={monthlyData} showDebts={hasAnyDebts} />
          </div>
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
          <div className="glass-panel p-5 md:p-6">
            <CategoryBreakdown data={categoryTotals} />
          </div>
        </TabsContent>

        <TabsContent value="comparar" className="mt-4">
          <div className="glass-panel p-5 md:p-6">
            <YearComparison availableYears={availablePeriods.map((p) => p.year)} />
          </div>
        </TabsContent>

        {hasInvestments && (
          <TabsContent value="inversiones" className="mt-4">
            <InvestmentReturnsTab returns={monthlyReturns} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
