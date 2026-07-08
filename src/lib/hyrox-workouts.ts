import { Flame, Activity, Zap, Wind, Trophy } from "lucide-react";
import type { WorkoutDay, Exercise } from "./workout-data";

/**
 * Hyrox training session library.
 *
 * For running / erg / carry exercises the `weight` column is repurposed as
 * **elapsed seconds** for that interval (weightLabel: "Sec"). This lets the
 * benchmark tracker chart pace improvement without changing the DB schema.
 * `reps` still stores metres (distance is fixed per set).
 *
 * Interval sessions (CR / Erg / Race Sim) are expanded round-by-round so the
 * user works straight down the list — round 1 (run → ski → rest), round 2,
 * etc. — rather than logging all sets of one movement before switching.
 */

/** Expand a set of "round exercises" over N rounds with per-round unique IDs. */
function rounds(count: number, template: Omit<Exercise, "sets">[], group = "A"): Exercise[] {
  const out: Exercise[] = [];
  for (let r = 1; r <= count; r++) {
    for (const ex of template) {
      out.push({
        ...ex,
        id: `${ex.id}-r${r}`,
        name: `${ex.name} · Rd ${r}`,
        sets: 1,
        supersetGroup: group,
      });
    }
  }
  return out;
}

export const HYROX_WORKOUTS: WorkoutDay[] = [
  // ── Compromised Running ────────────────────────────────────────────
  {
    id: "hyrox-cr-ski",
    name: "Hyrox · CR Ski Intro",
    icon: Wind,
    day: "Compromised Run",
    focus: "4 rounds · Run 400m + Ski 250m + Rest 90s",
    color: "from-orange-500/25 to-red-500/10",
    targetRir: "0-1",
    exercises: rounds(4, [
      { id: "hx-run-400", name: "Run 400m",     reps: "400", targetMuscle: "Aerobic Capacity", notes: "Target 10km pace. Log elapsed seconds — lower is better.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres" },
      { id: "hx-ski-250", name: "Ski Erg 250m", reps: "250", targetMuscle: "Upper Aerobic",    notes: "Hard but sustainable. Sub with rower if no ski.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres" },
      { id: "hx-rest-90", name: "Rest 90s",     reps: "90",  targetMuscle: "Recovery",         notes: "Walk, breathe deep, reset posture.", trackWeight: false, repLabel: "Sec" },
    ]),
  },
  {
    id: "hyrox-cr-full",
    name: "Hyrox · CR 1km Loop",
    icon: Activity,
    day: "Compromised Run",
    focus: "4 rounds · 1km Run + rotating station",
    color: "from-orange-500/25 to-red-500/10",
    targetRir: "0-1",
    exercises: [
      { id: "hx-run-1k-a", name: "Run 1000m · Rd 1",     sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "Target race pace. Log seconds.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-ski-1k",   name: "Ski Erg 1000m · Rd 1", sets: 1, reps: "1000", targetMuscle: "Upper Aerobic", notes: "Straight off the run — no rest.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-run-1k-b", name: "Run 1000m · Rd 2",     sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "Recover pace on run legs.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "B" },
      { id: "hx-sled-50",  name: "Sled Push 50m · Rd 2", sets: 1, reps: "50",   targetMuscle: "Legs/Power",    notes: "Heavy — Hyrox race weight (men 152kg / women 102kg incl. sled). Log kg on sled.", repLabel: "Metres", supersetGroup: "B" },
      { id: "hx-run-1k-c", name: "Run 1000m · Rd 3",     sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "C" },
      { id: "hx-row-1k",   name: "Row 1000m · Rd 3",     sets: 1, reps: "1000", targetMuscle: "Full Body",     notes: "Strong legs, drive with hips.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "C" },
      { id: "hx-run-1k-d", name: "Run 1000m · Rd 4",     sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "D" },
      { id: "hx-farm-200", name: "Farmers Carry 200m · Rd 4", sets: 1, reps: "200", targetMuscle: "Grip/Traps", notes: "2× 24kg (men) / 16kg (women). Log seconds elapsed.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "D" },
    ],
  },
  {
    id: "hyrox-cr-sprint",
    name: "Hyrox · CR Wall Ball Sprint",
    icon: Zap,
    day: "Compromised Run",
    focus: "8 rounds · Run 200m + 20 Wall Balls + Rest 60s",
    color: "from-orange-500/25 to-red-500/10",
    targetRir: "0-1",
    exercises: rounds(8, [
      { id: "hx-run-200", name: "Run 200m",   reps: "200", targetMuscle: "Aerobic",   notes: "Faster than race pace. Log seconds.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres" },
      { id: "hx-wb-20",   name: "Wall Balls", reps: "20",  targetMuscle: "Full Body", notes: "6kg to 10ft (men) / 4kg to 9ft (women). Log ball weight in kg.", trackWeight: true, weightLabel: "Kg", repLabel: "Reps" },
      { id: "hx-rest-60", name: "Rest 60s",   reps: "60",  targetMuscle: "Recovery",  notes: "Walk between rounds.", trackWeight: false, repLabel: "Sec" },
    ]),
  },
  // ── Station Strength (straight sets, no rounds) ────────────────────
  {
    id: "hyrox-strength-posterior",
    name: "Hyrox · Posterior Strength",
    icon: Trophy,
    day: "Strength",
    focus: "Sled · RDL · Farmers · Lunges",
    color: "from-amber-500/25 to-orange-500/10",
    targetRir: "1-2",
    exercises: [
      { id: "hx-sled-push-20",  name: "Sled Push 20m",         sets: 4, reps: "20",    targetMuscle: "Legs/Power",       notes: "Heavier than race weight. Log kg on sled.", repLabel: "Metres" },
      { id: "hx-sled-pull-20",  name: "Sled Pull 20m",         sets: 4, reps: "20",    targetMuscle: "Back/Posterior",   notes: "Hand-over-hand rope pull. Log kg on sled.", repLabel: "Metres" },
      { id: "fb2",              name: "Romanian Deadlift",     sets: 4, reps: "6",     targetMuscle: "Hamstrings/Glutes", notes: "Heavy hinge — carryover to sled pull and pick-ups.", targetRir: "1-2" },
      { id: "hx-farm-50",       name: "Farmers Carry 50m",     sets: 4, reps: "50",    targetMuscle: "Grip/Traps",       notes: "Heavier than race weight. Log kg per hand.", repLabel: "Metres" },
      { id: "hx-sb-lunge-20",   name: "Sandbag Lunges 20m",    sets: 4, reps: "20",    targetMuscle: "Legs/Core",        notes: "20kg sandbag on shoulder. Log bag weight.", repLabel: "Metres" },
    ],
  },
  {
    id: "hyrox-strength-power",
    name: "Hyrox · Power & Wall Ball",
    icon: Flame,
    day: "Strength",
    focus: "Burpees · Wall Balls · KB Swings · Box Jumps",
    color: "from-amber-500/25 to-orange-500/10",
    targetRir: "1-2",
    exercises: [
      { id: "hx-bbj",           name: "Burpee Broad Jumps",    sets: 5, reps: "10",    targetMuscle: "Full Body Power",  notes: "Full chest to floor, explosive broad jump each rep.", trackWeight: false, repLabel: "Reps" },
      { id: "hx-wb-25",         name: "Wall Balls",            sets: 5, reps: "25",    targetMuscle: "Full Body",        notes: "Race weight. Unbroken sets. Log ball kg.", repLabel: "Reps" },
      { id: "pw5",              name: "Kettlebell Swing",      sets: 5, reps: "20",    targetMuscle: "Hip Power",        notes: "Heavy KB. Hip snap." },
      { id: "hx-box-jump",      name: "Box Jump",              sets: 5, reps: "8",     targetMuscle: "Explosive Power",  notes: "Max height, step down. Log box height in inches.", trackWeight: true, weightLabel: "Height (in)", repLabel: "Reps" },
    ],
  },
  // ── Erg Conditioning ───────────────────────────────────────────────
  {
    id: "hyrox-erg-threshold",
    name: "Hyrox · Erg Threshold",
    icon: Activity,
    day: "Conditioning",
    focus: "6 rounds · Row 500m + Ski 500m + Rest 90s",
    color: "from-red-500/25 to-orange-500/10",
    targetRir: "0-1",
    exercises: rounds(6, [
      { id: "hx-row-500",  name: "Row 500m",     reps: "500", targetMuscle: "Full Body Aerobic", notes: "Threshold pace — hard but repeatable. Log seconds.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres" },
      { id: "hx-ski-500",  name: "Ski Erg 500m", reps: "500", targetMuscle: "Upper Aerobic",    notes: "Straight from rower. Log seconds.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres" },
      { id: "hx-rest-90b", name: "Rest 90s",     reps: "90",  targetMuscle: "Recovery",         notes: "", trackWeight: false, repLabel: "Sec" },
    ]),
  },
  {
    id: "hyrox-erg-vo2",
    name: "Hyrox · Erg VO2",
    icon: Zap,
    day: "Conditioning",
    focus: "10 rounds · Row 250m + Ski 250m + Rest 45s",
    color: "from-red-500/25 to-orange-500/10",
    targetRir: "0-1",
    exercises: rounds(10, [
      { id: "hx-row-250",  name: "Row 250m",     reps: "250", targetMuscle: "VO2 Max",  notes: "All-out. Under 60s target.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres" },
      { id: "hx-ski-250b", name: "Ski Erg 250m", reps: "250", targetMuscle: "VO2 Max",  notes: "All-out.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres" },
      { id: "hx-rest-45",  name: "Rest 45s",     reps: "45",  targetMuscle: "Recovery", notes: "Minimal — this is the point.", trackWeight: false, repLabel: "Sec" },
    ]),
  },
  // ── Simulation (already 1-set per round; kept as-is) ───────────────
  {
    id: "hyrox-halfrox",
    name: "Hyrox · HalfRox Simulation",
    icon: Trophy,
    day: "Race Simulation",
    focus: "4× Run + Station at race pace",
    color: "from-yellow-500/25 to-orange-500/10",
    targetRir: "0-1",
    exercises: [
      { id: "hx-sim-r1",   name: "Run 1000m · Rd 1",      sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "Race pace. Full simulation — no stopping.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-sim-ski",  name: "Ski Erg 1000m · Rd 1",  sets: 1, reps: "1000", targetMuscle: "Upper Aerobic", notes: "Station 1.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-sim-r2",   name: "Run 1000m · Rd 2",      sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "B" },
      { id: "hx-sim-push", name: "Sled Push 50m · Rd 2",  sets: 1, reps: "50",   targetMuscle: "Legs/Power",    notes: "Station 2. Race weight. Log kg.", repLabel: "Metres", supersetGroup: "B" },
      { id: "hx-sim-r3",   name: "Run 1000m · Rd 3",      sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "C" },
      { id: "hx-sim-pull", name: "Sled Pull 50m · Rd 3",  sets: 1, reps: "50",   targetMuscle: "Back/Posterior", notes: "Station 3. Race weight. Log kg.", repLabel: "Metres", supersetGroup: "C" },
      { id: "hx-sim-r4",   name: "Run 1000m · Rd 4",      sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "D" },
      { id: "hx-sim-bbj",  name: "Burpee Broad Jumps 80m · Rd 4", sets: 1, reps: "80", targetMuscle: "Full Body Power", notes: "Station 4. Log seconds.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "D" },
    ],
  },
];

/** IDs of one-off Hyrox sessions, grouped by pillar for the swap sheet. */
export const HYROX_SESSION_GROUPS = [
  {
    label: "Compromised Running",
    description: "Run + station coupling — the signature Hyrox stimulus.",
    ids: ["hyrox-cr-ski", "hyrox-cr-full", "hyrox-cr-sprint"],
  },
  {
    label: "Station Strength",
    description: "Sled, wall ball, lunge & posterior chain strength.",
    ids: ["hyrox-strength-posterior", "hyrox-strength-power"],
  },
  {
    label: "Erg Conditioning",
    description: "Rower + Ski Erg threshold and VO2 work.",
    ids: ["hyrox-erg-threshold", "hyrox-erg-vo2"],
  },
  {
    label: "Race Simulation",
    description: "Race-pace practice against the clock.",
    ids: ["hyrox-halfrox"],
  },
];

export const HYROX_WORKOUT_IDS = new Set(HYROX_WORKOUTS.map((w) => w.id));

export function isHyroxWorkout(workoutId: string): boolean {
  return HYROX_WORKOUT_IDS.has(workoutId);
}

// ── Benchmark catalog ─────────────────────────────────────────────────
export type HyroxBenchmarkDef = {
  key: string;
  label: string;
  category: "run" | "erg" | "carry" | "strength" | "power";
  /** "time" = weight stored as seconds, lower better. "weight" = kg, higher better. "reps" = reps@weight. */
  metric: "time" | "weight" | "reps";
  /** Fixed distance in metres, for pace calculation on time-based benchmarks. */
  distance?: number;
  /** Exercise ID prefixes whose sets should be aggregated into this benchmark.
   *  Rounds append `-r{n}` suffixes; matching is done via startsWith on the base ID. */
  exerciseIds: string[];
};

export const HYROX_BENCHMARKS: HyroxBenchmarkDef[] = [
  // Running
  { key: "run-1k",   label: "1km Run",   category: "run", metric: "time", distance: 1000,
    exerciseIds: ["hx-run-1k-a", "hx-run-1k-b", "hx-run-1k-c", "hx-run-1k-d", "hx-sim-r1", "hx-sim-r2", "hx-sim-r3", "hx-sim-r4"] },
  { key: "run-400",  label: "400m Run",  category: "run", metric: "time", distance: 400,  exerciseIds: ["hx-run-400"] },
  { key: "run-200",  label: "200m Run",  category: "run", metric: "time", distance: 200,  exerciseIds: ["hx-run-200"] },
  // Ski Erg
  { key: "ski-1k",   label: "1km Ski Erg", category: "erg", metric: "time", distance: 1000, exerciseIds: ["hx-ski-1k", "hx-sim-ski"] },
  { key: "ski-500",  label: "500m Ski Erg", category: "erg", metric: "time", distance: 500, exerciseIds: ["hx-ski-500"] },
  { key: "ski-250",  label: "250m Ski Erg", category: "erg", metric: "time", distance: 250, exerciseIds: ["hx-ski-250", "hx-ski-250b"] },
  // Row
  { key: "row-1k",   label: "1km Row",   category: "erg", metric: "time", distance: 1000, exerciseIds: ["hx-row-1k"] },
  { key: "row-500",  label: "500m Row",  category: "erg", metric: "time", distance: 500,  exerciseIds: ["hx-row-500"] },
  { key: "row-250",  label: "250m Row",  category: "erg", metric: "time", distance: 250,  exerciseIds: ["hx-row-250"] },
  // Carries
  { key: "farm-200", label: "200m Farmers Carry", category: "carry", metric: "time", distance: 200, exerciseIds: ["hx-farm-200"] },
  // Power (time under load)
  { key: "bbj-80",   label: "80m Burpee Broad Jumps", category: "power", metric: "time", distance: 80, exerciseIds: ["hx-sim-bbj"] },
  // Strength — heavier is better
  { key: "sled-push-50", label: "Sled Push 50m",  category: "strength", metric: "weight", exerciseIds: ["hx-sled-50", "hx-sim-push"] },
  { key: "sled-pull-50", label: "Sled Pull 50m",  category: "strength", metric: "weight", exerciseIds: ["hx-sim-pull"] },
  { key: "sled-push-20", label: "Sled Push 20m",  category: "strength", metric: "weight", exerciseIds: ["hx-sled-push-20"] },
  { key: "sled-pull-20", label: "Sled Pull 20m",  category: "strength", metric: "weight", exerciseIds: ["hx-sled-pull-20"] },
  { key: "farm-50",      label: "50m Farmers Carry", category: "strength", metric: "weight", exerciseIds: ["hx-farm-50"] },
];
