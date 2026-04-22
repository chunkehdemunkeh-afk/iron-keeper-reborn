import { describe, it, expect } from "vitest";
import {
  computeMuscleRecovery,
  getIntensityMultiplier,
  getSleepModifier,
  setFatigueUnits,
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

describe("setFatigueUnits — PR-relative scaling", () => {
  it("equal relative intensity ⇒ equal fatigue regardless of absolute weight", () => {
    // Beginner: 50 kg PR, lifts 25 kg (50%)
    // Advanced: 200 kg PR, lifts 100 kg (50%)
    const beginner = setFatigueUnits(25, 8, 50);
    const advanced = setFatigueUnits(100, 8, 200);
    expect(beginner).toBeCloseTo(advanced, 6);
  });

  it("higher relative intensity ⇒ more fatigue (exponent > 1)", () => {
    const lighter = setFatigueUnits(60, 8, 100);  // 60%
    const heavier = setFatigueUnits(90, 8, 100);  // 90%
    expect(heavier).toBeGreaterThan(lighter);
  });

  it("clamps super-low ratios at 0.3 floor", () => {
    const tiny = setFatigueUnits(5, 8, 100);   // 5% → clamped to 30%
    const floor = setFatigueUnits(30, 8, 100); // 30%
    expect(tiny).toBeCloseTo(floor, 6);
  });

  it("missing PR falls back to baseline (intensity 1.0)", () => {
    const noPR = setFatigueUnits(80, 8, undefined);
    expect(noPR).toBeCloseTo(8, 6); // 8 × 1.0^1.5
  });

  it("bodyweight (weight = 0) still registers fatigue via reps × 0.6", () => {
    const bw = setFatigueUnits(0, 10, undefined);
    expect(bw).toBeCloseTo(6, 6);
    const bwWithPR = setFatigueUnits(0, 10, 100);
    expect(bwWithPR).toBeCloseTo(6, 6);
  });

  it("zero reps ⇒ zero fatigue", () => {
    expect(setFatigueUnits(100, 0, 100)).toBe(0);
  });
});

describe("computeMuscleRecovery — PR normalisation in pipeline", () => {
  it("beginner and advanced lifter at same %PR get comparable recovery scores", () => {
    const today = new Date("2026-04-21T08:00:00Z");
    const beginnerSets: SetRecord[] = Array.from({ length: 5 }, () => ({
      exerciseId: "lib-1",
      exerciseName: "Bench Press",
      weight: 40,   // 80% of 50kg PR
      reps: 8,
      workoutDate: today.toISOString(),
      userPR: 50,
    }));
    const advancedSets: SetRecord[] = Array.from({ length: 5 }, () => ({
      exerciseId: "lib-1",
      exerciseName: "Bench Press",
      weight: 120,  // 80% of 150kg PR
      reps: 8,
      workoutDate: today.toISOString(),
      userPR: 150,
    }));
    const beginnerResult = computeMuscleRecovery(beginnerSets, [], "ppl", new Date("2026-04-21T12:00:00Z"));
    const advancedResult = computeMuscleRecovery(advancedSets, [], "ppl", new Date("2026-04-21T12:00:00Z"));
    expect(beginnerResult.chest.score).toBeCloseTo(advancedResult.chest.score, 4);
    expect(beginnerResult.chest.status).toBe(advancedResult.chest.status);
  });

  it("lastVolume is reported as raw kg × reps (not fatigue units)", () => {
    const sets: SetRecord[] = [{
      exerciseId: "lib-1",
      exerciseName: "Bench Press",
      weight: 100,
      reps: 8,
      workoutDate: new Date("2026-04-21T08:00:00Z").toISOString(),
      userPR: 120,
    }];
    const result = computeMuscleRecovery(sets, [], "ppl", new Date("2026-04-21T12:00:00Z"));
    expect(result.chest.lastVolume).toBe(800); // 100 × 8 raw, not normalised
  });

  it("missing PR still produces non-zero fatigue (graceful fallback)", () => {
    const sets: SetRecord[] = Array.from({ length: 5 }, () => ({
      exerciseId: "lib-1",
      exerciseName: "Bench Press",
      weight: 80,
      reps: 8,
      workoutDate: new Date("2026-04-21T08:00:00Z").toISOString(),
      // userPR intentionally omitted
    }));
    const result = computeMuscleRecovery(sets, [], "ppl", new Date("2026-04-21T12:00:00Z"));
    expect(result.chest.score).toBeLessThan(1);
    expect(result.chest.status).not.toBe("rested");
  });

  it("bodyweight exercises register fatigue", () => {
    const sets: SetRecord[] = Array.from({ length: 4 }, () => ({
      exerciseId: "lib-3",
      exerciseName: "Push-ups",
      weight: 0,
      reps: 20,
      workoutDate: new Date("2026-04-21T08:00:00Z").toISOString(),
    }));
    const result = computeMuscleRecovery(sets, [], "ppl", new Date("2026-04-21T12:00:00Z"));
    expect(result.chest.score).toBeLessThan(1);
    expect(result.chest.lastVolume).toBe(0); // raw kg × reps = 0 for bodyweight
  });
});
