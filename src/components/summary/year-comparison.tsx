"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { comparePeriods } from "@/actions/expenses";
import { Amount } from "@/components/ui/amount";
import { MONTHS } from "@/lib/format";

type ComparisonRow = {
  name: string;
  icon: string;
  color: string;
  valueA: number;
  valueB: number;
  diff: number;
};

type Period = { year: number | ""; month: number | "" };

type Props = {
  availableYears: number[];
  /** Year being viewed: the comparison starts as this year against the one before. */
  year: number;
};

const selectClass =
  "h-10 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring sm:h-9";

function PeriodPicker({
  label,
  period,
  years,
  onChange,
}: {
  label: string;
  period: Period;
  years: number[];
  onChange: (period: Period) => void;
}) {
  return (
    <fieldset className="min-w-0 space-y-1.5">
      <legend className="text-sm font-semibold text-muted-foreground">{label}</legend>
      <div className="flex gap-1.5">
        <select
          aria-label={`${label}: año`}
          value={period.year}
          onChange={(e) => onChange({ ...period, year: e.target.value ? Number(e.target.value) : "" })}
          className={selectClass}
        >
          <option value="">Año…</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          aria-label={`${label}: mes`}
          value={period.month}
          onChange={(e) => onChange({ ...period, month: e.target.value ? Number(e.target.value) : "" })}
          className={selectClass}
        >
          <option value="">Todo el año</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </div>
    </fieldset>
  );
}

const periodLabel = (p: Period) => (p.month ? `${MONTHS[p.month - 1].substring(0, 3)} ${p.year}` : String(p.year));
const tone = (value: number) => (value > 0 ? "text-income" : value < 0 ? "text-expense" : "");

/**
 * Two periods side by side, by category. It compares as soon as both periods
 * are chosen — and they start chosen — so there is no empty state to get past.
 */
export function YearComparison({ availableYears, year }: Props) {
  const years = [...new Set([...availableYears, year])].sort((a, b) => b - a);
  const [a, setA] = useState<Period>({ year, month: "" });
  const [b, setB] = useState<Period>({ year: years.includes(year - 1) ? year - 1 : "", month: "" });

  const key = a.year && b.year ? JSON.stringify([a, b]) : null;
  const [result, setResult] = useState<{ key: string; rows: ComparisonRow[] } | null>(null);

  useEffect(() => {
    if (!key || !a.year || !b.year) return;
    let cancelled = false;
    comparePeriods({ yearA: a.year, monthA: a.month || null, yearB: b.year, monthB: b.month || null })
      .then((rows) => {
        if (!cancelled) setResult({ key, rows });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, rows: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [key, a.year, a.month, b.year, b.month]);

  const loading = key !== null && result?.key !== key;
  const rows = key !== null && result?.key === key ? result.rows : null;

  const totalA = rows?.reduce((s, r) => s + r.valueA, 0) ?? 0;
  const totalB = rows?.reduce((s, r) => s + r.valueB, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <PeriodPicker label="Periodo A" period={a} years={years} onChange={setA} />
        <PeriodPicker label="Periodo B" period={b} years={years} onChange={setB} />
      </div>

      {key === null && (
        <p className="py-4 text-center text-sm text-muted-foreground">Elige el año de los dos periodos para compararlos.</p>
      )}

      {loading && (
        <p className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Comparando…
        </p>
      )}

      {rows && rows.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">No hay movimientos en esos periodos.</p>
      )}

      {rows && rows.length > 0 && (
        // Figures in whole euros and without the symbol, so the four columns fit a phone.
        <div className="-mx-5 overflow-x-auto md:mx-0">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="py-2 pl-5 pr-1 text-left font-semibold md:pl-2">Categoría (€)</th>
                <th className="px-2 py-2 text-right font-semibold">{periodLabel(a)}</th>
                <th className="px-2 py-2 text-right font-semibold">{periodLabel(b)}</th>
                <th className="py-2 pl-2 pr-5 text-right font-semibold md:pr-2" title="Periodo A menos periodo B">A − B</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-b border-border/30 transition-colors hover:bg-muted/25">
                  <td className="max-w-[7.5rem] truncate py-1.5 pl-5 pr-1 font-medium md:max-w-none md:pl-2">
                    <span className="mr-1.5">{row.icon}</span>{row.name}
                  </td>
                  {[row.valueA, row.valueB].map((value, i) => (
                    <td key={i} className={`px-2 py-1.5 text-right ${value > 0 ? "text-income" : value === 0 ? "text-muted-foreground/40" : ""}`}>
                      {Math.round(value) === 0 ? "—" : <Amount value={value} compact whole />}
                    </td>
                  ))}
                  <td className={`py-1.5 pl-2 pr-5 text-right font-semibold md:pr-2 ${tone(row.diff)}`}>
                    {Math.round(row.diff) === 0 ? "—" : <Amount value={row.diff} compact whole />}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border/60 font-bold">
                <td className="py-2 pl-5 pr-2 md:pl-2">Total</td>
                <td className={`px-2 py-2 text-right ${tone(totalA)}`}><Amount value={totalA} compact whole /></td>
                <td className={`px-2 py-2 text-right ${tone(totalB)}`}><Amount value={totalB} compact whole /></td>
                <td className={`py-2 pl-2 pr-5 text-right md:pr-2 ${tone(totalA - totalB)}`}><Amount value={totalA - totalB} compact whole /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
