"use client";

import { useState, useTransition } from "react";
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

type Props = {
  availableYears: number[];
};

export function YearComparison({ availableYears }: Props) {
  const [yearA, setYearA] = useState<number | "">("");
  const [monthA, setMonthA] = useState<number | "">("");
  const [yearB, setYearB] = useState<number | "">("");
  const [monthB, setMonthB] = useState<number | "">("");
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [fetched, setFetched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCompare() {
    if (!yearA || !yearB) return;
    startTransition(async () => {
      const result = await comparePeriods({
        yearA,
        monthA: monthA || null,
        yearB,
        monthB: monthB || null,
      });
      setRows(result);
      setFetched(true);
    });
  }

  const labelA = monthA ? `${MONTHS[monthA - 1]} ${yearA}` : String(yearA);
  const labelB = monthB ? `${MONTHS[monthB - 1]} ${yearB}` : String(yearB);

  const totalA = rows.reduce((s, r) => s + r.valueA, 0);
  const totalB = rows.reduce((s, r) => s + r.valueB, 0);
  const totalDiff = totalA - totalB;

  const selectClass = "h-9 rounded-lg border border-border/70 bg-transparent px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Periodo A</p>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
            <select value={yearA} onChange={(e) => { setYearA(e.target.value ? Number(e.target.value) : ""); setFetched(false); }} className={selectClass}>
              <option value="">Año</option>
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {yearA && (
              <select value={monthA} onChange={(e) => { setMonthA(e.target.value ? Number(e.target.value) : ""); setFetched(false); }} className={selectClass}>
                <option value="">Completo</option>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m.substring(0, 3)}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Periodo B</p>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
            <select value={yearB} onChange={(e) => { setYearB(e.target.value ? Number(e.target.value) : ""); setFetched(false); }} className={selectClass}>
              <option value="">Año</option>
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {yearB && (
              <select value={monthB} onChange={(e) => { setMonthB(e.target.value ? Number(e.target.value) : ""); setFetched(false); }} className={selectClass}>
                <option value="">Completo</option>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m.substring(0, 3)}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {yearA && yearB && (
        <button
          type="button"
          onClick={handleCompare}
          disabled={isPending}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          {isPending ? "Comparando..." : "Comparar"}
        </button>
      )}

      {isPending && (
        <p className="py-4 text-center text-sm text-muted-foreground">Cargando datos...</p>
      )}

      {!isPending && fetched && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm tabular-nums md:min-w-0">
            <thead>
              <tr className="border-b border-border/60">
                <th className="py-2 pl-3 pr-3 text-left font-semibold text-muted-foreground md:pl-6">Categoría</th>
                <th className="py-2 px-2 text-right font-semibold text-muted-foreground">{labelA}</th>
                <th className="py-2 px-2 text-right font-semibold text-muted-foreground">{labelB}</th>
                <th className="py-2 pl-2 pr-3 text-right font-semibold text-muted-foreground">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-b border-border/30 hover:bg-muted/25 transition-colors">
                  <td className="py-1.5 pl-3 pr-3 font-medium text-foreground md:pl-6">
                    <span className="mr-1.5">{row.icon}</span>{row.name}
                  </td>
                  <td className={`py-1.5 px-2 text-right ${row.valueA > 0 ? "text-income" : row.valueA < 0 ? "text-foreground" : "text-muted-foreground/30"}`}>
                    {row.valueA === 0 ? "—" : <Amount value={row.valueA} />}
                  </td>
                  <td className={`py-1.5 px-2 text-right ${row.valueB > 0 ? "text-income" : row.valueB < 0 ? "text-foreground" : "text-muted-foreground/30"}`}>
                    {row.valueB === 0 ? "—" : <Amount value={row.valueB} />}
                  </td>
                  <td className={`py-1.5 pl-2 pr-3 text-right font-semibold ${row.diff > 0 ? "text-emerald-600" : row.diff < 0 ? "text-rose-600" : ""}`}>
                    {row.diff === 0 ? "—" : <Amount value={row.diff} />}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border/60 font-bold">
                <td className="py-2 pl-3 pr-3 text-foreground md:pl-6">Total</td>
                <td className={`py-2 px-2 text-right ${totalA > 0 ? "text-income" : totalA < 0 ? "text-expense" : ""}`}>
                  <Amount value={totalA} />
                </td>
                <td className={`py-2 px-2 text-right ${totalB > 0 ? "text-income" : totalB < 0 ? "text-expense" : ""}`}>
                  <Amount value={totalB} />
                </td>
                <td className={`py-2 pl-2 pr-3 text-right ${totalDiff > 0 ? "text-emerald-600" : totalDiff < 0 ? "text-rose-600" : ""}`}>
                  <Amount value={totalDiff} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!isPending && fetched && rows.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No hay datos para comparar en los periodos seleccionados
        </p>
      )}

      {!fetched && !isPending && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Selecciona dos periodos y pulsa Comparar
        </p>
      )}
    </div>
  );
}
