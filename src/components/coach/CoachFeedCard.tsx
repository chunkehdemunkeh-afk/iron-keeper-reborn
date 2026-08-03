import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Clock, Trophy, Flame, MessageSquare, CheckCircle2, Star,
} from "lucide-react";
import { format } from "date-fns";
import type { FeedSession } from "@/lib/data/coach-feed-queries";
import AthleteAvatar from "@/components/coach/AthleteAvatar";

interface Props {
  session: FeedSession;
  onComment: (session: FeedSession) => void;
  onToggleReview: (session: FeedSession) => void;
  onOpenAthlete?: (athleteId: string) => void;
}

function formatSetValue(reps: number, weight: number, isTimeBased: boolean) {
  if (isTimeBased) {
    if (reps >= 60) return `${Math.floor(reps / 60)}:${String(reps % 60).padStart(2, "0")}`;
    return `${reps}s`;
  }
  if (weight > 0) return `${reps} × ${weight} kg`;
  return `${reps} reps`;
}

export default function CoachFeedCard({ session, onComment, onToggleReview, onOpenAthlete }: Props) {
  const [open, setOpen] = useState(false);
  const reviewed = !!session.reviewedAt;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: reviewed ? 0.65 : 1, y: 0 }}
      className="rounded-2xl bg-card hairline border overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button onClick={() => onOpenAthlete?.(session.athleteId)} aria-label={`Open ${session.athleteName}`}>
            <AthleteAvatar name={session.athleteName} url={session.athleteAvatar} size={38} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">{session.athleteName}</p>
              {reviewed && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {session.workoutName} · {format(new Date(session.date), "HH:mm")}
            </p>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40"
            aria-label={open ? "Collapse session" : "Expand session"}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Headline metrics */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {session.duration} min
          </span>
          <span className="tabular-nums">
            <strong className="text-foreground">{session.totalVolume.toLocaleString()}</strong> kg volume
          </span>
          <span className="tabular-nums">
            <strong className="text-foreground">{session.workingSets}</strong> sets
          </span>
          <span className="tabular-nums">
            {session.exercisesCompleted}/{session.totalExercises} done
          </span>
          {session.prCount > 0 && (
            <span className="inline-flex items-center gap-1 text-primary font-semibold">
              <Trophy className="h-3 w-3" />
              {session.prCount} PR{session.prCount > 1 ? "s" : ""}
            </span>
          )}
          {session.caloriesBurned != null && (
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3 w-3" />
              {session.caloriesBurned} kcal
            </span>
          )}
          {session.effortRating != null && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3" />
              Effort {session.effortRating}/5
            </span>
          )}
        </div>

        {session.sessionNotes && (
          <p className="mt-3 rounded-xl bg-muted/30 px-3 py-2 text-xs italic text-muted-foreground">
            “{session.sessionNotes}”
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => onComment(session)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-muted/40 px-3 py-2 text-xs font-semibold hover:bg-muted/60 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Comment
          </button>
          <button
            onClick={() => onToggleReview(session)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              reviewed
                ? "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                : "bg-primary/15 text-primary hover:bg-primary/25"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {reviewed ? "Reviewed" : "Mark reviewed"}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden hairline border-t bg-muted/10"
          >
            <div className="p-4 space-y-3">
              {session.exercises.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No sets recorded.</p>
              ) : (
                session.exercises.map((ex) => (
                  <div key={ex.exerciseId}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold truncate">{ex.name}</p>
                      {!ex.isTimeBased && ex.volume > 0 && (
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                          {Math.round(ex.volume).toLocaleString()} kg
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {ex.sets.map((s, i) => {
                        const warmup = s.setType === "warmup";
                        const missedTarget =
                          !warmup && s.targetReps != null && s.reps < s.targetReps;
                        return (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] tabular-nums hairline border ${
                              warmup
                                ? "bg-orange-500/10 border-orange-500/30 text-orange-500"
                                : s.isPr
                                  ? "bg-primary/15 border-primary/40 text-primary font-semibold"
                                  : missedTarget
                                    ? "bg-destructive/10 border-destructive/30"
                                    : "bg-card"
                            }`}
                          >
                            {warmup ? "WU" : s.index}
                            <span className="text-foreground/80">
                              {formatSetValue(s.reps, s.weight, ex.isTimeBased)}
                            </span>
                            {s.rir != null && !warmup && (
                              <span className="text-muted-foreground">RIR {s.rir}</span>
                            )}
                            {s.isPr && <Trophy className="h-3 w-3" />}
                          </span>
                        );
                      })}
                    </div>
                    {ex.sets.some((s) => s.targetWeight != null) && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Target: {ex.sets.find((s) => s.targetWeight != null)?.targetWeight} kg ×{" "}
                        {ex.sets.find((s) => s.targetReps != null)?.targetReps ?? "—"}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
