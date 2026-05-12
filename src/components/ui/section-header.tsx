import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard section header with optional subtitle and right-aligned action.
 *
 * @example
 * <SectionHeader title="History" subtitle="Last 30 days" action={<Button>Export</Button>} />
 */
export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
}

export const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ title, subtitle, action, as: Heading = "h2", className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-end justify-between gap-3 mb-3", className)}
      {...props}
    >
      <div className="min-w-0">
        <Heading className="font-display text-xl tracking-tight text-foreground truncate">
          {title}
        </Heading>
        {subtitle ? (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  ),
);
SectionHeader.displayName = "SectionHeader";
