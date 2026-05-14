import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchDailyBiometrics,
  fetchDailyScores,
  fetchSleepLogs,
  fetchWorkoutHistory,
  updateDailyScoreAIInsight,
  type AIInsight,
} from "@/lib/cloud-data";
import type { DailyBiometric, SleepLogFull } from "@/lib/recovery-scores";

export interface TrainingTodayEntry {
  name: string;
  durationMin: number;
  totalSets: number;
  totalVolumeKg: number;
  caloriesBurned: number | null;
}

interface InsightInputs {
  date: string;
  scores: { recovery: number; strain: number; stress: number; sleep: number };
  biometricHistory: DailyBiometric[];
  sleepFull: SleepLogFull | null;
  prevStrain: number;
  spo2Pct: number;
  trainingToday?: TrainingTodayEntry[];
}

/** Fire-and-forget AI insight call; persists result to daily_scores. */
export async function generateAIInsight(
  inputs: InsightInputs,
  queryClient: QueryClient,
): Promise<boolean> {
  try {
    const { date, scores, biometricHistory, sleepFull, prevStrain, spo2Pct } = inputs;
    const stress7d = biometricHistory.slice(0, 7).map((b) => b.samsungStressScore).reverse();
    const rhr7d    = biometricHistory.slice(0, 7).map((b) => b.restingHr).reverse();

    const payload = {
      scores: {
        recovery: Math.round(scores.recovery),
        strain: scores.strain,
        stress: scores.stress,
        sleep: Math.round(scores.sleep),
      },
      trends: {
        stress_7d: stress7d,
        rhr_7d: rhr7d,
        recovery_7d: [],
      },
      context: {
        next_workout: null,
        sleep_hours: sleepFull?.hours ?? null,
        sleep_stages: sleepFull
          ? {
              deep:  sleepFull.deepSleepMin  ?? null,
              rem:   sleepFull.remSleepMin   ?? null,
              light: sleepFull.lightSleepMin ?? null,
              awake: sleepFull.awakeMin      ?? null,
            }
          : null,
        yesterday_strain: prevStrain,
        spo2: spo2Pct,
      },
    };

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      console.warn("biometric-insight: no session token");
      return false;
    }
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/biometric-insight`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`biometric-insight ${res.status}:`, errText);
      return false;
    }

    const insight: AIInsight = await res.json();
    await updateDailyScoreAIInsight(date, insight, new Date().toISOString());
    queryClient.invalidateQueries({ queryKey: ["daily-scores"] });
    return true;
  } catch (err) {
    console.error("AI insight generation failed:", err);
    return false;
  }
}

/**
 * Re-generate today's AI insight from currently-saved data.
 * Used by the "Refresh insight" button on the recovery card.
 */
export async function regenerateAIInsightFromSaved(
  date: string,
  queryClient: QueryClient,
): Promise<boolean> {
  const [biometrics, sleepLogs, scores] = await Promise.all([
    fetchDailyBiometrics(28),
    fetchSleepLogs(7),
    fetchDailyScores(2),
  ]);

  const todayScore = scores.find((s) => s.date === date);
  if (!todayScore) {
    console.warn("regenerateAIInsight: no daily_score for", date);
    return false;
  }
  const todaySleep = sleepLogs.find((s) => s.date === date) ?? null;
  const todayBio = biometrics.find((b) => b.date === date);

  const prevDate = (() => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();
  const prevStrain = scores.find((s) => s.date === prevDate)?.strainScore ?? 0;

  const biometricHistory: DailyBiometric[] = biometrics.map((b) => ({
    date: b.date,
    samsungStressScore: b.samsungStressScore,
    restingHr: b.restingHr,
    spo2Pct: b.spo2Pct,
    hrvMs: b.hrvMs,
    respiratoryRate: b.respiratoryRate,
  }));

  const sleepFull: SleepLogFull | null = todaySleep
    ? {
        date: todaySleep.date,
        hours: todaySleep.hours,
        quality: todaySleep.quality,
        deepSleepMin:  todaySleep.deepSleepMin  ?? null,
        remSleepMin:   todaySleep.remSleepMin   ?? null,
        lightSleepMin: todaySleep.lightSleepMin ?? null,
        awakeMin:      todaySleep.awakeMin      ?? null,
      }
    : null;

  return generateAIInsight(
    {
      date,
      scores: {
        recovery: todayScore.recoveryScore ?? 0,
        strain: todayScore.strainScore ?? 0,
        stress: todayScore.stressLevel ?? 0,
        sleep: todayScore.sleepPerformance ?? 0,
      },
      biometricHistory,
      sleepFull,
      prevStrain,
      spo2Pct: todayBio?.spo2Pct ?? 97,
    },
    queryClient,
  );
}
