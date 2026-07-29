import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, ArrowLeftRight, Save, Sparkles, ChevronDown, ChevronUp, Search, Dumbbell, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { hapticSuccess, hapticMedium } from "@/lib/haptics";
import { useAuth } from "@/hooks/useAuth";
import { getUserPreferences, saveUserPreferences } from "@/lib/user-preferences";
import { upsertUserPreferencesToCloud, upsertCustomWorkoutToCloud } from "@/lib/cloud-data";
import type { WorkoutDay, Exercise } from "@/lib/workout-data";
import { EXERCISE_LIBRARY } from "@/lib/exercise-library";
import { getAllCustomWorkouts } from "@/pages/WorkoutBuilder";
import {
  resolveSchedule,
  cloneWorkoutForCustomization,
  computeWeeklyMuscleVolume,
  getWeeklyVolumeTargets,
  autoFillDay,
  type ProgrammeGoal,
} from "@/lib/programme-customizer";
import { VolumeMeter } from "@/components/programme/VolumeMeter";
import { SubstitutionSheet } from "@/components/programme/SubstitutionSheet";

const CUSTOM_WORKOUTS_STORAGE_KEY = "ironkeeper_custom_workouts";

// Editable snapshot of a workout day — no icon (JSON-safe)
type EditableDay = Omit<WorkoutDay, "icon">;

const REP_RANGE_OPTIONS = ["3-5", "5-8", "6-10", "8-10", "8-12", "10-15", "12-15", "15-20"];

