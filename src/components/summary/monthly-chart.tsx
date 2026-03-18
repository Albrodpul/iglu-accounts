"use client";

import { useState, useEffect } from "react";
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

const currencyFormatter = (value: number) => {
  const hasDecimals = value % 1 !== 0;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
};

export function MonthlyChart({ data, showDebts = false }: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const tooltipStyle = {
    borderRadius: "12px",
    borderColor: "rgba(148, 163, 184, 0.45)",
    backgroundColor: "rgba(255,255,255,0.94)",
  };

  if (isMobile) {
    const height = Math.max(data.length * (showDebts ? 64 : 52), 300);
    return (
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barGap={1} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.25)" horizontal={false} />
            <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
            <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} width={35} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => currencyFormatter(Number(value))} />
            <Legend />
            <Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[0, 4, 4, 0]} />
            <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[0, 4, 4, 0]} />
            {showDebts && <Bar dataKey="deudas" name="Deudas" fill="#f59e0b" radius={[0, 4, 4, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={1} barCategoryGap="15%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.25)" vertical={false} />
          <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval={0} />
          <YAxis fontSize={11} tickLine={false} axisLine={false} width={45} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => currencyFormatter(Number(value))} />
          <Legend />
          <Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
          {showDebts && <Bar dataKey="deudas" name="Deudas" fill="#f59e0b" radius={[4, 4, 0, 0]} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
