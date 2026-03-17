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
    <div className="h-[250px] w-full sm:h-[350px]">
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
            formatter={(value) =>
              new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency: "EUR",
              }).format(Number(value))
            }
          />
          <Legend />
          <Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
