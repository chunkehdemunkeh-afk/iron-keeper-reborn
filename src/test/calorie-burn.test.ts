import { describe, it, expect } from "vitest";
import { estimateCardioBurn, estimateStrengthBurn } from "@/lib/calorie-burn";

describe("estimateCardioBurn", () => {
  it("returns null without duration or weight", () => {
    expect(estimateCardioBurn({ activityType: "running", durationMin: 0, weightKg: 80 })).toBeNull();
    expect(estimateCardioBurn({ activityType: "running", durationMin: 30, weightKg: 0 })).toBeNull();
  });

  it("returns 0 for rest", () => {
    expect(estimateCardioBurn({ activityType: "rest", durationMin: 30, weightKg: 80 })).toBe(0);
  });

  it("uses pace-aware MET for running", () => {
    // 24 min @ 3.36 km → 8.4 km/h pace → MET 9.8
    // 9.8 × 80 × (24/60) = 313.6 → rounds to 315
    const burn = estimateCardioBurn({
      activityType: "running",
      durationMin: 24,
      distanceKm: 3.36,
      weightKg: 80,
    });
    expect(burn).toBe(315);
  });

  it("falls back to mid-band MET when distance is missing", () => {
    // Running 30m no distance → MET 9.8 → 9.8 × 75 × 0.5 = 367.5 → 370
    const burn = estimateCardioBurn({
      activityType: "running",
      durationMin: 30,
      weightKg: 75,
    });
    expect(burn).toBe(370);
  });

  it("adds incline contribution for walking", () => {
    const flat = estimateCardioBurn({
      activityType: "walking",
      durationMin: 30,
      distanceKm: 2.5,
      weightKg: 80,
    });
    const inclined = estimateCardioBurn({
      activityType: "walking",
      durationMin: 30,
      distanceKm: 2.5,
      inclinePct: 10,
      weightKg: 80,
    });
    expect(inclined!).toBeGreaterThan(flat!);
  });
});

describe("estimateStrengthBurn", () => {
  it("returns null without duration or weight", () => {
    expect(estimateStrengthBurn({ sets: [], durationMin: 0, weightKg: 80 })).toBeNull();
    expect(estimateStrengthBurn({ sets: [], durationMin: 45, weightKg: 0 })).toBeNull();
  });

  it("excludes warm-up sets from the work term", () => {
    const withoutWarmup = estimateStrengthBurn({
      sets: [
        { weight: 100, reps: 5, setType: "working" },
        { weight: 100, reps: 5, setType: "working" },
      ],
      durationMin: 45,
      weightKg: 80,
    });
    const withWarmup = estimateStrengthBurn({
      sets: [
        { weight: 60, reps: 10, setType: "warmup" }, // ignored in work term
        { weight: 100, reps: 5, setType: "working" },
        { weight: 100, reps: 5, setType: "working" },
      ],
      durationMin: 45,
      weightKg: 80,
    });
    // Warm-up rounds away within the 5-kcal tolerance — both should match.
    expect(withWarmup).toBe(withoutWarmup);
  });

  it("computes a sensible total for a typical session", () => {
    // 4 sets × 100kg × 5 reps = 2000kg lifted → 2000 × 0.0035 = 7 kcal work
    // Metabolic: 5.5 × 80 × (45/60) = 330 kcal
    // Total ≈ 337 → rounds to 335
    const burn = estimateStrengthBurn({
      sets: [
        { weight: 100, reps: 5 },
        { weight: 100, reps: 5 },
        { weight: 100, reps: 5 },
        { weight: 100, reps: 5 },
      ],
      durationMin: 45,
      weightKg: 80,
    });
    expect(burn).toBe(335);
  });

  it("handles bodyweight movements (weight = 0)", () => {
    const burn = estimateStrengthBurn({
      sets: [{ weight: 0, reps: 20 }],
      durationMin: 30,
      weightKg: 80,
    });
    // 80 × 20 × 0.0025 = 4 kcal work + 5.5 × 80 × 0.5 = 220 kcal → 225
    expect(burn).toBe(225);
  });
});
