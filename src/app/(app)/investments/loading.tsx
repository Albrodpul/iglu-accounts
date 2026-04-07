import { Skeleton } from "@/components/ui/skeleton";

export default function InvestmentsLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Hero */}
      <div className="hero-surface p-6 md:p-8">
        <Skeleton className="h-4 w-28 bg-white/15" />
        <Skeleton className="mt-3 h-10 w-48 bg-white/15" />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl bg-white/10" />
          <Skeleton className="h-20 rounded-xl bg-white/10" />
        </div>
      </div>

      {/* Fund list */}
      <div className="glass-panel p-5 md:p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <div className="text-right space-y-1.5">
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-3 w-14 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
