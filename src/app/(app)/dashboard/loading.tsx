import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero card */}
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <div className="hero-surface p-6 md:p-8">
          <Skeleton className="h-4 w-32 bg-white/15" />
          <Skeleton className="mt-3 h-10 w-48 bg-white/15" />
        </div>
        <div className="glass-panel p-6 md:p-8">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-8 w-40" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Month summary + recent expenses */}
      <div className="grid gap-6 md:grid-cols-[1fr_1.5fr] md:gap-8">
        <div className="space-y-4">
          <Skeleton className="h-7 w-40" />
          <div className="glass-panel p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-36" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-16 rounded-lg" />
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="glass-panel p-5 md:p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
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
