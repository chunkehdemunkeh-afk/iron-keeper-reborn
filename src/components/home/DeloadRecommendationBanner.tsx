import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BatteryLow, X, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActiveDeload, useDeloadActions } from "@/hooks/queries/useDeload";

export default function DeloadRecommendationBanner() {
  const { data: rec } = useActiveDeload();
  const { accept, dismiss, isAccepting } = useDeloadActions();
  const [open, setOpen] = useState(false);

  if (!rec || rec.status !== "pending") return null;
  const reasons = rec.signals?.reasons ?? [];
  const headline = reasons[0] ?? "Several recovery signals are flagging up";

  return (
    <>
      <AnimatePresence>
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          onClick={() => setOpen(true)}
          className="w-full glass-card rounded-xl p-3 flex items-center gap-3 text-left ring-1 ring-amber-500/30"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 flex-shrink-0">
            <BatteryLow className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Deload week suggested</p>
            <p className="text-[11px] text-muted-foreground truncate">{headline}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              dismiss(rec.id);
            }}
            className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        </motion.button>
      </AnimatePresence>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <BatteryLow className="h-4 w-4 text-amber-500" />
              Deload week suggested
            </SheetTitle>
            <SheetDescription>
              Based on your logged training, a lighter week will help you super-compensate
              and come back stronger.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-border/40 bg-card/40 p-3 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                Why now
              </p>
              <ul className="space-y-1.5">
                {reasons.map((r, i) => (
                  <li key={i} className="text-sm text-foreground flex gap-2">
                    <span className="text-amber-500">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border/40 bg-card/40 p-3 space-y-1.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                What you'll do this week
              </p>
              <p className="text-sm text-foreground">
                ~60% of your normal working weights, half the working sets, bottom of the
                rep range, stop ≥3 reps in reserve. Cardio and stretching stay the same.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => dismiss(rec.id)}
                className="flex-1 rounded-xl border border-border/60 bg-card/40 py-3 text-sm font-semibold text-muted-foreground active:scale-[0.98] transition-transform"
              >
                Push through
              </button>
              <button
                onClick={() => {
                  accept(rec.id);
                  setOpen(false);
                }}
                disabled={isAccepting}
                className="flex-1 rounded-xl bg-amber-500 text-white py-3 text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                Start deload week
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
