import { describe, it, expect } from "vitest";
import {
  buildDeloadPlan,
  computeACWR,
  computeDeloadSignals,
  computeRecoveryTrend,
  deloadWeekBounds,
  detectRegressions,
  detectStalls,
  passesTimeGuard,
  shouldRecommendDeload,
  type DeloadSetRecord,
  type DeloadProgressionRow,
  type DeloadDailyScore,
} from "@/lib/deload";

const NOW = new Date("2026-06-15T12:00:00Z");

function dayOffset(days: number): string {
  return new Date(NOW.getTime() - days * 86400_000).toISOString();
}

function bench(reps: number, weight: number, daysAgo: number): DeloadSetRecord {
  return {
    exerciseId: "lib-1",
    weight,
    reps,
    setType: "working",
    workoutDate: dayOffset(daysAgo),
  };
}

describe("detectRegressions", () => {
  it("flags a lift that drops ≥15% on the most recent session", () => {
    const sets = [
      // session today: 5 reps @ 100kg (down from 8/9)
      bench(5, 100, 0), bench(5, 100, 0),
      // 3 days ago: 8 reps @ 100kg
      bench(8, 100, 3), bench(8, 100, 3),
      // 6 days ago: 9 reps @ 100kg
      bench(9, 100, 6), bench(9, 100, 6),
    ];
    const r = detectRegressions(sets);
    expect(r).toHaveLength(1);
    expect(r[0].exerciseId).toBe("lib-1");
    expect(r[0].latestReps).toBe(5);
  });

  it("does not flag when reps improved or held", () => {
    const sets = [
      bench(10, 100, 0), bench(9, 100, 0),
      bench(9, 100, 3), bench(9, 100, 3),
      bench(8, 100, 6), bench(8, 100, 6),
    ];
    expect(detectRegressions(sets)).toHaveLength(0);
  });
});

describe("detectStalls", () => {
  it("flags 3 consecutive sessions at the same weight without rep progress", () => {
    const sets = [
      bench(8, 80, 0), bench(8, 80, 3), bench(8, 80, 6),
    ];
    expect(detectStalls(sets)).toHaveLength(1);
  });

  it("does not flag when weight changed across sessions", () => {
    const sets = [
      bench(8, 85, 0), bench(8, 80, 3), bench(8, 80, 6),
    ];
    expect(detectStalls(sets)).toHaveLength(0);
  });
});

describe("computeACWR", () => {
  it("returns a high ratio when this week massively exceeds 4-week average", () => {
    const sets: DeloadSetRecord[] = [];
    // big spike this week
    for (let i = 0; i < 5; i++) sets.push(bench(10, 100, i));
    // sparse previous 3 weeks
    sets.push(bench(5, 50, 10));
    sets.push(bench(5, 50, 18));
    sets.push(bench(5, 50, 25));
    const { ratio } = computeACWR(sets, NOW);
    expect(ratio).toBeGreaterThan(1.5);
  });

  it("returns 0 when there is no chronic history", () => {
    const sets = [bench(10, 100, 0)];
    const { ratio } = computeACWR(sets, NOW);
    expect(ratio).toBe(0);
  });
});

describe("computeRecoveryTrend", () => {
  it("returns null when there is not enough data", () => {
    const scores: DeloadDailyScore[] = [{ date: "2026-06-14", recoveryScore: 60 }];
    const t = computeRecoveryTrend(scores, NOW);
    expect(t.delta).toBeNull();
  });

  it("computes negative delta when recent week is below baseline", () => {
    const scores: DeloadDailyScore[] = [];
    // last 7 days: avg ~40
    for (let i = 0; i < 7; i++) scores.push({ date: new Date(NOW.getTime() - i * 86400_000).toISOString().slice(0, 10), recoveryScore: 40 });
    // prior 21 days: avg ~75
    for (let i = 7; i < 28; i++) scores.push({ date: new Date(NOW.getTime() - i * 86400_000).toISOString().slice(0, 10), recoveryScore: 75 });
    const t = computeRecoveryTrend(scores, NOW);
    expect(t.delta).toBeLessThanOrEqual(-30);
  });
});

describe("shouldRecommendDeload + time guard", () => {
  it("requires ≥2 signals", () => {
    const sig = computeDeloadSignals([], [], [], NOW);
    expect(shouldRecommendDeload(sig, null, NOW)).toBe(false);
  });

  it("blocks recommendation within 21 days of the last accepted deload", () => {
    expect(passesTimeGuard(new Date(NOW.getTime() - 10 * 86400_000).toISOString(), NOW)).toBe(false);
    expect(passesTimeGuard(new Date(NOW.getTime() - 25 * 86400_000).toISOString(), NOW)).toBe(true);
  });
});

describe("buildDeloadPlan", () => {
  it("reduces weight to ~60% snapped to plate and halves sets", () => {
    const progs: DeloadProgressionRow[] = [
      { exerciseId: "lib-1", exerciseName: "Bench Press", targetWeight: 100, targetRepsLow: 6, targetRepsHigh: 8, lastEvaluatedAt: null },
      { exerciseId: "lib-2", exerciseName: "Dumbbell Curl", targetWeight: 20, targetRepsLow: 10, targetRepsHigh: 12, lastEvaluatedAt: null },
    ];
    const setsByEx = new Map([["lib-1", 4], ["lib-2", 3]]);
    const plan = buildDeloadPlan(progs, setsByEx);
    const bench = plan.find(p => p.exerciseId === "lib-1")!;
    const curl = plan.find(p => p.exerciseId === "lib-2")!;
    expect(bench.weight).toBe(60); // 60% of 100, snapped
    expect(bench.reps).toBe(6);
    expect(bench.sets).toBe(2);    // floor(4 * 0.5)
    expect(curl.weight).toBe(12.5); // 60% of 20 = 12, snap to 1.25 → 12.5
    expect(curl.sets).toBe(1);     // floor(3 * 0.5) = 1
  });
});

describe("deloadWeekBounds", () => {
  it("returns a 7-day window inclusive", () => {
    const { start, end } = deloadWeekBounds(new Date("2026-06-15T00:00:00Z"));
    expect(start).toBe("2026-06-15");
    expect(end).toBe("2026-06-21");
  });
});
