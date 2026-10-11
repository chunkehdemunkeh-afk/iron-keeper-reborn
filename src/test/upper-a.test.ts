import { describe, expect, it } from "vitest";
import { WORKOUTS } from "../lib/workout-data";

const exercises = WORKOUTS.find((workout) => workout.id === "upper_a")?.exercises ?? [];
const ids = exercises.map((exercise) => exercise.id);

describe("Upper A exercise replacements", () => {
  it("replaces skull crushers with tricep pushdowns", () => {
    expect(ids).toContain("up8");
    expect(ids).not.toContain("bn5");
  });
  it("keeps the pushdown slot at the session's set and rep scheme", () => {
    expect(exercises.find((exercise) => exercise.id === "up8")).toMatchObject({ sets: 2, reps: "5-10" });
  });
  it("keeps every Upper A exercise in the 5-10 rep range", () => {
    expect(exercises.length).toBeGreaterThan(0);
    for (const exercise of exercises) {
      expect(exercise.reps).toBe("5-10");
    }
  });
});
