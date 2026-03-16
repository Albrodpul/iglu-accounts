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
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip
            formatter={(value) =>
              new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency: "EUR",
              }).format(Number(value))
            }
          />
          <Legend />
          <Bar dataKey="gastos" name="Gastos" fill="#ef4444" />
          <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
