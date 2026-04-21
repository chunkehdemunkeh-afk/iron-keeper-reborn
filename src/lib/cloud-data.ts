import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WORKOUTS, type CompletedWorkout } from "./workout-data";
import { EXERCISE_SUBSTITUTIONS } from "./exercise-substitutions";
import { ACCESSORY_ROUTINES, ACCESSORY_SUBSTITUTIONS } from "./accessory-routines";

// Save workout to Supabase (with localStorage fallback)
export async function saveWorkoutToCloud(workout: CompletedWorkout): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    const { saveWorkout } = await import("./workout-data");
    saveWorkout(workout);
    return;
  }

  const { data: historyRow, error: historyError } = await supabase
    .from("workout_history")
    .insert({
      user_id: user.id,
      workout_id: workout.workoutId,
      workout_name: workout.workoutName,
      date: workout.date,
      duration: workout.duration,
      exercises_completed: workout.exercisesCompleted,
      total_exercises: workout.totalExercises,
      effort_rating: workout.effortRating ?? null,
      session_notes: workout.sessionNotes ?? null,
    })
    .select("id")
    .single();

  if (historyError || !historyRow) {
    console.error("Failed to save workout:", historyError);
    return;
  }

  const exerciseMap: Record<string, string> = {};
  WORKOUTS.forEach(w => w.exercises.forEach(ex => { exerciseMap[ex.id] = ex.name; }));
  // Include substitutes
  Object.values(EXERCISE_SUBSTITUTIONS).flat().forEach(sub => { exerciseMap[sub.id] = sub.name; });
  // Include accessories and their substitutes
  ACCESSORY_ROUTINES.forEach(r => r.exercises.forEach(ex => { exerciseMap[ex.id] = ex.name; }));
  Object.values(ACCESSORY_SUBSTITUTIONS).flat().forEach(sub => { exerciseMap[sub.id] = sub.name; });

  if (workout.sets.length > 0) {
    const { error: setsError } = await supabase
      .from("workout_sets")
      .insert(
        workout.sets.map(s => ({
          workout_history_id: historyRow.id,
          user_id: user.id,
          exercise_id: s.exerciseId,
          exercise_name: exerciseMap[s.exerciseId] || s.exerciseId,
          reps: s.reps,
          weight: s.weight,
        }))
      );

    if (setsError) {
      console.error("Failed to save sets:", setsError);
    }
  }
}

// Fetch workout history from Supabase
export async function fetchWorkoutHistory(): Promise<CompletedWorkout[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    const { getWorkoutHistory } = await import("./workout-data");
    return getWorkoutHistory();
  }

  const { data: history, error } = await supabase
    .from("workout_history")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error || !history) return [];

  const historyIds = history.map(h => h.id);
  const { data: allSets } = await supabase
    .from("workout_sets")
    .select("*")
    .in("workout_history_id", historyIds);

  const setsMap: Record<string, typeof allSets> = {};
  allSets?.forEach(s => {
    if (!setsMap[s.workout_history_id]) setsMap[s.workout_history_id] = [];
    setsMap[s.workout_history_id]!.push(s);
  });

  return history.map(h => ({
    id: h.id,
    workoutId: h.workout_id,
    workoutName: h.workout_name,
    date: h.date,
    duration: h.duration,
    exercisesCompleted: h.exercises_completed,
    totalExercises: h.total_exercises,
    sets: (setsMap[h.id] || []).map(s => ({
      exerciseId: s.exercise_id,
      reps: s.reps,
      weight: Number(s.weight),
    })),
  }));
}

// Delete a workout and its sets from Supabase
export async function deleteWorkoutFromCloud(workoutId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Delete sets first (foreign key)
  await supabase
    .from("workout_sets")
    .delete()
    .eq("workout_history_id", workoutId)
    .eq("user_id", user.id);

  const { error } = await supabase
    .from("workout_history")
    .delete()
    .eq("id", workoutId)
    .eq("user_id", user.id);

  return !error;
}

