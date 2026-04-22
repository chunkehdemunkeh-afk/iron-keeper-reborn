import { describe, it, expect } from "vitest";
import {
  epley1RM,
  inferLiftId,
  getStrengthRating,
  ageCoefficient,
  overallTier,
  TIERS,
} from "@/lib/strength-standards";

describe("epley1RM", () => {
  it("returns weight for a 1-rep set", () => {
    expect(epley1RM(100, 1)).toBe(100);
  });
  it("scales up with reps", () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.67, 1);
  });
  it("returns 0 for invalid input", () => {
    expect(epley1RM(0, 5)).toBe(0);
    expect(epley1RM(100, 0)).toBe(0);
  });
});

describe("inferLiftId", () => {
  it("matches bench press variants", () => {
    expect(inferLiftId("lib-1", "Barbell Bench Press")).toBe("bench");
    expect(inferLiftId("lib-db-Bench_Press", "Bench Press")).toBe("bench");
  });
  it("matches squat but not front squat", () => {
    expect(inferLiftId("ll1", "Back Squat")).toBe("squat");
    expect(inferLiftId("ll2", "Front Squat")).toBe("front_squat");
  });
  it("matches deadlift", () => {
    expect(inferLiftId("ll3", "Conventional Deadlift")).toBe("deadlift");
  });
  it("matches OHP variants", () => {
    expect(inferLiftId("sh1", "Overhead Press")).toBe("ohp");
    expect(inferLiftId("sh2", "Military Press")).toBe("ohp");
  });
  it("matches pull-up legacy IDs", () => {
    expect(inferLiftId("pu1", "Pull-Ups")).toBe("weighted_pullup");
  });
  it("returns null for unrelated exercises", () => {
    expect(inferLiftId("lib-99", "Cable Bicep Curl")).toBeNull();
  });
});

describe("ageCoefficient", () => {
  it("is 1.0 for prime years", () => {
    expect(ageCoefficient(25)).toBe(1.0);
    expect(ageCoefficient(30)).toBe(1.0);
  });
  it("declines with age", () => {
    expect(ageCoefficient(40)).toBeLessThan(1.0);
    expect(ageCoefficient(60)).toBeLessThan(ageCoefficient(50));
  });
  it("never goes below 0.5", () => {
    expect(ageCoefficient(90)).toBeGreaterThanOrEqual(0.5);
  });
});

describe("getStrengthRating — Beginner band", () => {
  // Male, 80kg, age 30 — bench thresholds: u=40, n=75, i=105, a=145, e=185
  // Beginner = round(40 + 0.4 * (75 - 40)) = round(54) = 54
  const inputs = { bodyweight: 80, sex: "male" as const, age: 30 };

  it("rates just-above-untrained as Beginner", () => {
    const r = getStrengthRating("bench", 55, inputs)!;
    expect(r.tier).toBe("beginner");
  });
  it("rates just-below-novice as Beginner", () => {
    const r = getStrengthRating("bench", 74, inputs)!;
    expect(r.tier).toBe("beginner");
  });
  it("rates exactly-novice as Novice", () => {
    const r = getStrengthRating("bench", 75, inputs)!;
    expect(r.tier).toBe("novice");
  });
  it("rates below the beginner threshold as Untrained", () => {
    const r = getStrengthRating("bench", 30, inputs)!;
    expect(r.tier).toBe("untrained");
  });
});

describe("getStrengthRating — boundaries", () => {
  const inputs = { bodyweight: 80, sex: "male" as const, age: 30 };

  it("rates at-elite-threshold as Elite with no next tier", () => {
    const r = getStrengthRating("bench", 185, inputs)!;
    expect(r.tier).toBe("elite");
    expect(r.kgToNextTier).toBeNull();
    expect(r.nextTier).toBeNull();
  });

  it("computes kg to next tier correctly", () => {
    // 100kg bench → Novice (75-104), next is Intermediate at 105 → 5kg away
    const r = getStrengthRating("bench", 100, inputs)!;
    expect(r.tier).toBe("novice");
    expect(r.nextTier).toBe("intermediate");
    expect(r.kgToNextTier).toBe(5);
  });

  it("applies age coefficient to lower thresholds", () => {
    const young = getStrengthRating("bench", 100, { ...inputs, age: 25 })!;
    const older = getStrengthRating("bench", 100, { ...inputs, age: 60 })!;
    // Older lifter should be rated equal or higher for the same lift
    expect(older.tierIndex).toBeGreaterThanOrEqual(young.tierIndex);
  });

  it("adds bodyweight for weighted pull-up", () => {
    // Male, 80kg, age 30 — weighted_pullup row 80: u=70, n=100, i=132, a=175, e=225
    // Lifting +20kg → 100kg system load → Novice
    const r = getStrengthRating("weighted_pullup", 20, inputs)!;
    expect(r.oneRm).toBe(100);
    expect(r.tier).toBe("novice");
  });
});

describe("overallTier", () => {
  it("returns null on empty array", () => {
    expect(overallTier([])).toBeNull();
  });
  it("returns the median tier", () => {
    const inputs = { bodyweight: 80, sex: "male" as const, age: 30 };
    const r1 = getStrengthRating("bench", 100, inputs)!;  // novice
    const r2 = getStrengthRating("bench", 145, inputs)!;  // advanced
    const r3 = getStrengthRating("bench", 110, inputs)!;  // intermediate
    expect(overallTier([r1, r2, r3])).toBe("intermediate");
  });
  it("includes beginner as a possible result", () => {
    const inputs = { bodyweight: 80, sex: "male" as const, age: 30 };
    const r1 = getStrengthRating("bench", 60, inputs)!;   // beginner
    const r2 = getStrengthRating("bench", 60, inputs)!;   // beginner
    expect(overallTier([r1, r2])).toBe("beginner");
  });
});

describe("TIERS order", () => {
  it("has Beginner between Untrained and Novice", () => {
    expect(TIERS).toEqual([
      "untrained",
      "beginner",
      "novice",
      "intermediate",
      "advanced",
      "elite",
    ]);
  });
});
