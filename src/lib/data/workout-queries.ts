import { supabase } from "@/integrations/supabase/client";
import { WORKOUTS, type CompletedWorkout } from "../workout-data";
import { EXERCISE_SUBSTITUTIONS } from "../exercise-substitutions";
import { ACCESSORY_ROUTINES, ACCESSORY_SUBSTITUTIONS } from "../accessory-routines";
import { EXERCISE_LIBRARY } from "../exercise-library";
import { stripExerciseSuffixes } from "../muscle-mapping";
import { estimateStrengthBurn } from "../calorie-burn";
import { lookupUserBodyweight } from "./nutrition-queries";

export type PersonalRecord = {
  weight: number;
  reps: number;
  date: string;
  name: string;
  setId: string;
  bestReps: number;
  bestTrue1RM?: number;
};

export interface RecentSetRecord {
  exerciseId: string;
  exerciseName: string;
  targetMuscle?: string;
  muscleGroup?: string;
  weight: number;
  reps: number;
  workoutDate: string;
  userPR?: number;
}

export interface PRTrendPoint {
  date: string;
  weight: number;
  reps: number;
  isNewPR: boolean;
}

export interface ExercisePRTrend {
  baseId: string;
  name: string;
  currentPR: number;
  points: PRTrendPoint[];
}

