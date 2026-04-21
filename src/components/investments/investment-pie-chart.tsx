"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";
import type { InvestmentFundWithType } from "@/types";
import { CollapsibleSection } from "@/components/shared/collapsible-section";

const COLORS = [
  "#a78bfa", "#67e8f9", "#6ee7b7", "#fcd34d",
  "#f9a8d4", "#93c5fd", "#fb923c", "#86efac",
  "#e879f9", "#fde68a",
];

const currencyFormatter = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

type Props = {
  funds: InvestmentFundWithType[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.07) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

const tooltipProps = {
  contentStyle: {
    borderRadius: "12px",
    borderColor: "rgba(148, 163, 184, 0.3)",
    backgroundColor: "rgba(15,23,42,0.92)",
    color: "#f1f5f9",
    fontSize: 13,
  },
  itemStyle: { color: "#f1f5f9" },
  labelStyle: { display: "none" },
};

export function InvestmentPieChart({ funds }: Props) {
  const data = funds
    .map((f) => ({
      name: f.name,
      value: f.current_value > 0 ? f.current_value : f.invested_amount,
    }))
    .filter((d) => d.value > 0);

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);

  const legendItems = data.map((d, i) => (
    <div key={i} className="flex items-center gap-1.5 min-w-0">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: COLORS[i % COLORS.length] }}
      />
      <span className="truncate text-[14px] md:text-[14px] text-white/80">{d.name}</span>
      <span className="ml-auto shrink-0 pl-2 text-[14px] md:text-[14px] font-semibold text-white/60">
        {((d.value / total) * 100).toFixed(0)}%
      </span>
    </div>
  ));

  return (
    <div>
      {/* Desktop: chart + legend side by side */}
      <div className="hidden md:flex md:items-center md:gap-3">
        <div className="shrink-0">
          <PieChart width={200} height={200}>
            <Pie data={data} cx={100} cy={100} outerRadius={90} dataKey="value" labelLine={false} label={CustomLabel}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, entry) => {
                const v = Number(value);
                const pct = ((v / total) * 100).toFixed(1);
                return [`${currencyFormatter(v)} (${pct}%)`, (entry.payload as { name: string }).name];
              }}
              {...tooltipProps}
            />
          </PieChart>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">{legendItems}</div>
      </div>

      {/* Mobile: collapsible chart + legend */}
      <div className="md:hidden">
        <CollapsibleSection label="Distribución" variant="hero">
          <div className="flex justify-center">
            <PieChart width={220} height={200}>
              <Pie data={data} cx={110} cy={100} outerRadius={90} dataKey="value" labelLine={false} label={CustomLabel}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _name: string, entry: { payload: { name: string } }) => {
                  const pct = ((value / total) * 100).toFixed(1);
                  return [`${currencyFormatter(value)} (${pct}%)`, entry.payload.name];
                }}
                {...tooltipProps}
              />
            </PieChart>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">{legendItems}</div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
