import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WORKOUTS, type CompletedWorkout } from "./workout-data";
import { EXERCISE_SUBSTITUTIONS } from "./exercise-substitutions";
import { ACCESSORY_ROUTINES, ACCESSORY_SUBSTITUTIONS } from "./accessory-routines";
import { EXERCISE_LIBRARY } from "./exercise-library";
import { stripExerciseSuffixes } from "./muscle-mapping";
import { estimateStrengthBurn } from "./calorie-burn";

/**
 * Look up the most recent body weight to use as the reference for burn
 * calculations. Falls back to the TDEE weight from nutrition_goals, then
 * to a 75 kg default. Mirrors the SQL `lookup_user_bodyweight` function.
 */
export async function lookupUserBodyweight(userId: string): Promise<number> {
  const [{ data: bm }, { data: ng }] = await Promise.all([
    supabase
      .from("body_measurements")
      .select("body_weight")
      .eq("user_id", userId)
      .not("body_weight", "is", null)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("nutrition_goals")
      .select("tdee_weight_kg")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const bw = bm?.body_weight ? Number(bm.body_weight) : null;
  const tdeeBw = ng?.tdee_weight_kg ? Number(ng.tdee_weight_kg) : null;
  return bw ?? tdeeBw ?? 75;
}

// Save workout to Supabase (with localStorage fallback)
export async function saveWorkoutToCloud(workout: CompletedWorkout): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    const { saveWorkout } = await import("./workout-data");
    saveWorkout(workout);
    return;
  }

  // Estimate calories burned client-side so the value is available immediately.
  // SQL functions exist as a backstop for backfills but the live path computes here.
  let caloriesBurned: number | null = null;
  try {
    const bodyweight = await lookupUserBodyweight(user.id);
    caloriesBurned = estimateStrengthBurn({
      sets: workout.sets,
      durationMin: workout.duration,
      weightKg: bodyweight,
    });
  } catch (e) {
    console.error("Burn estimate failed:", e);
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
      calories_burned: caloriesBurned,
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
          set_type: s.setType ?? "working",
        } as never))
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
    caloriesBurned: (h as { calories_burned?: number | null }).calories_burned ?? null,
    sets: (setsMap[h.id] || []).map(s => ({
      exerciseId: s.exercise_id,
      reps: s.reps,
      weight: Number(s.weight),
      setType: ((s as { set_type?: string }).set_type ?? "working") as "working" | "warmup" | "1rm_test",
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

// Fetch personal records (max weight per exercise, plus best reps for rep-PR detection,
// plus the heaviest dedicated 1RM-test single ever logged for that exercise).
export type PersonalRecord = {
  weight: number;
  reps: number;
  date: string;
  name: string;
  setId: string;
  bestReps: number;
  bestTrue1RM?: number;
};

export async function fetchPersonalRecords(): Promise<Record<string, PersonalRecord>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("id, exercise_id, exercise_name, reps, weight, created_at, set_type")
    .eq("user_id", user.id)
    .order("weight", { ascending: false });

  if (!sets) return {};

  const prs: Record<string, PersonalRecord> = {};
  sets.forEach(s => {
    const w = Number(s.weight);
    const r = Number(s.reps);
    const setType = (s as { set_type?: string }).set_type ?? "working";
    const existing = prs[s.exercise_id];
    if (!existing) {
      prs[s.exercise_id] = {
        weight: w,
        reps: r,
        date: s.created_at,
        name: s.exercise_name,
        setId: s.id,
        bestReps: r,
        bestTrue1RM: setType === "1rm_test" ? w : undefined,
      };
    } else {
      if (w > existing.weight) {
        existing.weight = w;
        existing.reps = r;
        existing.date = s.created_at;
        existing.name = s.exercise_name;
        existing.setId = s.id;
      }
      if (r > existing.bestReps) existing.bestReps = r;
      if (setType === "1rm_test" && (existing.bestTrue1RM === undefined || w > existing.bestTrue1RM)) {
        existing.bestTrue1RM = w;
      }
    }
  });

  return prs;
}

export async function deletePersonalRecord(setId: string): Promise<boolean> {
  const { error } = await supabase.from("workout_sets").delete().eq("id", setId);
  return !error;
}

/**
 * Best estimated 1RM for a given canonical lift across all matching exercise IDs.
 * Prefers a real 1RM-test single when one exists; otherwise falls back to the
 * heaviest Epley-derived estimate from working sets.
 */
export function bestOneRmForLift(
  prs: Record<string, PersonalRecord>,
  matcher: (exerciseId: string, exerciseName: string) => boolean,
  epley: (weight: number, reps: number) => number,
  /** Optional multiplier applied to logged weight before Epley (e.g. ×2 for bilateral DB). */
  weightMultiplier?: (exerciseId: string, exerciseName: string) => number,
): number {
  let bestTrue = 0;
  let bestEpley = 0;
  Object.entries(prs).forEach(([exId, pr]) => {
    if (!matcher(exId, pr.name)) return;
    const mult = weightMultiplier ? weightMultiplier(exId, pr.name) : 1;
    if (pr.bestTrue1RM && pr.bestTrue1RM * mult > bestTrue) bestTrue = pr.bestTrue1RM * mult;
    const e = epley(pr.weight * mult, pr.reps);
    if (e > bestEpley) bestEpley = e;
  });
  // True 1RM wins when present, even if Epley estimate is higher
  // (a real single is more reliable than a multi-rep extrapolation).
  return bestTrue > 0 ? bestTrue : bestEpley;
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

// Strength profile: latest bodyweight + sex + age (for strength-standards rating)
export async function fetchStrengthProfile(): Promise<{
  bodyweight: number | null;
  sex: "male" | "female" | null;
  age: number | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { bodyweight: null, sex: null, age: null };

  const [{ data: bm }, { data: ng }] = await Promise.all([
    supabase
      .from("body_measurements")
      .select("body_weight, date")
      .eq("user_id", user.id)
      .not("body_weight", "is", null)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("nutrition_goals")
      .select("tdee_gender, tdee_age, tdee_weight_kg")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const bodyweight =
    (bm?.body_weight ? Number(bm.body_weight) : null) ??
    (ng?.tdee_weight_kg ? Number(ng.tdee_weight_kg) : null);
  const rawSex = ng?.tdee_gender?.toLowerCase() ?? null;
  const sex: "male" | "female" | null =
    rawSex === "male" || rawSex === "m" ? "male" :
    rawSex === "female" || rawSex === "f" ? "female" : null;
  const age = ng?.tdee_age ?? null;

  return { bodyweight, sex, age };
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
  distanceKm: number | null;
  inclinePct: number | null;
  caloriesBurned: number | null;
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

export async function saveActivityLog(data: {
  date: string;
  activityType: string;
  label?: string;
  duration?: number;
  notes?: string;
  distanceKm?: number | null;
  inclinePct?: number | null;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Compute estimated burn client-side using the same formulas as the SQL fn.
  const { estimateCardioBurn } = await import("./calorie-burn");
  const bodyweight = await lookupUserBodyweight(user.id);
  const caloriesBurned = estimateCardioBurn({
    activityType: data.activityType,
    durationMin: data.duration || 0,
    distanceKm: data.distanceKm ?? null,
    inclinePct: data.inclinePct ?? null,
    weightKg: bodyweight,
  });

  const { error } = await supabase
    .from("activity_logs")
    .insert({
      user_id: user.id,
      date: data.date,
      activity_type: data.activityType,
      label: data.label || null,
      duration: data.duration || 0,
      notes: data.notes || null,
      distance_km: data.distanceKm ?? null,
      incline_pct: data.inclinePct ?? null,
      calories_burned: caloriesBurned,
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
    distanceKm: a.distance_km !== null && a.distance_km !== undefined ? Number(a.distance_km) : null,
    inclinePct: a.incline_pct ?? null,
    caloriesBurned: a.calories_burned ?? null,
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

// ── Sleep logs ────────────────────────────────────────────────────────────────

export interface SleepLogRecord {
  id: string;
  date: string;     // YYYY-MM-DD
  hours: number;
  quality: number;  // 1..5
  notes: string | null;
  source: string;
}

export async function fetchSleepLogs(daysBack: number = 14): Promise<SleepLogRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", cutoffStr)
    .order("date", { ascending: false });

  if (error || !data) return [];

  return data.map((r: any) => ({
    id: r.id,
    date: r.date,
    hours: Number(r.hours),
    quality: r.quality,
    notes: r.notes,
    source: r.source,
  }));
}

export async function upsertSleepLog(data: {
  date: string;
  hours: number;
  quality: number;
  notes?: string;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("sleep_logs")
    .upsert(
      {
        user_id: user.id,
        date: data.date,
        hours: data.hours,
        quality: data.quality,
        notes: data.notes ?? null,
        source: "manual",
      },
      { onConflict: "user_id,date" },
    );

  if (error) console.error("Failed to save sleep log:", error);
  return !error;
}

export async function deleteSleepLog(date: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("sleep_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("date", date);

  return !error;
}

// ── Recent sets (joined with workout_history.date) ────────────────────────────

export interface RecentSetRecord {
  exerciseId: string;
  exerciseName: string;
  targetMuscle?: string;
  muscleGroup?: string;
  weight: number;
  reps: number;
  workoutDate: string; // ISO
  /** User's all-time max weight on this exercise's base id (for PR-relative fatigue). */
  userPR?: number;
}

export async function fetchRecentSets(daysBack: number = 7): Promise<RecentSetRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffIso = cutoff.toISOString();

  // Get recent workout_history rows
  const { data: history } = await supabase
    .from("workout_history")
    .select("id, date")
    .eq("user_id", user.id)
    .gte("date", cutoffIso);

  if (!history || history.length === 0) return [];

  const dateMap: Record<string, string> = {};
  history.forEach((h: any) => { dateMap[h.id] = h.date; });

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("exercise_id, exercise_name, weight, reps, workout_history_id")
    .in("workout_history_id", history.map((h: any) => h.id));

  if (!sets) return [];

  // Build a PR map from ALL the user's sets (not just recent), so beginners
  // and lifters who haven't hit a PR in the last 7 days still get normalised
  // fatigue. Aggregated by base id (suffix-stripped) so cable attachment
  // variants share a PR pool with their parent exercise.
  const prMap: Record<string, number> = {};
  const { data: allSets } = await supabase
    .from("workout_sets")
    .select("exercise_id, weight")
    .eq("user_id", user.id)
    .gt("weight", 0);

  if (allSets) {
    for (const row of allSets as any[]) {
      const base = stripExerciseSuffixes(row.exercise_id);
      const w = Number(row.weight);
      if (!w || Number.isNaN(w)) continue;
      if (!prMap[base] || w > prMap[base]) prMap[base] = w;
    }
  }

  // Build lookups by exercise base id (so suffixed rows like "up1-mag-grip"
  // resolve to the underlying "up1" definition).
  const targetMap: Record<string, string> = {};
  const nameMap: Record<string, string> = {};
  WORKOUTS.forEach((w) => w.exercises.forEach((ex: any) => {
    if (ex.targetMuscle) targetMap[ex.id] = ex.targetMuscle;
    if (ex.name) nameMap[ex.id] = ex.name;
  }));
  ACCESSORY_ROUTINES.forEach((r) => r.exercises.forEach((ex: any) => {
    if (ex.targetMuscle) targetMap[ex.id] = ex.targetMuscle;
    if (ex.name) nameMap[ex.id] = ex.name;
  }));
  // Substitutes have real names too
  Object.values(EXERCISE_SUBSTITUTIONS).flat().forEach((sub: any) => {
    if (sub.name) nameMap[sub.id] = sub.name;
  });
  Object.values(ACCESSORY_SUBSTITUTIONS).flat().forEach((sub: any) => {
    if (sub.name) nameMap[sub.id] = sub.name;
  });

  // Library exercises supply muscleGroup
  const muscleGroupMap: Record<string, string> = {};
  EXERCISE_LIBRARY.forEach((ex) => {
    muscleGroupMap[ex.id] = ex.muscleGroup;
    if (ex.name) nameMap[ex.id] = ex.name;
  });

  return sets.map((s: any) => {
    const baseId = stripExerciseSuffixes(s.exercise_id);
    // Prefer the real exercise name from our maps if the stored row has
    // name == id (legacy cable-attachment rows). Falls back to whatever was stored.
    const realName =
      s.exercise_name && s.exercise_name !== s.exercise_id
        ? s.exercise_name
        : nameMap[baseId] ?? nameMap[s.exercise_id] ?? s.exercise_name ?? "";
    return {
      exerciseId: s.exercise_id,
      exerciseName: realName,
      targetMuscle: targetMap[baseId] ?? targetMap[s.exercise_id],
      muscleGroup: muscleGroupMap[baseId] ?? muscleGroupMap[s.exercise_id],
      weight: Number(s.weight),
      reps: s.reps,
      workoutDate: dateMap[s.workout_history_id],
      userPR: prMap[baseId] ?? prMap[s.exercise_id],
    };
  });
}

// ── PR trend history (running max weight per exercise over time) ──────────────

export interface PRTrendPoint {
  date: string;       // ISO date
  weight: number;     // running max as of this point
  reps: number;       // reps performed at the new PR (only meaningful when weight increased)
  isNewPR: boolean;   // true when this set set a new PR
}

export interface ExercisePRTrend {
  baseId: string;     // suffix-stripped exercise id (groups cable variants)
  name: string;       // human-readable name
  currentPR: number;  // most recent running max
  points: PRTrendPoint[]; // chronological points (oldest → newest)
}

/**
 * Fetches every weighted set the user has logged and computes a running-max
 * "PR over time" series per exercise (grouped by base id so cable attachment
 * variants share a trend). Each series includes one point per set, and the
 * `isNewPR` flag marks moments the running max increased.
 */
export async function fetchExercisePRHistory(): Promise<ExercisePRTrend[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("exercise_id, exercise_name, weight, reps, created_at")
    .eq("user_id", user.id)
    .gt("weight", 0)
    .order("created_at", { ascending: true });

  if (!sets || sets.length === 0) return [];

  // Resolve real exercise names (legacy rows can have name == id).
  const nameMap: Record<string, string> = {};
  WORKOUTS.forEach((w) => w.exercises.forEach((ex: any) => {
    if (ex.name) nameMap[ex.id] = ex.name;
  }));
  ACCESSORY_ROUTINES.forEach((r) => r.exercises.forEach((ex: any) => {
    if (ex.name) nameMap[ex.id] = ex.name;
  }));
  Object.values(EXERCISE_SUBSTITUTIONS).flat().forEach((sub: any) => {
    if (sub.name) nameMap[sub.id] = sub.name;
  });
  Object.values(ACCESSORY_SUBSTITUTIONS).flat().forEach((sub: any) => {
    if (sub.name) nameMap[sub.id] = sub.name;
  });
  EXERCISE_LIBRARY.forEach((ex) => { if (ex.name) nameMap[ex.id] = ex.name; });

  const grouped: Record<string, { name: string; running: number; points: PRTrendPoint[] }> = {};

  for (const s of sets as any[]) {
    const baseId = stripExerciseSuffixes(s.exercise_id);
    const w = Number(s.weight);
    if (!w || Number.isNaN(w)) continue;

    const realName =
      s.exercise_name && s.exercise_name !== s.exercise_id
        ? s.exercise_name
        : nameMap[baseId] ?? nameMap[s.exercise_id] ?? s.exercise_name ?? baseId;

    if (!grouped[baseId]) {
      grouped[baseId] = { name: realName, running: 0, points: [] };
    }

    const isNew = w > grouped[baseId].running;
    if (isNew) grouped[baseId].running = w;
    grouped[baseId].points.push({
      date: s.created_at,
      weight: grouped[baseId].running,
      reps: s.reps,
      isNewPR: isNew,
    });
  }

  return Object.entries(grouped)
    .filter(([, g]) => g.points.length > 0)
    .map(([baseId, g]) => ({
      baseId,
      name: g.name,
      currentPR: g.running,
      points: g.points,
    }))
    .sort((a, b) => b.currentPR - a.currentPR);
}

// ── Progress photos ──────────────────────────────────────────────────────────

export interface ProgressPhoto {
  id: string;
  date: string;          // YYYY-MM-DD
  storagePath: string;
  pose: string | null;   // 'front' | 'side' | 'back' | 'other' | null
  notes: string | null;
  createdAt: string;
  signedUrl: string | null;
}

const PHOTO_BUCKET = "progress-photos";
const SIGNED_URL_TTL = 60 * 5; // 5 minutes

async function signPhotoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

export async function fetchProgressPhotos(): Promise<ProgressPhoto[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const signed = await Promise.all(
    data.map(async (r: any) => ({
      id: r.id,
      date: r.date,
      storagePath: r.storage_path,
      pose: r.pose,
      notes: r.notes,
      createdAt: r.created_at,
      signedUrl: await signPhotoUrl(r.storage_path),
    }))
  );
  return signed;
}

export async function uploadProgressPhoto(
  file: File,
  date: string,
  pose?: string | null,
  notes?: string | null,
): Promise<ProgressPhoto | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp", "heic"].includes(ext) ? ext : "jpg";
  const storagePath = `${user.id}/${date}-${Date.now()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || `image/${safeExt}`,
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload photo:", uploadError);
    toast.error("Failed to upload photo");
    return null;
  }

  const { data: row, error: insertError } = await supabase
    .from("progress_photos")
    .insert({
      user_id: user.id,
      date,
      storage_path: storagePath,
      pose: pose || null,
      notes: notes || null,
    })
    .select("*")
    .single();

  if (insertError || !row) {
    console.error("Failed to save photo metadata:", insertError);
    await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
    return null;
  }

  return {
    id: row.id,
    date: row.date,
    storagePath: row.storage_path,
    pose: row.pose,
    notes: row.notes,
    createdAt: row.created_at,
    signedUrl: await signPhotoUrl(row.storage_path),
  };
}

export async function deleteProgressPhoto(id: string, storagePath: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);

  const { error } = await supabase
    .from("progress_photos")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return !error;
}

export async function updateProgressPhotoNotes(id: string, notes: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from("progress_photos")
    .update({ notes: notes || null })
    .eq("id", id)
    .eq("user_id", user.id);
  return !error;
}

// ── Weekly reviews ───────────────────────────────────────────────────────────

export interface WeeklyReview {
  id: string;
  weekStart: string;     // YYYY-MM-DD (Monday)
  rating: number;        // 1..5
  wentWell: string | null;
  toImprove: string | null;
  focusNext: string | null;
  photoId: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapReview(r: any): WeeklyReview {
  return {
    id: r.id,
    weekStart: r.week_start,
    rating: r.rating,
    wentWell: r.went_well,
    toImprove: r.to_improve,
    focusNext: r.focus_next,
    photoId: r.photo_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function fetchWeeklyReview(weekStart: string): Promise<WeeklyReview | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  return data ? mapReview(data) : null;
}

export async function fetchAllWeeklyReviews(): Promise<WeeklyReview[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false });

  if (error || !data) return [];
  return data.map(mapReview);
}

export async function upsertWeeklyReview(input: {
  weekStart: string;
  rating: number;
  wentWell?: string | null;
  toImprove?: string | null;
  focusNext?: string | null;
  photoId?: string | null;
}): Promise<WeeklyReview | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("weekly_reviews")
    .upsert(
      {
        user_id: user.id,
        week_start: input.weekStart,
        rating: input.rating,
        went_well: input.wentWell ?? null,
        to_improve: input.toImprove ?? null,
        focus_next: input.focusNext ?? null,
        photo_id: input.photoId ?? null,
      },
      { onConflict: "user_id,week_start" },
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to save weekly review:", error);
    return null;
  }
  return mapReview(data);
}

export async function deleteWeeklyReview(id: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from("weekly_reviews")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  return !error;
}

// ── Week summary stats ───────────────────────────────────────────────────────

export interface WeekSummary {
  weekStart: string;
  weekEnd: string;
  workouts: { count: number; totalMinutes: number };
  activities: { restDays: number; otherCount: number };
  food: { daysLogged: number; avgCalories: number | null };
  water: { daysAtGoal: number; totalMl: number };
  weight: { entries: number; deltaKg: number | null; latestKg: number | null };
  sleep: { avgHours: number | null; avgQuality: number | null };
  prs: { count: number; names: string[] };
}

export async function computeWeekStats(weekStart: string): Promise<WeekSummary> {
  const { data: { user } } = await supabase.auth.getUser();
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 7); // exclusive
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const startDate = weekStart;
  const endDateExclusive = (() => {
    const d = new Date(start);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  })();

  const empty: WeekSummary = {
    weekStart,
    weekEnd: (() => {
      const d = new Date(start);
      d.setDate(d.getDate() + 6);
      return d.toISOString().split("T")[0];
    })(),
    workouts: { count: 0, totalMinutes: 0 },
    activities: { restDays: 0, otherCount: 0 },
    food: { daysLogged: 0, avgCalories: null },
    water: { daysAtGoal: 0, totalMl: 0 },
    weight: { entries: 0, deltaKg: null, latestKg: null },
    sleep: { avgHours: null, avgQuality: null },
    prs: { count: 0, names: [] },
  };

  if (!user) return empty;

  const [
    workoutsRes,
    activitiesRes,
    foodRes,
    waterRes,
    bodyRes,
    sleepRes,
    nutritionGoalsRes,
  ] = await Promise.all([
    supabase
      .from("workout_history")
      .select("id, date, duration, workout_name")
      .eq("user_id", user.id)
      .gte("date", startIso)
      .lt("date", endIso),
    supabase
      .from("activity_logs")
      .select("activity_type, date")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lt("date", endDateExclusive),
    supabase
      .from("food_logs")
      .select("date, calories")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lt("date", endDateExclusive),
    supabase
      .from("water_intake")
      .select("date, amount_ml")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lt("date", endDateExclusive),
    supabase
      .from("body_measurements")
      .select("date, body_weight")
      .eq("user_id", user.id)
      .gte("date", startIso)
      .lt("date", endIso)
      .order("date", { ascending: true }),
    supabase
      .from("sleep_logs")
      .select("date, hours, quality")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lt("date", endDateExclusive),
    supabase
      .from("nutrition_goals")
      .select("water_goal_ml")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const workouts = workoutsRes.data || [];
  const activities = activitiesRes.data || [];
  const foods = foodRes.data || [];
  const waters = waterRes.data || [];
  const bodies = bodyRes.data || [];
  const sleeps = sleepRes.data || [];
  const waterGoal = nutritionGoalsRes.data?.water_goal_ml || 2500;

  // Workouts
  empty.workouts.count = workouts.length;
  empty.workouts.totalMinutes = workouts.reduce((s: number, w: any) => s + (w.duration || 0), 0);

  // Activities
  empty.activities.restDays = activities.filter((a: any) => a.activity_type === "rest").length;
  empty.activities.otherCount = activities.length - empty.activities.restDays;

  // Food
  const foodDays = new Set(foods.map((f: any) => f.date));
  empty.food.daysLogged = foodDays.size;
  if (foodDays.size > 0) {
    const dailyTotals: Record<string, number> = {};
    foods.forEach((f: any) => {
      dailyTotals[f.date] = (dailyTotals[f.date] || 0) + Number(f.calories || 0);
    });
    const totals = Object.values(dailyTotals);
    empty.food.avgCalories = Math.round(totals.reduce((s, x) => s + x, 0) / totals.length);
  }

  // Water
  const waterByDay: Record<string, number> = {};
  waters.forEach((w: any) => {
    waterByDay[w.date] = (waterByDay[w.date] || 0) + (w.amount_ml || 0);
    empty.water.totalMl += w.amount_ml || 0;
  });
  empty.water.daysAtGoal = Object.values(waterByDay).filter((ml) => ml >= waterGoal).length;

  // Weight
  empty.weight.entries = bodies.filter((b: any) => b.body_weight != null).length;
  if (bodies.length > 0) {
    const last = bodies[bodies.length - 1];
    if (last?.body_weight != null) empty.weight.latestKg = Number(last.body_weight);
  }
  // Delta vs previous week's last weight
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - 7);
  const { data: prevWeights } = await supabase
    .from("body_measurements")
    .select("date, body_weight")
    .eq("user_id", user.id)
    .gte("date", prevStart.toISOString())
    .lt("date", startIso)
    .order("date", { ascending: false })
    .limit(1);
  const prevLast = prevWeights?.[0]?.body_weight;
  if (empty.weight.latestKg != null && prevLast != null) {
    empty.weight.deltaKg = Number((empty.weight.latestKg - Number(prevLast)).toFixed(1));
  }

  // Sleep
  if (sleeps.length > 0) {
    empty.sleep.avgHours = Number(
      (sleeps.reduce((s: number, x: any) => s + Number(x.hours || 0), 0) / sleeps.length).toFixed(1),
    );
    empty.sleep.avgQuality = Number(
      (sleeps.reduce((s: number, x: any) => s + Number(x.quality || 0), 0) / sleeps.length).toFixed(1),
    );
  }

  // PRs this week — find sets in this week where weight exceeds all-time max
  // before the start of this week (per base exercise).
  if (workouts.length > 0) {
    const historyIds = workouts.map((w: any) => w.id);
    const { data: weekSets } = await supabase
      .from("workout_sets")
      .select("exercise_id, exercise_name, weight, created_at")
      .in("workout_history_id", historyIds)
      .gt("weight", 0);
    const { data: priorSets } = await supabase
      .from("workout_sets")
      .select("exercise_id, weight, created_at")
      .eq("user_id", user.id)
      .gt("weight", 0)
      .lt("created_at", startIso);

    const priorMax: Record<string, number> = {};
    (priorSets || []).forEach((s: any) => {
      const base = stripExerciseSuffixes(s.exercise_id);
      const w = Number(s.weight);
      if (!priorMax[base] || w > priorMax[base]) priorMax[base] = w;
    });

    const newMax: Record<string, { weight: number; name: string }> = {};
    (weekSets || []).forEach((s: any) => {
      const base = stripExerciseSuffixes(s.exercise_id);
      const w = Number(s.weight);
      const prior = priorMax[base] || 0;
      if (w > prior) {
        if (!newMax[base] || w > newMax[base].weight) {
          newMax[base] = { weight: w, name: s.exercise_name || base };
        }
      }
    });
    const prList = Object.values(newMax);
    empty.prs.count = prList.length;
    empty.prs.names = prList.map((p) => p.name).slice(0, 6);
  }

  return empty;
}

// ── Calorie burn rollups ─────────────────────────────────────────────────────

export type DailyBurn = {
  date: string;
  strengthKcal: number;
  cardioKcal: number;
  totalKcal: number;
};

export type WeeklyBurn = {
  weekStart: string;
  totalKcal: number;
  strengthKcal: number;
  cardioKcal: number;
  dailyBreakdown: DailyBurn[];
};

/** Sum strength + cardio kcal for a single date (local YYYY-MM-DD). */
export async function fetchDailyBurn(date: string): Promise<DailyBurn> {
  const { data: { user } } = await supabase.auth.getUser();
  const empty: DailyBurn = { date, strengthKcal: 0, cardioKcal: 0, totalKcal: 0 };
  if (!user) return empty;

  // workout_history.date is timestamptz — match the calendar day.
  const startISO = `${date}T00:00:00.000Z`;
  const endISO = `${date}T23:59:59.999Z`;

  const [{ data: wh }, { data: al }] = await Promise.all([
    supabase
      .from("workout_history")
      .select("calories_burned")
      .eq("user_id", user.id)
      .gte("date", startISO)
      .lte("date", endISO),
    supabase
      .from("activity_logs")
      .select("calories_burned")
      .eq("user_id", user.id)
      .eq("date", date),
  ]);

  const strengthKcal = (wh || []).reduce((s, r: { calories_burned: number | null }) => s + (r.calories_burned ?? 0), 0);
  const cardioKcal = (al || []).reduce((s, r: { calories_burned: number | null }) => s + (r.calories_burned ?? 0), 0);
  return { date, strengthKcal, cardioKcal, totalKcal: strengthKcal + cardioKcal };
}

/**
 * Weekly burn rollup. `weekStart` should be a Monday in `YYYY-MM-DD`.
 * Returns daily breakdown for the 7 days starting at `weekStart`.
 */
export async function fetchWeeklyBurn(weekStart: string): Promise<WeeklyBurn> {
  const { data: { user } } = await supabase.auth.getUser();
  const start = new Date(weekStart + "T00:00:00");
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  const empty: WeeklyBurn = {
    weekStart,
    totalKcal: 0,
    strengthKcal: 0,
    cardioKcal: 0,
    dailyBreakdown: days.map((date) => ({ date, strengthKcal: 0, cardioKcal: 0, totalKcal: 0 })),
  };
  if (!user) return empty;

  const startISO = `${days[0]}T00:00:00.000Z`;
  const endISO = `${days[6]}T23:59:59.999Z`;

  const [{ data: wh }, { data: al }] = await Promise.all([
    supabase
      .from("workout_history")
      .select("date, calories_burned")
      .eq("user_id", user.id)
      .gte("date", startISO)
      .lte("date", endISO),
    supabase
      .from("activity_logs")
      .select("date, calories_burned")
      .eq("user_id", user.id)
      .gte("date", days[0])
      .lte("date", days[6]),
  ]);

  const dayMap: Record<string, DailyBurn> = {};
  days.forEach((d) => (dayMap[d] = { date: d, strengthKcal: 0, cardioKcal: 0, totalKcal: 0 }));

  (wh || []).forEach((r: { date: string; calories_burned: number | null }) => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (dayMap[key]) {
      dayMap[key].strengthKcal += r.calories_burned ?? 0;
    }
  });
  (al || []).forEach((r: { date: string; calories_burned: number | null }) => {
    if (dayMap[r.date]) {
      dayMap[r.date].cardioKcal += r.calories_burned ?? 0;
    }
  });

  const dailyBreakdown = days.map((d) => {
    const day = dayMap[d];
    return { ...day, totalKcal: day.strengthKcal + day.cardioKcal };
  });

  const strengthKcal = dailyBreakdown.reduce((s, d) => s + d.strengthKcal, 0);
  const cardioKcal = dailyBreakdown.reduce((s, d) => s + d.cardioKcal, 0);

  return {
    weekStart,
    strengthKcal,
    cardioKcal,
    totalKcal: strengthKcal + cardioKcal,
    dailyBreakdown,
  };
}

/** Monday of the week containing `date` as YYYY-MM-DD (local). */
export function mondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay() || 7; // Sun=0 → 7
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Last N ISO Mondays including the current week, oldest → newest. */
export function recentMondays(weeks = 4): string[] {
  const now = new Date();
  const start = new Date(mondayOfWeek(now));
  const out: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(start.getDate() - i * 7);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

