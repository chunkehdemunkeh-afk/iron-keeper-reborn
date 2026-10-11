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
  it("adds a dumbbell rear delt fly at the session's set and rep scheme", () => {
    expect(ids).toContain("lib-15");
    expect(exercises.find((exercise) => exercise.id === "lib-15")).toMatchObject({ sets: 2, reps: "5-10" });
  });
  it("orders the session chest, back, chest, back, shoulder, bicep, tricep, shoulder, then grip", () => {
    expect(ids).toEqual([
      "lib-db-Smith_Machine_Incline_Bench_Press",
      "lib-69",
      "lib-68",
      "pl1",
      "lib-db-Smith_Machine_Overhead_Shoulder_Press",
      "lib-db-Machine_Preacher_Curls",
      "up8",
      "lib-72",
      "lib-15",
      "lib-17",
    ]);
  });
});
