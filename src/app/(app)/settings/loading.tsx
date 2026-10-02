import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-4 md:space-y-5">
      <Skeleton className="mb-2 h-8 w-28 md:mb-3" />
      {[1, 2, 2, 2, 1].map((rows, i) => (
        <div key={i} className="surface-card space-y-4 p-5 md:p-6">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: rows }).map((_, j) => (
            <Skeleton key={j} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
