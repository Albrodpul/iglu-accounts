import Link from "next/link";
import { getExpenses, getExpensesByYear, getAllTimeBalance } from "@/actions/expenses";
import { getCategories, getDebtCategoryId, getTransferCategoryId } from "@/actions/categories";
import { getRecurringExpenses } from "@/actions/recurring";
import { hasInvestmentsEnabled } from "@/actions/accounts";
import { getInvestmentSummary } from "@/actions/investments";
import {
  buildBalanceYearKpis,
  buildMonthSummaryKpis,
  calculateFinancialTotals,
} from "@/lib/expense-metrics";
import { MONTHS } from "@/lib/format";
import { Amount } from "@/components/ui/amount";
import { ExpenseList } from "@/components/expenses/expense-list";
import { AddExpenseFab } from "@/components/expenses/add-expense-fab";
import { BalanceYear } from "@/components/shared/balance-year";
import { MonthSummary } from "@/components/shared/month-summary";
import { CollapsibleSection } from "@/components/shared/collapsible-section";
import { ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [debtCategoryId, transferCategoryId] = await Promise.all([
    getDebtCategoryId(),
    getTransferCategoryId(),
  ]);

  const [monthExpenses, yearExpenses, categories, recurring, allTime, hasInvestments, investmentSummary] =
    await Promise.all([
      getExpenses({ month, year }),
      getExpensesByYear(year),
      getCategories(),
      getRecurringExpenses(),
      getAllTimeBalance(debtCategoryId),
      hasInvestmentsEnabled(),
      getInvestmentSummary(),
    ]);

  const monthTotals = calculateFinancialTotals(monthExpenses, debtCategoryId, transferCategoryId);

  const yearTotals = calculateFinancialTotals(yearExpenses, debtCategoryId, transferCategoryId);

  // Monthly average spending
  const avgMonthlySpend = yearTotals.totalExpenses / month;

  // Fixed monthly totals
  const fixedExpenses = recurring.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);

  // Recent expenses (last 5)
  const recentExpenses = [...monthExpenses]
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
    .slice(0, 5);

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

  // Build asset breakdown items
  type AssetItem = { label: string; value: number; highlight?: boolean };
  const assetBreakdown: AssetItem[] = [];

  if (hasInvestments && investmentSummary) {
    assetBreakdown.push({ label: "Banco", value: bankBalance });

    if (cashBalance !== 0) {
      assetBreakdown.push({ label: "Efectivo", value: cashBalance });
    }

    for (const type of investmentSummary.types) {
      assetBreakdown.push({ label: type.name, value: type.totalValue });
    }

    assetBreakdown.push({ label: "Neto inversiones", value: totalReturn, highlight: true });
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {hasInvestments ? (
        <>
          {/* Total acumulado — full width when investments active */}
          <section className="hero-surface p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
              Total acumulado
            </p>
            <p
              className={`mt-2 text-4xl font-bold tracking-tight tabular-nums md:text-5xl ${
                grandTotal >= 0 ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              <Amount value={grandTotal} />
            </p>

            {/* Asset breakdown — collapsible */}
            {assetBreakdown.length > 0 && (
              <CollapsibleSection label="Desglose de activos">
                <div className="space-y-1.5">
                  {assetBreakdown.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${
                        item.highlight ? "bg-white/10" : ""
                      }`}
                    >
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                        {item.label}
                      </span>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          item.highlight
                            ? item.value >= 0
                              ? "text-emerald-300"
                              : "text-rose-300"
                            : "text-white/90"
                        }`}
                      >
                        <Amount value={item.value} />
                      </span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Year chips — collapsible */}
            {allTime.years.length > 0 && (
              <CollapsibleSection label="Balance por año">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
                  {allTime.years.map((y) => (
                    <Link
                      key={y.year}
                      href={`/summary?year=${y.year}`}
                      className="kpi-chip transition-colors hover:bg-white/25 overflow-hidden"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                        {y.year}
                      </p>
                      <p
                        className={`mt-0.5 text-sm font-semibold tabular-nums truncate ${
                          y.neto >= 0 ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        <Amount value={y.neto} />
                      </p>
                    </Link>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </section>

          {/* Balance año + mes — second row */}
          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            <BalanceYear year={year} neto={yearTotals.net} kpis={balanceKpis} collapsible />
            <MonthSummary month={month} year={year} neto={monthTotals.net} kpis={monthKpis} collapsible />
          </div>
        </>
      ) : (
        <>
          {/* Sin inversiones — layout original */}
          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            <section className="hero-surface p-6 md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
                Total acumulado
              </p>
              <p
                className={`mt-2 text-4xl font-bold tracking-tight tabular-nums md:text-5xl ${
                  allTime.total >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                <Amount value={allTime.total} />
              </p>

              {allTime.years.length > 0 && (
                <CollapsibleSection label="Balance por año">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {allTime.years.map((y) => (
                      <Link
                        key={y.year}
                        href={`/summary?year=${y.year}`}
                        className="kpi-chip transition-colors hover:bg-white/25 overflow-hidden"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                          {y.year}
                        </p>
                        <p
                          className={`mt-0.5 text-sm font-semibold tabular-nums truncate ${
                            y.neto >= 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          <Amount value={y.neto} />
                        </p>
                      </Link>
                    ))}
                  </div>
                </CollapsibleSection>
              )}
            </section>

            <BalanceYear year={year} neto={yearTotals.net} kpis={balanceKpis} collapsible />
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr_1.5fr] md:gap-8">
            <div>
              <h2 className="mb-4 text-xl font-bold md:text-2xl">
                {MONTHS[month - 1]} {year}
              </h2>
              <MonthSummary month={month} year={year} neto={monthTotals.net} kpis={monthKpis} collapsible />
            </div>

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
                <ExpenseList expenses={recentExpenses} categories={categories} sortable={false} hasInvestments={false} debtCategoryId={debtCategoryId} transferCategoryId={transferCategoryId} />
              </div>
            </section>
          </div>
        </>
      )}

      <AddExpenseFab categories={categories} hasInvestments={hasInvestments} />
    </div>
  );
}
