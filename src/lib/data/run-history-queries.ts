import { supabase } from "@/integrations/supabase/client";
import { RUN_WORKOUTS, RUN_WORKOUT_IDS } from "@/lib/run-workouts";
import { targetSecondsFor, baseRunExerciseId } from "@/lib/run-splits";

export type RunSplit = {
  exerciseId: string;
  name: string;
  /** Distance in metres (stored in reps). */
  metres: number;
  /** Elapsed seconds (stored in weight). */
  seconds: number;
  paceSecPerKm: number;
  targetSeconds: number | null;
  achieved: boolean | null;
};

export type RunSessionRecord = {
  id: string;
  workoutId: string;
  workoutName: string;
  date: string;
  durationMin: number;
  splits: RunSplit[];
  totalMetres: number;
  /** Number of paced splits hit / total paced splits. */
  hit: number;
  paced: number;
};

/** Display names for every run exercise, including round-suffixed variants. */
const RUN_NAMES: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  RUN_WORKOUTS.forEach((w) => w.exercises.forEach((e) => { m[e.id] = e.name; }));
  return m;
})();

/**
 * Every logged run session with its splits compared against target pace.
 * `goalPaceSecPerKm` comes from the athlete's half marathon goal.
 */
export async function fetchRunSessionHistory(goalPaceSecPerKm: number): Promise<RunSessionRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: sessions, error } = await supabase
    .from("workout_history")
    .select("id, workout_id, workout_name, date, duration")
    .eq("user_id", user.id)
    .in("workout_id", Array.from(RUN_WORKOUT_IDS))
    .order("date", { ascending: false })
    .limit(100);
  if (error || !sessions?.length) return [];

  const ids = sessions.map((s) => s.id as string);
  const { data: sets } = await supabase
    .from("workout_sets")
    .select("workout_history_id, exercise_id, exercise_name, reps, weight, created_at")
    .in("workout_history_id", ids)
    .order("created_at", { ascending: true });

  const byHistory: Record<string, RunSplit[]> = {};
  for (const s of sets ?? []) {
    const seconds = Number(s.weight);
    const metres = Number(s.reps);
    if (!seconds || seconds <= 0) continue;
    if (!baseRunExerciseId(s.exercise_id as string)) continue;
    const targetSeconds = targetSecondsFor(s.exercise_id as string, metres, goalPaceSecPerKm);
    const name = RUN_NAMES[s.exercise_id as string]
      ?? (s.exercise_name && s.exercise_name !== s.exercise_id ? (s.exercise_name as string) : (s.exercise_id as string));
    (byHistory[s.workout_history_id as string] ??= []).push({
      exerciseId: s.exercise_id as string,
      name,
      metres,
      seconds,
      paceSecPerKm: metres > 0 ? (seconds / metres) * 1000 : 0,
      targetSeconds,
      achieved: targetSeconds === null ? null : seconds <= targetSeconds,
    });
  }

  return sessions.map((s) => {
    const splits = byHistory[s.id as string] ?? [];
    const paced = splits.filter((x) => x.achieved !== null);
    return {
      id: s.id as string,
      workoutId: s.workout_id as string,
      workoutName: s.workout_name as string,
      date: s.date as string,
      durationMin: Number(s.duration ?? 0),
      splits,
      totalMetres: splits.reduce((a, x) => a + (x.metres || 0), 0),
      hit: paced.filter((x) => x.achieved).length,
      paced: paced.length,
    };
  });
}
