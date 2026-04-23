import { Skeleton } from "@/components/ui/skeleton";

export default function SummaryLoading() {
  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Tab list */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 flex-1 rounded-md" />
        ))}
      </div>

      {/* Tab content — matches the "Resumen Anual" default tab (BalanceYear) */}
      <div className="glass-panel p-6 md:p-8">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-8 w-40" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
