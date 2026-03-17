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

type Props = {
  data: {
    name: string;
    gastos: number;
    ingresos: number;
    neto: number;
  }[];
};

const currencyFormatter = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);

export function MonthlyChart({ data }: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (isMobile) {
    // Horizontal bar chart for mobile
    const height = Math.max(data.length * 52, 300);
    return (
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barGap={1} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.25)" horizontal={false} />
            <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
            <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} width={35} />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                borderColor: "rgba(148, 163, 184, 0.45)",
                backgroundColor: "rgba(255,255,255,0.94)",
              }}
              formatter={(value) => currencyFormatter(Number(value))}
            />
            <Legend />
            <Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[0, 4, 4, 0]} />
            <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[0, 4, 4, 0]} />
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
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              borderColor: "rgba(148, 163, 184, 0.45)",
              backgroundColor: "rgba(255,255,255,0.94)",
            }}
            formatter={(value) => currencyFormatter(Number(value))}
          />
          <Legend />
          <Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