// Fetch personal records (max weight per exercise, plus best reps for rep-PR detection)
export async function fetchPersonalRecords(): Promise<Record<string, { weight: number; reps: number; date: string; name: string; setId: string; bestReps: number }>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("id, exercise_id, exercise_name, reps, weight, created_at")
    .eq("user_id", user.id)
    .order("weight", { ascending: false });

  if (!sets) return {};

  const prs: Record<string, { weight: number; reps: number; date: string; name: string; setId: string; bestReps: number }> = {};
  sets.forEach(s => {
    const w = Number(s.weight);
    const r = Number(s.reps);
    const existing = prs[s.exercise_id];
    if (!existing) {
      prs[s.exercise_id] = { weight: w, reps: r, date: s.created_at, name: s.exercise_name, setId: s.id, bestReps: r };
    } else {
      if (w > existing.weight) {
        existing.weight = w;
        existing.reps = r;
        existing.date = s.created_at;
        existing.name = s.exercise_name;
        existing.setId = s.id;
      }
      if (r > existing.bestReps) existing.bestReps = r;
    }
  });

  return prs;
}

export async function deletePersonalRecord(setId: string): Promise<boolean> {
  const { error } = await supabase.from("workout_sets").delete().eq("id", setId);
  return !error;
}

// Fetch volume data (total weight × reps per session)
export async function fetchVolumeData(): Promise<{ date: string; volume: number; name: string }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: history } = await supabase
    .from("workout_history")
    .select("id, date, workout_name")
    .eq("user_id", user.id)
    .order("date", { ascending: true })
    .limit(30);

  if (!history || history.length === 0) return [];

  const historyIds = history.map(h => h.id);
  const { data: allSets } = await supabase
    .from("workout_sets")
    .select("workout_history_id, reps, weight")
    .in("workout_history_id", historyIds);

  if (!allSets) return [];

  const volumeMap: Record<string, number> = {};
  allSets.forEach(s => {
    volumeMap[s.workout_history_id] = (volumeMap[s.workout_history_id] || 0) + (s.reps * Number(s.weight));
  });

  return history.map(h => ({
    date: new Date(h.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    volume: volumeMap[h.id] || 0,
    name: h.workout_name,
  }));
}

// Fetch last session data for auto-fill (previous weights/reps per exercise)
// Looks at the most recent session of this workout first, then falls back to
// the last time each individual exercise was ever performed.
export async function fetchLastSessionData(workoutId: string): Promise<Record<string, { reps: number; weight: number }[]>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  // 1. Try the last session of this workout type
  const { data: lastWorkout } = await supabase
    .from("workout_history")
    .select("id")
    .eq("user_id", user.id)
    .eq("workout_id", workoutId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  const result: Record<string, { reps: number; weight: number }[]> = {};

  if (lastWorkout) {
    const { data: sets } = await supabase
      .from("workout_sets")
      .select("exercise_id, reps, weight")
      .eq("workout_history_id", lastWorkout.id)
      .order("created_at", { ascending: true });

    sets?.forEach(s => {
      if (!result[s.exercise_id]) result[s.exercise_id] = [];
      result[s.exercise_id].push({ reps: s.reps, weight: Number(s.weight) });
    });
  }

  return result;
}

// Fetch the last recorded sets for a specific exercise across ALL workouts
export async function fetchExerciseLastData(exerciseId: string): Promise<{ reps: number; weight: number }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Find the most recent workout_history that contains this exercise
  const { data: latestSet } = await supabase
    .from("workout_sets")
    .select("workout_history_id")
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!latestSet) return [];

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("reps, weight")
    .eq("workout_history_id", latestSet.workout_history_id)
    .eq("exercise_id", exerciseId)
    .order("created_at", { ascending: true });

  return (sets || []).map(s => ({ reps: s.reps, weight: Number(s.weight) }));
}

// Body measurements
export async function saveBodyMeasurement(data: { bodyWeight?: number; bodyFatPct?: number; notes?: string }): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("body_measurements")
    .insert({
      user_id: user.id,
      body_weight: data.bodyWeight || null,
      body_fat_pct: data.bodyFatPct || null,
      notes: data.notes || null,
    });

  return !error;
}

export async function fetchBodyMeasurements(): Promise<{ id: string; date: string; bodyWeight: number | null; bodyFatPct: number | null; notes: string | null }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  if (error || !data) return [];

  return data.map(m => ({
    id: m.id,
    date: m.date,
    bodyWeight: m.body_weight ? Number(m.body_weight) : null,
    bodyFatPct: m.body_fat_pct ? Number(m.body_fat_pct) : null,
    notes: m.notes,
  }));
}

