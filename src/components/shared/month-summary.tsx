import { MONTHS } from "@/lib/format";
import { BalanceCard, type SurfaceVariant } from "@/components/shared/balance-card";
import type { Kpi } from "@/lib/expense-metrics";

type Props = {
  month: number;
  year: number;
  neto: number;
  kpis: Kpi[];
  /** When true, KPIs are hidden behind a collapsible toggle */
  collapsible?: boolean;
  variant?: SurfaceVariant;
};

export function MonthSummary({ month, year, neto, kpis, collapsible = false, variant }: Props) {
  return (
    <BalanceCard
      title={`Neto ${MONTHS[month - 1].toLowerCase()} ${year}`}
      neto={neto}
      kpis={kpis}
      variant={variant}
      size="md"
      collapsibleLabel={collapsible ? "Desglose del mes" : undefined}
    />
  );
}
