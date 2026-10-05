"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { pieColor } from "@/lib/chart-colors";
import { formatPercent } from "@/lib/format";
import { groupPieSlices, OTHERS_COLOR, positionValue } from "@/lib/investments";
import type { InvestmentFundWithType } from "@/types";
import { CollapsibleSection } from "@/components/shared/collapsible-section";


const fmt = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: "always" }).format(value);

type RawItem = { name: string; value: number };
type ChartItem = RawItem & { breakdown?: RawItem[] };

type View = "fund" | "type";
type Props = { funds: InvestmentFundWithType[] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.07) return null;
  const R = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return (
    <text
      x={cx + r * Math.cos(-midAngle * R)}
      y={cy + r * Math.sin(-midAngle * R)}
      fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}
    >
      {formatPercent(percent * 100, { decimals: 0 })}
    </text>
  );
}

function sliceColor(i: number, item: ChartItem) {
  return item.breakdown ? OTHERS_COLOR : pieColor(i);
}

function PieTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartItem }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const pct = formatPercent((item.value / total) * 100);
  return (
    <div style={{ borderRadius: 12, borderColor: "rgba(148,163,184,0.3)", backgroundColor: "rgba(15,23,42,0.92)", color: "#f1f5f9", fontSize: 13, padding: "10px 14px", minWidth: 180 }}>
      <p style={{ fontWeight: 600, marginBottom: item.breakdown ? 6 : 0 }}>{item.name}</p>
      <p style={{ color: "#94a3b8" }}>{fmt(item.value)} · {pct}</p>
      {item.breakdown && (
        <div style={{ marginTop: 8, borderTop: "1px solid rgba(148,163,184,0.2)", paddingTop: 8 }}>
          {item.breakdown.map((b, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: i > 0 ? 3 : 0 }}>
              <span style={{ color: "#cbd5e1" }}>{b.name}</span>
              <span style={{ color: "#94a3b8", whiteSpace: "nowrap" }}>{formatPercent((b.value / total) * 100)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LegendItem({
  d,
  color,
  total,
  size,
}: {
  d: ChartItem;
  color: string;
  total: number;
  size: "sm" | "md";
}) {
  // Declared at module level: defined inside the chart it would remount on
  // every parent render and lose this open/closed state.
  const [open, setOpen] = useState(false);
  const fs = size === "md" ? "text-[13px]" : "text-[11px]";
  const pct = formatPercent((d.value / total) * 100, { decimals: 0 });

  if (d.breakdown) {
    return (
      <div
        className="group relative flex items-center gap-1.5 min-w-0 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className={`truncate ${fs} text-white/80 underline decoration-dotted underline-offset-2`}>{d.name}</span>
        <span className={`ml-auto shrink-0 pl-2 ${fs} font-semibold text-white/80`}>{pct}</span>
        <div className={`pointer-events-none absolute top-full left-0 z-50 mt-1 w-52 rounded-xl border border-white/10 bg-[rgba(15,23,42,0.95)] p-3 shadow-xl group-hover:block ${open ? "block" : "hidden"}`}>
          {d.breakdown.map((b, j) => (
            <div key={j} className="flex justify-between gap-3 text-[12px]" style={{ marginTop: j > 0 ? 4 : 0 }}>
              <span className="truncate text-slate-300">{b.name}</span>
              <span className="shrink-0 text-slate-400">{formatPercent((b.value / total) * 100)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className={`truncate ${fs} text-white/80`}>{d.name}</span>
      <span className={`ml-auto shrink-0 pl-2 ${fs} font-semibold text-white/80`}>{pct}</span>
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-white/10 p-0.5 text-[11px] font-semibold">
      {(["fund", "type"] as View[]).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
            view === v ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
          }`}
        >
          {v === "fund" ? "Por fondo" : "Por tipo"}
        </button>
      ))}
    </div>
  );
}

export function InvestmentPieChart({ funds }: Props) {
  const [view, setView] = useState<View>("fund");

  const fundData: RawItem[] = funds
    .map((f) => ({ name: f.name, value: positionValue(f) }))
    .filter((d) => d.value > 0);

  const typeData: RawItem[] = Object.values(
    funds.reduce<Record<string, RawItem>>((acc, f) => {
      const name = f.investment_type.name;
      const value = positionValue(f);
      if (!acc[name]) acc[name] = { name, value: 0 };
      acc[name].value += value;
      return acc;
    }, {})
  ).filter((d) => d.value > 0);

  const data = view === "fund" ? fundData : typeData;

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);

  // Group the smallest items into "Otros" (same rule the fund list uses for its colours).
  const { visible, others: othersItems } = groupPieSlices(data);
  const chartData: ChartItem[] =
    othersItems.length > 0
      ? [
          ...visible,
          {
            name: `Otros (${othersItems.length})`,
            value: othersItems.reduce((s, d) => s + d.value, 0),
            breakdown: othersItems,
          },
        ]
      : visible;

  const desktopLegendItems = chartData.map((d, i) => (
    <LegendItem key={i} d={d} color={sliceColor(i, d)} total={total} size="md" />
  ));
  const mobileLegendItems = chartData.map((d, i) => (
    <LegendItem key={i} d={d} color={sliceColor(i, d)} total={total} size="sm" />
  ));

  return (
    <div>
      {/* Wide screens: chart + legend side by side */}
      <div className="hidden xl:flex xl:items-center xl:gap-3">
        <div className="shrink-0">
          <PieChart width={200} height={200}>
            <Pie data={chartData} cx={100} cy={100} outerRadius={90} dataKey="value" labelLine={false} label={CustomLabel}>
              {chartData.map((item, i) => (
                <Cell key={i} fill={sliceColor(i, item)} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip total={total} />} />
          </PieChart>
        </div>
        <div className="flex-1 min-w-0 space-y-1.5 -mt-4">
          <div className="mb-2"><ViewToggle view={view} onChange={setView} /></div>
          {desktopLegendItems}
        </div>
      </div>

      {/* Narrower: behind a pill, like the other hero details */}
      <div className="xl:hidden">
        <CollapsibleSection label="Distribución" variant="hero">
          <div className="mb-3"><ViewToggle view={view} onChange={setView} /></div>
          <div className="flex justify-center">
            <PieChart width={220} height={200}>
              <Pie data={chartData} cx={110} cy={100} outerRadius={90} dataKey="value" labelLine={false} label={CustomLabel}>
                {chartData.map((item, i) => (
                  <Cell key={i} fill={sliceColor(i, item)} />
                ))}
              </Pie>
            </PieChart>
          </div>
          <div className={`mt-3 ${chartData.length > 5 ? "grid grid-cols-2 gap-x-3 gap-y-1.5" : "space-y-1.5"}`}>
            {mobileLegendItems}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
