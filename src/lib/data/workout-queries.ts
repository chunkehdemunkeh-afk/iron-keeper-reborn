import { supabase } from "@/integrations/supabase/client";
import { WORKOUTS, type CompletedWorkout } from "../workout-data";
import { EXERCISE_SUBSTITUTIONS } from "../exercise-substitutions";
import { ACCESSORY_ROUTINES, ACCESSORY_SUBSTITUTIONS } from "../accessory-routines";
import { EXERCISE_LIBRARY } from "../exercise-library";
import { stripExerciseSuffixes } from "../muscle-mapping";
import { looksLikeExerciseName, resolveExerciseName } from "../exercise-names";
import { estimateStrengthBurn } from "../calorie-burn";
import { lookupUserBodyweight } from "./nutrition-queries";
import { isReverseLoadExercise } from "../reverse-load-exercises";


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

  // Use the duration the client already computed (frozen when the workout was
  // finished), not a fresh Date.now() - startedAt recompute — the save can
  // happen minutes later (feedback screen, retry, offline queue), which would
  // otherwise inflate kcal/duration by however long that gap was.
  const actualDuration = workout.duration;

  let caloriesBurned: number | null = null;
  try {
    const bodyweight = await lookupUserBodyweight(user.id);
    caloriesBurned = estimateStrengthBurn({
      sets: workout.sets,
      durationMin: actualDuration,
      weightKg: bodyweight,
    });
  } catch (e) {
    console.error("Burn estimate failed:", e);
  }

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
    // Must reject, not silently return — WorkoutSession's finalizeWorkout()
    // shows "Workout saved!" and clears the autosave in its .then(), so a
    // silent return here would report success and lose the session on a
    // failed insert.
    throw historyError ?? new Error("Failed to save workout: no row returned");
  }

  const exerciseMap: Record<string, string> = {};
  WORKOUTS.forEach(w => w.exercises.forEach(ex => { exerciseMap[ex.id] = ex.name; }));
  Object.values(EXERCISE_SUBSTITUTIONS).flat().forEach(sub => { exerciseMap[sub.id] = sub.name; });
  ACCESSORY_ROUTINES.forEach(r => r.exercises.forEach(ex => { exerciseMap[ex.id] = ex.name; }));
  Object.values(ACCESSORY_SUBSTITUTIONS).flat().forEach(sub => { exerciseMap[sub.id] = sub.name; });
  EXERCISE_LIBRARY.forEach(ex => { exerciseMap[ex.id] = ex.name; });

  const resolveName = (id: string, fallback?: string): string =>
    resolveExerciseName(id, fallback);

  if (workout.sets.length > 0) {
    // Global monotonic counter across the whole session so `ORDER BY set_index ASC`
    // recovers the exact order the user logged rows (exercise-by-exercise AND
    // set-by-set). A per-exercise counter used to leave every exercise's first
    // set tied at set_index=0, so on read-back the exercise order collapsed to
    // random UUID `id` order.
    const { error: setsError } = await supabase
      .from("workout_sets")
      .insert(
        workout.sets.map((s, idx) => {
          return {
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
            set_index: idx,
          } as never;
        })
      );

    if (setsError) {
      console.error("Failed to save sets:", setsError);
      // Same reasoning as historyError above — must reject so the caller's
      // error toast/retry flow fires instead of reporting a save that
      // actually left the workout with zero logged sets.
      throw setsError;
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

  // Evaluate smart deload signals (writes a pending recommendation if criteria met).
  try {
    const { evaluateDeload } = await import("./deload-queries");
    await evaluateDeload();
  } catch (e) {
    console.error("Deload evaluation failed:", e);
  }

  // Contribute to active community challenges. Failures non-fatal.
  try {
    const { fetchActiveCommunityChallenges, contributeToChallenge } = await import("./community-queries");
    const challenges = await fetchActiveCommunityChallenges();
    if (challenges.length > 0) {
      const workingSets = workout.sets.filter((s) => {
        const t = s.setType ?? "working";
        return t === "working" || t === "1rm_test";
      });
      const volumeKg = workingSets.reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
      const setCount = workingSets.length;
      const repCount = workingSets.reduce((s, x) => s + (Number(x.reps) || 0), 0);
      for (const ch of challenges) {
        let delta = 0;
        if (ch.metric === "volume_kg") delta = volumeKg;
        else if (ch.metric === "sets") delta = setCount;
        else if (ch.metric === "reps") delta = repCount;
        else if (ch.metric === "workouts") delta = 1;
        if (delta > 0) await contributeToChallenge(user.id, ch.id, delta);
      }
    }
  } catch (e) {
    console.error("Community contribution failed:", e);
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
    .in("workout_history_id", historyIds)
    .order("set_index", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

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
    avgHr: (h as { avg_hr?: number | null }).avg_hr ?? null,
    maxHr: (h as { max_hr?: number | null }).max_hr ?? null,
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

  // Page through — Supabase default cap of 1000 rows would silently truncate
  // a heavy user's history and hide PRs from older sessions.
  const PAGE = 1000;
  const prs: Record<string, PersonalRecord> = {};
  for (let from = 0; ; from += PAGE) {
    const { data: sets, error } = await supabase
      .from("workout_sets")
      .select("id, exercise_id, exercise_name, reps, weight, created_at, set_type")
      .eq("user_id", user.id)
      .order("weight", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !sets || sets.length === 0) break;
    sets.forEach(s => {
      const w = Number(s.weight);
      const r = Number(s.reps);
      const setType = (s as { set_type?: string }).set_type ?? "working";
      if (setType === "warmup") return;
      // reps < 1 means the set was never actually completed — don't let an
      // abandoned/empty "working" row register as a PR (weight can legitimately
      // be 0 for bodyweight exercises, so only reps is filtered here).
      if (r < 1) return;
      // Assisted machines log assistance load — lower weight is the better set.
      const reverse = isReverseLoadExercise(s.exercise_id, s.exercise_name);
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
        if (reverse ? w < existing.weight : w > existing.weight) {
          existing.weight = w;
          existing.reps = r;
          existing.date = s.created_at;
          existing.name = s.exercise_name;
          existing.setId = s.id;
        }
        if (r > existing.bestReps) existing.bestReps = r;
        if (setType === "1rm_test" && (existing.bestTrue1RM === undefined || (reverse ? w < existing.bestTrue1RM : w > existing.bestTrue1RM))) {
          existing.bestTrue1RM = w;
        }

      }
    });
    if (sets.length < PAGE) break;
  }

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

export async function fetchVolumeData(daysBack = 90): Promise<{ date: string; volume: number; name: string }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  // Windowed by date, not row count — a user with many sessions in a short
  // span shouldn't have older-but-still-recent history cut off (and the old
  // ascending + limit(30) combo actually kept the OLDEST 30 rows, dropping
  // the most recent ones entirely).
  const { data: history } = await supabase
    .from("workout_history")
    .select("id, date, workout_name")
    .eq("user_id", user.id)
    .gte("date", cutoff.toISOString())
    .order("date", { ascending: true });

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

export async function fetchLastSessionData(workoutId: string): Promise<Record<string, { reps: number; weight: number; rir: number | null }[]>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data: lastWorkout } = await supabase
    .from("workout_history")
    .select("id")
    .eq("user_id", user.id)
    .eq("workout_id", workoutId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const result: Record<string, { reps: number; weight: number; rir: number | null }[]> = {};

  if (lastWorkout) {
    const { data: sets } = await supabase
      .from("workout_sets")
      .select("exercise_id, reps, weight, rir, set_type, set_index, created_at, id")
      .eq("workout_history_id", lastWorkout.id)
      .order("set_index", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    sets?.forEach(s => {
      const st = (s as { set_type?: string }).set_type ?? "working";
      if (st === "warmup") return;
      if (!result[s.exercise_id]) result[s.exercise_id] = [];
      const rirVal = (s as { rir?: number | null }).rir;
      result[s.exercise_id].push({
        reps: s.reps,
        weight: Number(s.weight),
        rir: rirVal === undefined || rirVal === null ? null : Number(rirVal),
      });
    });
  }

  return result;
}

export async function fetchExerciseLastData(exerciseId: string): Promise<{ reps: number; weight: number; rir: number | null }[]> {
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
    .maybeSingle();

  if (!latestSet) return [];

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("reps, weight, rir, set_type, set_index, created_at, id")
    .eq("workout_history_id", latestSet.workout_history_id)
    .eq("exercise_id", exerciseId)
    .neq("set_type", "warmup")
    .order("set_index", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  return (sets || []).map(s => {
    const rirVal = (s as { rir?: number | null }).rir;
    return {
      reps: s.reps,
      weight: Number(s.weight),
      rir: rirVal === undefined || rirVal === null ? null : Number(rirVal),
    };
  });
}


export async function fetchExerciseLastDataLike(baseId: string): Promise<{ exerciseId: string; sets: { reps: number; weight: number; rir: number | null }[] } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

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
    .select("reps, weight, rir, set_type, set_index, created_at, id")
    .eq("workout_history_id", latestSet.workout_history_id)
    .eq("exercise_id", latestSet.exercise_id)
    .neq("set_type", "warmup")
    .order("set_index", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  return {
    exerciseId: latestSet.exercise_id as string,
    sets: (sets || []).map(s => {
      const rirVal = (s as { rir?: number | null }).rir;
      return {
        reps: s.reps,
        weight: Number(s.weight),
        rir: rirVal === undefined || rirVal === null ? null : Number(rirVal),
      };
    }),
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
      nameMap[s.exercise_id] ?? nameMap[baseId] ??
      (looksLikeExerciseName(s.exercise_name) ? s.exercise_name : baseId);
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

  // Page through — Supabase default cap of 1000 rows would silently truncate.
  const PAGE = 1000;
  const sets: { exercise_id: string; exercise_name: string; weight: number | string; reps: number; created_at: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data: page, error } = await supabase
      .from("workout_sets")
      .select("exercise_id, exercise_name, weight, reps, created_at")
      .eq("user_id", user.id)
      .gt("weight", 0)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !page || page.length === 0) break;
    sets.push(...(page as typeof sets));
    if (page.length < PAGE) break;
  }
  if (sets.length === 0) return [];

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
    // Exclude Hyrox time-based benchmarks — their "weight" column stores
    // seconds (lower = better), so the generic PR chart would mis-flag slower
    // times as PRs. Hyrox benchmarks live on the dedicated /hyrox page.
    if (baseId.startsWith("hx-run-") || baseId.startsWith("hx-ski-") ||
        baseId.startsWith("hx-row-") || baseId.startsWith("hx-sim-r") ||
        baseId === "hx-sim-ski" || baseId === "hx-sim-bbj" ||
        baseId === "hx-farm-200") continue;


    const realName =
      nameMap[s.exercise_id] ?? nameMap[baseId] ??
      (looksLikeExerciseName(s.exercise_name) ? s.exercise_name : baseId);

    // Assisted machines: the running "best" is the lowest assistance used.
    const reverse = isReverseLoadExercise(s.exercise_id, realName);
    if (!grouped[baseId]) {
      grouped[baseId] = { name: realName, running: reverse ? Infinity : 0, points: [] };
    }

    const isNew = reverse ? w < grouped[baseId].running : w > grouped[baseId].running;
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

  // Page through — Supabase default cap of 1000 rows would silently truncate
  // the CSV export and hide older sets from the user.
  const PAGE = 1000;
  const sets: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data: page, error } = await supabase
      .from("workout_sets")
      .select("exercise_name, reps, weight, created_at, set_type, rir, target_rir, target_reps, target_weight, is_pr")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !page || page.length === 0) break;
    sets.push(...(page as Record<string, unknown>[]));
    if (page.length < PAGE) break;
  }
  if (sets.length === 0) return "";

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
