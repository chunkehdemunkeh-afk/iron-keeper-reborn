import { Loader2, ArrowDown } from "lucide-react";

interface Props {
  pull: number;
  refreshing: boolean;
  armed: boolean;
  threshold?: number;
}

/**
 * Floating top indicator that mirrors `usePullToRefresh` state.
 * Drop in at the top of a page that uses the hook.
 */
export default function PullToRefreshIndicator({
  pull,
  refreshing,
  armed,
  threshold = 70,
}: Props) {
  const visible = pull > 0 || refreshing;
  if (!visible) return null;

  const progress = Math.min(1, pull / threshold);

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-50 -translate-x-1/2"
      style={{
        top: `calc(env(safe-area-inset-top, 0px) + ${Math.min(pull, 80) - 40}px)`,
        opacity: Math.min(1, progress + 0.2),
        transition: refreshing ? "top 0.2s ease, opacity 0.2s ease" : "none",
      }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-card hairline border shadow-lg">
        {refreshing ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <ArrowDown
            className={`h-4 w-4 transition-all ${armed ? "text-primary rotate-180" : "text-muted-foreground"}`}
          />
        )}
      </div>
    </div>
  );
}
