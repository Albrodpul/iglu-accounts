import { Skeleton } from "@/components/ui/skeleton";

export default function SummaryLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Balance year */}
      <div className="glass-panel p-6 md:p-8">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-8 w-40" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Monthly chart */}
      <section>
        <Skeleton className="mb-4 h-6 w-56" />
        <div className="glass-panel p-5 md:p-6">
          <Skeleton className="h-[280px] w-full rounded-md" />
        </div>
      </section>

      {/* Annual grid */}
      <section>
        <Skeleton className="mb-4 h-6 w-52" />
        <div className="rounded-lg border border-border/80 bg-card shadow-[0_10px_30px_-20px_rgba(28,35,45,0.38)] p-5 md:p-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        </div>
      </section>

      {/* Category breakdown */}
      <section>
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="glass-panel p-5 md:p-6">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section>
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="glass-panel p-5 md:p-6">
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
      </section>
    </div>
  );
}
