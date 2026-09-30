import { BalanceCard, type SurfaceVariant } from "@/components/shared/balance-card";
import type { Kpi } from "@/lib/expense-metrics";

type Props = {
  year: number;
  neto: number;
  kpis: Kpi[];
  /** grid columns on desktop (2 or 3), defaults to 2 */
  columns?: 2 | 3;
  /** When true, KPIs are hidden behind a collapsible toggle */
  collapsible?: boolean;
  variant?: SurfaceVariant;
};

export function BalanceYear({ year, neto, kpis, columns = 2, collapsible = false, variant }: Props) {
  return (
    <BalanceCard
      title={`Balance ${year}`}
      neto={neto}
      kpis={kpis}
      columns={columns}
      variant={variant}
      collapsibleLabel={collapsible ? "Desglose del año" : undefined}
    />
  );
}
