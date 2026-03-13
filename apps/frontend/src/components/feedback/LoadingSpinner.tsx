import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  "aria-label"?: string;
}

export function LoadingSpinner({
  className,
  "aria-label": ariaLabel = "Loading",
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "inline-block size-6 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      role="status"
      aria-label={ariaLabel}
    />
  );
}

export function PageLoadingFallback() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
      <LoadingSpinner className="text-primary" aria-label="Loading page" />
      <p className="text-muted-foreground text-sm">Loading…</p>
    </div>
  );
}
