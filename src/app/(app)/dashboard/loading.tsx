import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the dashboard: hero, then month + latest movements + year. */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="hero-surface p-6 md:p-8">
        <Skeleton className="h-4 w-32 bg-white/15" />
        <Skeleton className="mt-3 h-12 w-64 max-w-full bg-white/15 md:h-14" />
        <Skeleton className="mt-6 h-4 w-40 bg-white/10" />
      </div>

      <div className="grid items-start gap-6 md:grid-cols-2 md:gap-8">
        <div className="contents md:block md:space-y-4">
        <div className="surface-card order-1 p-5 md:p-6">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-3 h-9 w-40 max-w-full" />
          <Skeleton className="mt-5 h-4 w-32" />
        </div>

        <div className="surface-card order-3 p-5 md:p-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-10 w-48 max-w-full" />
          <Skeleton className="mt-5 h-4 w-32" />
        </div>
        </div>

        <div className="order-2">
          <Skeleton className="mb-3 h-6 w-44" />
          <div className="glass-panel space-y-4 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
