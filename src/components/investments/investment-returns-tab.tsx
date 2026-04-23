"use client";

import { useState, useTransition } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { MONTHS } from "@/lib/format";
import { formatCurrency } from "@/lib/format";
import { recordMonthlyReturnSnapshot } from "@/actions/investments";

const MONTHS_SHORT = MONTHS.map((m) => m.substring(0, 3));

type MonthlyReturn = {
  year: number;
  month: number;
  total_invested: number;
  current_value: number;
  return_amount: number;
  return_pct: number;
};

type Props = {
  returns: MonthlyReturn[];
};

export function InvestmentReturnsTab({ returns }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const now = new Date();

  function handleSnapshot() {
    setError(null);
    startTransition(async () => {
      const result = await recordMonthlyReturnSnapshot(now.getFullYear(), now.getMonth() + 1);
      if ("error" in result) setError(result.error ?? null);
    });
  }

  if (returns.length === 0) {
    return (
      <div className="glass-panel flex min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Aún no hay datos. El cron registra el día 1 de cada mes.
        </p>
        <button
          onClick={handleSnapshot}
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Registrando…" : "Registrar snapshot ahora"}
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // Chart data: accumulated return_pct over time (shows portfolio growth curve)
  const chartData = returns.map((r) => ({
    label: `${MONTHS_SHORT[r.month - 1]} ${String(r.year).slice(2)}`,
    return_pct: Number(r.return_pct),
  }));

  // Latest snapshot for current stats
  const latest = returns[returns.length - 1];
  const latestReturn = Number(latest.return_amount);
  const latestPct = Number(latest.return_pct);

  // Monthly delta returns: what the portfolio actually earned each month
  // delta = change in return_amount / previous month's current_value
  const monthlyDeltas = returns.map((r, i) => {
    if (i === 0) return null; // no previous month to compare
    const prev = returns[i - 1];
    const deltaAmount = Number(r.return_amount) - Number(prev.return_amount);
    const prevValue = Number(prev.current_value);
    const deltaPct = prevValue > 0 ? (deltaAmount / prevValue) * 100 : null;
    return deltaPct;
  });

  // Group by year for the table
  const years = [...new Set(returns.map((r) => r.year))].sort((a, b) => a - b);
  const byYearMonth = new Map<string, number | null>();
  for (let i = 0; i < returns.length; i++) {
    const r = returns[i];
    byYearMonth.set(`${r.year}-${r.month}`, monthlyDeltas[i]);
  }

  // Annual averages: avg of monthly deltas within that year (skip nulls)
  const annualAvg = new Map<number, number | null>();
  for (const year of years) {
    const yearIndices = returns.reduce<number[]>((acc, r, i) => {
      if (r.year === year) acc.push(i);
      return acc;
    }, []);
    const vals = yearIndices.map((i) => monthlyDeltas[i]).filter((v): v is number => v !== null);
    annualAvg.set(year, vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null);
  }

  // Monthly averages: avg delta across years for each month position (skip nulls)
  const monthlyAvg = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const vals = returns
      .map((r, idx) => (r.month === month ? monthlyDeltas[idx] : null))
      .filter((v): v is number => v !== null);
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  });

  const fmtPct = (v: number | null) => {
    if (v === null) return "—";
    const sign = v >= 0 ? "+" : "";
    return `${sign}${v.toFixed(2)}%`;
  };

  const pctClass = (v: number | null) => {
    if (v === null) return "text-muted-foreground";
    return v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    const val = payload[0].value;
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-sm">
        <p className="font-medium text-foreground">{label}</p>
        <p className={`font-bold tabular-nums ${pctClass(val)}`}>{fmtPct(val)}</p>
      </div>
    );
  };

  const currentMonthRecorded = returns.some(
    (r) => r.year === now.getFullYear() && r.month === now.getMonth() + 1,
  );

  return (
    <div className="space-y-6">
      {/* Manual snapshot trigger */}
      {!currentMonthRecorded && (
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">
            El mes actual aún no está registrado
          </span>
          <button
            onClick={handleSnapshot}
            disabled={pending}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? "Registrando…" : "Registrar ahora"}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Stats chips */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel p-3 md:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Invertido
          </p>
          <p className="mt-1 text-base font-bold tabular-nums md:text-lg">
            {formatCurrency(Number(latest.total_invested))}
          </p>
        </div>
        <div className="glass-panel p-3 md:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Valor actual
          </p>
          <p className="mt-1 text-base font-bold tabular-nums md:text-lg">
            {formatCurrency(Number(latest.current_value))}
          </p>
        </div>
        <div className="glass-panel p-3 md:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Rentabilidad
          </p>
          <p className={`mt-1 text-base font-bold tabular-nums md:text-lg ${pctClass(latestReturn)}`}>
            {formatCurrency(latestReturn)}
            <span className="ml-1 text-sm font-semibold">{fmtPct(latestPct)}</span>
          </p>
        </div>
      </div>

      {/* Line chart */}
      <div className="glass-panel p-4 md:p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground/80">Evolución de la rentabilidad</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="return_pct"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: "#10b981" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="px-4 py-3 text-left font-semibold text-foreground/70">Año</th>
              {MONTHS_SHORT.map((m) => (
                <th key={m} className="px-2 py-3 text-center font-semibold text-foreground/70">
                  {m}
                </th>
              ))}
              <th className="px-3 py-3 text-center font-semibold text-foreground/70">Prom.</th>
            </tr>
          </thead>
          <tbody>
            {years.map((year, yi) => (
              <tr
                key={year}
                className={yi % 2 === 0 ? "bg-muted/20" : ""}
              >
                <td className="px-4 py-2.5 font-semibold tabular-nums">{year}</td>
                {Array.from({ length: 12 }, (_, i) => {
                  const val = byYearMonth.get(`${year}-${i + 1}`) ?? null;
                  return (
                    <td key={i} className={`px-2 py-2.5 text-center tabular-nums text-xs ${pctClass(val)}`}>
                      {fmtPct(val)}
                    </td>
                  );
                })}
                <td className={`px-3 py-2.5 text-center text-xs font-semibold tabular-nums ${pctClass(annualAvg.get(year) ?? null)}`}>
                  {fmtPct(annualAvg.get(year) ?? null)}
                </td>
              </tr>
            ))}
            {/* Monthly averages footer */}
            {years.length > 1 && (
              <tr className="border-t border-border/60">
                <td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Prom. mensual</td>
                {monthlyAvg.map((val, i) => (
                  <td key={i} className={`px-2 py-2.5 text-center text-xs tabular-nums ${pctClass(val)}`}>
                    {fmtPct(val)}
                  </td>
                ))}
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
