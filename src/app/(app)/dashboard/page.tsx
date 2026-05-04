import Link from "next/link";
import { getExpenses, getExpensesByYear, getExpensesPaginated, getAllTimeBalance, getMonthProjection } from "@/actions/expenses";
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
import { MonthProjection } from "@/components/shared/month-projection";
import { ArrowRight } from "lucide-react";
import { AssetPieChart } from "@/components/investments/asset-pie-chart";

export default async function DashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [debtCategoryId, transferCategoryId] = await Promise.all([
    getDebtCategoryId(),
    getTransferCategoryId(),
  ]);

  const [monthExpenses, yearExpenses, categories, recurring, allTime, hasInvestments, investmentSummary, projection, recentPage] =
    await Promise.all([
      getExpenses({ month, year }),
      getExpensesByYear(year),
      getCategories(),
      getRecurringExpenses(),
      getAllTimeBalance(debtCategoryId),
      hasInvestmentsEnabled(),
      getInvestmentSummary(),
      getMonthProjection({ month, year, debtCategoryId, transferCategoryId }),
      getExpensesPaginated({ page: 0, limit: 5, ascending: false }),
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
                {(() => {
                  const PIE_COLORS = [
                    "#f43f5e","#38bdf8","#facc15","#a78bfa",
                    "#34d399","#f97316","#818cf8","#e879f9",
                    "#4ade80","#fb7185","#2dd4bf","#fbbf24",
                    "#67e8f9","#c084fc","#fdba74","#60a5fa",
                    "#f472b6","#d946ef","#a3e635","#fde68a",
                  ];
                  const total = assetBreakdown.filter((i) => !i.highlight && i.value > 0).reduce((s, i) => s + i.value, 0);
                  let pieIndex = 0;
                  return (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                      <div className="shrink-0 flex justify-center">
                        <AssetPieChart items={assetBreakdown.filter((i) => !i.highlight)} />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {assetBreakdown.map((item) => {
                          const isAsset = !item.highlight;
                          const color = isAsset ? PIE_COLORS[pieIndex % PIE_COLORS.length] : null;
                          const pct = isAsset && total > 0 ? ((item.value / total) * 100).toFixed(0) : null;
                          if (isAsset) pieIndex++;
                          return (
                            <div
                              key={item.label}
                              className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${item.highlight ? "bg-white/10" : ""}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
                                <span className="text-xs font-semibold uppercase tracking-wider text-white/70 truncate">
                                  {item.label}
                                </span>
                                {pct && <span className="text-[11px] text-white/40 shrink-0">{pct}%</span>}
                              </div>
                              <span className={`text-sm font-semibold tabular-nums shrink-0 pl-2 ${item.highlight ? item.value >= 0 ? "text-emerald-300" : "text-rose-300" : "text-white/90"}`}>
                                <Amount value={item.value} />
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
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
            <div>
              <MonthSummary month={month} year={year} neto={monthTotals.net} kpis={monthKpis} collapsible />
              <MonthProjection
                projected={projection.projected}
                currentNet={projection.currentNet}
                historicalMonths={projection.historicalMonths}
                monthProgress={projection.monthProgress}
                pendingRecurringNet={projection.pendingRecurringNet}
              />
            </div>
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
              <MonthProjection
                projected={projection.projected}
                currentNet={projection.currentNet}
                historicalMonths={projection.historicalMonths}
                monthProgress={projection.monthProgress}
                pendingRecurringNet={projection.pendingRecurringNet}
              />
            </div>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold md:text-2xl">Últimos movimientos</h2>
                <Link
                  href="/expenses"
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
