import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the Diario: title + period selector, then the list panel (with the category panel beside it on wide screens). */
export default function ExpensesLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="ml-auto h-11 w-40 rounded-lg" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] xl:gap-8">
        <div className="glass-panel p-5 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-10 flex-1 rounded-lg sm:h-9" />
            <Skeleton className="h-10 w-10 rounded-lg sm:hidden" />
            <Skeleton className="hidden h-9 w-44 rounded-lg sm:block" />
            <Skeleton className="hidden h-9 w-32 rounded-lg sm:block" />
          </div>
          {Array.from({ length: 2 }).map((_, g) => (
            <div key={g}>
              <div className="mb-2 mt-3 flex items-center justify-between px-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-14" />
              </div>
              <div className="space-y-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2.5 md:py-1.5">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-xl md:h-9 md:w-9" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-2/5" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="surface-card hidden space-y-3 p-5 lg:block">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
