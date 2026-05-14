import { WEEK_DAYS, WORKOUTS } from "@/lib/workout-data";
import { fetchWorkoutHistory, fetchActivityLogs, saveActivityLog, deleteActivityLog, deleteWorkoutFromCloud, ACTIVITY_PRESETS, type ActivityLog } from "@/lib/cloud-data";
import type { CompletedWorkout } from "@/lib/workout-data";
import { useEffect, useState, useCallback } from "react";
import { motion, animate, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { CheckCircle2, Circle, X, Dumbbell, Clock, Bed, Plus, Trash2, Footprints, Waves, Bike, Flower, CircleDot, Pencil, Activity, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { hapticMedium } from "@/lib/haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/query-keys";

function SwipeToDeleteCard({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-110, -40], [1, 0]);

  function handleDragEnd(_: any, info: PanInfo) {
    if (info.offset.x < -90) {
      onDelete();
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0 flex items-center justify-end pr-4 bg-destructive rounded-xl">
        <Trash2 className="h-4 w-4 text-white" />
      </motion.div>
      <motion.div
        style={{ x, touchAction: "pan-y" }}
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={{ left: 0.1, right: 0 }}
        onDragEnd={handleDragEnd}
        className="glass-card rounded-xl p-3.5"
      >
        {children}
      </motion.div>
    </div>
  );
}
const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  rest: Bed,
  walk: Footprints,
  running: Activity,
  swimming: Waves,
  cycling: Bike,
  yoga: Flower,
  football: CircleDot,
  other: Pencil,
};

export default function WeekStrip() {
  const todayIndex = new Date().getDay();
  const [completedDays, setCompletedDays] = useState<Record<number, CompletedWorkout[]>>({});
  const [activityDays, setActivityDays] = useState<Record<number, ActivityLog[]>>({});
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [logSheetDay, setLogSheetDay] = useState<number | null>(null);
  const [logDuration, setLogDuration] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logDistance, setLogDistance] = useState("");
  const [logIncline, setLogIncline] = useState("");
  const [pendingType, setPendingType] = useState<{ type: string; label: string } | null>(null);
  const [otherLabel, setOtherLabel] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const getDateForDayIndex = useCallback((dayIdx: number) => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const target = new Date(weekStart);
    target.setDate(weekStart.getDate() + dayIdx);
    // Use local date to avoid UTC timezone shift
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  useEffect(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    fetchWorkoutHistory().then((history) => {
      const dayMap: Record<number, CompletedWorkout[]> = {};
      history.forEach((w) => {
        const d = new Date(w.date);
        if (d >= weekStart) {
          const dayIdx = d.getDay();
          if (!dayMap[dayIdx]) dayMap[dayIdx] = [];
          dayMap[dayIdx].push(w);
        }
      });
      setCompletedDays(dayMap);
    });

    fetchActivityLogs().then((logs) => {
      const dayMap: Record<number, ActivityLog[]> = {};
      logs.forEach((a) => {
        const d = new Date(a.date + "T00:00:00");
        if (d >= weekStart) {
          const dayIdx = d.getDay();
          if (!dayMap[dayIdx]) dayMap[dayIdx] = [];
          dayMap[dayIdx].push(a);
        }
      });
      setActivityDays(dayMap);
    });
  }, [refreshKey]);

  const allExercises = WORKOUTS.flatMap((w) => w.exercises);
  const getExerciseMeta = (id: string) => allExercises.find((e) => e.id === id);

  const formatSet = (s: { exerciseId: string; reps: number; weight: number }) => {
    const ex = getExerciseMeta(s.exerciseId);
    const isTimeBased = ex?.repLabel === "Sec";
    if (isTimeBased) return `${s.reps}s`;
    const showWeight = ex?.trackWeight !== false;
    if (showWeight && s.weight > 0) return `${s.weight}kg×${s.reps}`;
    return `${s.reps} ${(ex?.repLabel || "reps").toLowerCase()}`;
  };

  const SUPPORTS_DISTANCE = new Set(["walk", "running", "cycling", "swimming"]);
  const SUPPORTS_INCLINE = new Set(["walk", "running"]);

  const handlePresetClick = (activityType: string, label: string) => {
    if (activityType === "other") {
      setShowOtherInput(true);
      return;
    }
    if (activityType === "rest") {
      // Rest day logs instantly with no extra inputs
      handleLogActivity(activityType, label);
      return;
    }
    // For everything else, open the detail form so user can add duration/distance
    setPendingType({ type: activityType, label });
  };

  const handleLogActivity = async (activityType: string, label: string) => {
    if (logSheetDay === null) return;
    const dateStr = getDateForDayIndex(logSheetDay);
    const success = await saveActivityLog({
      date: dateStr,
      activityType,
      label,
      duration: logDuration ? parseInt(logDuration) : 0,
      notes: logNotes.trim() || undefined,
      distanceKm: logDistance ? parseFloat(logDistance) : null,
      inclinePct: logIncline ? parseInt(logIncline) : null,
    });
    if (success) {
      hapticMedium();
      toast.success(`${label} logged!`);
      setLogSheetDay(null);
      setLogDuration("");
      setLogNotes("");
      setLogDistance("");
      setLogIncline("");
      setOtherLabel("");
      setPendingType(null);
      setShowOtherInput(false);
      setRefreshKey((k) => k + 1);
    } else {
      toast.error("Failed to log activity");
    }
  };

  const handleDeleteActivity = async (id: string) => {
    const success = await deleteActivityLog(id);
    if (success) {
      toast.success("Activity removed");
      setRefreshKey((k) => k + 1);
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    const success = await deleteWorkoutFromCloud(id);
    if (success) {
      toast.success("Workout removed");
      setRefreshKey((k) => k + 1);
      setSelectedDay(null);
    }
  };

  const handleDayTap = (i: number) => {
    const hasWorkout = completedDays[i] && completedDays[i].length > 0;
    const hasActivity = activityDays[i] && activityDays[i].length > 0;

    if (hasWorkout || hasActivity) {
      setSelectedDay(selectedDay === i ? null : i);
    } else if (i <= todayIndex) {
      // Allow logging on today or past days this week
      setLogSheetDay(i);
    }
  };

  const selectedWorkouts = selectedDay !== null ? (completedDays[selectedDay] || []) : [];
  const selectedActivities = selectedDay !== null ? (activityDays[selectedDay] || []) : [];

  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {WEEK_DAYS.map((day, i) => {
          const isToday = i === todayIndex;
          const isPast = i < todayIndex;
          const completed = completedDays[i];
          const activities = activityDays[i];
          const hasWorkout = completed && completed.length > 0;
          const hasActivity = activities && activities.length > 0;
          const hasAnything = hasWorkout || hasActivity;
          const isRestDay = hasActivity && activities.some(a => a.activityType === "rest");
          const canLog = (isPast || isToday) && !hasAnything;

          return (
            <motion.button
              key={day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleDayTap(i)}
              className={`flex min-w-[3.2rem] flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition-all ${
                isToday
                  ? "glass-card-elevated ring-1 ring-primary/50 glow-primary"
                  : isPast && !hasAnything
                  ? "opacity-40"
                  : hasAnything && !isToday
                  ? "opacity-90"
                  : "glass-card"
              } ${hasAnything || canLog ? "cursor-pointer active:scale-95" : ""}`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                {day}
              </span>
              {hasWorkout ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
              ) : hasActivity ? (
                <CheckCircle2 className={`h-4.5 w-4.5 ${isRestDay ? "text-blue-400" : "text-amber-400"}`} />
              ) : canLog ? (
                <Plus className="h-4.5 w-4.5 text-muted-foreground/50" />
              ) : (
                <Circle className={`h-4.5 w-4.5 ${isToday ? "text-primary" : "text-muted-foreground"}`} />
              )}
              <span className={`text-[10px] font-medium text-center leading-tight ${isToday ? "text-foreground" : "text-muted-foreground"}`}>
                {hasWorkout
                  ? completed[0].workoutName.split(" ")[0]
                  : hasActivity
                  ? (activities[0].label || activities[0].activityType).split(" ")[0]
                  : isToday
                  ? "Today"
                  : canLog
                  ? "Log"
                  : "—"}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Expanded day details */}
      <AnimatePresence>
        {selectedDay !== null && (selectedWorkouts.length > 0 || selectedActivities.length > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2">
              {/* Workout details */}
              {selectedWorkouts.map((w) => {
                const Icon = WORKOUTS.find((wk) => wk.id === w.workoutId)?.icon || Dumbbell;
                return (
                  <SwipeToDeleteCard key={w.id} onDelete={() => handleDeleteWorkout(w.id)}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                        <Icon className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{w.workoutName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {w.duration}m
                          </span>
                          <span>·</span>
                          <span>{w.exercisesCompleted}/{w.totalExercises} exercises</span>
                          {w.caloriesBurned != null && w.caloriesBurned > 0 && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-amber-400">
                                <Flame className="h-3 w-3" /> {w.caloriesBurned} kcal
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedDay(null)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {w.sets.length > 0 && (
                      <div className="space-y-1 mt-2.5">
                        {Object.entries(
                          w.sets.reduce<Record<string, { exerciseId: string; reps: number; weight: number }[]>>((acc, s) => {
                            const ex = getExerciseMeta(s.exerciseId);
                            const name = ex?.name || s.exerciseId;
                            if (!acc[name]) acc[name] = [];
                            acc[name].push(s);
                            return acc;
                          }, {})
                        ).map(([name, sets]) => (
                          <div key={name} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground truncate mr-2">{name}</span>
                            <span className="text-foreground font-medium whitespace-nowrap">
                              {sets.map((s) => formatSet(s)).join(", ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </SwipeToDeleteCard>
                );
              })}

              {/* Activity details */}
              {selectedActivities.map((a) => {
                const preset = ACTIVITY_PRESETS.find(p => p.type === a.activityType);
                return (
                  <SwipeToDeleteCard key={a.id} onDelete={() => handleDeleteActivity(a.id)}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                        a.activityType === "rest" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {(() => {
                          const Icon = ACTIVITY_ICONS[a.activityType] || Pencil;
                          return <Icon className="h-4 w-4" />;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{a.label || preset?.label || a.activityType}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          {a.duration > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {a.duration}m
                            </span>
                          )}
                          {a.distanceKm != null && a.distanceKm > 0 && (
                            <>
                              {a.duration > 0 && <span>·</span>}
                              <span>{a.distanceKm} km</span>
                            </>
                          )}
                          {a.inclinePct != null && a.inclinePct > 0 && (
                            <>
                              <span>·</span>
                              <span>{a.inclinePct}% incline</span>
                            </>
                          )}
                          {a.caloriesBurned != null && a.caloriesBurned > 0 && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-amber-400">
                                <Flame className="h-3 w-3" /> {a.caloriesBurned} kcal
                              </span>
                            </>
                          )}
                          {a.notes && (
                            <>
                              <span>·</span>
                              <span className="truncate">{a.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedDay(null)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </SwipeToDeleteCard>
                );
              })}

              {/* Allow adding additional activities even when the day already has one */}
              {selectedDay !== null && selectedDay <= todayIndex && (
                <button
                  onClick={() => { setLogSheetDay(selectedDay); setSelectedDay(null); }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <Plus className="h-3 w-3" /> {selectedActivities.length || selectedWorkouts.length ? "Add another activity" : "Log activity"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log Activity Sheet */}
      <Sheet
        open={logSheetDay !== null}
        onOpenChange={(open) => {
          if (!open) {
            setLogSheetDay(null);
            setShowOtherInput(false);
            setOtherLabel("");
            setPendingType(null);
            setLogDuration("");
            setLogNotes("");
            setLogDistance("");
            setLogIncline("");
          }
        }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl bg-card border-border/50 max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-foreground">
              {pendingType ? `Log ${pendingType.label}` : `Log Activity`} — {logSheetDay !== null ? WEEK_DAYS[logSheetDay] : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4 pb-6">
            {!showOtherInput && !pendingType ? (
              <div className="grid grid-cols-3 gap-2">
                {ACTIVITY_PRESETS.map((preset) => {
                  const Icon = ACTIVITY_ICONS[preset.type] || Pencil;
                  return (
                    <button
                      key={preset.type}
                      onClick={() => handlePresetClick(preset.type, preset.label)}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-muted/30 px-3 py-3 text-sm hover:border-primary/40 hover:bg-primary/5 transition-colors active:scale-95"
                    >
                      <Icon className="h-5 w-5 text-foreground/80" />
                      <span className="text-xs font-medium text-foreground">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : showOtherInput ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  What activity?
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Hiking, Climbing, Tennis…"
                  value={otherLabel}
                  onChange={(e) => setOtherLabel(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            ) : null}

            {(pendingType || showOtherInput) && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration (min)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Minutes"
                    value={logDuration}
                    onChange={(e) => setLogDuration(e.target.value)}
                    className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {pendingType && SUPPORTS_DISTANCE.has(pendingType.type) && (
                  <div className={`grid gap-2 ${SUPPORTS_INCLINE.has(pendingType.type) ? "grid-cols-2" : "grid-cols-1"}`}>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distance (km)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="e.g. 5"
                        value={logDistance}
                        onChange={(e) => setLogDistance(e.target.value)}
                        className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    {SUPPORTS_INCLINE.has(pendingType.type) && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Incline (%)</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          step="1"
                          placeholder="0"
                          value={logIncline}
                          onChange={(e) => setLogIncline(e.target.value)}
                          className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes (optional)</label>
                  <textarea
                    placeholder="e.g. easy pace…"
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setShowOtherInput(false);
                      setOtherLabel("");
                      setPendingType(null);
                      setLogDuration("");
                      setLogNotes("");
                      setLogDistance("");
                      setLogIncline("");
                    }}
                    className="flex-1 rounded-xl border border-border/50 bg-muted/30 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    disabled={showOtherInput ? !otherLabel.trim() : false}
                    onClick={() => {
                      if (showOtherInput) {
                        handleLogActivity("other", otherLabel.trim());
                      } else if (pendingType) {
                        handleLogActivity(pendingType.type, pendingType.label);
                      }
                    }}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Log
                  </button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
