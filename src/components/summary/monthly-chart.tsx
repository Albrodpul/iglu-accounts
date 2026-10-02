"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { Amount } from "@/components/ui/amount";
import { useMediaQuery } from "@/hooks/use-browser-state";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type MonthData = {
  name: string;
  gastos: number;
  ingresos: number;
  deudas?: number;
  neto: number;
  /** A month that has not started: its figures are only what was entered ahead of time. */
  future?: boolean;
};

type Props = {
  data: MonthData[];
  year: number;
  showDebts?: boolean;
};

const axisNumber = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const axisFormatter = (value: number) => axisNumber.format(value);

/** Months still to come are drawn faded: they are not bad months, just unfinished ones. */
const FUTURE_OPACITY = 0.35;

function LegendDot({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", className)} />
      {children}
    </span>
  );
}

/**
 * Phones: one compact row per month — bars for scale, the net figure in plain
 * sight (no tapping a bar to read it), and the whole year on one screen. Each
 * row opens that month in the Diario.
 */
function MonthRows({ data, year, showDebts }: Props) {
  const max = Math.max(1, ...data.flatMap((m) => [m.gastos, m.ingresos, showDebts ? Math.abs(m.deudas ?? 0) : 0]));
  const width = (value: number) => `${value > 0 ? Math.max(1.5, (value / max) * 100) : 0}%`;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex gap-3">
          <LegendDot className="bg-income">Ingresos</LegendDot>
          <LegendDot className="bg-expense">Gastos</LegendDot>
          {showDebts && <LegendDot className="bg-debt">Deudas</LegendDot>}
        </div>
        <span>Neto</span>
      </div>
      <ul className="-mx-2">
        {data.map((month, i) => (
          <li key={month.name}>
            <Link
              href={`/expenses?month=${i + 1}&year=${year}`}
              className={cn(
                "grid grid-cols-[2rem_minmax(0,1fr)_5.5rem] items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40",
                month.future && "opacity-50"
              )}
            >
              <span className="text-xs font-medium text-muted-foreground">{month.name}</span>
              <span className="space-y-0.5">
                <span className="block h-1.5 rounded-full bg-income" style={{ width: width(month.ingresos) }} />
                <span className="block h-1.5 rounded-full bg-expense" style={{ width: width(month.gastos) }} />
                {showDebts && (
                  <span className="block h-1.5 rounded-full bg-debt" style={{ width: width(Math.abs(month.deudas ?? 0)) }} />
                )}
              </span>
              <span
                className={cn(
                  "text-right text-sm font-semibold tabular-nums",
                  month.future || month.neto === 0
                    ? "text-muted-foreground"
                    : month.neto > 0
                      ? "text-income"
                      : "text-expense"
                )}
              >
                {month.ingresos === 0 && month.gastos === 0 ? "—" : <Amount value={month.neto} whole />}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MonthlyChart({ data, year, showDebts = false }: Props) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const c = useThemeColors();

  if (isMobile) return <MonthRows data={data} year={year} showDebts={showDebts} />;

  const tooltipProps = {
    contentStyle: {
      borderRadius: 12,
      border: `1px solid ${c.border}`,
      backgroundColor: c.popover,
      color: c.foreground,
      boxShadow: "0 12px 28px -18px rgba(15, 23, 42, 0.45)",
      padding: "8px 12px",
      fontSize: 13,
    },
    labelStyle: { fontWeight: 700, color: c.foreground, marginBottom: 2 },
    cursor: { fill: c.muted, opacity: 0.6 },
    formatter: (value: unknown) => formatCurrency(Number(value)),
  };
  const tick = { fill: c["muted-foreground"], fontSize: 11 };
  const legendProps = { iconType: "circle" as const, wrapperStyle: { fontSize: 12, paddingTop: 8 } };
  const cells = data.map((month) => <Cell key={month.name} fillOpacity={month.future ? FUTURE_OPACITY : 1} />);

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={1} barCategoryGap="15%">
          <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
          <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={false} interval={0} />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={45} tickFormatter={axisFormatter} />
          <Tooltip {...tooltipProps} />
          <Legend {...legendProps} />
          <Bar dataKey="gastos" name="Gastos" fill={c.expense} radius={[6, 6, 0, 0]}>{cells}</Bar>
          <Bar dataKey="ingresos" name="Ingresos" fill={c.income} radius={[6, 6, 0, 0]}>{cells}</Bar>
          {showDebts && <Bar dataKey="deudas" name="Deudas" fill={c.debt} radius={[6, 6, 0, 0]}>{cells}</Bar>}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
