import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // cn() lets a caller's bg-* (e.g. bg-white/15 on a dark hero) replace bg-muted.
  return <div className={cn("skeleton-shimmer rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
