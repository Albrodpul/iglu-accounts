import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the dashboard: full-width hero, then the year and month cards. */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="hero-surface p-6 md:p-8">
        <Skeleton className="h-4 w-32 bg-white/15" />
        <Skeleton className="mt-3 h-12 w-64 max-w-full bg-white/15 md:h-14" />
        <Skeleton className="mt-6 h-4 w-40 bg-white/10" />
        <Skeleton className="mt-4 h-4 w-32 bg-white/10" />
      </div>

      <div className="grid items-start gap-6 md:grid-cols-2 md:gap-8">
        <div className="surface-card p-5 md:p-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-10 w-48 max-w-full" />
          <Skeleton className="mt-5 h-4 w-32" />
        </div>
        <div>
          <div className="surface-card p-5 md:p-6">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-3 h-9 w-40 max-w-full" />
            <Skeleton className="mt-5 h-4 w-32" />
          </div>
          <div className="surface-card mt-4 px-5 py-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-3 h-2 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
