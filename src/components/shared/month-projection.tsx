import { Amount } from "@/components/ui/amount";
import { TrendingUp, TrendingDown } from "lucide-react";

type Props = {
  projected: number | null;
  currentNet: number;
  historicalMonths: number;
  monthProgress: number;
  pendingRecurringNet: number;
};

export function MonthProjection({ projected, currentNet, historicalMonths, monthProgress, pendingRecurringNet }: Props) {
  if (projected === null || monthProgress < 0.1) return null;

  const isPositive = projected >= 0;
  const progressPct = Math.round(monthProgress * 100);

  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-muted/25 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 shrink-0 text-rose-500" />
          )}
          <span className="text-xs font-semibold text-muted-foreground">
            Proyección fin de mes
          </span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
          <Amount value={projected} />
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-border/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/60 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground tabular-nums shrink-0">
          {progressPct}% del mes
        </span>
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        {pendingRecurringNet !== 0 && (
          <>
            <Amount value={pendingRecurringNet} /> en fijos pendientes
            {historicalMonths > 0 && " · "}
          </>
        )}
        {historicalMonths > 0 && (
          <>Gasto variable estimado de {historicalMonths} meses</>
        )}
      </p>
    </div>
  );
}
