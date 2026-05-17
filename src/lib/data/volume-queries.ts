import { supabase } from "@/integrations/supabase/client";
import { WORKOUTS } from "../workout-data";
import { EXERCISE_SUBSTITUTIONS } from "../exercise-substitutions";
import { ACCESSORY_ROUTINES, ACCESSORY_SUBSTITUTIONS } from "../accessory-routines";
import { EXERCISE_LIBRARY } from "../exercise-library";
import { getMusclesWorked, stripExerciseSuffixes, MUSCLE_REGIONS } from "../muscle-mapping";
import type { MuscleRegion } from "../muscle-mapping";
import { mondayOfWeek, recentMondays } from "./utils";
import { isStrengthSet } from "../volume-standards";

export interface MuscleSetsForWeek {
  sets: number;
  load: number;
  strengthSets: number;
}

export interface WeeklyMuscleData {
  weekStart: string;
  muscles: Record<MuscleRegion, MuscleSetsForWeek>;
}

function emptyMuscles(): Record<MuscleRegion, MuscleSetsForWeek> {
  const out = {} as Record<MuscleRegion, MuscleSetsForWeek>;
  for (const m of MUSCLE_REGIONS) out[m] = { sets: 0, load: 0, strengthSets: 0 };
  return out;
}

export async function fetchWeeklyMuscleData(weeksBack = 4): Promise<WeeklyMuscleData[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);
  const cutoffIso = cutoff.toISOString();

  const { data: history } = await supabase
    .from("workout_history")
    .select("id, date")
    .eq("user_id", user.id)
    .gte("date", cutoffIso);

  if (!history || history.length === 0) {
    const weeks = recentMondays(weeksBack);
    return weeks.map(weekStart => ({ weekStart, muscles: emptyMuscles() }));
  }

  const historyIds = history.map((h: any) => h.id);
  const historyDateMap: Record<string, string> = {};
  history.forEach((h: any) => { historyDateMap[h.id] = h.date; });

  // Select set_type and rir — not available in fetchRecentSets
  const { data: sets } = await supabase
    .from("workout_sets")
    .select("exercise_id, exercise_name, weight, reps, workout_history_id, set_type, rir")
    .in("workout_history_id", historyIds);

  if (!sets) {
    const weeks = recentMondays(weeksBack);
    return weeks.map(weekStart => ({ weekStart, muscles: emptyMuscles() }));
  }

  // Build exercise metadata maps
  const nameMap: Record<string, string> = {};
  const targetMap: Record<string, string> = {};
  const muscleGroupMap: Record<string, string> = {};

  WORKOUTS.forEach((w) => w.exercises.forEach((ex: any) => {
    if (ex.name) nameMap[ex.id] = ex.name;
    if (ex.targetMuscle) targetMap[ex.id] = ex.targetMuscle;
  }));
  ACCESSORY_ROUTINES.forEach((r) => r.exercises.forEach((ex: any) => {
    if (ex.name) nameMap[ex.id] = ex.name;
    if (ex.targetMuscle) targetMap[ex.id] = ex.targetMuscle;
  }));
  Object.values(EXERCISE_SUBSTITUTIONS).flat().forEach((sub: any) => {
    if (sub.name) nameMap[sub.id] = sub.name;
  });
  Object.values(ACCESSORY_SUBSTITUTIONS).flat().forEach((sub: any) => {
    if (sub.name) nameMap[sub.id] = sub.name;
  });
  EXERCISE_LIBRARY.forEach((ex) => {
    if (ex.name) nameMap[ex.id] = ex.name;
    muscleGroupMap[ex.id] = ex.muscleGroup;
  });

  // Build PR map for strength-set detection
  const prMap: Record<string, number> = {};
  const { data: allUserSets } = await supabase
    .from("workout_sets")
    .select("exercise_id, weight")
    .eq("user_id", user.id)
    .gt("weight", 0);

  if (allUserSets) {
    for (const row of allUserSets as any[]) {
      const base = stripExerciseSuffixes(row.exercise_id);
      const w = Number(row.weight);
      if (!w || Number.isNaN(w)) continue;
      if (!prMap[base] || w > prMap[base]) prMap[base] = w;
    }
  }

  const weekStarts = recentMondays(weeksBack);
  const weekSet = new Set(weekStarts);

  // Accumulator: weekStart → muscle → counts
  const acc = new Map<string, Record<MuscleRegion, MuscleSetsForWeek>>();
  for (const ws of weekStarts) acc.set(ws, emptyMuscles());

  for (const s of sets as any[]) {
    const setType = s.set_type ?? "working";
    if (setType === "warmup") continue;

    const rawDate = historyDateMap[s.workout_history_id];
    if (!rawDate) continue;

    // Normalize to YYYY-MM-DD and anchor at noon to dodge DST flips
    const dateStr = String(rawDate).slice(0, 10);
    const weekStart = mondayOfWeek(new Date(dateStr + "T12:00:00"));
    if (!weekSet.has(weekStart)) continue;

    const baseId = stripExerciseSuffixes(s.exercise_id);
    const realName =
      s.exercise_name && s.exercise_name !== s.exercise_id
        ? s.exercise_name
        : nameMap[baseId] ?? nameMap[s.exercise_id] ?? s.exercise_name ?? "";

    const { primary } = getMusclesWorked(
      s.exercise_id,
      realName,
      targetMap[baseId] ?? targetMap[s.exercise_id],
      muscleGroupMap[baseId] ?? muscleGroupMap[s.exercise_id],
    );

    const weight = Number(s.weight);
    const reps = Number(s.reps);
    const load = weight * reps;
    const isStr = isStrengthSet(s.rir ?? null, weight, prMap[baseId] ?? prMap[s.exercise_id] ?? null);

    const weekData = acc.get(weekStart)!;
    for (const muscle of primary) {
      weekData[muscle].sets += 1;
      weekData[muscle].load += load;
      if (isStr) weekData[muscle].strengthSets += 1;
    }
  }

  return weekStarts.map(weekStart => ({
    weekStart,
    muscles: acc.get(weekStart)!,
  }));
}
