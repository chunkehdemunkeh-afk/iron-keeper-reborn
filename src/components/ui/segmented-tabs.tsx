import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentedTabsOption<T extends string = string> {
  value: T;
  label: string;
}

interface Props<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedTabsOption<T>[];
  className?: string;
  layoutId?: string;
}

/**
 * Premium filled-pill segmented control. Used across Progress / Ranks for
 * a consistent tab look — active option gets a soft amber pill that
 * smoothly slides between options via framer-motion `layoutId`.
 */
export function SegmentedTabs<T extends string = string>({
  value,
  onChange,
  options,
  className,
  layoutId = "segmented-pill",
}: Props<T>) {
  return (
    <div
      className={cn(
        "relative inline-flex w-full items-center gap-1 rounded-full bg-card/60 hairline border p-1",
        className,
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-primary shadow-[0_2px_10px_-2px_hsl(var(--primary)/0.5)]"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
