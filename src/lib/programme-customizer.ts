/**
 * Programme customizer — pure logic for cloning presets into user-editable
 * custom workouts, computing weekly volume, and suggesting exercises to hit
 * MEV/MAV/MRV targets.
 *
 * All functions here are pure. Side effects (localStorage / Supabase writes)
 * live in the ProgrammeEditor page component.
 */

import type { WorkoutDay, Exercise } from "@/lib/workout-data";
import { WORKOUTS } from "@/lib/workout-data";
import { EXERCISE_LIBRARY } from "@/lib/exercise-library";
import { EXERCISE_SUBSTITUTIONS } from "@/lib/exercise-substitutions";
import type { MuscleRegion } from "@/lib/muscle-mapping";
import { MUSCLE_REGIONS, getMusclesWorked } from "@/lib/muscle-mapping";
import { VOLUME_STANDARDS, STRENGTH_STANDARDS, type VolumeStandard } from "@/lib/volume-standards";

export type ProgrammeGoal = "hypertrophy" | "strength" | "maintenance";

// ── Clone helpers ────────────────────────────────────────────────────────────

/**
 * Clone a preset WorkoutDay into a user-owned copy suitable for saving into
 * `custom_workouts`. Exercise IDs are preserved so PR/history keeps working.
 * Icon is dropped (not JSON-safe) — restored to Dumbbell on read.
 */
export function cloneWorkoutForCustomization(
  workout: WorkoutDay,
  userId: string,
  suffix?: string,
): Omit<WorkoutDay, "icon"> {
  const slug = (suffix ?? workout.id).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const userShort = userId.slice(0, 8);
  const id = `custom-${slug}-${userShort}`;
  return {
    id,
    name: workout.name,
    focus: workout.focus,
    color: workout.color,
    day: workout.day,
    targetRir: workout.targetRir,
    exercises: workout.exercises.map((ex) => ({ ...ex })),
  };
}

// ── Volume computation ───────────────────────────────────────────────────────

export type MuscleVolumeMap = Record<MuscleRegion, number>;

function zeroVolume(): MuscleVolumeMap {
  const map = {} as MuscleVolumeMap;
  MUSCLE_REGIONS.forEach((m) => { map[m] = 0; });
  return map;
}

/**
 * Sum working sets per PRIMARY muscle across a schedule.
 * Warm-ups excluded implicitly (not present in schedule data).
 * Only primary muscles counted — matches volume-queries.ts behaviour.
 */
export function computeWeeklyMuscleVolume(workouts: (Omit<WorkoutDay, "icon"> | WorkoutDay)[]): MuscleVolumeMap {
  const totals = zeroVolume();
  for (const w of workouts) {
    for (const ex of w.exercises) {
      const hits = getMusclesWorked(ex.id, ex.name, ex.targetMuscle);
      const sets = Number(ex.sets) || 0;
      for (const m of hits.primary) {
        totals[m] += sets;
      }
    }
  }
  return totals;
}

// ── Volume targets per goal ──────────────────────────────────────────────────

/**
 * Recommended weekly set count per muscle for a given training goal.
 * hypertrophy → MAV midpoint (RP standards)
 * strength    → strength-standards MAV midpoint
 * maintenance → MEV floor
 */
export function getWeeklyVolumeTargets(goal: ProgrammeGoal): Record<MuscleRegion, number> {
  const targets = {} as Record<MuscleRegion, number>;
  for (const m of MUSCLE_REGIONS) {
    const std: VolumeStandard = goal === "strength" ? STRENGTH_STANDARDS[m] : VOLUME_STANDARDS[m];
    if (goal === "maintenance") {
      targets[m] = std.mev;
    } else {
      targets[m] = Math.round((std.mavLow + std.mavHigh) / 2);
    }
  }
  return targets;
}

// ── Substitutions ────────────────────────────────────────────────────────────

export type SwapOption = {
  id: string;
  name: string;
  targetMuscle: string;
  equipment?: string;
  source: "substitution" | "library";
  sameEquipment: boolean;
};

const LIB_MUSCLE_TO_REGIONS: Record<string, MuscleRegion[]> = {
  Chest: ["chest"],
  Back: ["lats", "mid_back"],
  Shoulders: ["front_delts", "side_delts", "rear_delts"],
  Biceps: ["biceps"],
  Triceps: ["triceps"],
  Quads: ["quads"],
  Hamstrings: ["hamstrings"],
  Glutes: ["glutes"],
  Calves: ["calves"],
  Core: ["abs", "obliques"],
  Forearms: ["forearms"],
};

/**
 * Suggest substitutions for a given exercise, blending curated swaps
 * (EXERCISE_SUBSTITUTIONS) with library entries sharing the same primary muscle.
 * Deduplicated by id; up to 12 results.
 */
