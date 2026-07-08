import { supabase } from "@/integrations/supabase/client";
import type { WorkoutDay, Exercise } from "../workout-data";

// custom_workouts is not yet in the generated Supabase types.
type CustomWorkoutRow = {
  id: string;
  name: string;
  focus: string;
  color: string;
  day: string;
  target_rir: string | null;
  exercises: Exercise[];
};

const table = () => (supabase as unknown as { from: (t: string) => any }).from("custom_workouts");

/** Fetch all custom workouts for a user from the cloud backup. Icon is not stored — caller must patch it in. */
export async function fetchCustomWorkoutsFromCloud(userId: string): Promise<Omit<WorkoutDay, "icon">[]> {
  const { data, error } = await table()
    .select("id, name, focus, color, day, target_rir, exercises")
    .eq("user_id", userId);
  if (error || !data) {
    console.error("fetchCustomWorkoutsFromCloud failed:", error);
    return [];
  }
  return (data as CustomWorkoutRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    focus: r.focus,
    color: r.color,
    day: r.day,
    targetRir: r.target_rir ?? undefined,
    exercises: r.exercises,
  }));
}

/** Best-effort write-through — failures are swallowed (localStorage is the primary copy). */
export async function upsertCustomWorkoutToCloud(userId: string, workout: WorkoutDay): Promise<void> {
  try {
    const { error } = await table().upsert({
      id: workout.id,
      user_id: userId,
      name: workout.name,
      focus: workout.focus,
      color: workout.color,
      day: workout.day,
      target_rir: workout.targetRir ?? null,
      exercises: workout.exercises,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("upsertCustomWorkoutToCloud failed:", error);
  } catch (e) {
    console.error("upsertCustomWorkoutToCloud failed:", e);
  }
}

/** Best-effort delete — failures are swallowed (localStorage is the primary copy). */
export async function deleteCustomWorkoutFromCloud(id: string): Promise<void> {
  try {
    const { error } = await table().delete().eq("id", id);
    if (error) console.error("deleteCustomWorkoutFromCloud failed:", error);
  } catch (e) {
    console.error("deleteCustomWorkoutFromCloud failed:", e);
  }
}
