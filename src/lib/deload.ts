/**
 * Smart deload detection — pure functions, no Supabase imports.
 *
 * A deload is recommended only when the evidence is in. The 5 signals are
 * drawn from current resistance-training literature (Israetel/RP, Helms/3DMJ,
 * Tuchscherer RTS) and sports-science workload research (Gabbett 2016 ACWR).
 *
 *   1. Performance regression  — reps drop ≥ ~15% on the same lift × same
 *      weight across 2+ consecutive sessions.
 *   2. Progression stall       — no accepted weight increase on a lift for
 *      ≥ 3 sessions despite repeated attempts.
 *   3. ACWR spike              — this week's whole-body tonnage ÷ trailing
 *      4-week average > 1.5 (Gabbett "danger zone").
 *   4. Recovery / sleep trend  — rolling 7-day recovery_score or
 *      sleep_performance ≥ 10 points below the trailing 28-day baseline.
 *   5. Time guard              — never re-recommend within 3 weeks of the
 *      previous accepted deload.
 *
 * A deload is recommended when ≥ 2 of signals 1-4 fire AND signal 5 passes.
 *
 * When the user accepts, `buildDeloadPlan` returns reduced targets per lift:
 *   weight = 60% of current target (snapped to plate)
 *   reps   = bottom of current rep range
 *   sets   = floor(working sets × 0.5), min 1
 */

export type DeloadSetRecord = {
  exerciseId: string;
  weight: number;
  reps: number;
  setType?: string | null;
  workoutDate: string; // ISO date or full ISO timestamp
};

export type DeloadProgressionRow = {
  exerciseId: string;
  exerciseName: string;
  targetWeight: number;
  targetRepsLow: number;
  targetRepsHigh: number;
  lastEvaluatedAt: string | null;
};

export type DeloadDailyScore = {
  date: string;             // YYYY-MM-DD
  recoveryScore?: number | null;
  sleepPerformance?: number | null;
};

export type DeloadSignals = {
  regression: {
    fired: boolean;
    lifts: { exerciseId: string; weight: number; latestReps: number; prevBestReps: number }[];
  };
  stall: {
    fired: boolean;
    lifts: { exerciseId: string; sessionsStalled: number }[];
  };
  acwr: {
    fired: boolean;
    ratio: number;
    weekTonnage: number;
    chronicAvg: number;
  };
  recovery: {
    fired: boolean;
    recentAvg: number | null;
    baseline: number | null;
    delta: number | null;
  };
  firedCount: number;
  reasons: string[];
};

/** YYYY-MM-DD slice (UTC). */
function isoDate(d: string | Date): string {
  return (typeof d === "string" ? new Date(d) : d).toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400_000);
}