export function getSubstitutionsFor(exercise: Exercise): SwapOption[] {
  const seen = new Set<string>([exercise.id]);
  const out: SwapOption[] = [];

  // 1. Curated swaps
  const curated = EXERCISE_SUBSTITUTIONS[exercise.id] ?? [];
  for (const s of curated) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push({
      id: s.id,
      name: s.name,
      targetMuscle: s.targetMuscle,
      equipment: undefined,
      source: "substitution",
      sameEquipment: true,
    });
  }

  // 2. Library matches by primary muscle
  const targetHits = getMusclesWorked(exercise.id, exercise.name, exercise.targetMuscle);
  const targetPrimary = new Set(targetHits.primary);
  if (targetPrimary.size > 0) {
    const currentLib = EXERCISE_LIBRARY.find((l) => l.id === exercise.id);
    const currentEquip = currentLib?.equipment;
    for (const lib of EXERCISE_LIBRARY) {
      if (seen.has(lib.id) || out.length >= 12) continue;
      const regions = LIB_MUSCLE_TO_REGIONS[lib.muscleGroup] ?? [];
      if (!regions.some((r) => targetPrimary.has(r))) continue;
      seen.add(lib.id);
      out.push({
        id: lib.id,
        name: lib.name,
        targetMuscle: lib.muscleGroup,
        equipment: lib.equipment,
        source: "library",
        sameEquipment: !!currentEquip && lib.equipment === currentEquip,
      });
    }
  }

  // Sort: same-equipment first, curated first within groups
  out.sort((a, b) => {
    if (a.sameEquipment !== b.sameEquipment) return a.sameEquipment ? -1 : 1;
    if (a.source !== b.source) return a.source === "substitution" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return out.slice(0, 12);
}

// ── Auto-fill day ────────────────────────────────────────────────────────────

/**
 * Human-facing day labels → muscles targeted by that day.
 * Fallback: full body.
 */
export const DAY_LABEL_TO_MUSCLES: Record<string, MuscleRegion[]> = {
  push: ["chest", "front_delts", "side_delts", "triceps"],
  pull: ["lats", "mid_back", "rear_delts", "biceps"],
  legs: ["quads", "hamstrings", "glutes", "calves", "adductors", "abductors"],
  upper: ["chest", "front_delts", "side_delts", "rear_delts", "lats", "mid_back", "biceps", "triceps"],
  lower: ["quads", "hamstrings", "glutes", "calves", "adductors", "abductors"],
  chest: ["chest", "front_delts"],
  back: ["lats", "mid_back", "traps"],
  shoulders: ["front_delts", "side_delts", "rear_delts"],
  arms: ["biceps", "triceps", "forearms"],
  "chest_back": ["chest", "lats", "mid_back"],
  "shoulders_arms": ["front_delts", "side_delts", "rear_delts", "biceps", "triceps"],
  fullbody: ["chest", "lats", "quads", "hamstrings", "glutes", "front_delts", "side_delts", "biceps", "triceps"],
  full: ["chest", "lats", "quads", "hamstrings", "glutes", "front_delts", "side_delts", "biceps", "triceps"],
};

function musclesForDay(dayLabel: string, workoutId: string): MuscleRegion[] {
  const key = workoutId.toLowerCase();
  if (DAY_LABEL_TO_MUSCLES[key]) return DAY_LABEL_TO_MUSCLES[key];
  const lower = dayLabel.toLowerCase();
  for (const [k, v] of Object.entries(DAY_LABEL_TO_MUSCLES)) {
    if (lower.includes(k)) return v;
  }
  // Fallback: full body
  return DAY_LABEL_TO_MUSCLES.fullbody;
}

/** Build a fresh exercise list for a day aimed at hitting `perMuscleTarget` sets each. */
export function autoFillDay(
  workout: Omit<WorkoutDay, "icon"> | WorkoutDay,
  perMuscleTarget: Partial<Record<MuscleRegion, number>>,
  goal: ProgrammeGoal,
): Exercise[] {
  const muscles = musclesForDay(workout.day, workout.id);
  const defaultReps = goal === "strength" ? "3-5" : goal === "maintenance" ? "8-12" : "6-10";
  const defaultSets = goal === "strength" ? 4 : 3;

  const chosen: Exercise[] = [];
  const chosenIds = new Set<string>();

  for (const muscle of muscles) {
    const need = perMuscleTarget[muscle] ?? 0;
    if (need <= 0) continue;
    // Pick 1–2 exercises per muscle depending on target
    const picks = need >= defaultSets * 2 ? 2 : 1;
    let placed = 0;
    for (const lib of EXERCISE_LIBRARY) {
      if (placed >= picks) break;
      if (chosenIds.has(lib.id)) continue;
      const regions = LIB_MUSCLE_TO_REGIONS[lib.muscleGroup] ?? [];
      if (!regions.includes(muscle)) continue;
      chosenIds.add(lib.id);
      chosen.push({
        id: lib.id,
        name: lib.name,
        sets: defaultSets,
        reps: defaultReps,
        targetMuscle: lib.muscleGroup,
        notes: lib.description.split(".")[0],
      });
      placed++;
    }
  }

  return chosen;
}

// ── Resolve schedule → workouts ──────────────────────────────────────────────

/**
 * Given a user's SavedSplitDay[] and their custom workouts (from localStorage),
 * resolve each schedule entry to its full WorkoutDay definition.
 * Falls back to null if a workoutId cannot be resolved.
 */
export function resolveSchedule(
  schedule: { label: string; workoutId: string }[],
  customWorkouts: WorkoutDay[],
): WorkoutDay[] {
  const byId = new Map<string, WorkoutDay>();
  for (const w of WORKOUTS) byId.set(w.id, w);
  for (const w of customWorkouts) byId.set(w.id, w);
  const out: WorkoutDay[] = [];
  for (const entry of schedule) {
    const w = byId.get(entry.workoutId);
    if (w) out.push(w);
  }
  return out;
}
