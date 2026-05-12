import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Standardised empty state.
 *
 * @example
 * <EmptyState
 *   icon={Dumbbell}
 *   title="No workouts yet"
 *   description="Start a session to see it here."
 *   action={<Button onClick={...}>Start workout</Button>}
 * />
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon: Icon, title, description, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        className={cn(
          "flex flex-col items-center justify-center text-center px-6 py-10 min-h-[200px] gap-3",
          className,
        )}
        {...props}
      >
        {Icon ? (
          <div className="rounded-full bg-muted p-3 text-muted-foreground" aria-hidden>
            <Icon className="h-6 w-6" />
          </div>
        ) : null}
        <div className="space-y-1">
          <h3 className="font-display text-lg text-foreground">{title}</h3>
          {description ? (
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
          ) : null}
        </div>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    );
  },
);
EmptyState.displayName = "EmptyState";
