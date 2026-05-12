import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Centred spinner with screen-reader label.
 *
 * @example <LoadingState label="Loading workouts" />
 */
export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ label = "Loading", className, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-center py-10 min-h-[160px]", className)}
      {...props}
    >
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">{label}…</span>
    </div>
  ),
);
LoadingState.displayName = "LoadingState";

/**
 * List of placeholder skeletons. Sized to approximate real content.
 *
 * @example <SkeletonList rows={4} variant="card" />
 */
export interface SkeletonListProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  variant?: "card" | "row" | "stat";
}

const VARIANT_CLASS: Record<NonNullable<SkeletonListProps["variant"]>, string> = {
  card: "h-24 rounded-xl",
  row: "h-12 rounded-md",
  stat: "h-20 rounded-lg",
};

export const SkeletonList = React.forwardRef<HTMLDivElement, SkeletonListProps>(
  ({ rows = 4, variant = "card", className, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("space-y-3", className)}
      {...props}
    >
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn("w-full", VARIANT_CLASS[variant])} />
      ))}
    </div>
  ),
);
SkeletonList.displayName = "SkeletonList";
