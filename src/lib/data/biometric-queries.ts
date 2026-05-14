import { supabase } from "@/integrations/supabase/client";
import { awardXpAndNotify } from "@/lib/gamification/notify";

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
  if (!error) void awardXpAndNotify({ source: "biometric_checkin", metadata: { date: data.date } });
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

/**
 * Recompute today's strain by summing all workouts + activities logged today,
 * then patch the existing daily_scores row (or insert a minimal one if missing).
 * Preserves recovery/stress/sleep/AI fields already saved by the morning check-in.
 */
export async function recomputeTodayStrain(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().split("T")[0];

  const [workoutsRes, activitiesRes, existingRes, biometricRes, profileRes] = await Promise.all([
    supabase
      .from("workout_history")
      .select("calories_burned, calories_watch, effort_rating, duration, duration_watch, avg_hr, max_hr, hr_zones")
      .eq("user_id", user.id)
      .eq("date", today),
    supabase
      .from("activity_logs")
      .select("calories_burned")
      .eq("user_id", user.id)
      .eq("date", today),
    supabase
      .from("daily_scores")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("daily_biometrics")
      .select("resting_hr")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("nutrition_goals")
      .select("tdee_age")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const workouts = workoutsRes.data ?? [];
  const activities = activitiesRes.data ?? [];

  // Prefer watch-reported calories per workout when present
  const workoutCalories = workouts.reduce(
    (s: number, w: any) => s + (w.calories_watch ?? w.calories_burned ?? 0),
    0,
  );
  const activityCalories = activities.reduce((s: number, a: any) => s + (a.calories_burned ?? 0), 0);
  const efforts = workouts.map((w: any) => w.effort_rating).filter((e: any): e is number => typeof e === "number");
  const avgEffort = efforts.length ? efforts.reduce((s, e) => s + e, 0) / efforts.length : null;

  // Aggregate HR weighted by duration (prefer watch duration when present)
  const totalDur = workouts.reduce((s: number, w: any) => s + (w.duration_watch ?? w.duration ?? 0), 0);
  const hrWeightedSum = workouts.reduce(
    (s: number, w: any) => s + ((w.avg_hr ?? 0) * (w.duration_watch ?? w.duration ?? 0)),
    0,
  );
  const avgHr = totalDur > 0 && hrWeightedSum > 0 ? hrWeightedSum / totalDur : null;
  const maxHr = workouts.reduce(
    (m: number | null, w: any) => (w.max_hr && (m === null || w.max_hr > m) ? w.max_hr : m),
    null as number | null,
  );

  // Sum HR zones element-wise across the day
  const zoneSum: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let anyZones = false;
  for (const w of workouts as any[]) {
    const z = Array.isArray(w.hr_zones) ? w.hr_zones : null;
    if (z && z.length === 5) {
      for (let i = 0; i < 5; i++) zoneSum[i] += Number(z[i]) || 0;
      if (z.some((v: any) => Number(v) > 0)) anyZones = true;
    }
  }

  const restingHr = (biometricRes.data as any)?.resting_hr ?? null;
  const age = (profileRes.data as any)?.tdee_age ?? null;

  const { computeStrainScore } = await import("../recovery-scores");
  const strain = computeStrainScore(workoutCalories, avgEffort, activityCalories, {
    durationMin: totalDur,
    avgHr,
    maxHr,
    restingHr,
    age,
    hrZones: anyZones ? zoneSum : null,
  });

  if (existingRes.data) {
    await supabase
      .from("daily_scores")
      .update({ strain_score: strain, updated_at: new Date().toISOString() })
      .eq("id", existingRes.data.id);
  } else {
    await supabase.from("daily_scores").insert({
      user_id: user.id,
      date: today,
      strain_score: strain,
    });
  }
}

/**
 * Recompute strain_score for the past `daysBack` days by summing each day's
 * workouts + activities. Updates existing daily_scores rows in-place;
 * inserts a minimal row when a day has training but no score record yet.
 * Returns number of days touched.
 */
export async function backfillStrainScores(daysBack = 30): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const [workoutsRes, activitiesRes, scoresRes, biometricsRes, profileRes] = await Promise.all([
    supabase
      .from("workout_history")
      .select("date, calories_burned, calories_watch, effort_rating, duration, duration_watch, avg_hr, max_hr, hr_zones")
      .eq("user_id", user.id)
      .gte("date", cutoffStr),
    supabase
      .from("activity_logs")
      .select("date, calories_burned")
      .eq("user_id", user.id)
      .gte("date", cutoffStr),
    supabase
      .from("daily_scores")
      .select("id, date")
      .eq("user_id", user.id)
      .gte("date", cutoffStr),
    supabase
      .from("daily_biometrics")
      .select("date, resting_hr")
      .eq("user_id", user.id)
      .gte("date", cutoffStr),
    supabase
      .from("nutrition_goals")
      .select("tdee_age")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  type Bucket = {
    workoutCal: number;
    activityCal: number;
    efforts: number[];
    durationMin: number;
    hrWeightedSum: number;
    maxHr: number | null;
  };
  const dayMap = new Map<string, Bucket>();
  const ensure = (d: string): Bucket => {
    if (!dayMap.has(d)) dayMap.set(d, { workoutCal: 0, activityCal: 0, efforts: [], durationMin: 0, hrWeightedSum: 0, maxHr: null });
    return dayMap.get(d)!;
  };
  for (const w of workoutsRes.data ?? []) {
    const d = String((w as any).date).split("T")[0];
    const bucket = ensure(d);
    bucket.workoutCal += (w as any).calories_burned ?? 0;
    bucket.durationMin += (w as any).duration ?? 0;
    if (typeof (w as any).effort_rating === "number") bucket.efforts.push((w as any).effort_rating);
    const dur = (w as any).duration ?? 0;
    if ((w as any).avg_hr && dur > 0) bucket.hrWeightedSum += (w as any).avg_hr * dur;
    if ((w as any).max_hr && (bucket.maxHr === null || (w as any).max_hr > bucket.maxHr)) {
      bucket.maxHr = (w as any).max_hr;
    }
  }
  for (const a of activitiesRes.data ?? []) {
    const d = String((a as any).date).split("T")[0];
    ensure(d).activityCal += (a as any).calories_burned ?? 0;
  }

  const restingByDate = new Map<string, number>();
  for (const b of biometricsRes.data ?? []) {
    if ((b as any).resting_hr) restingByDate.set((b as any).date, (b as any).resting_hr);
  }
  const age = (profileRes.data as any)?.tdee_age ?? null;

  const scoreIdByDate = new Map<string, string>();
  for (const s of scoresRes.data ?? []) scoreIdByDate.set((s as any).date, (s as any).id);

  const { computeStrainScore } = await import("../recovery-scores");
  let touched = 0;

  for (const [date, b] of dayMap) {
    const avgEffort = b.efforts.length ? b.efforts.reduce((s, e) => s + e, 0) / b.efforts.length : null;
    const avgHr = b.durationMin > 0 && b.hrWeightedSum > 0 ? b.hrWeightedSum / b.durationMin : null;
    const strain = computeStrainScore(b.workoutCal, avgEffort, b.activityCal, {
      durationMin: b.durationMin,
      avgHr,
      maxHr: b.maxHr,
      restingHr: restingByDate.get(date) ?? null,
      age,
    });
    const existingId = scoreIdByDate.get(date);
    if (existingId) {
      await supabase
        .from("daily_scores")
        .update({ strain_score: strain, updated_at: new Date().toISOString() })
        .eq("id", existingId);
    } else {
      await supabase.from("daily_scores").insert({
        user_id: user.id,
        date,
        strain_score: strain,
      });
    }
    touched++;
  }

  return touched;
}
