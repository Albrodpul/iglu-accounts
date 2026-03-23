import { redirect } from "next/navigation";
import { hasInvestmentsEnabled } from "@/actions/accounts";
import { getInvestmentTypes, getInvestmentFunds } from "@/actions/investments";
import { InvestmentTypeManager } from "@/components/investments/investment-type-manager";
import { FundList } from "@/components/investments/fund-list";
import { Amount } from "@/components/ui/amount";

export default async function InvestmentsPage() {
  const enabled = await hasInvestmentsEnabled();
  if (!enabled) redirect("/dashboard");

  const [types, funds] = await Promise.all([
    getInvestmentTypes(),
    getInvestmentFunds(),
  ]);

  const totalInvested = funds.reduce((s, f) => s + f.invested_amount, 0);
  const totalValue = funds.reduce((s, f) => s + f.current_value, 0);
  const totalReturn = totalValue - totalInvested;
  const returnPct = totalInvested > 0
    ? ((totalReturn / totalInvested) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold md:text-3xl">Inversiones</h1>
        <InvestmentTypeManager types={types} funds={funds} />
      </div>

      {/* Hero — Rentabilidad */}
      <section className="hero-surface p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
          Rentabilidad
        </p>
        <div className="mt-2 flex items-baseline gap-3">
          <p
            className={`text-4xl font-bold tracking-tight tabular-nums md:text-5xl ${
              totalReturn >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            <Amount value={totalReturn} prefix={totalReturn >= 0 ? "+" : ""} />
          </p>
          <p
            className={`text-lg font-semibold tabular-nums md:text-xl ${
              totalReturn >= 0 ? "text-emerald-300/70" : "text-rose-300/70"
            }`}
          >
            {totalReturn >= 0 ? "+" : ""}{returnPct}%
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="kpi-chip">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
              Total invertido
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-white md:text-xl">
              <Amount value={totalInvested} />
            </p>
          </div>
          <div className="kpi-chip">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
              Valor actual
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-white md:text-xl">
              <Amount value={totalValue} />
            </p>
          </div>
        </div>
      </section>

      {/* Fund list */}
      <section className="glass-panel p-5 md:p-6">
        <FundList types={types} funds={funds} />
      </section>
    </div>
  );
}
