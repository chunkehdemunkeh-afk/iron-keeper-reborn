import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Error fallback for failed queries / boundaries.
 *
 * @example
 * const { isError, refetch } = useQuery(...)
 * if (isError) return <ErrorState onRetry={refetch} />
 */
export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      title = "Something went wrong",
      description = "We couldn't load this section. Please try again.",
      onRetry,
      retryLabel = "Try again",
      className,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-8 min-h-[200px] gap-3 rounded-xl border border-destructive/30 bg-destructive/5",
        className,
      )}
      {...props}
    >
      <div className="rounded-full bg-destructive/10 p-3 text-destructive" aria-hidden>
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-lg text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <RefreshCw className="h-4 w-4" aria-hidden />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  ),
);
ErrorState.displayName = "ErrorState";
