import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the default summary view: balance card, then the month-by-month panel. */
export default function SummaryLoading() {
  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-11 w-36 rounded-lg" />
      </div>

      {/* View switcher: dropdown on phones/tablets, tab strip from lg */}
      <Skeleton className="h-11 w-full rounded-lg lg:hidden" />
      <div className="hidden gap-1 rounded-lg bg-muted p-1 lg:flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1 rounded-md" />
        ))}
      </div>

      <div className="surface-card p-5 md:p-6">
        <Skeleton className="h-4 w-28" />
        <div className="mt-2 flex items-end justify-between gap-4">
          <Skeleton className="h-9 w-48 max-w-full md:h-12 md:w-64" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="mt-4 h-3 w-56 max-w-full" />
      </div>

      <div className="glass-panel p-5 md:p-6">
        <Skeleton className="mb-4 h-5 w-24" />
        {/* Phones: one row per month. Wider: the bar chart area. */}
        <div className="space-y-3 sm:hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-7" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="hidden h-[320px] w-full rounded-lg sm:block" />
      </div>
    </div>
  );
}
