import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { Amount } from "@/components/ui/amount";
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

/** Money in or out: a small tinted arrow and the figure, right-aligned so the two stack into a column. */
function Flow({ kpi, direction }: { kpi: Kpi; direction: "in" | "out" }) {
  const Icon = direction === "in" ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="flex items-center justify-end gap-1.5">
      <dt>
        <span className="sr-only">{kpi.label}</span>
        <span
          aria-hidden
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full",
            direction === "in" ? "bg-income/12 text-income" : "bg-expense/12 text-expense"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </dt>
      <dd className="text-sm font-semibold tabular-nums">
        <Amount value={kpi.value} />
      </dd>
    </div>
  );
}

/**
 * Net of a period with its income and expenses beside it — nothing to unfold,
 * and no taller than the collapsed card it replaces. Extra figures (monthly
 * average, fixed costs, debts) sit on a quiet footer line. With `href`, the
 * whole card is one link.
 */
export function PeriodCard({ title, href, neto, kpis, size = "md" }: Props) {
  const [income, expenses, ...extras] = kpis;

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

      {/* Net on the left, the two flows on the right; if a huge figure leaves no room they wrap below. */}
      <div className="mt-1 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <p
          className={cn(
            "text-3xl font-extrabold tracking-tight tabular-nums",
            size === "lg" ? "md:text-5xl" : "md:text-4xl",
            neto >= 0 ? "text-income" : "text-expense"
          )}
        >
          <Amount value={neto} animate />
        </p>
        <dl className="ml-auto space-y-1">
          <Flow kpi={income} direction="in" />
          <Flow kpi={expenses} direction="out" />
        </dl>
      </div>

      {extras.length > 0 && (
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
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
      )}
    </section>
  );
}