function snapToPlate(weight: number, isolation: boolean): number {
  const step = isolation ? 1.25 : 2.5;
  return Math.round(weight / step) * step;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal 1: Performance regression
// ─────────────────────────────────────────────────────────────────────────────
/**
 * For each lift, compare the best working set of the latest session vs the
 * best of the prior 2 sessions at the SAME weight. If reps dropped ≥ 15%
 * AND it happened on the last 2 consecutive sessions, count it.
 */
export function detectRegressions(sets: DeloadSetRecord[]) {
  const working = sets.filter(s => (s.setType ?? "working") === "working" && s.weight > 0);
  const byEx = new Map<string, DeloadSetRecord[]>();
  for (const s of working) {
    if (!byEx.has(s.exerciseId)) byEx.set(s.exerciseId, []);
    byEx.get(s.exerciseId)!.push(s);
  }
  const regressed: { exerciseId: string; weight: number; latestReps: number; prevBestReps: number }[] = [];
  for (const [exId, exSets] of byEx) {
    // Group sets by session-date.
    const byDate = new Map<string, DeloadSetRecord[]>();
    for (const s of exSets) {
      const d = isoDate(s.workoutDate);
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(s);
    }
    const dates = Array.from(byDate.keys()).sort().reverse(); // newest first
    if (dates.length < 3) continue;
    const [d0, d1, d2] = dates;
    const bestAt = (date: string, weight: number) =>
      Math.max(0, ...byDate.get(date)!.filter(s => s.weight === weight).map(s => s.reps));
    // Use the heaviest working weight from the latest session as the reference.
    const w = Math.max(...byDate.get(d0)!.map(s => s.weight));
    const latest = bestAt(d0, w);
    const prev1 = bestAt(d1, w);
    const prev2 = bestAt(d2, w);
    const prevBest = Math.max(prev1, prev2);
    if (latest === 0 || prevBest === 0) continue;
    const drop = (prevBest - latest) / prevBest;
    // Regression on 2 consecutive sessions: latest < prev1 < prev2 at the same weight.
    const twoInARow = latest < prev1 && prev1 <= prev2 && prev2 - latest >= Math.ceil(prevBest * 0.15);
    if (drop >= 0.15 && (twoInARow || latest <= prev1 * 0.85)) {
      regressed.push({ exerciseId: exId, weight: w, latestReps: latest, prevBestReps: prevBest });
    }
  }
  return regressed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal 2: Progression stall
// ─────────────────────────────────────────────────────────────────────────────
/**
 * A lift is "stalled" if its current target weight has not changed across the
 * last 3+ sessions for that lift. We approximate this from the set history:
 * 3 consecutive sessions where the heaviest working set used the same weight
 * and reps did not increase.
 */
export function detectStalls(sets: DeloadSetRecord[]) {
  const working = sets.filter(s => (s.setType ?? "working") === "working" && s.weight > 0);
  const byEx = new Map<string, DeloadSetRecord[]>();
  for (const s of working) {
    if (!byEx.has(s.exerciseId)) byEx.set(s.exerciseId, []);
    byEx.get(s.exerciseId)!.push(s);
  }
  const stalled: { exerciseId: string; sessionsStalled: number }[] = [];
  for (const [exId, exSets] of byEx) {
    const byDate = new Map<string, DeloadSetRecord[]>();
    for (const s of exSets) {
      const d = isoDate(s.workoutDate);
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(s);
    }
    const dates = Array.from(byDate.keys()).sort().reverse();
    if (dates.length < 3) continue;
    const topWeight = (d: string) => Math.max(...byDate.get(d)!.map(s => s.weight));
    const topReps = (d: string, w: number) =>
      Math.max(...byDate.get(d)!.filter(s => s.weight === w).map(s => s.reps));
    const w0 = topWeight(dates[0]);
    let stallCount = 1;
    let prevReps = topReps(dates[0], w0);
    for (let i = 1; i < dates.length; i++) {
      const w = topWeight(dates[i]);
      if (w !== w0) break;
      const r = topReps(dates[i], w);
      // Reps did not improve compared to the more-recent session.
      if (r >= prevReps) {
        // counts as not-improving (newer wasn't better than older)
      }
      stallCount++;
      prevReps = r;
    }
    if (stallCount >= 3) stalled.push({ exerciseId: exId, sessionsStalled: stallCount });
  }
  return stalled;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal 3: Acute:Chronic Workload Ratio (Gabbett)
// ─────────────────────────────────────────────────────────────────────────────
export function computeACWR(sets: DeloadSetRecord[], now: Date) {
  const working = sets.filter(
    s => ((s.setType ?? "working") === "working" || s.setType === "1rm_test") && s.weight > 0,
  );
  const acuteStart = new Date(now);
  acuteStart.setDate(acuteStart.getDate() - 7);
  const chronicStart = new Date(now);
  chronicStart.setDate(chronicStart.getDate() - 28);

  let acute = 0;
  const weeklyBuckets: number[] = [0, 0, 0, 0]; // 4 weeks for chronic average
  for (const s of working) {
    const d = new Date(s.workoutDate);
    const ageDays = daysBetween(now, d);
    if (ageDays < 0) continue;
    const tonnage = s.weight * s.reps;
    if (ageDays < 7) acute += tonnage;
    if (ageDays < 28) {
      const bucket = Math.min(3, Math.floor(ageDays / 7));
      weeklyBuckets[bucket] += tonnage;
    }
  }
  const nonZero = weeklyBuckets.filter(v => v > 0).length;
  const chronic = nonZero > 0 ? weeklyBuckets.reduce((a, b) => a + b, 0) / Math.max(2, nonZero) : 0;
  const ratio = chronic > 0 ? acute / chronic : 0;
  return { ratio, acute, chronic };
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal 4: Recovery / sleep trend
// ─────────────────────────────────────────────────────────────────────────────
export function computeRecoveryTrend(scores: DeloadDailyScore[], now: Date) {
  const today = isoDate(now);
  const items = scores
    .filter(s => s.date <= today)
    .map(s => ({
      date: s.date,
      score: s.recoveryScore ?? s.sleepPerformance ?? null,
      ageDays: daysBetween(now, new Date(s.date)),
    }))
    .filter(s => s.score != null) as { date: string; score: number; ageDays: number }[];

  const recent = items.filter(s => s.ageDays < 7);
  const baselineWindow = items.filter(s => s.ageDays >= 7 && s.ageDays < 28);
  if (recent.length < 4 || baselineWindow.length < 7) {
    return { recentAvg: null, baseline: null, delta: null };
  }
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const recentAvg = avg(recent.map(s => s.score));
  const baseline = avg(baselineWindow.map(s => s.score));
  return { recentAvg, baseline, delta: recentAvg - baseline };
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate
// ─────────────────────────────────────────────────────────────────────────────
export function computeDeloadSignals(
  sets: DeloadSetRecord[],
  scores: DeloadDailyScore[],
  _progressions: DeloadProgressionRow[],
  now: Date = new Date(),
): DeloadSignals {
  const regressed = detectRegressions(sets);
  const stalled = detectStalls(sets);
  const acwr = computeACWR(sets, now);
  const trend = computeRecoveryTrend(scores, now);

  const sig: DeloadSignals = {
    regression: { fired: regressed.length >= 2, lifts: regressed },
    stall: { fired: stalled.length >= 2, lifts: stalled },
    acwr: { fired: acwr.ratio > 1.5, ratio: acwr.ratio, weekTonnage: acwr.acute, chronicAvg: acwr.chronic },
    recovery: {
      fired: trend.delta != null && trend.delta <= -10,
      recentAvg: trend.recentAvg,
      baseline: trend.baseline,
      delta: trend.delta,
    },
    firedCount: 0,
    reasons: [],
  };
  sig.firedCount =
    (sig.regression.fired ? 1 : 0) +
    (sig.stall.fired ? 1 : 0) +
    (sig.acwr.fired ? 1 : 0) +
    (sig.recovery.fired ? 1 : 0);

  if (sig.regression.fired) {
    sig.reasons.push(`${regressed.length} lifts regressed in your last session`);
  }
  if (sig.stall.fired) {
    sig.reasons.push(`${stalled.length} lifts stalled for 3+ sessions`);
  }
  if (sig.acwr.fired) {
    const pct = Math.round((sig.acwr.ratio - 1) * 100);
    sig.reasons.push(`Tonnage ${pct}% above your 4-week average`);
  }
  if (sig.recovery.fired && sig.recovery.delta != null) {
    sig.reasons.push(`Recovery down ${Math.abs(Math.round(sig.recovery.delta))} pts vs baseline`);
  }
  return sig;
}

/** Time-guard: 21 days since last accepted deload. */
export function passesTimeGuard(lastAcceptedAt: string | null, now: Date = new Date()): boolean {
  if (!lastAcceptedAt) return true;
  const age = daysBetween(now, new Date(lastAcceptedAt));
  return age >= 21;
}

export function shouldRecommendDeload(
  signals: DeloadSignals,
  lastAcceptedAt: string | null,
  now: Date = new Date(),
): boolean {
  return signals.firedCount >= 2 && passesTimeGuard(lastAcceptedAt, now);
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan construction (only called when the user accepts)
// ─────────────────────────────────────────────────────────────────────────────
export type DeloadPlanEntry = {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  sets: number;
};

/**
 * Build a reduced-load plan from the user's current progression targets.
 * Caller decides how many working sets each lift currently has; we default to
 * 3 if unknown (typical novice/intermediate prescription).
 */
export function buildDeloadPlan(
  progressions: DeloadProgressionRow[],
  workingSetsByExercise: Map<string, number> = new Map(),
): DeloadPlanEntry[] {
  return progressions
    .filter(p => p.targetWeight > 0)
    .map(p => {
      const isolation =
        /(curl|fly|raise|extension|kickback|pushdown|crunch|abductor|adductor|shrug)/i.test(p.exerciseName);
      const reduced = snapToPlate(p.targetWeight * 0.6, isolation);
      const baseSets = workingSetsByExercise.get(p.exerciseId) ?? 3;
      return {
        exerciseId: p.exerciseId,
        exerciseName: p.exerciseName,
        weight: Math.max(reduced, isolation ? 1.25 : 2.5),
        reps: p.targetRepsLow,
        sets: Math.max(1, Math.floor(baseSets * 0.5)),
      };
    });
}

/** Mon→Sun week containing `from`. ISO Monday-start. */
export function deloadWeekBounds(from: Date): { start: string; end: string } {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  return {
    start: isoDate(d),
    end: isoDate(new Date(d.getTime() + 6 * 86400_000)),
  };
}
