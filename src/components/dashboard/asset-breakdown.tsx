import { Amount } from "@/components/ui/amount";
import { AssetPieChart } from "@/components/investments/asset-pie-chart";
import { pieColor } from "@/lib/chart-colors";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export type AssetItem = {
  label: string;
  value: number;
  /** A summary line (e.g. net investment return), not a slice of the total. */
  highlight?: boolean;
};

/** Where the total is held — bank, cash and each investment type — as a pie and its legend. For the hero surface. */
export function AssetBreakdown({ items, className }: { items: AssetItem[]; className?: string }) {
  const slices = items.filter((item) => !item.highlight);
  const total = slices.filter((item) => item.value > 0).reduce((sum, item) => sum + item.value, 0);
  let sliceIndex = 0;

  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-center md:gap-4", className)}>
      <div className="flex shrink-0 justify-center">
        <AssetPieChart items={slices} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        {items.map((item) => {
          // Only positive assets are slices of the pie; keep the same index it uses.
          const isSlice = !item.highlight && item.value > 0;
          const color = isSlice ? pieColor(sliceIndex++) : null;
          const share = isSlice && total > 0 ? formatPercent((item.value / total) * 100, { decimals: 0 }) : null;
          return (
            <div
              key={item.label}
              className={cn("flex items-center justify-between rounded-lg px-3 py-1", item.highlight && "mt-1 bg-white/10 py-1.5")}
            >
              <div className="flex min-w-0 items-center gap-2">
                {color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
                <span className="truncate text-xs font-medium text-white/85">{item.label}</span>
                {share && <span className="shrink-0 text-[11px] text-white/65">{share}</span>}
              </div>
              <span
                className={cn(
                  "shrink-0 pl-2 text-sm font-semibold tabular-nums",
                  item.highlight ? (item.value >= 0 ? "text-emerald-300" : "text-rose-200") : "text-white/90"
                )}
              >
                <Amount value={item.value} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
