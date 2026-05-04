"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = [
  "#f43f5e", "#38bdf8", "#facc15", "#a78bfa",
  "#34d399", "#f97316", "#818cf8", "#e879f9",
  "#4ade80", "#fb7185", "#2dd4bf", "#fbbf24",
  "#67e8f9", "#c084fc", "#fdba74", "#60a5fa",
  "#f472b6", "#d946ef", "#a3e635", "#fde68a",
];

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

type Entry = { label: string; value: number };

export function AssetPieChart({ items }: { items: Entry[] }) {
  const data = items.filter((i) => i.value > 0);
  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);

  const tooltipProps = {
    formatter: (value: unknown, _name: unknown, entry: unknown) => {
      const v = Number(value);
      return [`${fmt(v)} (${((v / total) * 100).toFixed(1)}%)`, (entry as { payload: Entry }).payload.label];
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
    data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />);

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
