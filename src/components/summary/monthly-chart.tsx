"use client";

import { useMediaQuery } from "@/hooks/use-browser-state";
import { useThemeColors } from "@/hooks/use-theme-colors";
import {
  BarChart,
  Bar,
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
};

type Props = {
  data: MonthData[];
  showDebts?: boolean;
};

const axisNumber = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const axisFormatter = (value: number) => axisNumber.format(value);

const currencyFormatter = (value: number) => {
  const hasDecimals = value % 1 !== 0;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
    useGrouping: "always",
  }).format(value);
};

export function MonthlyChart({ data, showDebts = false }: Props) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const c = useThemeColors();

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
    formatter: (value: unknown) => currencyFormatter(Number(value)),
  };
  const tick = { fill: c["muted-foreground"], fontSize: 11 };
  const legendProps = { iconType: "circle" as const, wrapperStyle: { fontSize: 12, paddingTop: 8 } };

  if (isMobile) {
    const height = Math.max(data.length * (showDebts ? 64 : 52), 300);
    return (
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barGap={1} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={c.border} horizontal={false} />
            <XAxis type="number" tick={{ ...tick, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={axisFormatter} />
            <YAxis dataKey="name" type="category" tick={tick} tickLine={false} axisLine={false} width={35} />
            <Tooltip {...tooltipProps} />
            <Legend {...legendProps} />
            <Bar dataKey="gastos" name="Gastos" fill={c.expense} radius={[0, 6, 6, 0]} />
            <Bar dataKey="ingresos" name="Ingresos" fill={c.income} radius={[0, 6, 6, 0]} />
            {showDebts && <Bar dataKey="deudas" name="Deudas" fill={c.debt} radius={[0, 6, 6, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={1} barCategoryGap="15%">
          <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
          <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={false} interval={0} />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={45} tickFormatter={axisFormatter} />
          <Tooltip {...tooltipProps} />
          <Legend {...legendProps} />
          <Bar dataKey="gastos" name="Gastos" fill={c.expense} radius={[6, 6, 0, 0]} />
          <Bar dataKey="ingresos" name="Ingresos" fill={c.income} radius={[6, 6, 0, 0]} />
          {showDebts && <Bar dataKey="deudas" name="Deudas" fill={c.debt} radius={[6, 6, 0, 0]} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
