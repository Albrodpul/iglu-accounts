import { Skeleton } from "@/components/ui/skeleton";

export default function SummaryLoading() {
  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* View switcher: dropdown on phones/tablets, tab strip from lg */}
      <Skeleton className="h-11 w-full rounded-lg lg:hidden" />
      <div className="hidden gap-1 rounded-lg bg-muted p-1 lg:flex">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1 rounded-md" />
        ))}
      </div>

      {/* Default view: "Balance del año" hero card */}
      <div className="hero-surface p-6 md:p-8">
        <Skeleton className="h-4 w-28 bg-white/15" />
        <Skeleton className="mt-3 h-12 w-56 max-w-full bg-white/15" />
        <div className="mt-5 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}
