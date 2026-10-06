import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the investments page: title + actions, the return hero, then the positions. */
export default function InvestmentsLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-md sm:w-36" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>

      <div className="hero-surface p-6 md:p-8">
        <div className="xl:flex xl:items-center xl:gap-8">
          <div className="xl:flex-1">
            <Skeleton className="h-4 w-28 bg-white/15" />
            <Skeleton className="mt-3 h-12 w-64 max-w-full bg-white/15 md:h-14" />
            <Skeleton className="mt-3 h-7 w-20 rounded-full bg-white/10" />
            <div className="mt-4 flex gap-7">
              <Skeleton className="h-9 w-32 bg-white/10" />
              <Skeleton className="h-9 w-32 bg-white/10" />
            </div>
            <Skeleton className="mt-4 h-8 w-32 rounded-full bg-white/10 xl:hidden" />
          </div>
          <div className="hidden items-center gap-6 xl:flex xl:w-[540px] xl:border-l xl:border-white/20 xl:pl-8">
            <Skeleton className="h-44 w-44 shrink-0 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3.5 w-full bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        {Array.from({ length: 3 }).map((_, g) => (
          <div key={g} className="mb-5 space-y-2">
            <Skeleton className="ml-3 h-4 w-32" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl border border-border/60 px-3 py-3 xl:border-transparent xl:py-2">
                <Skeleton className="h-2.5 w-2.5 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-3/5 xl:hidden" />
                </div>
                <Skeleton className="hidden h-4 w-72 xl:block" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
