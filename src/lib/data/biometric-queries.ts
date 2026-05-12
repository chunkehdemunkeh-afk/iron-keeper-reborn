import { supabase } from "@/integrations/supabase/client";

export interface DailyBiometricRecord {
  id: string;
  date: string;
  samsungStressScore: number | null;
  restingHr: number | null;
  spo2Pct: number | null;
  hrvMs: number | null;
  respiratoryRate: number | null;
  source: string;
}

export interface AIInsight {
  headline: string;
  recovery_summary: string;
  training_recommendation: string;
  sleep_analysis: string;
  week_ahead: string;
}

export interface DailyScoreRecord {
  id: string;
  date: string;
  recoveryScore: number | null;
  strainScore: number | null;
  stressLevel: number | null;
  sleepPerformance: number | null;
  aiInsight: AIInsight | null;
  aiGeneratedAt: string | null;
}

export async function upsertDailyBiometrics(data: {
  date: string;
  samsungStressScore?: number | null;
  restingHr?: number | null;
  spo2Pct?: number | null;
  hrvMs?: number | null;
  respiratoryRate?: number | null;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("daily_biometrics")
    .upsert(
      {
        user_id: user.id,
        date: data.date,
        samsung_stress_score: data.samsungStressScore ?? null,
        resting_hr: data.restingHr ?? null,
        spo2_pct: data.spo2Pct ?? null,
        hrv_ms: data.hrvMs ?? null,
        respiratory_rate: data.respiratoryRate ?? null,
        source: "manual",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" },
    );

  if (error) console.error("Failed to save biometrics:", error);
  return !error;
}

export async function fetchDailyBiometrics(daysBack = 28): Promise<DailyBiometricRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("daily_biometrics")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", cutoffStr)
    .order("date", { ascending: false });

  if (error || !data) return [];

  return data.map((r: any) => ({
    id: r.id,
    date: r.date,
    samsungStressScore: r.samsung_stress_score ?? null,
    restingHr: r.resting_hr ?? null,
    spo2Pct: r.spo2_pct != null ? Number(r.spo2_pct) : null,
    hrvMs: r.hrv_ms != null ? Number(r.hrv_ms) : null,
    respiratoryRate: r.respiratory_rate != null ? Number(r.respiratory_rate) : null,
    source: r.source,
  }));
}

export async function upsertDailyScore(data: {
  date: string;
  recoveryScore?: number | null;
  strainScore?: number | null;
  stressLevel?: number | null;
  sleepPerformance?: number | null;
  aiInsight?: AIInsight | null;
  aiGeneratedAt?: string | null;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("daily_scores")
    .upsert(
      {
        user_id: user.id,
        date: data.date,
        recovery_score: data.recoveryScore ?? null,
        strain_score: data.strainScore ?? null,
        stress_level: data.stressLevel ?? null,
        sleep_performance: data.sleepPerformance ?? null,
        ai_insight: (data.aiInsight ?? null) as never,
        ai_generated_at: data.aiGeneratedAt ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" },
    );

  if (error) console.error("Failed to save daily score:", error);
  return !error;
}

export async function updateDailyScoreAIInsight(
  date: string,
  aiInsight: AIInsight,
  aiGeneratedAt: string,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from("daily_scores")
    .update({ ai_insight: aiInsight as never, ai_generated_at: aiGeneratedAt, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("date", date);
  if (error) console.error("Failed to save AI insight:", error);
  return !error;
}

export async function fetchDailyScores(daysBack = 14): Promise<DailyScoreRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("daily_scores")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", cutoffStr)
    .order("date", { ascending: false });

  if (error || !data) return [];

  return data.map((r: any) => ({
    id: r.id,
    date: r.date,
    recoveryScore: r.recovery_score != null ? Number(r.recovery_score) : null,
    strainScore: r.strain_score != null ? Number(r.strain_score) : null,
    stressLevel: r.stress_level != null ? Number(r.stress_level) : null,
    sleepPerformance: r.sleep_performance != null ? Number(r.sleep_performance) : null,
    aiInsight: r.ai_insight ?? null,
    aiGeneratedAt: r.ai_generated_at ?? null,
  }));
}

export async function fetchTodayScore(): Promise<DailyScoreRecord | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("daily_scores")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    date: data.date,
    recoveryScore: data.recovery_score != null ? Number(data.recovery_score) : null,
    strainScore: data.strain_score != null ? Number(data.strain_score) : null,
    stressLevel: data.stress_level != null ? Number(data.stress_level) : null,
    sleepPerformance: data.sleep_performance != null ? Number(data.sleep_performance) : null,
    aiInsight: (data.ai_insight as unknown as AIInsight | null) ?? null,
    aiGeneratedAt: data.ai_generated_at ?? null,
  };
}
