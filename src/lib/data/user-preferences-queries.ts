import { supabase } from "@/integrations/supabase/client";
import type { UserPreferences } from "../user-preferences";

// user_preferences is not yet in the generated Supabase types.
type UserPreferencesRow = {
  onboarding_complete: boolean;
  days_per_week: number | null;
  split_id: string | null;
  split_name: string | null;
  schedule: UserPreferences["schedule"] | null;
};

const table = () => (supabase as unknown as { from: (t: string) => any }).from("user_preferences");

/** Cloud backup of the localStorage-primary UserPreferences — used to recover after a reinstall/app-data clear. */
export async function fetchUserPreferencesFromCloud(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await table()
    .select("onboarding_complete, days_per_week, split_id, split_name, schedule")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("fetchUserPreferencesFromCloud failed:", error);
    return null;
  }
  const row = data as UserPreferencesRow;
  return {
    onboardingComplete: row.onboarding_complete,
    daysPerWeek: row.days_per_week ?? 0,
    splitId: row.split_id ?? "",
    splitName: row.split_name ?? "",
    schedule: row.schedule ?? [],
  };
}

/** Best-effort write-through — failures are swallowed (localStorage is the primary copy). */
export async function upsertUserPreferencesToCloud(userId: string, prefs: UserPreferences): Promise<void> {
  try {
    const { error } = await table().upsert({
      user_id: userId,
      onboarding_complete: prefs.onboardingComplete,
      days_per_week: prefs.daysPerWeek,
      split_id: prefs.splitId,
      split_name: prefs.splitName,
      schedule: prefs.schedule,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("upsertUserPreferencesToCloud failed:", error);
  } catch (e) {
    console.error("upsertUserPreferencesToCloud failed:", e);
  }
}
