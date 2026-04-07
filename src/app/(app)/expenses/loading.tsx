import { Skeleton } from "@/components/ui/skeleton";

export default function ExpensesLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>

      {/* Month summary */}
      <div className="glass-panel p-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-8 w-36" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      </div>

      {/* Expense list */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <div className="glass-panel p-5 md:p-6 space-y-4">
          {/* Day group */}
          {Array.from({ length: 2 }).map((_, g) => (
            <div key={g} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
