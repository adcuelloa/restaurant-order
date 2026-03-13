import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("bg-muted animate-pulse rounded-md", className)} aria-hidden />;
}

/** Skeleton for a card in a grid (item/order card). */
export function CardSkeleton() {
  return (
    <div className="border-border bg-card flex flex-col gap-4 overflow-hidden rounded-xl border p-4">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

/** Skeleton for a list of N cards. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
