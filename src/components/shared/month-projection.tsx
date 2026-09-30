import { Amount } from "@/components/ui/amount";
import { TrendingUp, TrendingDown } from "lucide-react";

type Props = {
  projected: number | null;
  historicalMonths: number;
  monthProgress: number;
  pendingRecurringNet: number;
};

export function MonthProjection({ projected, historicalMonths, monthProgress, pendingRecurringNet }: Props) {
  if (projected === null || monthProgress < 0.1) return null;

  const isPositive = projected >= 0;
  const progressPct = Math.round(monthProgress * 100);

  return (
    <div className="surface-card mt-4 px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 shrink-0 text-income" />
          ) : (
            <TrendingDown className="h-4 w-4 shrink-0 text-expense" />
          )}
          <span className="text-sm font-semibold text-muted-foreground">
            Proyección fin de mes
          </span>
        </div>
        <span className={`text-base font-extrabold tabular-nums ${isPositive ? "text-income" : "text-expense"}`}>
          <Amount value={projected} />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground tabular-nums shrink-0">
          {progressPct}% del mes
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
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
