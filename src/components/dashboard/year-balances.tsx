import Link from "next/link";
import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/utils";

type Props = {
  years: { year: number; neto: number }[];
  /** Current year: later ones only hold movements entered ahead of time. */
  currentYear: number;
  /** Chip columns from `md` up. */
  columns?: 3 | 6;
};

/** A year that has not started is neither a good nor a bad one yet: no red, no green. */
function tone(neto: number, future: boolean) {
  if (future) return "text-white/60";
  return neto >= 0 ? "text-emerald-300" : "text-rose-200";
}

/**
 * Net balance of every year, each linking to its summary. Sits on the hero
 * (dark) surface. Phones get a compact two-column list — a chip per year took
 * seven rows — and wider screens the chips.
 */
export function YearBalances({ years, currentYear, columns = 6 }: Props) {
  return (
    <>
      <ul className="columns-2 gap-x-6 md:hidden">
        {years.map((y) => (
          <li key={y.year} className="break-inside-avoid">
            <Link
              href={`/summary?year=${y.year}`}
              className="flex items-baseline justify-between gap-2 border-b border-white/10 py-1.5 text-sm"
            >
              <span className="font-medium text-white/80">{y.year}</span>
              <span className={cn("font-semibold tabular-nums", tone(y.neto, y.year > currentYear))}>
                <Amount value={y.neto} whole />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={cn("hidden gap-2 md:grid", columns === 6 ? "md:grid-cols-4 xl:grid-cols-6" : "md:grid-cols-3")}>
        {years.map((y) => {
          const future = y.year > currentYear;
          return (
            <Link
              key={y.year}
              href={`/summary?year=${y.year}`}
              title={future ? "Año sin empezar: solo movimientos apuntados por adelantado" : undefined}
              className={cn("kpi-chip overflow-hidden transition-colors hover:bg-white/25", future && "opacity-70")}
            >
              <p className="text-xs font-medium text-white/80">{y.year}</p>
              <p className={cn("mt-0.5 truncate text-sm font-semibold tabular-nums", tone(y.neto, future))}>
                <Amount value={y.neto} />
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
