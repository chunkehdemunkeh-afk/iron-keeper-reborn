import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchWorkoutHistory, deleteWorkoutFromCloud, exportWorkoutHistoryCSV, exportSetsCSV, fetchActivityLogs, deleteActivityLog, ACTIVITY_PRESETS, type ActivityLog } from "@/lib/cloud-data";
import { WORKOUTS, type CompletedWorkout } from "@/lib/workout-data";
import { Calendar as CalendarIcon, Clock, Dumbbell, TrendingUp, Download, ChevronLeft, ChevronRight, Trash2, Bed, Footprints, Activity, Waves, Bike, Flower, CircleDot, Pencil, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import WorkoutCard from "@/components/history/WorkoutCard";
import SummaryCards from "@/components/history/SummaryCards";
import HelpButton from "@/components/demo/HelpButton";

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

export default function History() {
  const [searchParams] = useSearchParams();
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterWorkoutId, setFilterWorkoutId] = useState<string | null>(searchParams.get("workout") || null);

  useEffect(() => {
    Promise.all([fetchWorkoutHistory(), fetchActivityLogs()]).then(([h, a]) => {
      setHistory(h);
      setActivities(a);
      setLoading(false);
    });
  }, []);

  const workoutIcons: Record<string, LucideIcon> = {};
  WORKOUTS.forEach((w) => (workoutIcons[w.id] = w.icon));

  // Get unique workout types from history
  const workoutTypes = useMemo(() => {
    const types = new Map<string, string>();
    history.forEach((w) => types.set(w.workoutId, w.workoutName));
    return Array.from(types.entries());
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (!filterWorkoutId) return history;
    return history.filter((w) => w.workoutId === filterWorkoutId);
  }, [history, filterWorkoutId]);

  const dateWorkoutMap = useMemo(() => {
    const map: Record<string, CompletedWorkout[]> = {};
    filteredHistory.forEach((w) => {
      const key = format(new Date(w.date), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(w);
    });
    return map;
  }, [filteredHistory]);

  const dateActivityMap = useMemo(() => {
    const map: Record<string, ActivityLog[]> = {};
    activities.forEach((a) => {
      const key = a.date; // already yyyy-mm-dd
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [activities]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const selectedWorkouts = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return dateWorkoutMap[key] || [];
  }, [selectedDate, dateWorkoutMap]);

  const selectedActivities = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return dateActivityMap[key] || [];
  }, [selectedDate, dateActivityMap]);

  const totalMinutes = filteredHistory.reduce((s, w) => s + w.duration, 0);

  const weeklyData = Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return filteredHistory.filter((w) => {
      const d = new Date(w.date);
      return d >= weekStart && d < weekEnd;
    }).length;
  }).reverse();

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const success = await deleteWorkoutFromCloud(id);
    if (success) {
      setHistory((prev) => prev.filter((w) => w.id !== id));
      toast.success("Workout deleted");
    } else {
      toast.error("Failed to delete workout");
    }
    setDeletingId(null);
  };

  const handleDeleteActivity = async (id: string) => {
    const success = await deleteActivityLog(id);
    if (success) {
      setActivities((prev) => prev.filter((a) => a.id !== id));
      toast.success("Activity deleted");
    } else {
      toast.error("Failed to delete activity");
    }
  };

  const handleExportWorkouts = async () => {
    const csv = await exportWorkoutHistoryCSV();
    downloadCSV(csv, "ironkeeper_workouts.csv");
    toast.success("Workout history exported!");
  };

  const handleExportSets = async () => {
    const csv = await exportSetsCSV();
    if (!csv) { toast.error("No data to export"); return; }
    downloadCSV(csv, "ironkeeper_sets.csv");
    toast.success("Sets data exported!");
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background safe-bottom flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading history...</div>
      </div>
    );
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-2xl font-bold">
            History
          </motion.h1>
          <div className="flex items-center gap-2">
            <HelpButton />
            {history.length > 0 && (
              <>
                <button onClick={handleExportWorkouts} className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-1 hover:bg-primary/20 transition-colors">
                  <Download className="h-3 w-3" /> CSV
                </button>
                <button onClick={handleExportSets} className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 rounded-full px-2.5 py-1 hover:bg-muted/70 transition-colors">
                  <Download className="h-3 w-3" /> Sets
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter chips */}
        {workoutTypes.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setFilterWorkoutId(null)}
              className={`flex-shrink-0 text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${
                !filterWorkoutId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
            {workoutTypes.map(([id, name]) => {
              const Icon = workoutIcons[id] || Dumbbell;
              return (
                <button
                  key={id}
                  onClick={() => setFilterWorkoutId(filterWorkoutId === id ? null : id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${
                    filterWorkoutId === id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {name}
                </button>
              );
            })}
          </div>
        )}

        {/* Summary cards */}
        <SummaryCards
          totalWorkouts={filteredHistory.length}
          totalMinutes={totalMinutes}
          thisWeek={weeklyData[weeklyData.length - 1] || 0}
          avgPerWeek={filteredHistory.length > 0 ? (filteredHistory.length / Math.max(1, weeklyData.filter((w) => w > 0).length)).toFixed(1) : "0"}
        />

        {/* Weekly bar chart */}
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Weekly Activity</h3>
          <div className="flex items-end gap-3 h-24">
            {weeklyData.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(8, (count / 4) * 100)}%` }}
                  transition={{ delay: i * 0.1, type: "spring" }}
                  className={`w-full rounded-lg ${count >= 4 ? "bg-success" : count > 0 ? "gradient-primary" : "bg-muted"}`}
                />
                <span className="text-[9px] text-muted-foreground">
                  {i === 3 ? "This week" : i === 2 ? "Last week" : `${3 - i}w ago`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Full Calendar */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <h3 className="text-sm font-semibold text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const workouts = dateWorkoutMap[key] || [];
              const dayActivities = dateActivityMap[key] || [];
              const hasWorkout = workouts.length > 0;
              const hasActivity = dayActivities.length > 0;
              const isRestOnly = hasActivity && !hasWorkout && dayActivities.every((a) => a.activityType === "rest");
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all ${
                    !isCurrentMonth
                      ? "text-muted-foreground/30"
                      : isSelected
                      ? "bg-primary text-primary-foreground font-bold"
                      : isToday
                      ? "bg-muted font-bold text-foreground"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <span>{format(day, "d")}</span>
                  {(hasWorkout || hasActivity) && isCurrentMonth && (
                    <div className="absolute bottom-0.5 flex gap-0.5">
                      {workouts.slice(0, 3).map((_, wi) => (
                        <div
                          key={`w-${wi}`}
                          className={`h-1 w-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`}
                        />
                      ))}
                      {dayActivities.slice(0, 3 - Math.min(workouts.length, 3)).map((_, ai) => (
                        <div
                          key={`a-${ai}`}
                          className={`h-1 w-1 rounded-full ${
                            isSelected
                              ? "bg-primary-foreground/70"
                              : isRestOnly
                              ? "bg-blue-400"
                              : "bg-amber-400"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected date workouts */}
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              key={format(selectedDate, "yyyy-MM-dd")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-foreground">
                {format(selectedDate, "EEEE, d MMMM yyyy")}
              </h3>
              {selectedWorkouts.length === 0 ? (
                <div className="glass-card rounded-xl p-6 text-center">
                  <p className="text-sm text-muted-foreground">No workouts on this date</p>
                </div>
              ) : (
                selectedWorkouts.map((w) => (
                  <WorkoutCard
                    key={w.id}
                    workout={w}
                    icon={workoutIcons[w.workoutId] || Dumbbell}
                    onDelete={handleDelete}
                    isDeleting={deletingId === w.id}
                    defaultExpanded={true}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent workouts */}
        {!selectedDate && filteredHistory.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {filterWorkoutId ? `${workoutTypes.find(([id]) => id === filterWorkoutId)?.[1]} Sessions` : "Recent Workouts"}
            </h3>
            <div className="space-y-2">
              {filteredHistory.slice(0, 15).map((w, i) => {
                const date = new Date(w.date);
                const Icon = workoutIcons[w.workoutId] || Dumbbell;
                return (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-card rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => {
                      setSelectedDate(date);
                      setCurrentMonth(date);
                    }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                      <Icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{w.workoutName}</p>
                      <p className="text-xs text-muted-foreground">
                        {date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-foreground">{w.duration}m</p>
                      <p className="text-[10px] text-muted-foreground">{w.exercisesCompleted}/{w.totalExercises} ex</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {history.length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center">
            <Dumbbell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No workouts yet</p>
            <p className="text-xs text-muted-foreground mt-1">Complete a session to see your history</p>
          </div>
        )}
      </div>
    </div>
  );
}