export default function ProgrammeEditor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const focusDayId = params.get("day");

  const [days, setDays] = useState<EditableDay[]>([]);
  const [goal, setGoal] = useState<ProgrammeGoal>("hypertrophy");
  const [expandedIdx, setExpandedIdx] = useState<number>(0);
  const [swapTarget, setSwapTarget] = useState<{ dayIdx: number; exIdx: number } | null>(null);
  const [addingToDay, setAddingToDay] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const initialized = useRef(false);

  // Load user's current schedule
  useEffect(() => {
    if (!user || initialized.current) return;
    const prefs = getUserPreferences(user.id);
    if (!prefs) {
      toast.error("No programme found — complete onboarding first.");
      navigate("/onboarding");
      return;
    }
    const customWorkouts = getAllCustomWorkouts();
    const resolved = resolveSchedule(prefs.schedule, customWorkouts);
    // Deduplicate by workout id (schedule may repeat e.g. Upper twice a week)
    const seen = new Set<string>();
    const uniqueDays: EditableDay[] = [];
    for (const w of resolved) {
      if (seen.has(w.id)) continue;
      seen.add(w.id);
      // Strip icon for editing
      const { icon: _icon, ...rest } = w;
      uniqueDays.push(rest);
    }
    setDays(uniqueDays);
    if (focusDayId) {
      const idx = uniqueDays.findIndex((d) => d.id === focusDayId);
      if (idx >= 0) setExpandedIdx(idx);
    }
    initialized.current = true;
  }, [user, navigate, focusDayId]);

  // Compute weekly volume across all edited days
  const volume = useMemo(() => computeWeeklyMuscleVolume(days), [days]);

  // ── Mutators ────────────────────────────────────────────────────────────────
  const markDirty = () => setDirty(true);

  const updateExercise = (dayIdx: number, exIdx: number, patch: Partial<Exercise>) => {
    setDays((prev) => {
      const next = [...prev];
      const dayCopy = { ...next[dayIdx], exercises: [...next[dayIdx].exercises] };
      dayCopy.exercises[exIdx] = { ...dayCopy.exercises[exIdx], ...patch };
      next[dayIdx] = dayCopy;
      return next;
    });
    markDirty();
  };

  const removeExercise = (dayIdx: number, exIdx: number) => {
    setDays((prev) => {
      const next = [...prev];
      const dayCopy = { ...next[dayIdx], exercises: next[dayIdx].exercises.filter((_, i) => i !== exIdx) };
      next[dayIdx] = dayCopy;
      return next;
    });
    markDirty();
    hapticMedium();
  };

  const addExercise = (dayIdx: number, lib: typeof EXERCISE_LIBRARY[number]) => {
    // Adopt the day's prevailing sets/reps if available
    const day = days[dayIdx];
    const first = day.exercises[0];
    const sets = first?.sets ?? 3;
    const reps = first?.reps ?? "8-10";
    const newEx: Exercise = {
      id: lib.id,
      name: lib.name,
      sets,
      reps,
      targetMuscle: lib.muscleGroup,
      notes: lib.description.split(".")[0],
    };
    setDays((prev) => {
      const next = [...prev];
      const dayCopy = { ...next[dayIdx], exercises: [...next[dayIdx].exercises, newEx] };
      next[dayIdx] = dayCopy;
      return next;
    });
    markDirty();
    hapticMedium();
  };

  const swapExercise = (opt: { id: string; name: string; targetMuscle: string }) => {
    if (!swapTarget) return;
    updateExercise(swapTarget.dayIdx, swapTarget.exIdx, {
      id: opt.id,
      name: opt.name,
      targetMuscle: opt.targetMuscle,
    });
    setSwapTarget(null);
    toast.success(`Swapped to ${opt.name}`);
  };

  const regenerateDay = (dayIdx: number) => {
    const targets = getWeeklyVolumeTargets(goal);
    // Split target equally across all days in current schedule (rough)
    const daysCount = Math.max(1, days.length);
    const perDay: Partial<Record<keyof typeof targets, number>> = {};
    (Object.keys(targets) as (keyof typeof targets)[]).forEach((m) => {
      perDay[m] = Math.max(0, Math.round(targets[m] / daysCount));
    });
    const day = days[dayIdx];
    const newExercises = autoFillDay(day, perDay, goal);
    if (newExercises.length === 0) {
      toast.error("Could not generate exercises for this day");
      return;
    }
    setDays((prev) => {
      const next = [...prev];
      next[dayIdx] = { ...next[dayIdx], exercises: newExercises };
      return next;
    });
    markDirty();
    hapticSuccess();
    toast.success(`Regenerated ${day.day} — ${newExercises.length} exercises`);
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    try {
      // Clone each edited day into a user-owned custom workout, preserving PRs.
      const prefs = getUserPreferences(user.id);
      if (!prefs) return;

      const idRemap = new Map<string, string>(); // original id → new custom id

      // Load existing customs
      const existing = getAllCustomWorkouts();
      const existingById = new Map<string, WorkoutDay>();
      for (const w of existing) existingById.set(w.id, w);

      for (const editable of days) {
        // If it's already a custom (id starts with "custom-"), just update in place
        const isCustom = editable.id.startsWith("custom-");
        const cloned = isCustom
          ? editable
          : cloneWorkoutForCustomization({ ...editable, icon: undefined as any }, user.id, editable.id);

        if (!isCustom) idRemap.set(editable.id, cloned.id);
        existingById.set(cloned.id, { ...cloned, icon: undefined as any } as WorkoutDay);

        // Fire-and-forget cloud write
        void upsertCustomWorkoutToCloud(user.id, cloned as WorkoutDay);
      }

      // Persist custom workouts to localStorage (used by Sessions / WorkoutSession)
      const toSave = Array.from(existingById.values()).map((w) => {
        const { icon: _icon, ...rest } = w;
        return rest;
      });
      localStorage.setItem(CUSTOM_WORKOUTS_STORAGE_KEY, JSON.stringify(toSave));

      // Remap the schedule to point at custom clones for anything we edited
      const newSchedule = prefs.schedule.map((entry) => {
        const remapped = idRemap.get(entry.workoutId);
        return remapped ? { ...entry, workoutId: remapped } : entry;
      });

      const nextPrefs = { ...prefs, schedule: newSchedule };
      saveUserPreferences(user.id, nextPrefs);
      void upsertUserPreferencesToCloud(user.id, nextPrefs);

      hapticSuccess();
      toast.success("Programme saved");
      setDirty(false);
      navigate("/sessions");
    } catch (e) {
      console.error("Save programme failed:", e);
      toast.error("Failed to save programme");
    }
  };

  return (
    <div className="min-h-screen bg-background safe-bottom pb-32">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border/40">
        <div className="mx-auto max-w-lg md:max-w-3xl px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="font-display text-base font-bold">Customize Programme</h1>
          <button
            onClick={handleSave}
            disabled={!dirty}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              dirty
                ? "bg-primary text-primary-foreground active:scale-95"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <Save className="h-3.5 w-3.5" /> Save
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-lg md:max-w-3xl px-4 pt-4 space-y-4">
        {/* Goal picker */}
        <div className="glass-card rounded-2xl p-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Volume goal</p>
          <div className="grid grid-cols-3 gap-2">
            {(["hypertrophy", "strength", "maintenance"] as ProgrammeGoal[]).map((g) => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold capitalize transition-all ${
                  goal === g
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Targets follow RP MEV/MAV/MRV. {goal === "strength" ? "Strength: fewer heavy sets." : goal === "maintenance" ? "Maintenance: MEV floor." : "Hypertrophy: MAV midpoint."}
          </p>
        </div>

        {/* Days */}
        <div className="space-y-3">
          {days.map((day, dayIdx) => {
            const isOpen = expandedIdx === dayIdx;
            return (
              <div key={day.id} className={`glass-card rounded-2xl overflow-hidden bg-gradient-to-br ${day.color}`}>
                <button
                  onClick={() => setExpandedIdx(isOpen ? -1 : dayIdx)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div>
                    <p className="font-display text-base font-bold">{day.name}</p>
                    <p className="text-[11px] text-muted-foreground">{day.exercises.length} exercises</p>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="px-3 pb-4 space-y-2">
                    {/* Auto-fill button */}
                    <button
                      onClick={() => regenerateDay(dayIdx)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold py-2 transition-colors"
                    >
                      <Wand2 className="h-3.5 w-3.5" /> Auto-fill from volume targets
                    </button>

                    {day.exercises.map((ex, exIdx) => (
                      <ExerciseRow
                        key={`${ex.id}-${exIdx}`}
                        exercise={ex}
                        onUpdate={(patch) => updateExercise(dayIdx, exIdx, patch)}
                        onSwap={() => setSwapTarget({ dayIdx, exIdx })}
                        onRemove={() => removeExercise(dayIdx, exIdx)}
                      />
                    ))}

                    <button
                      onClick={() => setAddingToDay(dayIdx)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 text-xs font-semibold py-2.5 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add exercise
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Volume meter */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-bold">Weekly volume</h2>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Working sets per muscle across your whole week. Aim for the green optimal band.
          </p>
          <VolumeMeter volume={volume} goal={goal} />
        </div>

        {/* Build from scratch link */}
        <button
          onClick={() => navigate("/builder")}
          className="w-full glass-card rounded-2xl p-4 flex items-center justify-between hover:ring-1 hover:ring-primary/30 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Build a workout from scratch</p>
              <p className="text-[11px] text-muted-foreground">Full builder with drag-and-drop</p>
            </div>
          </div>
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Swap sheet */}
      <SubstitutionSheet
        exercise={swapTarget ? days[swapTarget.dayIdx].exercises[swapTarget.exIdx] : null}
        onClose={() => setSwapTarget(null)}
        onSwap={swapExercise}
      />

      {/* Add exercise sheet */}
      <AddExerciseSheet
        open={addingToDay !== null}
        onClose={() => setAddingToDay(null)}
        onPick={(lib) => {
          if (addingToDay !== null) addExercise(addingToDay, lib);
          setAddingToDay(null);
        }}
      />

      {/* Bottom save bar */}
      {dirty && (
        <motion.div
          initial={{ y: 60 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 inset-x-0 z-30 bg-background/90 backdrop-blur border-t border-border/50 p-3 safe-bottom"
        >
          <div className="mx-auto max-w-lg md:max-w-3xl">
            <button
              onClick={handleSave}
              className="w-full rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground glow-primary active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" /> Save programme
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Exercise row ──────────────────────────────────────────────────────────────
function ExerciseRow({
  exercise,
  onUpdate,
  onSwap,
  onRemove,
}: {
  exercise: Exercise;
  onUpdate: (patch: Partial<Exercise>) => void;
  onSwap: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl bg-card/60 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{exercise.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{exercise.targetMuscle}</p>
        </div>
        <button onClick={onSwap} className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Swap">
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </button>
        <button onClick={onRemove} className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors" title="Remove">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Sets stepper */}
        <div className="flex items-center rounded-lg bg-muted/40 overflow-hidden">
          <button
            onClick={() => onUpdate({ sets: Math.max(1, exercise.sets - 1) })}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            −
          </button>
          <div className="flex-1 text-center">
            <p className="text-[9px] font-bold uppercase text-muted-foreground leading-none">Sets</p>
            <p className="text-sm font-bold tabular-nums leading-tight">{exercise.sets}</p>
          </div>
          <button
            onClick={() => onUpdate({ sets: Math.min(10, exercise.sets + 1) })}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            +
          </button>
        </div>

        {/* Reps picker */}
        <div className="flex items-center rounded-lg bg-muted/40 px-2">
          <div className="flex-1">
            <p className="text-[9px] font-bold uppercase text-muted-foreground leading-none">Reps</p>
            <select
              value={REP_RANGE_OPTIONS.includes(exercise.reps) ? exercise.reps : ""}
              onChange={(e) => onUpdate({ reps: e.target.value || exercise.reps })}
              className="w-full bg-transparent text-sm font-bold tabular-nums leading-tight outline-none"
            >
              {!REP_RANGE_OPTIONS.includes(exercise.reps) && <option value="">{exercise.reps}</option>}
              {REP_RANGE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add exercise sheet ────────────────────────────────────────────────────────
function AddExerciseSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (lib: typeof EXERCISE_LIBRARY[number]) => void;
}) {
  const [q, setQ] = useState("");
  useEffect(() => { if (!open) setQ(""); }, [open]);

  const results = useMemo(() => {
    if (q.length < 2) return EXERCISE_LIBRARY.slice(0, 30);
    const query = q.toLowerCase();
    return EXERCISE_LIBRARY
      .filter((e) => e.name.toLowerCase().includes(query) || e.muscleGroup.toLowerCase().includes(query))
      .slice(0, 50);
  }, [q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 inset-x-0 max-h-[80vh] bg-background rounded-t-3xl shadow-2xl flex flex-col safe-bottom"
      >
        <div className="p-4 border-b border-border/40 flex-shrink-0">
          <h3 className="font-display text-base font-bold mb-3">Add Exercise</h3>
          <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search exercises…"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {results.map((lib) => (
            <button
              key={lib.id}
              onClick={() => onPick(lib)}
              className="w-full flex items-center gap-3 rounded-xl bg-muted/30 hover:bg-muted/50 active:scale-[0.99] p-3 text-left transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                <Dumbbell className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{lib.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{lib.muscleGroup} · {lib.equipment}</p>
              </div>
            </button>
          ))}
          {results.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No exercises found.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
