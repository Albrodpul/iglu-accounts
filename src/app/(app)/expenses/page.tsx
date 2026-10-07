import { getExpenses, getExpensesByYear, getExpensesPaginated, getAvailablePeriods } from "@/actions/expenses";
import { getCategories, getDebtCategoryId, getTransferCategoryId } from "@/actions/categories";
import { hasInvestmentsEnabled } from "@/actions/accounts";
import { MonthSelector } from "@/components/expenses/month-selector";
import { CategoryManager } from "@/components/expenses/category-manager";
import { PeriodCard } from "@/components/dashboard/period-card";
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

  // `?year=` without a month: the whole year (the yearly summary links here).
  const wholeYear = !hasMonth && !!params.year && Number.isInteger(year);
  const monthExpenses = hasMonth ? await getExpenses({ month, year }) : null;
  const yearExpenses = wholeYear ? await getExpensesByYear(year) : null;
  const allExpensesPage = !hasMonth && !wholeYear
    ? await getExpensesPaginated({ page: 0, limit: 50, ascending: false, categoryId: categoryFilter || undefined })
    : null;

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
      {/* One row when it fits; with a month picked on a narrow phone the selector wraps below. */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold md:text-3xl">Movimientos</h1>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* Phones reach category management from the filters sheet instead. */}
          <div className="hidden sm:block">
            <CategoryManager categories={categories} />
          </div>
          <MonthSelector
            month={hasMonth ? month : null}
            year={hasMonth || wholeYear ? year : null}
            availablePeriods={availablePeriods}
            nullable
          />
        </div>
      </div>

      {hasMonth && totals && (
        <PeriodCard title={`Neto ${MONTHS[month - 1].toLowerCase()} ${year}`} neto={totals.net} kpis={kpis} />
      )}

      <section aria-label={hasMonth ? `Movimientos de ${MONTHS[month - 1]}` : wholeYear ? `Movimientos de ${year}` : "Todos los movimientos"}>
        {(monthExpenses ?? yearExpenses) ? (
            <ExpenseListFiltered
              key={`${year}-${hasMonth ? month : "all"}-${categoryFilter}`}
              periodLabel={hasMonth ? `${MONTHS[month - 1]} ${year}` : `Año ${year}`}
              expenses={(monthExpenses ?? yearExpenses)!}
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
              initialCategoryFilter={categoryFilter}
              categories={categories}
              debtCategoryId={debtCategoryId}
              transferCategoryId={transferCategoryId}
              hasInvestments={hasInvestments}
            />
          ) : null}
      </section>

    </div>
  );
}