export async function saveWorkoutToCloud(workout: CompletedWorkout): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const { saveWorkout } = await import("../workout-data");
    saveWorkout(workout);
    return;
  }

  let caloriesBurned: number | null = null;
  try {
    const bodyweight = await lookupUserBodyweight(user.id);
    const burnDuration = workout.startedAt
      ? Math.max(1, Math.ceil((Date.now() - new Date(workout.startedAt).getTime()) / 60000))
      : workout.duration;
    caloriesBurned = estimateStrengthBurn({
      sets: workout.sets,
      durationMin: burnDuration,
      weightKg: bodyweight,
    });
  } catch (e) {
    console.error("Burn estimate failed:", e);
  }

  const actualDuration = workout.startedAt
    ? Math.max(1, Math.ceil((Date.now() - new Date(workout.startedAt).getTime()) / 60000))
    : workout.duration;

  // Derive avgHr from zones (using zone-midpoint %HRR × estimated maxHR) when zones present
  // and the user didn't separately enter avgHr.
  let derivedAvgHr: number | null = workout.avgHr ?? null;
  const zones = workout.hrZones ?? null;
  if (!derivedAvgHr && zones && zones.some(z => z > 0)) {
    try {
      const { data: ng } = await supabase
        .from("nutrition_goals")
        .select("tdee_age")
        .eq("user_id", user.id)
        .maybeSingle();
      const age = (ng as { tdee_age?: number | null } | null)?.tdee_age ?? null;
      const maxHr = age ? 220 - age : 190;
      const restingHr = 60;
      const reserve = Math.max(1, maxHr - restingHr);
      const midHrr = [0.55, 0.65, 0.75, 0.85, 0.95];
      const totalMin = zones.reduce((s, z) => s + (z || 0), 0);
      if (totalMin > 0) {
        const weightedHrr =
          zones.reduce((s, z, i) => s + (z || 0) * midHrr[i], 0) / totalMin;
        derivedAvgHr = Math.round(restingHr + weightedHrr * reserve);
      }
    } catch (e) {
      console.error("Avg HR derivation failed:", e);
    }
  }

  const { data: historyRow, error: historyError } = await supabase
    .from("workout_history")
    .insert({
      user_id: user.id,
      workout_id: workout.workoutId,
      workout_name: workout.workoutName,
      date: workout.date,
      duration: actualDuration,
      started_at: workout.startedAt ?? null,
      exercises_completed: workout.exercisesCompleted,
      total_exercises: workout.totalExercises,
      effort_rating: workout.effortRating ?? null,
      session_notes: workout.sessionNotes ?? null,
      calories_burned: caloriesBurned,
      avg_hr: derivedAvgHr,
      max_hr: workout.maxHr ?? null,
      hr_zones: zones,
      duration_watch: workout.durationWatch ?? null,
      calories_watch: workout.caloriesWatch ?? null,
    } as never)
    .select("id")
    .single();

  if (historyError || !historyRow) {
    console.error("Failed to save workout:", historyError);
    return;
  }

  const exerciseMap: Record<string, string> = {};
  WORKOUTS.forEach(w => w.exercises.forEach(ex => { exerciseMap[ex.id] = ex.name; }));
  Object.values(EXERCISE_SUBSTITUTIONS).flat().forEach(sub => { exerciseMap[sub.id] = sub.name; });
  ACCESSORY_ROUTINES.forEach(r => r.exercises.forEach(ex => { exerciseMap[ex.id] = ex.name; }));
  Object.values(ACCESSORY_SUBSTITUTIONS).flat().forEach(sub => { exerciseMap[sub.id] = sub.name; });
  EXERCISE_LIBRARY.forEach(ex => { exerciseMap[ex.id] = ex.name; });

  const resolveName = (id: string, fallback?: string): string => {
    if (exerciseMap[id]) return exerciseMap[id];
    const base = stripExerciseSuffixes(id);
    if (base !== id && exerciseMap[base]) return exerciseMap[base];
    if (fallback && fallback !== id) return fallback;
    return exerciseMap[base] ?? id;
  };

  if (workout.sets.length > 0) {
    const { error: setsError } = await supabase
      .from("workout_sets")
      .insert(
        workout.sets.map(s => ({
          workout_history_id: historyRow.id,
          user_id: user.id,
          exercise_id: s.exerciseId,
          original_exercise_id: s.originalExerciseId ?? null,
          exercise_name: resolveName(s.exerciseId, s.exerciseName),
          reps: s.reps,
          weight: s.weight,
          set_type: s.setType ?? "working",
          rir: s.rir ?? null,
          target_rir: s.targetRir ?? null,
          target_reps: s.targetReps ?? null,
          target_weight: s.targetWeight ?? null,
          is_pr: s.isPr ?? false,
        } as never))
      );

    if (setsError) {
      console.error("Failed to save sets:", setsError);
    }
  }

  // Refresh today's strain score so the home/recovery cards reflect this workout.
  if (String(workout.date).slice(0, 10) === new Date().toISOString().split("T")[0]) {
    try {
      const { recomputeTodayStrain } = await import("./biometric-queries");
      await recomputeTodayStrain();
    } catch (e) {
      console.error("Strain recompute failed:", e);
    }
  }

  // Evaluate auto-progression suggestions (double-progression model).
  try {
    const { evaluateAndStoreProgression } = await import("./progression-queries");
    await evaluateAndStoreProgression(
      workout.sets.map(s => ({
        exerciseId: s.exerciseId,
        exerciseName: resolveName(s.exerciseId, s.exerciseName),
        reps: s.reps,
        weight: s.weight,
        setType: s.setType,
        targetRepsLow: (s as { targetRepsLow?: number }).targetRepsLow,
        targetRepsHigh: (s as { targetRepsHigh?: number }).targetRepsHigh,
      }))
    );
  } catch (e) {
    console.error("Progression evaluation failed:", e);
  }

  // Award XP (gamification). Failures swallowed inside notify.
  try {
    const { awardXpAndNotify } = await import("@/lib/gamification/notify");
    await awardXpAndNotify({
      source: "workout",
      setCount: workout.sets.filter((s) => (s.setType ?? "working") !== "warmup").length,
      metadata: { workoutId: workout.workoutId, workoutName: workout.workoutName },
    });
    if (!workout.workoutId.startsWith("custom-")) {
      await awardXpAndNotify({
        source: "workout_programmed_bonus",
        metadata: { workoutId: workout.workoutId },
      });
    }
  } catch (e) {
    console.error("XP award failed:", e);
  }
}

export async function fetchWorkoutHistory(): Promise<CompletedWorkout[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const { getWorkoutHistory } = await import("../workout-data");
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
      exerciseName: (s as { exercise_name?: string }).exercise_name ?? undefined,
      reps: s.reps,
      weight: Number(s.weight),
      setType: ((s as { set_type?: string }).set_type ?? "working") as "working" | "warmup" | "1rm_test",
    })),
  }));
}

export async function deleteWorkoutFromCloud(workoutId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

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
    if (setType === "warmup") return;
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
  return bestTrue > 0 ? bestTrue : bestEpley;
}

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

