import { useState, useMemo } from "react";
import { WORKOUTS, type CompletedWorkout } from "@/lib/workout-data";
import { ACCESSORY_ROUTINES, ACCESSORY_SUBSTITUTIONS } from "@/lib/accessory-routines";
import { EXERCISE_LIBRARY } from "@/lib/exercise-library";
import { EXERCISE_SUBSTITUTIONS } from "@/lib/exercise-substitutions";
import { resolveExerciseName } from "@/lib/exercise-names";
import { stripExerciseSuffixes } from "@/lib/muscle-mapping";
import { Clock, Check, Trash2, ChevronDown, ChevronUp, AlertTriangle, Star, MessageSquare, Dumbbell, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, animate, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import type { PanInfo } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface WorkoutCardProps {
  workout: CompletedWorkout;
  icon: LucideIcon;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  defaultExpanded?: boolean;
}

export default function WorkoutCard({ workout: w, icon: Icon, onDelete, isDeleting, defaultExpanded = false }: WorkoutCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const x = useMotionValue(0);
  const deleteBgOpacity = useTransform(x, [-110, -40], [1, 0]);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x < -90) {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      setShowDeleteDialog(true);
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  }

  // Build a comprehensive lookup across every exercise source the app knows about,
  // so set rows can resolve a friendly name even when the DB stored the raw ID
  // (e.g. legacy cable-attachment rows like "up1-mag-grip" or library rows like "lib-44").
  const { metaById, nameById } = useMemo(() => {
    const meta: Record<string, { name: string; repLabel?: string; weightLabel?: string; trackWeight?: boolean; notes?: string }> = {};
    const names: Record<string, string> = {};

    // Built-in workouts + their substitutes
    for (const wk of WORKOUTS) {
      for (const ex of wk.exercises) {
        meta[ex.id] = { name: ex.name, repLabel: ex.repLabel, weightLabel: ex.weightLabel, trackWeight: ex.trackWeight, notes: ex.notes };
        names[ex.id] = ex.name;
      }
    }
    Object.values(EXERCISE_SUBSTITUTIONS).flat().forEach((sub: { id: string; name: string }) => {
      if (sub?.id && sub?.name) { names[sub.id] = sub.name; meta[sub.id] = meta[sub.id] ?? { name: sub.name }; }
    });

    // Accessory routines + their substitutes
    for (const r of ACCESSORY_ROUTINES) {
      for (const ex of r.exercises) {
        meta[ex.id] = { name: ex.name, repLabel: ex.repLabel, weightLabel: ex.weightLabel, trackWeight: ex.trackWeight, notes: ex.notes };
        names[ex.id] = ex.name;
      }
    }
    Object.values(ACCESSORY_SUBSTITUTIONS).flat().forEach((sub: { id: string; name: string }) => {
      if (sub?.id && sub?.name) { names[sub.id] = sub.name; meta[sub.id] = meta[sub.id] ?? { name: sub.name }; }
    });

    // Exercise library
    for (const ex of EXERCISE_LIBRARY) {
      names[ex.id] = ex.name;
      meta[ex.id] = meta[ex.id] ?? { name: ex.name };
    }

    return { metaById: meta, nameById: names };
  }, []);

  const getExerciseMeta = (id: string) => {
    const base = stripExerciseSuffixes(id);
    return metaById[id] ?? metaById[base];
  };

  const resolveName = (s: { exerciseId: string; exerciseName?: string }): string => {
    const base = stripExerciseSuffixes(s.exerciseId);
    return (
      nameById[s.exerciseId] ??
      nameById[base] ??
      resolveExerciseName(s.exerciseId, s.exerciseName)
    );
  };

  // Group sets by exercise, preserving order. Each group splits warm-ups from
  // working sets so they render as visually distinct sections (warm-ups don't
  // hijack "Set 1/2" of the working table).
  type GroupedSet = { exerciseId: string; reps: number; weight: number; name: string; setType: "working" | "warmup" | "1rm_test" };
  const groupedSets: [string, { working: GroupedSet[]; warmups: GroupedSet[] }][] = [];
  const seen = new Set<string>();
  for (const s of w.sets) {
    const name = resolveName(s);
    const setType = (s as { setType?: "working" | "warmup" | "1rm_test" }).setType ?? "working";
    if (!seen.has(name)) {
      seen.add(name);
      groupedSets.push([name, { working: [], warmups: [] }]);
    }
    const bucket = groupedSets.find(([n]) => n === name)![1];
    const row: GroupedSet = { ...s, name, setType };
    if (setType === "warmup") bucket.warmups.push(row);
    else bucket.working.push(row);
  }


  const totalVolume = w.sets
    .filter((s) => getExerciseMeta(s.exerciseId)?.trackWeight !== false)
    .filter((s) => ((s as { setType?: string }).setType ?? "working") !== "warmup")
    .reduce((sum, s) => sum + s.weight * s.reps, 0);

  const effortLabels = ["", "Easy", "Light", "Moderate", "Hard", "Max effort"];

  return (
    <>
    <motion.div
      layout
      className={`glass-card rounded-2xl overflow-hidden transition-all ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* ── Swipeable header ── */}
      <div className="relative overflow-hidden">
        <motion.div
          style={{ opacity: deleteBgOpacity }}
          className="absolute inset-0 flex items-center justify-end pr-5 bg-destructive rounded-t-2xl"
        >
          <Trash2 className="h-5 w-5 text-white" />
        </motion.div>
        <motion.div
          style={{ x, touchAction: "pan-y" }}
          drag="x"
          dragConstraints={{ left: -120, right: 0 }}
          dragElastic={{ left: 0.1, right: 0 }}
          onDragEnd={handleDragEnd}
          className="relative p-4 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
        {/* Top row: icon + name + chevron */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{w.workoutName}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {new Date(w.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="p-1.5 rounded-lg text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1 flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">{w.duration}m</span>
          </div>
          <div className="flex-1 flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5">
            <Check className="h-3.5 w-3.5 text-success" />
            <span className="text-xs font-semibold text-foreground">{w.exercisesCompleted}/{w.totalExercises} ex</span>
          </div>
          {totalVolume > 0 && (
            <div className="flex-1 flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5">
              <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">{(totalVolume / 1000).toFixed(1)}t</span>
            </div>
          )}
          {w.effortRating && (
            <div className="flex-1 flex items-center gap-1 rounded-lg bg-muted/40 px-2.5 py-1.5">
              {Array.from({ length: w.effortRating }).map((_, i) => (
                <Star key={i} className="h-2.5 w-2.5 text-primary fill-primary" />
              ))}
            </div>
          )}
        </div>
        </motion.div>
      </div>

      {/* ── Expanded exercise breakdown ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <div className="h-px bg-border/50" />

              {groupedSets.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No set data recorded</p>
              ) : (
                groupedSets.map(([name, { working, warmups }]) => {
                  const refSet = working[0] ?? warmups[0];
                  const ex = getExerciseMeta(refSet.exerciseId);
                  const isTimeBased = ex?.repLabel === "Sec";
                  const showWeight = ex?.trackWeight !== false;
                  const weightLabel = ex?.weightLabel || "Kg";
                  const repHeader = isTimeBased ? "Time" : (ex?.repLabel || "Reps");
                  return (
                  <div key={name} className="glass-card rounded-xl overflow-hidden">
                    {/* Exercise header */}
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-success/20 text-success text-[10px] font-bold flex-shrink-0">
                          <Check className="h-3 w-3" />
                        </span>
                        <p className="text-sm font-medium text-foreground flex-1">{name}</p>
                        <span className="text-[10px] text-muted-foreground bg-muted/50 rounded-md px-1.5 py-0.5">
                          {working.length} {working.length === 1 ? "set" : "sets"}
                        </span>
                      </div>
                      {ex?.notes ? (
                        <p className="text-[11px] text-muted-foreground mt-1.5 ml-[34px] leading-relaxed">{ex.notes}</p>
                      ) : null}
                    </div>

                    {/* Warm-up sub-section (only if any) */}
                    {warmups.length > 0 && (
                      <div className="px-3 pb-2">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Flame className="h-3 w-3 text-orange-400" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-400/90">
                            Warm-up
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            · {warmups.length} {warmups.length === 1 ? "set" : "sets"}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {warmups.map((s, si) => (
                            <div
                              key={`wu-${si}`}
                              className="flex items-center gap-2 rounded-md bg-orange-400/5 border border-orange-400/15 px-2.5 py-1.5"
                            >
                              <Flame className="h-3 w-3 text-orange-400/70 flex-shrink-0" />
                              <span className="text-xs text-orange-400/90 font-medium">
                                {showWeight && s.weight > 0 ? `${s.weight}${(ex?.weightLabel || "kg").toLowerCase()} × ${s.reps}` : `${s.reps} reps`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {working.length > 0 && (
                      <>
                        {/* Column headers */}
                        <div className="grid grid-cols-[28px_1fr_1fr_36px] gap-x-1.5 items-center px-3 pb-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          <span className="text-center">Set</span>
                          <span className="text-center">{weightLabel}</span>
                          <span className="text-center">{repHeader}</span>
                          <span className="text-center">✓</span>
                        </div>

                        {/* Working set rows */}
                        <div className="px-3 pb-2.5 space-y-1">
                          {working.map((s, si) => {
                            return (
                              <div
                                key={si}
                                className="grid grid-cols-[28px_1fr_1fr_36px] gap-x-1.5 items-center"
                              >
                                <span className="text-xs font-medium text-center text-success">{si + 1}</span>
                                {isTimeBased ? (
                                  <div className="col-span-2 h-9 rounded-lg bg-success/15 border border-success/40 flex items-center justify-center">
                                    <span className="text-sm font-semibold text-success">{s.reps}s</span>
                                  </div>
                                ) : (
                                  <>
                                    <div className={`h-9 rounded-lg flex items-center justify-center ${showWeight && s.weight > 0 ? "bg-success/15 border border-success/40" : "bg-muted/40 border border-border/50"}`}>
                                      <span className={`text-sm font-semibold ${showWeight && s.weight > 0 ? "text-success" : "text-muted-foreground"}`}>
                                        {showWeight ? (s.weight || "—") : "—"}
                                      </span>
                                    </div>
                                    <div className="h-9 rounded-lg bg-success/15 border border-success/40 flex items-center justify-center">
                                      <span className="text-sm font-semibold text-success">{s.reps}</span>
                                    </div>
                                  </>
                                )}
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success text-success-foreground">
                                  <Check className="h-3.5 w-3.5" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  );
                })
              )}

              {/* Session notes */}
              {w.sessionNotes && (
                <div className="glass-card rounded-xl p-3 flex gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Session Note</p>
                    <p className="text-xs text-foreground">{w.sessionNotes}</p>
                  </div>
                </div>
              )}

              {/* Effort rating */}
              {w.effortRating && (
                <div className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < w.effortRating! ? "text-primary fill-primary" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{effortLabels[w.effortRating]}</span>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>

    {/* Delete confirmation dialog — triggered by swipe */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 mb-1">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <AlertDialogTitle>Delete workout session?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your <span className="font-medium text-foreground">{w.workoutName}</span> session and all its set data. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { setShowDeleteDialog(false); onDelete(w.id); }}
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
