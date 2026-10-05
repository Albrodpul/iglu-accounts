import Link from "next/link";
import { getExpenses, getExpensesByYear, getExpensesPaginated, getAllTimeBalance } from "@/actions/expenses";
import { getCategories, getDebtCategoryId, getTransferCategoryId } from "@/actions/categories";
import { getPendingRecurring, getRecurringExpenses } from "@/actions/recurring";
import { hasInvestmentsEnabled } from "@/actions/accounts";
import { getInvestmentSummary } from "@/actions/investments";
import {
  buildBalanceYearKpis,
  buildMonthSummaryKpis,
  calculateFinancialTotals,
} from "@/lib/expense-metrics";
import { Amount } from "@/components/ui/amount";
import { ExpenseList } from "@/components/expenses/expense-list";
import { AddExpenseFab } from "@/components/expenses/add-expense-fab";
import { PeriodCard } from "@/components/dashboard/period-card";
import { MONTHS } from "@/lib/format";
import { HeroDetails } from "@/components/dashboard/hero-details";
import { HeroStat } from "@/components/dashboard/hero-stat";
import { PendingFixed } from "@/components/shared/pending-fixed";
import { ArrowRight, Banknote, Landmark, TrendingUp } from "lucide-react";
import { AssetBreakdown, type AssetItem } from "@/components/dashboard/asset-breakdown";
import { YearBalances } from "@/components/dashboard/year-balances";

