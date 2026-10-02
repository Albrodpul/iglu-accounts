import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/lib/expense-metrics";

type Props = {
  title: string;
  /**
   * Where the card leads (the month in the Diario, the year in the summary).
   * Leave it out when the card already sits on that page.
   */
  href?: string;
  neto: number;
  /** As the KPI builders return them: income, expenses, then any extra figures. */
  kpis: Kpi[];
  size?: "lg" | "md";
};

const extraTone: Record<Kpi["color"], string> = {
  emerald: "text-income",
  rose: "text-expense",
  amber: "text-debt",
  neutral: "text-foreground",
};

/**
 * Net of a period with its income and expenses in plain sight — nothing to
 * unfold. The bar shows how much of the income has been spent, so "is this
 * month tight?" reads at a glance. With `href`, the whole card is one link.
 */
export function PeriodCard({ title, href, neto, kpis, size = "md" }: Props) {
  const [income, expenses, ...extras] = kpis;
  const spent = Math.abs(expenses.value);
  // Share of the income already spent; with no income, any spending fills the bar.
  const share = income.value > 0 ? (spent / income.value) * 100 : spent > 0 ? 100 : 0;
  const hasMovement = income.value !== 0 || spent !== 0;

  return (
    <section className={cn("surface-card relative p-5 md:p-6", href && "transition-colors hover:border-primary/40")}>
      <h2 className="text-sm font-semibold text-muted-foreground">
        {href ? (
          // Stretched link: its ::after covers the card, so the whole surface is the target.
          <Link href={href} className="flex items-center justify-between gap-2 after:absolute after:inset-0 after:rounded-2xl">
            {title}
            <ChevronRight aria-hidden className="h-4 w-4 shrink-0" />
          </Link>
        ) : (
          title
        )}
      </h2>
      <p
        className={cn(
          "mt-1 font-extrabold tracking-tight tabular-nums",
          size === "lg" ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl",
          neto >= 0 ? "text-income" : "text-expense"
        )}
      >
        <Amount value={neto} animate />
      </p>

      {/* Kept as short as the "Desglose…" toggle it replaces: a bar and one line. */}
      <div
        role="img"
        aria-label={hasMovement ? `Gastado el ${formatPercent(share, { decimals: 0 })} de los ingresos` : "Sin movimientos"}
        className={cn("mt-3 h-1.5 overflow-hidden rounded-full", hasMovement ? "bg-income/30" : "bg-muted")}
      >
        <div className="h-full rounded-full bg-expense" style={{ width: `${Math.min(100, share)}%` }} />
      </div>

      <dl className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground">
        <div className="flex items-baseline gap-1.5">
          <dt>{income.label}</dt>
          <dd className="text-sm font-semibold tabular-nums text-income">
            <Amount value={income.value} />
          </dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt>{expenses.label}</dt>
          <dd className="text-sm font-semibold tabular-nums text-expense">
            <Amount value={expenses.value} />
          </dd>
        </div>
        {extras.map((kpi) => (
          <div key={kpi.label} className="flex items-baseline gap-1.5">
            <dt>{kpi.label}</dt>
            <dd className={cn("font-semibold tabular-nums", extraTone[kpi.color])}>
              {kpi.href ? (
                // Above the stretched link, so it keeps its own destination.
                <Link href={kpi.href} className="relative z-10 underline decoration-dotted underline-offset-2">
                  <Amount value={kpi.value} />
                </Link>
              ) : (
                <Amount value={kpi.value} />
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
