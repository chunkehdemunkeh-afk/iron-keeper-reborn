import { describe, it, expect } from "vitest";
import { computeProgressionDecision } from "@/lib/data/progression-queries";

describe("computeProgressionDecision", () => {
  const base = {
    exerciseName: "Bench Press",
    exerciseId: "bench",
    repsLow: 6,
    repsHigh: 8,
    hasPrev: true,
  };

  it("promotes a stale stored target when user is organically lifting heavier", () => {
    // Stored=50, user just did 60kg x 10 across the board on 6-8 range.
    // Suggestion should be off 60, not 50.
    const result = computeProgressionDecision({
      ...base,
      storedTarget: 50,
      workingSets: [
        { weight: 60, reps: 10 },
        { weight: 60, reps: 10 },
        { weight: 60, reps: 9 },
      ],
    });
    expect(result.currentTarget).toBe(60);
    expect(result.suggestion).not.toBeNull();
    expect(result.suggestion!.prevWeight).toBe(60);
    expect(result.suggestion!.suggestedWeight).toBeGreaterThan(60);
  });

  it("preserves classic behaviour: hitting top of range at stored weight bumps weight", () => {
    const result = computeProgressionDecision({
      ...base,
      storedTarget: 50,
      workingSets: [
        { weight: 50, reps: 8 },
        { weight: 50, reps: 8 },
      ],
    });
    expect(result.currentTarget).toBe(50);
    expect(result.suggestion).not.toBeNull();
    expect(result.suggestion!.prevWeight).toBe(50);
    expect(result.suggestion!.suggestedWeight).toBe(52.5);
  });

  it("does not promote target when a heavy set fails to hit repsLow on every set", () => {
    // Heaviest set 60kg but only 4 reps — below repsLow=6. Should not advance.
    const result = computeProgressionDecision({
      ...base,
      storedTarget: 50,
      workingSets: [
        { weight: 60, reps: 4 },
        { weight: 50, reps: 8 },
      ],
    });
    expect(result.currentTarget).toBe(50);
  });

  it("does not fire a suggestion when sets fall short of rep cap", () => {
    const result = computeProgressionDecision({
      ...base,
      storedTarget: 50,
      workingSets: [
        { weight: 50, reps: 6 },
        { weight: 50, reps: 5 },
      ],
    });
    expect(result.suggestion).toBeNull();
  });

  it("first-time exercise (no prev) seeds target from heaviest set", () => {
    const result = computeProgressionDecision({
      ...base,
      hasPrev: false,
      storedTarget: 0,
      workingSets: [
        { weight: 40, reps: 8 },
        { weight: 40, reps: 8 },
      ],
    });
    expect(result.currentTarget).toBe(40);
    // Hit top of range → should suggest a bump
    expect(result.suggestion).not.toBeNull();
    expect(result.suggestion!.prevWeight).toBe(40);
  });
});
