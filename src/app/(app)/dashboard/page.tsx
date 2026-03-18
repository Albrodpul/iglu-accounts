import Link from "next/link";
import { getExpenses, getExpensesByYear, getAllTimeBalance } from "@/actions/expenses";
import { getCategories, getDebtCategoryId } from "@/actions/categories";
import { getRecurringExpenses } from "@/actions/recurring";
import { hasInvestmentsEnabled } from "@/actions/accounts";
import { getInvestmentSummary } from "@/actions/investments";
import { formatCurrency, MONTHS } from "@/lib/format";
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

  const debtCategoryId = await getDebtCategoryId();

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

  // Month stats
  const monthGastos = monthExpenses
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + e.amount, 0);
  const monthIngresos = monthExpenses
    .filter((e) => e.amount > 0 && e.category_id !== debtCategoryId)
    .reduce((s, e) => s + e.amount, 0);
  const monthDeudas = debtCategoryId
    ? monthExpenses.filter((e) => e.category_id === debtCategoryId).reduce((s, e) => s + e.amount, 0)
    : 0;
  const monthNeto = monthGastos + monthIngresos;

  // Year stats
  const yearGastos = yearExpenses
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + e.amount, 0);
  const yearIngresos = yearExpenses
    .filter((e) => e.amount > 0 && e.category_id !== debtCategoryId)
    .reduce((s, e) => s + e.amount, 0);
  const yearDeudas = debtCategoryId
    ? yearExpenses.filter((e) => e.category_id === debtCategoryId).reduce((s, e) => s + e.amount, 0)
    : 0;
  const yearNeto = yearGastos + yearIngresos;

  // Monthly average spending
  const avgMonthlySpend = yearGastos / month;

  // Fixed monthly totals
  const fixedExpenses = recurring.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);

  // Recent expenses (last 5)
  const recentExpenses = [...monthExpenses]
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
    .slice(0, 5);

  // Build KPIs for Balance year card
  const balanceKpis: { label: string; value: number; color: string }[] = [
    { label: "Ingresos", value: yearIngresos, color: "emerald" },
    { label: "Gastos", value: yearGastos, color: "rose" },
    { label: "Media/mes", value: avgMonthlySpend, color: "amber" },
  ];

  if (yearDeudas > 0) {
    balanceKpis.push({
      label: "Deudas",
      value: yearDeudas,
      color: "sky",
    });
  } else {
    balanceKpis.push({
      label: "Fijos/mes",
      value: fixedExpenses,
      color: "emerald",
    });
  }

  // Build KPIs for month summary
  const monthKpis = [
    {
      label: "Ingresos",
      value: monthIngresos,
      labelColor: "text-white/75",
      valueColor: "text-emerald-300",
    },
    {
      label: "Gastos",
      value: monthGastos,
      labelColor: "text-white/75",
      valueColor: "text-rose-300",
    },
  ];

  if (monthDeudas > 0 && debtCategoryId) {
    monthKpis.push({
      label: "Deudas",
      value: monthDeudas,
      labelColor: "text-white/75",
      valueColor: "text-sky-300",
      href: `/expenses?month=${month}&year=${year}&category=${debtCategoryId}`,
    } as typeof monthKpis[number]);
  }

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
              {formatCurrency(grandTotal)}
            </p>

            {/* Asset breakdown */}
            {assetBreakdown.length > 0 && (
              <div className="mt-5 space-y-1.5">
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
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
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
                        {formatCurrency(y.neto)}
                      </p>
                    </Link>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </section>

          {/* Balance año + mes — second row */}
          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            <BalanceYear year={year} neto={yearNeto} kpis={balanceKpis} />
            <MonthSummary month={month} year={year} neto={monthNeto} kpis={monthKpis} />
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
                {formatCurrency(allTime.total)}
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
                          {formatCurrency(y.neto)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </CollapsibleSection>
              )}
            </section>

            <BalanceYear year={year} neto={yearNeto} kpis={balanceKpis} />
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr_1.5fr] md:gap-8">
            <div>
              <h2 className="mb-4 text-xl font-bold md:text-2xl">
                {MONTHS[month - 1]} {year}
              </h2>
              <MonthSummary month={month} year={year} neto={monthNeto} kpis={monthKpis} />
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
                <ExpenseList expenses={recentExpenses} categories={categories} sortable={false} hasInvestments={false} />
              </div>
            </section>
          </div>
        </>
      )}

      <AddExpenseFab categories={categories} hasInvestments={hasInvestments} />
    </div>
  );
}
