import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptics";

/**
 * Shared layout primitives for the refreshed UI.
 * One section header + one navigation tile style used across the app so every
 * screen reads with the same hierarchy.
 */

export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3 mb-2", className)}>
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function NavTile({
  icon: Icon,
  label,
  description,
  onClick,
  accent = false,
  badge,
  index = 0,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick: () => void;
  accent?: boolean;
  badge?: string | number;
  index?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.03 }}
      onClick={() => {
        hapticLight();
        onClick();
      }}
      className="w-full glass-card rounded-2xl p-3.5 flex items-center gap-3 text-left transition-transform active:scale-[0.99]"
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          accent ? "bg-primary/15" : "bg-muted/50",
        )}
      >
        <Icon className={cn("h-5 w-5", accent ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-bold leading-tight">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{description}</p>
        )}
      </div>
      {badge !== undefined && badge !== 0 && (
        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
          {badge}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </motion.button>
  );
}
