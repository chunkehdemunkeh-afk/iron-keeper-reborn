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

describe("muscle-mapping — production data shapes", () => {
  it("strips a single attachment suffix", () => {
    expect(stripExerciseSuffixes("up1-mag-grip")).toBe("up1");
    expect(stripExerciseSuffixes("up4-handles")).toBe("up4");
    expect(stripExerciseSuffixes("acc-abs1-handles")).toBe("acc-abs1");
    expect(stripExerciseSuffixes("up2-cuff-lat-bar")).toBe("up2");
  });

  it("strips compound heavy + attachment suffixes", () => {
    expect(stripExerciseSuffixes("up8-heavy-v-bar")).toBe("up8");
  });

  it("returns id unchanged when no known suffix", () => {
    expect(stripExerciseSuffixes("lib-1")).toBe("lib-1");
    expect(stripExerciseSuffixes("sub-up5a")).toBe("sub-up5a");
    expect(stripExerciseSuffixes("lib-db-Hack_Squat")).toBe("lib-db-Hack_Squat");
  });

  it("resolves cable-attachment row with name == id via base id targetMuscle", () => {
    // Simulates a real DB row: exercise_id="up1-mag-grip", exercise_name="up1-mag-grip"
    // After fetchRecentSets fix, exerciseName should be replaced with real name and
    // targetMuscle should be looked up by base id. Here we just feed targetMuscle directly.
    const hits = getMusclesWorked("up1-mag-grip", "Seated Cable Row - V Bar", "Back/Lats");
    expect(hits.primary.length).toBeGreaterThan(0);
  });

  it("resolves substituted exercise via real name keyword (sub-up5a → shoulder press)", () => {
    const hits = getMusclesWorked("sub-up5a", "Dumbbell Shoulder Press");
    expect(hits.primary).toContain("front_delts");
  });

  it("falls back to keyword on id-shaped name (lib-db-Hack_Squat)", () => {
    const hits = getMusclesWorked("lib-db-Hack_Squat", "lib-db-Hack_Squat");
    expect(hits.primary).toContain("quads");
  });

  it("resolves real workout id via targetMuscle string", () => {
    const hits = getMusclesWorked("lg1", "Seated Hamstring Curl", "Hamstrings");
    expect(hits.primary).toContain("hamstrings");
  });

  it("recovery actually classifies a today-session as fatigued for cable row variant", () => {
    const sets: SetRecord[] = Array.from({ length: 6 }, () => ({
      exerciseId: "up1-mag-grip",
      exerciseName: "Seated Cable Row - V Bar",
      targetMuscle: "Back/Lats",
      weight: 60,
      reps: 10,
      workoutDate: new Date("2026-04-21T08:00:00Z").toISOString(),
    }));
    const result = computeMuscleRecovery(sets, [], "ppl", new Date("2026-04-21T12:00:00Z"));
    expect(["fatigued", "workable"]).toContain(result.lats.status);
    expect(result.lats.lastVolume).toBeGreaterThan(0);
  });
});