// Export workout history as CSV
export async function exportWorkoutHistoryCSV(): Promise<string> {
  const history = await fetchWorkoutHistory();
  
  const headers = ["Date", "Workout", "Duration (min)", "Exercises Completed", "Total Exercises"];
  const rows = history.map(w => [
    new Date(w.date).toLocaleDateString("en-GB"),
    w.workoutName,
    w.duration,
    w.exercisesCompleted,
    w.totalExercises,
  ]);

  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  return csv;
}

export async function exportSetsCSV(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "";

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("exercise_name, reps, weight, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!sets) return "";

  const headers = ["Date", "Exercise", "Reps", "Weight (kg)"];
  const rows = sets.map(s => [
    new Date(s.created_at).toLocaleDateString("en-GB"),
    `"${s.exercise_name}"`,
    s.reps,
    s.weight,
  ]);

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

// Activity logs (rest days, running, etc.)
export type ActivityLog = {
  id: string;
  date: string;
  activityType: string;
  label: string | null;
  duration: number;
  notes: string | null;
};

const ACTIVITY_PRESETS = [
  { type: "rest", label: "Rest Day", icon: "bed" },
  { type: "walk", label: "Walk", icon: "footprints" },
  { type: "running", label: "Running", icon: "run" },
  { type: "swimming", label: "Swimming", icon: "waves" },
  { type: "cycling", label: "Cycling", icon: "bike" },
  { type: "yoga", label: "Yoga", icon: "flower" },
  { type: "football", label: "Football", icon: "circle-dot" },
  { type: "other", label: "Other", icon: "pencil" },
];
export { ACTIVITY_PRESETS };

export async function saveActivityLog(data: { date: string; activityType: string; label?: string; duration?: number; notes?: string }): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("activity_logs")
    .insert({
      user_id: user.id,
      date: data.date,
      activity_type: data.activityType,
      label: data.label || null,
      duration: data.duration || 0,
      notes: data.notes || null,
    });

  return !error;
}

export async function fetchActivityLogs(): Promise<ActivityLog[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error || !data) return [];

  return data.map(a => ({
    id: a.id,
    date: a.date,
    activityType: a.activity_type,
    label: a.label,
    duration: a.duration ?? 0,
    notes: a.notes,
  }));
}

export async function deleteActivityLog(id: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("activity_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return !error;
}

// ── Daily Logs (Complete Day snapshots) ───────────────────────────────────────

export interface DailyLog {
  id: string;
  date: string; // "YYYY-MM-DD"
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  calorie_goal: number;
  protein_goal_g: number;
  carbs_goal_g: number;
  fat_goal_g: number;
  water_goal_ml: number;
  weight_kg: number | null;
  created_at: string;
}

export async function saveDailyLog(data: {
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  calorie_goal: number;
  protein_goal_g: number;
  carbs_goal_g: number;
  fat_goal_g: number;
  water_goal_ml: number;
  weight_kg?: number | null;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("daily_logs")
    .upsert(
      {
        user_id: user.id,
        date: data.date,
        calories: data.calories,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g,
        water_ml: data.water_ml,
        calorie_goal: data.calorie_goal,
        protein_goal_g: data.protein_goal_g,
        carbs_goal_g: data.carbs_goal_g,
        fat_goal_g: data.fat_goal_g,
        water_goal_ml: data.water_goal_ml,
        weight_kg: data.weight_kg ?? null,
      },
      { onConflict: "user_id,date" }
    );

  if (error) {
    console.error("Error saving daily log:", error);
    toast.error("Failed to save: " + error.message);
  }

  return !error;
}

export async function hasDayBeenCompleted(date: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("daily_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  return !!data;
}

export async function fetchDailyLogs(): Promise<DailyLog[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  if (error || !data) return [];

  return data.map((r: any) => ({
    id: r.id,
    date: r.date,
    calories: r.calories,
    protein_g: Number(r.protein_g),
    carbs_g: Number(r.carbs_g),
    fat_g: Number(r.fat_g),
    water_ml: r.water_ml,
    calorie_goal: r.calorie_goal,
    protein_goal_g: Number(r.protein_goal_g),
    carbs_goal_g: Number(r.carbs_goal_g),
    fat_goal_g: Number(r.fat_goal_g),
    water_goal_ml: r.water_goal_ml,
    weight_kg: r.weight_kg ? Number(r.weight_kg) : null,
    created_at: r.created_at,
  }));
}
