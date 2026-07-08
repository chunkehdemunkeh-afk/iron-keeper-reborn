import { supabase } from "@/integrations/supabase/client";

// workout_drafts is not yet in the generated Supabase types.
const table = () => (supabase as unknown as { from: (t: string) => any }).from("workout_drafts");

/**
 * Cloud backup of the in-progress-session localStorage autosave (#19).
 * localStorage remains the primary/fast copy — this only exists so an
 * Android app-data clear mid-session doesn't lose the whole workout.
 */
export async function upsertWorkoutDraftToCloud(userId: string, workoutId: string, payload: unknown): Promise<void> {
  try {
    const { error } = await table().upsert({
      user_id: userId,
      workout_id: workoutId,
      payload,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("upsertWorkoutDraftToCloud failed:", error);
  } catch (e) {
    console.error("upsertWorkoutDraftToCloud failed:", e);
  }
}

export async function deleteWorkoutDraftFromCloud(userId: string, workoutId: string): Promise<void> {
  try {
    const { error } = await table().delete().eq("user_id", userId).eq("workout_id", workoutId);
    if (error) console.error("deleteWorkoutDraftFromCloud failed:", error);
  } catch (e) {
    console.error("deleteWorkoutDraftFromCloud failed:", e);
  }
}

export async function fetchWorkoutDraftFromCloud(userId: string, workoutId: string): Promise<{ payload: any; updatedAt: string } | null> {
  const { data, error } = await table()
    .select("payload, updated_at")
    .eq("user_id", userId)
    .eq("workout_id", workoutId)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("fetchWorkoutDraftFromCloud failed:", error);
    return null;
  }
  return { payload: data.payload, updatedAt: data.updated_at };
}
