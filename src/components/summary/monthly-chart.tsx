"use client";

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

export function MonthlyChart({ data }: Props) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.25)" vertical={false} />
          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              borderColor: "rgba(148, 163, 184, 0.45)",
              backgroundColor: "rgba(255,255,255,0.94)",
            }}
            formatter={(value) =>
              new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency: "EUR",
              }).format(Number(value))
            }
          />
          <Legend />
          <Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[8, 8, 0, 0]} />
          <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