export async function fetchLastSessionData(workoutId: string): Promise<Record<string, { reps: number; weight: number }[]>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

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
      .select("exercise_id, reps, weight, set_type")
      .eq("workout_history_id", lastWorkout.id)
      .order("created_at", { ascending: true });

    sets?.forEach(s => {
      const st = (s as { set_type?: string }).set_type ?? "working";
      if (st === "warmup") return;
      if (!result[s.exercise_id]) result[s.exercise_id] = [];
      result[s.exercise_id].push({ reps: s.reps, weight: Number(s.weight) });
    });
  }

  return result;
}

export async function fetchExerciseLastData(exerciseId: string): Promise<{ reps: number; weight: number }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: latestSet } = await supabase
    .from("workout_sets")
    .select("workout_history_id")
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId)
    .neq("set_type", "warmup")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!latestSet) return [];

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("reps, weight, set_type")
    .eq("workout_history_id", latestSet.workout_history_id)
    .eq("exercise_id", exerciseId)
    .neq("set_type", "warmup")
    .order("created_at", { ascending: true });

  return (sets || []).map(s => ({ reps: s.reps, weight: Number(s.weight) }));
}

export async function fetchExerciseLastDataLike(baseId: string): Promise<{ exerciseId: string; sets: { reps: number; weight: number }[] } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Run two filtered queries (exact match + LIKE prefix) and pick the most recent.
  // Avoids a fragile .or() chain that broke at runtime in some supabase-js builds.
  const [{ data: exactRows }, { data: likeRows }] = await Promise.all([
    supabase
      .from("workout_sets")
      .select("workout_history_id, exercise_id, created_at")
      .eq("user_id", user.id)
      .eq("exercise_id", baseId)
      .neq("set_type", "warmup")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("workout_sets")
      .select("workout_history_id, exercise_id, created_at")
      .eq("user_id", user.id)
      .like("exercise_id", `${baseId}-%`)
      .neq("set_type", "warmup")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const candidates = [...(exactRows ?? []), ...(likeRows ?? [])];
  if (candidates.length === 0) return null;
  candidates.sort((a, b) =>
    new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
  );
  const latestSet = candidates[0];

  if (!latestSet) return null;

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("reps, weight, set_type")
    .eq("workout_history_id", latestSet.workout_history_id)
    .eq("exercise_id", latestSet.exercise_id)
    .neq("set_type", "warmup")
    .order("created_at", { ascending: true });

  return {
    exerciseId: latestSet.exercise_id as string,
    sets: (sets || []).map(s => ({ reps: s.reps, weight: Number(s.weight) })),
  };
}

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

export async function fetchRecentSets(daysBack: number = 7): Promise<RecentSetRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffIso = cutoff.toISOString();

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
  Object.values(EXERCISE_SUBSTITUTIONS).flat().forEach((sub: any) => {
    if (sub.name) nameMap[sub.id] = sub.name;
  });
  Object.values(ACCESSORY_SUBSTITUTIONS).flat().forEach((sub: any) => {
    if (sub.name) nameMap[sub.id] = sub.name;
  });

  const muscleGroupMap: Record<string, string> = {};
  EXERCISE_LIBRARY.forEach((ex) => {
    muscleGroupMap[ex.id] = ex.muscleGroup;
    if (ex.name) nameMap[ex.id] = ex.name;
  });

  return sets.map((s: any) => {
    const baseId = stripExerciseSuffixes(s.exercise_id);
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

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

export async function exportSetsCSV(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "";

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("exercise_name, reps, weight, created_at, set_type, rir, target_rir, target_reps, target_weight, is_pr")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!sets) return "";

  const headers = ["Date", "Exercise", "Set Type", "Reps", "Weight (kg)", "Target Reps", "Target Weight (kg)", "RIR", "Target RIR", "PR"];
  const rows = (sets as any[]).map(s => [
    new Date(s.created_at).toLocaleDateString("en-GB"),
    `"${String(s.exercise_name).replace(/"/g, '""')}"`,
    s.set_type ?? "working",
    s.reps,
    s.weight,
    s.target_reps ?? "",
    s.target_weight ?? "",
    s.rir ?? "",
    s.target_rir ?? "",
    s.is_pr ? "yes" : "no",
  ]);

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}
