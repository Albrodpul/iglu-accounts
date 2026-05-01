import { Skeleton } from "@/components/ui/skeleton";

export default function ExpensesLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <div className="glass-panel p-5 md:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-9 w-44 rounded-lg" />
            <Skeleton className="h-9 w-44 rounded-lg" />
          </div>
          <div className="space-y-0">
            {Array.from({ length: 2 }).map((_, g) => (
              <div key={g}>
                <div className="mb-2 mt-3 flex items-center justify-between px-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="space-y-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                      <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-2/5" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                      <Skeleton className="h-4 w-14" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
