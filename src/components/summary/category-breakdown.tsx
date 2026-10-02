import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { formatPercent } from "@/lib/format";

type Props = {
  data: { id: string; name: string; color: string; icon: string; total: number }[];
  /** Year the figures belong to: the links open that same year in the Diario. */
  year: number;
};

/** Where the money went, biggest first. Each row opens the movements of that category. */
export function CategoryBreakdown({ data, year }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-4">
        No hay datos para este periodo
      </p>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total));
  const sum = data.reduce((s, d) => s + d.total, 0);

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-border/60 pb-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Total gastado</h2>
        <Amount value={sum} className="text-lg font-extrabold tabular-nums" />
      </div>
      <ul className="-mx-2">
        {data.map((item) => (
          <li key={item.id}>
            <Link
              href={`/expenses?year=${year}&category=${item.id}`}
              title={`Ver los movimientos de ${item.name} en ${year}`}
              className="group block space-y-1.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-baseline gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium text-foreground/90">
                  {item.icon} {item.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {(item.total / sum) * 100 < 1
                    ? `<${formatPercent(1, { decimals: 0 })}`
                    : formatPercent((item.total / sum) * 100, { decimals: 0 })}
                </span>
                <Amount value={item.total} className="w-24 shrink-0 text-right font-semibold tabular-nums" />
                <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 self-center text-muted-foreground/60 group-hover:text-foreground" />
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/70">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(1, (item.total / maxTotal) * 100)}%`, backgroundColor: item.color }}
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
