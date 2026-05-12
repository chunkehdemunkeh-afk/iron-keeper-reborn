// Pure scoring algorithms — Whoop-inspired biometric recovery/strain/stress scores.
// No React or Supabase imports. Mirrors the pattern of recovery.ts.

export interface DailyBiometric {
  date: string;               // YYYY-MM-DD
  samsungStressScore: number | null;  // 0–100 (Samsung HRV-derived)
  restingHr: number | null;           // bpm
  spo2Pct: number | null;
  hrvMs: number | null;               // RMSSD ms (optional)
  respiratoryRate: number | null;     // breaths/min
}

export interface SleepLogFull {
  date: string;
  hours: number;
  quality: number;            // 1–5
  deepSleepMin?: number | null;
  remSleepMin?: number | null;
  lightSleepMin?: number | null;
  awakeMin?: number | null;
  sleepEfficiency?: number | null;
}

export interface UserBaseline {
  avgStress: number;
  stdStress: number;
  avgRHR: number;
  stdRHR: number;
  avgHRV: number | null;
  stdHRV: number | null;
  sampleSize: number;
}

export interface DailyScores {
  recoveryScore: number;      // 0–100
  strainScore: number;        // 0–21
  stressLevel: number;        // 0–3
  sleepPerformance: number;   // 0–100
}

export type FactorKey = "sleep" | "hrv" | "rhr" | "stress" | "resp";

export interface RecoveryFactor {
  key: FactorKey;
  label: string;
  /** 0–1 sub-score that fed the composite. */
  score: number;
  /** Pre-weight contribution to the final 0–100 (= score × weight × 100). */
  contribution: number;
  /** Final weight used (0–1). */
  weight: number;
  /** Human-readable delta vs baseline, e.g. "+4 bpm" or "-12 min". null if no baseline yet. */
  deltaPretty: string | null;
  /** Direction relative to recovery: positive = helping, negative = hurting. */
  direction: "positive" | "negative" | "neutral";
}

