"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { pieColor } from "@/lib/chart-colors";
import { formatPercent } from "@/lib/format";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: "always" }).format(v);

type Entry = { label: string; value: number };

export function AssetPieChart({ items }: { items: Entry[] }) {
  const data = items.filter((i) => i.value > 0);
  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);

  const tooltipProps = {
    formatter: (value: unknown, _name: unknown, entry: unknown) => {
      const v = Number(value);
      return [`${fmt(v)} (${formatPercent((v / total) * 100)})`, (entry as { payload: Entry }).payload.label];
    },
    contentStyle: {
      borderRadius: "10px",
      borderColor: "rgba(148,163,184,0.3)",
      backgroundColor: "rgba(15,23,42,0.92)",
      color: "#f1f5f9",
      fontSize: 12,
    },
    itemStyle: { color: "#f1f5f9" },
    labelStyle: { display: "none" },
  };

  const renderCells = () =>
    data.map((_, i) => <Cell key={i} fill={pieColor(i)} />);

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden">
        <PieChart width={120} height={120}>
          <Pie data={data} dataKey="value" nameKey="label" cx={60} cy={60} outerRadius={54} innerRadius={22} labelLine={false}>
            {renderCells()}
          </Pie>
          <Tooltip {...tooltipProps} />
        </PieChart>
      </div>
      {/* Desktop */}
      <div className="hidden md:block">
        <PieChart width={200} height={200}>
          <Pie data={data} dataKey="value" nameKey="label" cx={100} cy={100} outerRadius={90} innerRadius={36} labelLine={false}>
            {renderCells()}
          </Pie>
          <Tooltip {...tooltipProps} />
        </PieChart>
      </div>
    </>
  );
}