export default async function DashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [debtCategoryId, transferCategoryId] = await Promise.all([
    getDebtCategoryId(),
    getTransferCategoryId(),
  ]);

  const [monthExpenses, yearExpenses, categories, recurring, allTime, hasInvestments, investmentSummary, recentPage, pendingFixed] =
    await Promise.all([
      getExpenses({ month, year }),
      getExpensesByYear(year),
      getCategories(),
      getRecurringExpenses(),
      getAllTimeBalance(debtCategoryId),
      hasInvestmentsEnabled(),
      getInvestmentSummary(),
      getExpensesPaginated({ page: 0, limit: 5, ascending: false, excludeFuture: true }),
      getPendingRecurring(),
    ]);

  const monthTotals = calculateFinancialTotals(monthExpenses, debtCategoryId, transferCategoryId);

  const yearTotals = calculateFinancialTotals(yearExpenses, debtCategoryId, transferCategoryId);

  // Monthly average spending
  const avgMonthlySpend = yearTotals.totalExpenses / month;

  // Fixed monthly totals
  const fixedExpenses = recurring.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);

  const recentExpenses = recentPage.data as typeof monthExpenses;


  // Build KPIs for Balance year card
  const balanceKpis = buildBalanceYearKpis({
    totalIncome: yearTotals.totalIncome,
    totalExpenses: yearTotals.totalExpenses,
    totalDebt: yearTotals.totalDebt,
    avgMonthlyExpense: avgMonthlySpend,
    fixedExpenses,
  });

  // Build KPIs for month summary
  const monthKpis = buildMonthSummaryKpis({
    totalIncome: monthTotals.totalIncome,
    totalExpenses: monthTotals.totalExpenses,
    totalDebt: monthTotals.totalDebt,
    debtCategoryId,
    month,
    year,
  });

  // Asset breakdown for investments module
  const totalInvested = investmentSummary?.totalInvested ?? 0;
  const totalInvestmentValue = investmentSummary?.totalValue ?? 0;
  const totalReturn = investmentSummary?.totalReturn ?? 0;

  // Bank = bank movements - invested amount
  // Cash = cash movements
  // Total = bank + cash + investment current values
  const bankBalance = allTime.bankTotal - totalInvested;
  const cashBalance = allTime.cashTotal;
  const grandTotal = bankBalance + cashBalance + totalInvestmentValue;

  // Where the total is held (only meaningful with the investments module).
  const assetBreakdown: AssetItem[] = [];
  if (hasInvestments && investmentSummary) {
    assetBreakdown.push({ label: "Banco", value: bankBalance });
    if (cashBalance !== 0) assetBreakdown.push({ label: "Efectivo", value: cashBalance });
    for (const type of investmentSummary.types) {
      assetBreakdown.push({ label: type.name, value: type.totalValue });
    }
    assetBreakdown.push({ label: "Neto inversiones", value: totalReturn, highlight: true });
  }
  const hasAssets = assetBreakdown.length > 0;
  // The two halves of the total: what is at hand, and what is invested (or, without
  // the investments module, bank and cash when there is any cash).
  const heroStats = hasInvestments
    ? [
        { icon: Landmark, label: "Banco y efectivo", value: bankBalance + cashBalance },
        { icon: TrendingUp, label: "Inversiones", value: totalInvestmentValue, href: "/investments" },
      ]
    : cashBalance !== 0
      ? [
          { icon: Landmark, label: "Banco", value: allTime.bankTotal },
          { icon: Banknote, label: "Efectivo", value: cashBalance },
        ]
      : [];
  const total = hasInvestments ? grandTotal : allTime.total;

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="hero-surface p-6 md:p-8">
        {/* Wide screens: the total and its two halves share the first row. */}
        <div className="xl:flex xl:items-end xl:justify-between xl:gap-8">
          <div>
            <p className="text-sm font-semibold text-white/85">Total acumulado</p>
            <p
              className={`mt-1 text-5xl font-extrabold tracking-tight tabular-nums md:text-6xl ${
                total >= 0 ? "text-emerald-300" : "text-rose-200"
              }`}
            >
              <Amount value={total} animate />
            </p>
          </div>
          {heroStats.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-7 gap-y-3 xl:mt-0 xl:pb-2">
              {heroStats.map((stat) => (
                <HeroStat key={stat.label} {...stat} />
              ))}
            </div>
          )}
        </div>

        <HeroDetails
          sections={[
            ...(hasAssets
              ? [
                  {
                    id: "assets",
                    label: "Activos",
                    // Wide screens use the full width: smaller pie, legend in two columns.
                    content: (
                      <>
                        <AssetBreakdown items={assetBreakdown} className="xl:hidden" />
                        <AssetBreakdown wide items={assetBreakdown} className="hidden xl:flex" />
                      </>
                    ),
                  },
                ]
              : []),
            ...(allTime.years.length > 0
              ? [{ id: "years", label: "Por año", content: <YearBalances years={allTime.years} currentYear={year} /> }]
              : []),
          ]}
        />
      </section>

      {/* Phones read top to bottom: this month, what is still due, the latest
          movements, then the year. From `md` up, month and year stack in the
          left column (one real column, so a short month card leaves no gap
          above the year) and the movements take the right one. On phones that
          column dissolves (`contents`) and `order` slots the movements between. */}
      <div className="grid items-start gap-6 md:grid-cols-2 md:gap-8">
        <div className="contents md:block md:space-y-4">
        <div className="order-1">
          <PeriodCard
            title={`Neto ${MONTHS[month - 1].toLowerCase()} ${year}`}
            href={`/expenses?month=${month}&year=${year}`}
            neto={monthTotals.net}
            kpis={monthKpis}
          />
          <PendingFixed items={pendingFixed} month={month} />
        </div>

        <div className="order-3">
          <PeriodCard
            title={`Balance ${year}`}
            href={`/summary?year=${year}`}
            neto={yearTotals.net}
            kpis={balanceKpis}
            size="lg"
          />
        </div>
        </div>

        <section className="order-2" aria-labelledby="recent-movements">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-movements" className="text-lg font-bold md:text-xl">Últimos movimientos</h2>
            <Link href="/expenses" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Ver todo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="glass-panel px-3 py-2 md:px-4 md:py-3">
            <ExpenseList
              expenses={recentExpenses}
              categories={categories}
              sortable={false}
              showYear={false}
              hasInvestments={hasInvestments}
              debtCategoryId={debtCategoryId}
              transferCategoryId={transferCategoryId}
            />
          </div>
        </section>
      </div>

      <AddExpenseFab categories={categories} hasInvestments={hasInvestments} />
    </div>
  );
}
