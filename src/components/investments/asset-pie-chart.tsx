"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { pieColor } from "@/lib/chart-colors";
import { formatPercent } from "@/lib/format";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: "always" }).format(v);

type Entry = { label: string; value: number };

/** `size` fixes the diameter; without it the chart is small on phones and larger from `md` up. */
export function AssetPieChart({ items, size }: { items: Entry[]; size?: number }) {
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

  const chart = (size: number) => (
    <PieChart width={size} height={size}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="label"
        cx={size / 2}
        cy={size / 2}
        outerRadius={size / 2 - 6}
        innerRadius={(size / 2 - 6) * 0.4}
        labelLine={false}
      >
        {renderCells()}
      </Pie>
      <Tooltip {...tooltipProps} />
    </PieChart>
  );

  if (size) return chart(size);

  return (
    <>
      <div className="md:hidden">{chart(120)}</div>
      <div className="hidden md:block">{chart(200)}</div>
    </>
  );
}
