import { redirect } from "next/navigation";
import { hasInvestmentsEnabled } from "@/actions/accounts";
import { getInvestmentTypes, getInvestmentFunds } from "@/actions/investments";
import { InvestmentTypeManager } from "@/components/investments/investment-type-manager";
import { FundList } from "@/components/investments/fund-list";
import { InvestmentPieChart } from "@/components/investments/investment-pie-chart";
import { NavRefreshButton } from "@/components/investments/nav-refresh-button";
import { LineChart, PiggyBank } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { HeroStat } from "@/components/dashboard/hero-stat";
import { formatPercent } from "@/lib/format";
import { lastPriceUpdate } from "@/lib/investments";
import { PricesUpdated } from "@/components/investments/prices-updated";

export default async function InvestmentsPage() {
  const enabled = await hasInvestmentsEnabled();
  if (!enabled) redirect("/dashboard");

  const [types, funds] = await Promise.all([
    getInvestmentTypes(),
    getInvestmentFunds(),
  ]);

  const pricesUpdatedAt = lastPriceUpdate(funds);
  const totalInvested = funds.reduce((s, f) => s + f.invested_amount, 0);
  const totalValue = funds.reduce((s, f) => s + f.current_value, 0);
  const totalReturn = totalValue - totalInvested;
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  // No gain and no loss is neither good nor bad news: keep it neutral.
  const tone = Math.round(totalReturn * 100) === 0 ? "flat" : totalReturn > 0 ? "up" : "down";
  const toneText = { up: "text-emerald-300", down: "text-rose-200", flat: "text-white/85" }[tone];
  const toneChip = { up: "bg-emerald-400/15", down: "bg-rose-400/15", flat: "bg-white/10" }[tone];

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold md:text-3xl">Inversiones</h1>
          {pricesUpdatedAt && <PricesUpdated at={pricesUpdatedAt} />}
        </div>
        <div className="flex items-center gap-2">
          {funds.some((f) => f.isin) && <NavRefreshButton />}
          <InvestmentTypeManager types={types} funds={funds} />
        </div>
      </div>

      {/* Hero — Rentabilidad */}
      <section className="hero-surface p-6 md:p-8">
        <div className="xl:flex xl:items-center xl:gap-8">
          {/* Stats */}
          <div className="xl:flex-1">
            <p className="text-sm font-semibold text-white/85">Rentabilidad</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p
                className={`text-5xl font-extrabold tracking-tight tabular-nums md:text-6xl ${toneText}`}
              >
                <Amount value={totalReturn} prefix={tone === "up" ? "+" : ""} animate />
              </p>
              <p
                className={`rounded-full px-2.5 py-0.5 text-base font-bold tabular-nums md:text-lg ${toneChip} ${toneText}`}
              >
                {formatPercent(returnPct, { decimals: 2, signed: true })}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
              <HeroStat icon={PiggyBank} label="Invertido" value={totalInvested} />
              <HeroStat icon={LineChart} label="Valor actual" value={totalValue} />
            </div>
          </div>

          {/* Pie chart — right on desktop, below on mobile */}
          {funds.length > 0 && (
            <div className="xl:w-[540px] xl:min-w-0 xl:border-l xl:border-white/20 xl:pl-8">
              <InvestmentPieChart funds={funds} />
            </div>
          )}
        </div>
      </section>

      {/* Fund list */}
      <section className="glass-panel p-5 md:p-6">
        <FundList types={types} funds={funds} />
      </section>
    </div>
  );
}
