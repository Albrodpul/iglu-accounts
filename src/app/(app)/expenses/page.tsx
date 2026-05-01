import { getExpenses, getExpensesPaginated, getAvailablePeriods } from "@/actions/expenses";
import { getCategories, getDebtCategoryId, getTransferCategoryId } from "@/actions/categories";
import { hasInvestmentsEnabled } from "@/actions/accounts";
import { MonthSelector } from "@/components/expenses/month-selector";
import { CategoryManager } from "@/components/expenses/category-manager";
import { AddExpenseFab } from "@/components/expenses/add-expense-fab";
import { MonthSummary } from "@/components/shared/month-summary";
import { ExpenseListFiltered } from "@/components/expenses/expense-list-filtered";
import { ExpenseListAll } from "@/components/expenses/expense-list-all";
import { buildMonthSummaryKpis, calculateFinancialTotals } from "@/lib/expense-metrics";
import { MONTHS } from "@/lib/format";

type Props = {
  searchParams: Promise<{ month?: string; year?: string; category?: string }>;
};

export default async function ExpensesPage({ searchParams }: Props) {
  const params = await searchParams;
  const hasMonth = !!params.month;
  const now = new Date();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const categoryFilter = params.category || "";

  const [categories, availablePeriods, debtCategoryId, hasInvestments, transferCategoryId] = await Promise.all([
    getCategories(),
    getAvailablePeriods(),
    getDebtCategoryId(),
    hasInvestmentsEnabled(),
    getTransferCategoryId(),
  ]);

  const monthExpenses = hasMonth ? await getExpenses({ month, year }) : null;
  const allExpensesPage = !hasMonth ? await getExpensesPaginated({ page: 0, limit: 50, ascending: false }) : null;

  const totals = monthExpenses
    ? calculateFinancialTotals(monthExpenses, debtCategoryId, transferCategoryId)
    : null;
  const kpis = totals
    ? buildMonthSummaryKpis({
        totalIncome: totals.totalIncome,
        totalExpenses: totals.totalExpenses,
        totalDebt: totals.totalDebt,
        debtCategoryId,
        month,
        year,
      })
    : [];

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold md:text-3xl">Movimientos</h1>
        <div className="ml-auto w-fit">
          <MonthSelector
            month={hasMonth ? month : null}
            year={hasMonth ? year : null}
            availablePeriods={availablePeriods}
            nullable
          />
        </div>
      </div>

      {hasMonth && totals && (
        <MonthSummary month={month} year={year} neto={totals.net} kpis={kpis} collapsible />
      )}

      <section>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold md:text-xl">
            {hasMonth ? `Detalle · ${MONTHS[month - 1]}` : "Todos los movimientos"}
          </h2>
          <CategoryManager categories={categories} />
        </div>
        <div className="glass-panel p-5 md:p-6">
          {hasMonth && monthExpenses ? (
            <ExpenseListFiltered
              expenses={monthExpenses}
              categories={categories}
              initialCategoryFilter={categoryFilter}
              hasInvestments={hasInvestments}
              debtCategoryId={debtCategoryId}
              transferCategoryId={transferCategoryId}
            />
          ) : allExpensesPage ? (
            <ExpenseListAll
              initialExpenses={allExpensesPage.data as never}
              initialHasMore={allExpensesPage.hasMore}
              categories={categories}
              debtCategoryId={debtCategoryId}
              transferCategoryId={transferCategoryId}
              hasInvestments={hasInvestments}
            />
          ) : null}
        </div>
      </section>

      <AddExpenseFab categories={categories} hasInvestments={hasInvestments} />
    </div>
  );
}
