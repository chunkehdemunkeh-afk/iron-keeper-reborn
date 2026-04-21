import { describe, it, expect } from "vitest";
import {
  computeMuscleRecovery,
  getIntensityMultiplier,
  getSleepModifier,
  type SetRecord,
  type SleepLog,
} from "@/lib/recovery";
import { getMusclesWorked, stripExerciseSuffixes } from "@/lib/muscle-mapping";

describe("getIntensityMultiplier", () => {
  it("returns 1.30 for PPL", () => expect(getIntensityMultiplier("ppl")).toBe(1.30));
  it("returns 0.85 for GK", () => expect(getIntensityMultiplier("gk")).toBe(0.85));
  it("returns 1.00 for unknown", () => expect(getIntensityMultiplier("xyz")).toBe(1.00));
});

describe("getSleepModifier", () => {
  it("returns 1.20 when no log exists", () => {
    expect(getSleepModifier(new Date("2026-04-21"), [])).toBe(1.20);
  });
  it("returns 0.90 for great sleep", () => {
    const logs: SleepLog[] = [{ date: "2026-04-21", hours: 8.5, quality: 5 }];
    expect(getSleepModifier(new Date("2026-04-21"), logs)).toBe(0.90);
  });
  it("returns 1.00 for baseline sleep", () => {
    const logs: SleepLog[] = [{ date: "2026-04-21", hours: 7.5, quality: 3 }];
    expect(getSleepModifier(new Date("2026-04-21"), logs)).toBe(1.00);
  });
  it("returns 1.20 for very poor sleep", () => {
    const logs: SleepLog[] = [{ date: "2026-04-21", hours: 5, quality: 1 }];
    expect(getSleepModifier(new Date("2026-04-21"), logs)).toBe(1.20);
  });
});

describe("computeMuscleRecovery", () => {
  it("marks all regions as rested when no sets", () => {
    const result = computeMuscleRecovery([], [], "ppl", new Date("2026-04-21T12:00:00Z"));
    expect(result.chest.status).toBe("rested");
    expect(result.quads.status).toBe("rested");
    expect(result.chest.score).toBe(1);
  });

  it("marks chest as fatigued after a heavy bench session today", () => {
    const sets: SetRecord[] = Array.from({ length: 5 }, () => ({
      exerciseId: "lib-1",
      exerciseName: "Bench Press",
      weight: 100,
      reps: 8,
      workoutDate: new Date("2026-04-21T08:00:00Z").toISOString(),
    }));
    const result = computeMuscleRecovery(sets, [], "ppl", new Date("2026-04-21T12:00:00Z"));
    expect(result.chest.status).toBe("fatigued");
    expect(result.chest.lastVolume).toBeGreaterThan(0);
  });

  it("marks chest as recovered after >72h", () => {
    const sets: SetRecord[] = [{
      exerciseId: "lib-1",
      exerciseName: "Bench Press",
      weight: 100,
      reps: 8,
      workoutDate: new Date("2026-04-17T12:00:00Z").toISOString(),
    }];
    const result = computeMuscleRecovery(sets, [], "ppl", new Date("2026-04-21T12:00:00Z"));
    expect(result.chest.status).toBe("recovered");
  });

  it("good sleep reduces fatigue accrual vs no sleep log", () => {
    const sets: SetRecord[] = Array.from({ length: 4 }, () => ({
      exerciseId: "lib-1",
      exerciseName: "Bench Press",
      weight: 80,
      reps: 8,
      workoutDate: new Date("2026-04-21T08:00:00Z").toISOString(),
    }));
    const noSleep = computeMuscleRecovery(sets, [], "ppl", new Date("2026-04-21T12:00:00Z"));
    const goodSleep = computeMuscleRecovery(
      sets,
      [{ date: "2026-04-21", hours: 8.5, quality: 5 }],
      "ppl",
      new Date("2026-04-21T12:00:00Z"),
    );
    expect(goodSleep.chest.score).toBeGreaterThanOrEqual(noSleep.chest.score);
  });
});
