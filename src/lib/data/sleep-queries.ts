import { supabase } from "@/integrations/supabase/client";
import { awardXpAndNotify } from "@/lib/gamification/notify";

export interface SleepLogRecord {
  id: string;
  date: string;
  hours: number;
  quality: number;
  notes: string | null;
  source: string;
  deepSleepMin: number | null;
  remSleepMin: number | null;
  lightSleepMin: number | null;
  awakeMin: number | null;
  sleepEfficiency: number | null;
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
    deepSleepMin: r.deep_sleep_min ?? null,
    remSleepMin: r.rem_sleep_min ?? null,
    lightSleepMin: r.light_sleep_min ?? null,
    awakeMin: r.awake_min ?? null,
    sleepEfficiency: r.sleep_efficiency != null ? Number(r.sleep_efficiency) : null,
  }));
}

export async function upsertSleepLog(data: {
  date: string;
  hours: number;
  quality: number;
  notes?: string;
  deepSleepMin?: number | null;
  remSleepMin?: number | null;
  lightSleepMin?: number | null;
  awakeMin?: number | null;
  sleepEfficiency?: number | null;
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
        deep_sleep_min: data.deepSleepMin ?? null,
        rem_sleep_min: data.remSleepMin ?? null,
        light_sleep_min: data.lightSleepMin ?? null,
        awake_min: data.awakeMin ?? null,
        sleep_efficiency: data.sleepEfficiency ?? null,
      },
      { onConflict: "user_id,date" },
    );

  if (error) console.error("Failed to save sleep log:", error);
  if (!error) {
    void awardXpAndNotify({ source: "sleep_log", metadata: { date: data.date } });
    const hasStages = data.deepSleepMin != null || data.remSleepMin != null || data.lightSleepMin != null;
    if (hasStages) {
      void awardXpAndNotify({ source: "sleep_log_with_stages", metadata: { date: data.date } });
    }
  }
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
