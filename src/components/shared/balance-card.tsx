import { Amount } from "@/components/ui/amount";
import { CollapsibleSection } from "@/components/shared/collapsible-section";
import type { Kpi, KpiColor } from "@/lib/expense-metrics";
import { cn } from "@/lib/utils";

/**
 * `hero`: the dark brand gradient, for the one figure a page is about.
 * `card`: a light surface, for secondary figures next to a hero.
 */
export type SurfaceVariant = "hero" | "card";

const kpiValueColor: Record<SurfaceVariant, Record<KpiColor, string>> = {
  hero: {
    emerald: "text-emerald-300",
    rose: "text-rose-300",
    amber: "text-amber-300",
    sky: "text-sky-300",
  },
  card: {
    emerald: "text-income",
    rose: "text-expense",
    amber: "text-amber-600 dark:text-amber-400",
    sky: "text-sky-600 dark:text-sky-400",
  },
};

function KpiGrid({ kpis, variant, columns }: { kpis: Kpi[]; variant: SurfaceVariant; columns: 2 | 3 }) {
  const chip =
    variant === "hero"
      ? "kpi-chip overflow-hidden"
      : "overflow-hidden rounded-xl border border-border/60 bg-muted/40 p-3";
  const chipHover = variant === "hero" ? "transition-colors hover:bg-white/25" : "transition-colors hover:bg-muted/70";
  const label = variant === "hero" ? "text-white/70" : "text-muted-foreground";

  return (
    <div className={cn("grid gap-3", columns === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2")}>
      {kpis.map((kpi) => {
        const content = (
          <>
            <p className={cn("text-xs font-medium", label)}>{kpi.label}</p>
            <p className={cn("mt-0.5 text-base font-bold tabular-nums md:text-lg", kpiValueColor[variant][kpi.color])}>
              <Amount value={kpi.value} />
            </p>
          </>
        );
        return kpi.href ? (
          <a key={kpi.label} href={kpi.href} className={cn(chip, chipHover)}>
            {content}
          </a>
        ) : (
          <div key={kpi.label} className={chip}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

type Props = {
  title: string;
  neto: number;
  kpis: Kpi[];
  variant?: SurfaceVariant;
  columns?: 2 | 3;
  /** When set, KPIs hide behind a toggle with this label. */
  collapsibleLabel?: string;
  size?: "lg" | "md";
};

/** Net balance of a period (year, month…) with its breakdown. */
export function BalanceCard({
  title,
  neto,
  kpis,
  variant = "hero",
  columns = 2,
  collapsibleLabel,
  size = "lg",
}: Props) {
  const hero = variant === "hero";
  const positive = neto >= 0;
  const netColor = hero
    ? positive ? "text-emerald-300" : "text-rose-300"
    : positive ? "text-income" : "text-expense";

  const grid = <KpiGrid kpis={kpis} variant={variant} columns={columns} />;

  return (
    <section className={cn(hero ? "hero-surface p-6 md:p-8" : "surface-card p-5 md:p-6")}>
      <p className={cn("text-sm font-semibold", hero ? "text-white/75" : "text-muted-foreground")}>{title}</p>
      <p
        className={cn(
          "mt-1 font-extrabold tracking-tight tabular-nums",
          size === "lg" ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl",
          netColor
        )}
      >
        <Amount value={neto} animate />
      </p>
      {collapsibleLabel ? (
        <CollapsibleSection label={collapsibleLabel} variant={hero ? "hero" : "card"}>
          {grid}
        </CollapsibleSection>
      ) : (
        <div className="mt-5">{grid}</div>
      )}
    </section>
  );
}
