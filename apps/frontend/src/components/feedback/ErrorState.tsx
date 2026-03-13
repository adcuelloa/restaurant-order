import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Optional secondary action (e.g. "Go back") */
  secondaryAction?: React.ReactNode;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  secondaryAction,
}: ErrorStateProps) {
  return (
    <div
      className="border-destructive/20 bg-destructive/5 flex flex-col items-center justify-center gap-4 rounded-xl border px-6 py-10 text-center"
      role="alert"
    >
      <h2 className="text-foreground text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground max-w-md text-sm">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button onClick={onRetry} variant="default" size="sm">
            {retryLabel}
          </Button>
        ) : null}
        {secondaryAction}
      </div>
    </div>
  );
}