export interface RecoveryBreakdown {
  score: number;              // 0–100, same as computeRecoveryScore
  factors: RecoveryFactor[];  // ordered by absolute contribution change vs neutral (0.5)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stdDev(arr: number[], avg?: number): number {
  if (arr.length < 2) return 0;
  const m = avg ?? mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

// Normalise a value relative to a baseline mean/std into a 0–1 score.
// positive direction = higher than mean is BETTER (e.g. lower stress → higher recovery).
function normaliseScore(value: number, mean: number, std: number, positiveDirection: "higher" | "lower"): number {
  if (std <= 0) return 0.5;
  const z = (value - mean) / std;
  const directed = positiveDirection === "higher" ? z : -z;
  // Sigmoid squash: maps z≈0 to 0.5, ±2σ to ~0.88/0.12, clamped to 0–1
  return clamp(0.5 + directed * 0.18, 0, 1);
}

// ─── Baseline ────────────────────────────────────────────────────────────────

/**
 * Compute a 28-day rolling personal baseline from historical biometrics.
 * Used to personalise scores (same HR = different meaning for different people).
 */
export function computeUserBaseline(history: DailyBiometric[]): UserBaseline {
  const stressValues = history.map(b => b.samsungStressScore).filter((v): v is number => v !== null);
  const rhrValues    = history.map(b => b.restingHr).filter((v): v is number => v !== null);
  const hrvValues    = history.map(b => b.hrvMs).filter((v): v is number => v !== null);

  const avgStress = stressValues.length ? mean(stressValues) : 40;
  const avgRHR    = rhrValues.length    ? mean(rhrValues)    : 60;
  const avgHRV    = hrvValues.length    ? mean(hrvValues)    : null;

  return {
    avgStress,
    stdStress: stressValues.length >= 3 ? stdDev(stressValues, avgStress) : 12,
    avgRHR,
    stdRHR:    rhrValues.length >= 3    ? stdDev(rhrValues, avgRHR)       : 5,
    avgHRV,
    stdHRV:    hrvValues.length >= 3    ? stdDev(hrvValues, avgHRV ?? 0)  : null,
    sampleSize: Math.max(stressValues.length, rhrValues.length),
  };
}

// ─── Sleep factor (shared between recovery + sleep performance) ───────────────

function computeSleepFactor(sleep: SleepLogFull, sleepNeed: number): number {
  const sufficiency = clamp(sleep.hours / sleepNeed, 0, 1);

  const deep  = sleep.deepSleepMin  ?? null;
  const rem   = sleep.remSleepMin   ?? null;
  const light = sleep.lightSleepMin ?? null;
  const awake = sleep.awakeMin      ?? null;

  if (deep !== null && rem !== null && light !== null) {
    const totalSleepMin = sleep.hours * 60;
    const awakeFrac = awake !== null ? awake / totalSleepMin : 0.05;
    const efficiency = clamp(1 - awakeFrac, 0, 1);
    const restorative = clamp((deep + rem) / totalSleepMin, 0, 1);
    return (
      sufficiency   * 0.40 +
      (sleep.quality / 5) * 0.15 +
      efficiency    * 0.25 +
      restorative   * 0.20
    );
  }

  // Fallback (no stage data)
  return sufficiency * 0.60 + (sleep.quality / 5) * 0.40;
}

// ─── Recovery Score ───────────────────────────────────────────────────────────

/**
 * Compute daily recovery score (0–100).
 * Color bands: green ≥ 67, yellow 34–66, red ≤ 33.
 *
 * Primary signal: Samsung Stress Score (0–100, lower = more recovered).
 * Secondary: RHR deviation from baseline, sleep quality/duration, respiratory rate.
 *
 * Graceful fallback if no biometrics entered today: uses sleep + previous strain only.
 */
export function computeRecoveryScore(
  today: DailyBiometric | null,
  baseline: UserBaseline,
  sleep: SleepLogFull | null,
  prevDayStrain: number,
): number {
  return computeRecoveryBreakdown(today, baseline, sleep, prevDayStrain).score;
}

/**
 * Whoop-style breakdown — same composite as computeRecoveryScore, but also
 * returns each factor's sub-score, weight, and human-readable delta vs baseline.
 *
 * Weighting (mirrors Whoop's published guidance):
 *   • HRV present  → Sleep 40 / HRV 30 / RHR 15 / Stress 10 / Resp 5
 *   • HRV missing  → Sleep 40 / Stress 30 / RHR 20 / Resp 10  (Galaxy Watch path)
 *
 * If `today` is null we fall back to sleep + inverse-of-yesterday's-strain
 * and return only those two factors.
 */
export function computeRecoveryBreakdown(
  today: DailyBiometric | null,
  baseline: UserBaseline,
  sleep: SleepLogFull | null,
  prevDayStrain: number,
): RecoveryBreakdown {
  const sleepNeed = 7.0 + (prevDayStrain / 21) * 1.5; // 7–8.5h

  const sleepScore = sleep ? computeSleepFactor(sleep, sleepNeed) : 0.4;
  const sleepDelta = sleep ? formatHoursDelta(sleep.hours - sleepNeed) : null;
  const sleepFactor: RecoveryFactor = {
    key: "sleep",
    label: "Sleep",
    score: sleepScore,
    weight: 0,
    contribution: 0,
    deltaPretty: sleepDelta,
    direction: scoreDirection(sleepScore),
  };

  if (!today) {
    const strainScore = clamp(1 - prevDayStrain / 21, 0, 1);
    sleepFactor.weight = 0.7;
    sleepFactor.contribution = sleepScore * 70;
    const strainFactor: RecoveryFactor = {
      key: "stress",
      label: "Yesterday's strain",
      score: strainScore,
      weight: 0.3,
      contribution: strainScore * 30,
      deltaPretty: prevDayStrain > 0 ? `${prevDayStrain.toFixed(1)} / 21` : null,
      direction: scoreDirection(strainScore),
    };
    const composite = clamp(sleepScore * 0.7 + strainScore * 0.3, 0, 1) * 100;
    return { score: composite, factors: orderByImpact([sleepFactor, strainFactor]) };
  }

  // ── HRV ──────────────────────────────────────────────────────────────────
  const hrvAvailable = today.hrvMs !== null && baseline.avgHRV !== null;
  const hrvScore = hrvAvailable
    ? normaliseScore(today.hrvMs!, baseline.avgHRV!, baseline.stdHRV ?? 8, "higher")
    : 0.5;
  const hrvDelta = hrvAvailable ? formatBpmDelta(today.hrvMs! - baseline.avgHRV!, "ms") : null;

  // ── Stress (Samsung HRV-derived score, lower = better) ───────────────────
  const stressScore = today.samsungStressScore !== null
    ? normaliseScore(today.samsungStressScore, baseline.avgStress, baseline.stdStress, "lower")
    : sleepScore;
  const stressDelta = today.samsungStressScore !== null
    ? formatBpmDelta(today.samsungStressScore - baseline.avgStress, "")
    : null;

  // ── RHR (lower = better) ──────────────────────────────────────────────────
  const rhrScore = today.restingHr !== null
    ? normaliseScore(today.restingHr, baseline.avgRHR, baseline.stdRHR, "lower")
    : 0.5;
  const rhrDelta = today.restingHr !== null
    ? formatBpmDelta(today.restingHr - baseline.avgRHR, "bpm")
    : null;

  // ── Respiratory rate ─────────────────────────────────────────────────────
  const respBaseline = 15; // population norm; could be personalised once 14d of data exists
  const respScore = today.respiratoryRate !== null
    ? clamp(1 - Math.abs(today.respiratoryRate - respBaseline) / 8, 0, 1)
    : 0.5;
  const respDelta = today.respiratoryRate !== null
    ? formatBpmDelta(today.respiratoryRate - respBaseline, "br/min")
    : null;

  // Whoop weighting — sleep leads, HRV second when present
  const weights = hrvAvailable
    ? { sleep: 0.40, hrv: 0.30, rhr: 0.15, stress: 0.10, resp: 0.05 }
    : { sleep: 0.40, hrv: 0.00, rhr: 0.20, stress: 0.30, resp: 0.10 };

  const factors: RecoveryFactor[] = ([
    { ...sleepFactor, weight: weights.sleep, contribution: sleepScore * weights.sleep * 100 },
    {
      key: "hrv",
      label: "HRV",
      score: hrvScore,
      weight: weights.hrv,
      contribution: hrvScore * weights.hrv * 100,
      deltaPretty: hrvDelta,
      direction: hrvAvailable ? scoreDirection(hrvScore) : "neutral",
    },
    {
      key: "rhr",
      label: "Resting HR",
      score: rhrScore,
      weight: weights.rhr,
      contribution: rhrScore * weights.rhr * 100,
      deltaPretty: rhrDelta,
      direction: today.restingHr !== null ? scoreDirection(rhrScore) : "neutral",
    },
    {
      key: "stress",
      label: "Stress score",
      score: stressScore,
      weight: weights.stress,
      contribution: stressScore * weights.stress * 100,
      deltaPretty: stressDelta,
      direction: today.samsungStressScore !== null ? scoreDirection(stressScore) : "neutral",
    },
    {
      key: "resp",
      label: "Respiratory rate",
      score: respScore,
      weight: weights.resp,
      contribution: respScore * weights.resp * 100,
      deltaPretty: respDelta,
      direction: today.respiratoryRate !== null ? scoreDirection(respScore) : "neutral",
    },
  ].filter((f) => f.weight > 0);

  const raw =
    sleepScore   * weights.sleep  +
    hrvScore     * weights.hrv    +
    rhrScore     * weights.rhr    +
    stressScore  * weights.stress +
    respScore    * weights.resp;

  return {
    score: clamp(raw, 0, 1) * 100,
    factors: orderByImpact(factors),
  };
}

// ─── Breakdown helpers ───────────────────────────────────────────────────────

function scoreDirection(score: number): "positive" | "negative" | "neutral" {
  if (score >= 0.6) return "positive";
  if (score <= 0.4) return "negative";
  return "neutral";
}

function orderByImpact(factors: RecoveryFactor[]): RecoveryFactor[] {
  // Sort by how far each factor pulled away from neutral (0.5 × weight × 100)
  return [...factors].sort((a, b) => {
    const aDist = Math.abs(a.contribution - a.weight * 50);
    const bDist = Math.abs(b.contribution - b.weight * 50);
    return bDist - aDist;
  });
}

function formatBpmDelta(delta: number, unit: string): string {
  const sign = delta > 0 ? "+" : "";
  const rounded = Math.round(delta);
  return unit ? `${sign}${rounded} ${unit}` : `${sign}${rounded}`;
}

function formatHoursDelta(hoursDelta: number): string {
  const minutes = Math.round(hoursDelta * 60);
  const sign = minutes > 0 ? "+" : "";
  return `${sign}${minutes} min`;
}

export function recoveryColor(score: number): string {
  if (score >= 67) return "hsl(152 70% 50%)";  // emerald — green
  if (score >= 34) return "hsl(38 95% 60%)";   // amber — yellow
  return "hsl(351 85% 60%)";                   // rose — red
}

export function recoveryLabel(score: number): "Green" | "Yellow" | "Red" {
  if (score >= 67) return "Green";
  if (score >= 34) return "Yellow";
  return "Red";
}

// ─── Strain Score ─────────────────────────────────────────────────────────────

/**
 * Daily strain score (0–21, logarithmic scale mirrors Whoop).
 * Computed from workout calories burned × effort multiplier + activity calories.
 * Logarithmic so each additional unit gets progressively harder to accumulate.
 */
export function computeStrainScore(
  workoutCalories: number,
  effortRating: number | null,   // 1–10 (from workout session RPE field)
  activityCalories: number,
): number {
  // effort_rating 1→0.6, 5→1.0, 10→1.8 — linearly interpolated
  const effortMult = effortRating !== null
    ? clamp(0.6 + ((effortRating - 1) / 9) * 1.2, 0.6, 1.8)
    : 1.0;

  // Workout contribution: higher effort workouts count more per calorie
  const workoutBase = (workoutCalories / 60) * effortMult;
  // Activity contribution: cardio at moderate intensity
  const activityBase = activityCalories / 80;

  const total = workoutBase + activityBase;
  // Logarithmic squash onto 0–21 scale
  const strain = Math.min(21, Math.log(1 + total) * 3.2);
  return Math.round(strain * 100) / 100;
}

export function strainLabel(score: number): string {
  if (score < 4)  return "Rest";
  if (score < 8)  return "Light";
  if (score < 12) return "Moderate";
  if (score < 16) return "Strenuous";
  if (score < 19) return "Very Strenuous";
  return "Maximum";
}

export function strainColor(score: number): string {
  if (score < 4)  return "hsl(152 70% 50%)";   // emerald
  if (score < 8)  return "hsl(200 80% 60%)";   // sky
  if (score < 12) return "hsl(38 95% 60%)";    // amber
  if (score < 16) return "hsl(25 90% 60%)";    // orange
  return "hsl(351 85% 60%)";                   // rose
}

// ─── Body Stress Level ────────────────────────────────────────────────────────

/**
 * Real-time body stress level (0–3) based on Samsung stress score + RHR vs 14-day baseline.
 * 0–0.9 = Low, 1.0–1.9 = Moderate, 2.0–2.9 = Elevated, 3.0 = High
 * Mirrors Whoop's Stress Monitor — motion-aware (distinguishes workout HR from stress).
 */
export function computeStressLevel(
  today: DailyBiometric | null,
  baseline: UserBaseline,
): number {
  if (!today || (today.samsungStressScore === null && today.restingHr === null)) {
    return 1.0; // default moderate when no data
  }

  let stressDeviation = 0;
  if (today.samsungStressScore !== null && baseline.stdStress > 0) {
    stressDeviation = (today.samsungStressScore - baseline.avgStress) / baseline.stdStress;
  }

  let rhrDeviation = 0;
  if (today.restingHr !== null && baseline.stdRHR > 0) {
    rhrDeviation = (today.restingHr - baseline.avgRHR) / baseline.stdRHR;
  }

  const raw = stressDeviation * 0.6 + rhrDeviation * 0.4;
  // Map z-scores to 0–3 scale: z=0 → 1.0 (moderate baseline), z=2 → ~3 (high)
  return clamp(1.0 + raw * 0.8, 0, 3);
}

export function stressLevelLabel(level: number): string {
  if (level < 1.0) return "Low";
  if (level < 2.0) return "Moderate";
  if (level < 2.8) return "Elevated";
  return "High";
}

export function stressLevelColor(level: number): string {
  if (level < 1.0) return "hsl(152 70% 50%)";  // emerald
  if (level < 2.0) return "hsl(38 95% 60%)";   // amber
  if (level < 2.8) return "hsl(25 90% 60%)";   // orange
  return "hsl(351 85% 60%)";                   // rose
}

// ─── Sleep Performance ────────────────────────────────────────────────────────

/**
 * Sleep performance score (0–100).
 * Accounts for sleep need (scales with yesterday's strain), stage quality if available.
 */
export function computeSleepPerformance(
  sleep: SleepLogFull | null,
  prevDayStrain: number,
): number {
  if (!sleep) return 0;
  const sleepNeed = 7.0 + (prevDayStrain / 21) * 1.5;
  return clamp(computeSleepFactor(sleep, sleepNeed), 0, 1) * 100;
}

export function sleepPerformanceLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  return "Poor";
}

// ─── Compute all scores in one call ──────────────────────────────────────────

export function computeAllScores(
  today: DailyBiometric | null,
  sleep: SleepLogFull | null,
  baseline: UserBaseline,
  workoutCalories: number,
  effortRating: number | null,
  activityCalories: number,
  prevDayStrain: number,
): DailyScores {
  return {
    recoveryScore:    computeRecoveryScore(today, baseline, sleep, prevDayStrain),
    strainScore:      computeStrainScore(workoutCalories, effortRating, activityCalories),
    stressLevel:      computeStressLevel(today, baseline),
    sleepPerformance: computeSleepPerformance(sleep, prevDayStrain),
  };
}
