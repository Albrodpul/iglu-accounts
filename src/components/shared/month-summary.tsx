import { formatCurrency, MONTHS } from "@/lib/format";

type KpiItem = {
  label: string;
  value: number;
  labelColor: string;
  valueColor: string;
  href?: string;
};

type Props = {
  month: number;
  year: number;
  neto: number;
  kpis: KpiItem[];
};

export function MonthSummary({ month, year, neto, kpis }: Props) {
  return (
    <section className="hero-surface p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
        Neto {MONTHS[month - 1]} {year}
      </p>
      <p
        className={`mt-2 text-3xl font-bold tracking-tight tabular-nums md:text-4xl ${
          neto >= 0 ? "text-emerald-300" : "text-rose-300"
        }`}
      >
        {formatCurrency(neto)}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {kpis.map((kpi) => {
          const content = (
            <>
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${kpi.labelColor}`}
              >
                {kpi.label}
              </p>
              <p className={`mt-1 text-xl font-semibold tabular-nums ${kpi.valueColor}`}>
                {formatCurrency(kpi.value)}
              </p>
            </>
          );

          if (kpi.href) {
            return (
              <a
                key={kpi.label}
                href={kpi.href}
                className="kpi-chip transition-colors hover:bg-white/25"
              >
                {content}
              </a>
            );
          }

          return (
            <div key={kpi.label} className="kpi-chip">
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
