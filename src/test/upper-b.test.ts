import { describe, expect, it } from "vitest";
import { WORKOUTS } from "../lib/workout-data";
import { ACCESSORY_ROUTINES } from "../lib/accessory-routines";

const exercises = WORKOUTS.find((workout) => workout.id === "upper_b")?.exercises ?? [];
const ids = exercises.map((exercise) => exercise.id);

describe("Upper B exercise replacements", () => {
  it("replaces the plate-loaded row with lat pulldown", () => {
    expect(ids).toContain("lib-8");
    expect(ids).not.toContain("pl1");
  });
  it("replaces the chest-supported dumbbell row with T-bar row", () => {
    expect(ids).toContain("pl2");
    expect(ids).not.toContain("dl5");
  });
  it("replaces cable flies to thighs with pec dec", () => {
    expect(ids).toContain("lib-60");
    expect(ids).not.toContain("up4");
  });
  it("replaces incline curls with Bayesian curls", () => {
    expect(ids).toContain("lib-61");
    expect(ids).not.toContain("lib-18");
  });
  it("replaces hammer curls with both existing wrist exercises as a superset", () => {
    expect(ids).not.toContain("ub6");
    const wrists = ACCESSORY_ROUTINES.find((routine) => routine.id === "acc-wrists")?.exercises ?? [];
    expect(wrists).toHaveLength(2);
    for (const wrist of wrists) {
      const upperBWrist = exercises.find((exercise) => exercise.id === wrist.id);
      expect(upperBWrist).toMatchObject({ sets: wrist.sets, reps: wrist.reps, supersetGroup: "W" });
    }
  });
  it("replaces single-arm reverse fly with rear pec deck fly", () => {
    expect(ids).toContain("lib-db-Reverse_Machine_Flyes");
    expect(ids).not.toContain("lib-64");
  });
  it("replaces tricep pushdowns with tricep X-overs", () => {
    expect(ids).toContain("pu5");
    expect(ids).not.toContain("lib-19");
  });
});