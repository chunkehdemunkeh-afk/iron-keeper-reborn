import { WORKOUTS } from "@/lib/workout-data";
import { getAllCustomWorkouts } from "@/pages/WorkoutBuilder";
import { useNavigate } from "react-router-dom";
import { Play, Repeat2, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { getUserPreferences, getNextSplitDay } from "@/lib/user-preferences";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkoutHistory } from "@/lib/cloud-data";

export default function NextSessionCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const [overrideWorkoutId, setOverrideWorkoutId] = useState<string | null>(null);

  const prefs = user ? getUserPreferences(user.id) : null;

  const { data: history = [] } = useQuery({
    queryKey: ["workout-history", user?.id],
    queryFn: fetchWorkoutHistory,
    enabled: !!user && !!prefs,
  });

  const allWorkouts = [...WORKOUTS, ...getAllCustomWorkouts()];

  // Determine the "next up" workout from the user's split
  const nextSplitDay = useMemo(() => {
    if (!prefs?.schedule?.length) return null;
    const recent = history.map((h) => h.workoutId);
    return getNextSplitDay(prefs.schedule, recent);
  }, [prefs, history]);

  const splitNextWorkout = nextSplitDay
    ? allWorkouts.find((w) => w.id === nextSplitDay.next.workoutId)
    : null;

  const nextWorkout = overrideWorkoutId
    ? allWorkouts.find((w) => w.id === overrideWorkoutId) ?? splitNextWorkout
    : splitNextWorkout;

  // Workouts not in the split (for the "something different" dropdown)
  const splitWorkoutIds = new Set(prefs?.schedule?.map((d) => d.workoutId) ?? []);
  const otherWorkouts = allWorkouts.filter((w) => !splitWorkoutIds.has(w.id));

  // ── No preferences set: show all workouts (pre-onboarding or skipped) ──
  if (!prefs || !prefs.schedule?.length) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div
          className="flex items-center justify-between mb-2 cursor-pointer active:opacity-70 transition-opacity"
          onClick={() => navigate("/sessions")}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Choose Your Session
          </p>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-2.5">
          {allWorkouts.map((workout, i) => (
            <WorkoutButton key={workout.id} workout={workout} index={i} />
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Has a split: show themed "next up" + collapsible list ──
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      {/* Next up banner */}
      <div
        className="flex items-center justify-between mb-2 cursor-pointer active:opacity-70 transition-opacity"
        onClick={() => navigate("/sessions")}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Next Up
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5 font-medium">
            {prefs.splitName}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {nextWorkout && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(`/workout/${nextWorkout.id}`)}
          className={`w-full glass-card-elevated rounded-2xl overflow-hidden text-left transition-all hover:ring-1 hover:ring-primary/40 active:scale-[0.98] mb-2`}
        >
          <div className={`bg-gradient-to-br ${nextWorkout.color} p-4`}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 flex-shrink-0">
                <nextWorkout.icon className="h-5.5 w-5.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-foreground">{nextWorkout.name}</h3>
                  <span className="text-[9px] font-bold text-primary bg-primary/15 rounded-full px-2 py-0.5 uppercase tracking-wide">
                    Up Next
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{nextWorkout.focus}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground">{nextWorkout.exercises.length} ex</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
                  <Play className="h-4 w-4 fill-current text-primary-foreground" />
                </div>
              </div>
            </div>
          </div>
        </motion.button>
      )}

      {/* Rotation pills — tap to swap next up */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide mb-3">
        {prefs.schedule.map((day, i) => {
          const dayWorkout = allWorkouts.find((w) => w.id === day.workoutId);
          const DayIcon = dayWorkout?.icon;
          const isSelected = day.workoutId === nextWorkout?.id;
          return (
            <button
              key={i}
              onClick={() => {
                if (isSelected) {
                  setOverrideWorkoutId(null);
                } else {
                  setOverrideWorkoutId(day.workoutId);
                }
              }}
              className={`flex-shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95 ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {DayIcon && <DayIcon className="h-2.5 w-2.5" />}
              {day.label}
            </button>
          );
        })}
      </div>

      {/* Switch it out — workouts not in the split */}
      {otherWorkouts.length > 0 && (
        <>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <Repeat2 className="h-3.5 w-3.5" />
            Something outside your split?
            {showAll ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <AnimatePresence>
            {showAll && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-2"
              >
                {otherWorkouts.map((workout, i) => (
                  <WorkoutButton key={workout.id} workout={workout} index={i} compact />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

function WorkoutButton({ workout, index, compact = false }: {
  workout: import("@/lib/workout-data").WorkoutDay;
  index: number;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const Icon = workout.icon;
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/workout/${workout.id}`)}
      className="w-full glass-card-elevated rounded-2xl overflow-hidden text-left transition-all hover:ring-1 hover:ring-primary/30 active:scale-[0.98]"
    >
      <div className={`bg-gradient-to-br ${workout.color} ${compact ? "p-3" : "p-4"}`}>
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center rounded-xl bg-primary/15 flex-shrink-0 ${compact ? "h-8 w-8" : "h-10 w-10"}`}>
            <Icon className={compact ? "h-4 w-4 text-primary" : "h-5 w-5 text-primary"} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-display font-bold text-foreground ${compact ? "text-sm" : "text-base"}`}>{workout.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{workout.focus}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{workout.exercises.length} ex</span>
            <div className={`flex items-center justify-center rounded-lg gradient-primary ${compact ? "h-7 w-7" : "h-8 w-8"}`}>
              <Play className={`fill-current text-primary-foreground ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
