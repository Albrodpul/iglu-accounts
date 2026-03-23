import { Amount } from "@/components/ui/amount";
import { CollapsibleSection } from "@/components/shared/collapsible-section";

const colorMap: Record<string, string> = {
  emerald: "text-emerald-300",
  rose: "text-rose-300",
  amber: "text-amber-300",
  sky: "text-sky-300",
};

type KpiItem = {
  label: string;
  value: number;
  color: string;
  href?: string;
};

type Props = {
  year: number;
  neto: number;
  kpis: KpiItem[];
  /** grid columns on desktop (2 or 3), defaults to 2 */
  columns?: 2 | 3;
  /** When true, KPIs are hidden behind a collapsible toggle */
  collapsible?: boolean;
};

export function BalanceYear({ year, neto, kpis, columns = 2, collapsible = false }: Props) {
  const colClass = columns === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2";

  const kpiGrid = (
    <div className={`grid gap-3 ${colClass}`}>
      {kpis.map((kpi) => {
        const content = (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
              {kpi.label}
            </p>
            <p
              className={`mt-1 text-base font-semibold tabular-nums md:text-xl ${colorMap[kpi.color] || "text-white"}`}
            >
              <Amount value={kpi.value} />
            </p>
          </>
        );

        if (kpi.href) {
          return (
            <a
              key={kpi.label}
              href={kpi.href}
              className="kpi-chip overflow-hidden transition-colors hover:bg-white/25"
            >
              {content}
            </a>
          );
        }

        return (
          <div key={kpi.label} className="kpi-chip overflow-hidden">
            {content}
          </div>
        );
      })}
    </div>
  );

  return (
    <section className="hero-surface p-6 md:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
        Balance {year}
      </p>
      <p
        className={`mt-2 text-4xl font-bold tracking-tight tabular-nums md:text-5xl ${
          neto >= 0 ? "text-emerald-300" : "text-rose-300"
        }`}
      >
        <Amount value={neto} />
      </p>
      {collapsible ? (
        <CollapsibleSection label="Desglose del año">{kpiGrid}</CollapsibleSection>
      ) : (
        <div className="mt-5">{kpiGrid}</div>
      )}
    </section>
  );
}
