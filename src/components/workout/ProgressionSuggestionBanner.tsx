import { motion } from "framer-motion";
import { TrendingUp, Check, X } from "lucide-react";
import type { ProgressionRow } from "@/lib/data/progression-queries";
import { useProgressionActions } from "@/hooks/queries/useProgressions";

interface Props {
  progression: ProgressionRow;
  onApplied?: (sug: { weight: number; repsLow: number; repsHigh: number }) => void;
}

/**
 * Inline progression suggestion shown above an exercise card.
 * Renders only when `progression.pendingSuggestion` is non-null.
 */
export default function ProgressionSuggestionBanner({ progression, onApplied }: Props) {
  const { accept, dismiss } = useProgressionActions();
  const sug = progression.pendingSuggestion;
  if (!sug) return null;

  const handleAccept = () => {
    accept(progression.exerciseId);
    onApplied?.({
      weight: sug.suggestedWeight,
      repsLow: sug.suggestedRepsLow,
      repsHigh: sug.suggestedRepsHigh,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="mb-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm"
    >
      <div className="flex items-start gap-2">
        <TrendingUp className="h-4 w-4 text-success mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-success">
            Progress: {sug.prevWeight}kg → {sug.suggestedWeight}kg × {sug.suggestedRepsLow}-{sug.suggestedRepsHigh}
          </div>
          {sug.triggerWeight ? (
            <div className="text-xs text-foreground/80">
              You hit {sug.triggerReps} reps @ {sug.triggerWeight}kg
              {sug.repsOver > 0 ? ` (${sug.repsOver} over the ${sug.suggestedRepsHigh} cap)` : ""}
            </div>
          ) : null}
          <div className="text-xs text-muted-foreground">{sug.reason}</div>
        </div>
        <button
          onClick={handleAccept}
          className="rounded-md bg-success px-2 py-1 text-xs font-semibold text-success-foreground flex items-center gap-1"
          aria-label="Apply progression"
        >
          <Check className="h-3 w-3" />
          Apply
        </button>
        <button
          onClick={() => dismiss(progression.exerciseId)}
          className="rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground"
          aria-label="Dismiss progression"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}
