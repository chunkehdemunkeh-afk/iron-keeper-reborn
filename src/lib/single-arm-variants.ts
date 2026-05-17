/**
 * Single-arm eligibility: which exercises can sensibly be performed unilaterally.
 *
 * Used by the workout session to show a "2 Arm / 1 Arm" toggle pill alongside
 * the existing 2-Handed and Light/Heavy pills. When toggled on, the effective
 * exercise ID gets a `-sa` suffix so per-arm history & PRs track separately
 * from the bilateral version, and the weight column is labelled "per arm".
 *
 * Exclusions:
 *  - Barbell lifts (bench, OHP, deadlift, squat, row, shrug, etc.)
 *  - Bilateral-only fixed machines (pec deck, hip ab/adductor)
 *  - Bodyweight compound lifts (pull-up, dip, push-up — single-arm versions
 *    are an entirely different exercise)
 *  - Movements that are already inherently unilateral (Bayesian curl,
 *    Bulgarian split squat, pistol squat, concentration curl, kickback,
 *    single-arm-row library entries) — no toggle needed.
 */

/**
 * Equipment keywords that, when found in the exercise name, indicate the
 * movement is a candidate for a single-arm variation.
 */
const ELIGIBLE_EQUIPMENT = [
  "dumbbell",
  " db ",
  "db ",
  "cable",
  "machine",
  "landmine",
  "kettlebell",
  " kb ",
  "kb ",
  "hammer strength",
  "smith",
  "plate",
];

/**
 * Movement-pattern keywords. Combined with an eligible-equipment hit, these
 * confirm the exercise is something a single-arm version makes sense for.
 */
const ELIGIBLE_PATTERNS = [
  // Press
  "bench press",
  "shoulder press",
  "overhead press",
  "ohp",
  "arnold",
  "floor press",
  "chest press",
  "incline press",
  "decline press",
  "press ",
  "z press",
  // Row
  "row",
  // Pulldown / pullover
  "pulldown",
  "pull down",
  "pull-down",
  "pullover",
  "straight-arm",
  "straight arm",
  // Curl / extension
  "curl",
  "tricep extension",
  "triceps extension",
  "overhead extension",
  "pushdown",
  "push down",
  "push-down",
  "skullcrusher",
  "skull crusher",
  // Delts
  "lateral raise",
  "front raise",
  "rear delt",
  "reverse fly",
  "rev fly",
  "y-raise",
  "y raise",
  "upright row",
  "face pull",
  "facepull",
  // Lower body (machine unilateral mode)
  "leg press",
  "leg extension",
  "leg curl",
  "calf raise",
  // Cable misc
  "crossover",
  "fly",
  "kickback",
  // KB
  "swing",
  "clean",
  "snatch",
];

/**
 * Keywords that disqualify an exercise from getting the toggle — either it's
 * inherently unilateral, inherently bilateral-only, or a different movement
 * entirely from a typical single-arm variation.
 */
const EXCLUDE_PATTERNS = [
  // Already unilateral
  "single arm",
  "single-arm",
  "one arm",
  "one-arm",
  "1-arm",
  "1 arm",
  "single hand",
  
  "concentration",
  "kickback", // kickbacks are conventionally one-arm-at-a-time
  "bulgarian",
  "pistol",
  "split squat",
  "single leg",
  "single-leg",
  "lunge",
  "step up",
  "step-up",
  // Bilateral-only fixtures
  "pec deck",
  "pec-deck",
  "hip abduct",
  "hip adduct",
  "abductor",
  "adductor",
  "hack squat",
  // Different categories (no meaningful 1-arm form / not requested)
  "deadlift",
  "rdl",
  "romanian",
  "shrug",
  "good morning",
  "thruster",
  "squat",
  "front squat",
  "back squat",
  "barbell bench",
  "barbell row",
  "barbell curl",
  "barbell shrug",
  "ez bar",
  "ez-bar",
  // Movement is whole-body / not arm-isolated
  "deadlift",
  "carry",
  "farmer",
];

const BARBELL_INDICATORS = ["barbell", "ez bar", "ez-bar", "trap bar", "safety bar"];

/**
 * Returns true if this exercise should display the "2 Arm / 1 Arm" toggle pill.
 */
export function isSingleArmEligible(exerciseId: string, exerciseName: string): boolean {
  const hay = `${exerciseName} ${exerciseId}`.toLowerCase();

  // Hard exclude barbell variants — single-arm barbell work is a niche skill,
  // not the typical "switch to dumbbell-style unilateral" the toggle covers.
  if (BARBELL_INDICATORS.some((b) => hay.includes(b))) return false;

  // Exclude already-unilateral / bilateral-only / wrong-category movements.
  if (EXCLUDE_PATTERNS.some((p) => hay.includes(p))) return false;

  // Must have eligible equipment AND an eligible movement pattern.
  const hasEquip = ELIGIBLE_EQUIPMENT.some((e) => hay.includes(e));
  if (!hasEquip) return false;

  const hasPattern = ELIGIBLE_PATTERNS.some((p) => hay.includes(p));
  return hasPattern;
}
