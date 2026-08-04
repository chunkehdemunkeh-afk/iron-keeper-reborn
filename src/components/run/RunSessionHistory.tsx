import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ChevronDown, CalendarDays } from "lucide-react";
import { useRunSessionHistory } from "@/hooks/queries/useRunSessionHistory";
import { formatSplit, formatDelta } from "@/lib/run-splits";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

function pace(secPerKm: number) {
  return `${formatSplit(secPerKm)}/km`;
}

export default function RunSessionHistory({ goalPace }: { goalPace: number }) {
  const { data: sessions, isLoading } = useRunSessionHistory(goalPace);
  const [open, setOpen] = useState<string | null>(null);

  if (isLoading) return <LoadingState label="Loading run history" />;
  if (!sessions?.length) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No run sessions logged"
        description="Finish a run from the half marathon plan and every split you time will appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => {
        const expanded = open === s.id;
        const allHit = s.paced > 0 && s.hit === s.paced;
        return (
          <div key={s.id} className="glass-card rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpen(expanded ? null : s.id)}
              className="w-full flex items-center gap-3 p-3.5 text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{s.workoutName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(s.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  {s.totalMetres > 0 && ` · ${(s.totalMetres / 1000).toFixed(1)} km`}
                  {s.durationMin > 0 && ` · ${s.durationMin} min`}
                </p>
              </div>
              {s.paced > 0 && (
                <span
                  className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                    allHit ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.hit}/{s.paced} splits
                </span>
              )}
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3.5 pb-3.5 space-y-1.5">
                    {s.splits.map((sp, i) => (
                      <div
                        key={`${sp.exerciseId}-${i}`}
                        className="flex items-center gap-2.5 rounded-xl bg-card/60 hairline border px-3 py-2"
                      >
                        <span
                          className={`h-5 w-5 shrink-0 rounded-full flex items-center justify-center ${
                            sp.achieved === null
                              ? "bg-muted text-muted-foreground"
                              : sp.achieved
                                ? "bg-success/15 text-success"
                                : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          {sp.achieved === null ? (
                            <span className="text-[10px]">–</span>
                          ) : sp.achieved ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{sp.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {sp.metres > 0 && `${sp.metres} m · `}
                            {pace(sp.paceSecPerKm)}
                            {sp.targetSeconds !== null && ` · target ${formatSplit(sp.targetSeconds)}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-sm font-bold tabular-nums">{formatSplit(sp.seconds)}</p>
                          {sp.targetSeconds !== null && (
                            <p
                              className={`text-[10px] font-semibold ${
                                sp.achieved ? "text-success" : "text-destructive"
                              }`}
                            >
                              {formatDelta(sp.seconds, sp.targetSeconds)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {s.splits.length === 0 && (
                      <p className="text-xs text-muted-foreground">No timed splits logged in this session.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
