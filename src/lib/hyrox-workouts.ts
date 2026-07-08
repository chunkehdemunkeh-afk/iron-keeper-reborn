import { Flame, Activity, Zap, Wind, Trophy } from "lucide-react";
import type { WorkoutDay } from "./workout-data";

/**
 * Hyrox training session library.
 *
 * Hyrox race format (fixed order): 8× (1km Run + Station):
 *  1. 1000m Ski Erg
 *  2. 50m Sled Push (heavy)
 *  3. 50m Sled Pull (heavy)
 *  4. 80m Burpee Broad Jumps
 *  5. 1000m Row
 *  6. 200m Farmers Carry
 *  7. 100m Sandbag Lunges
 *  8. 100 Wall Balls
 *
 * Sessions below train the four core pillars:
 *   - Compromised Running (CR)  — signature Hyrox stimulus
 *   - Station Strength/Technique
 *   - Pure Conditioning (Ergs)
 *   - Race Simulation
 */
export const HYROX_WORKOUTS: WorkoutDay[] = [
  // ── Compromised Running ────────────────────────────────────────────
  {
    id: "hyrox-cr-ski",
    name: "Hyrox · CR Ski Intro",
    icon: Wind,
    day: "Compromised Run",
    focus: "Compromised Running · Ski + Run Coupling",
    color: "from-orange-500/25 to-red-500/10",
    targetRir: "0-1",
    exercises: [
      { id: "hx-run-400",  name: "Run 400m",         sets: 4, reps: "400",  targetMuscle: "Aerobic Capacity", notes: "Target 10km pace. Straight into ski, no rest.", trackWeight: false, repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-ski-250",  name: "Ski Erg 250m",     sets: 4, reps: "250",  targetMuscle: "Upper Aerobic",    notes: "Hard but sustainable — same effort every round. Sub with rower if no ski.", trackWeight: false, repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-rest-90",  name: "Rest 90s",         sets: 4, reps: "90",   targetMuscle: "Recovery",         notes: "Walk, breathe deep, reset posture.", trackWeight: false, repLabel: "Sec" },
    ],
  },
  {
    id: "hyrox-cr-full",
    name: "Hyrox · CR 1km Loop",
    icon: Activity,
    day: "Compromised Run",
    focus: "Race-pace 1km + rotating station",
    color: "from-orange-500/25 to-red-500/10",
    targetRir: "0-1",
    exercises: [
      { id: "hx-run-1k-a", name: "Run 1000m",             sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "Target race pace. Log time.", trackWeight: false, repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-ski-1k",   name: "Ski Erg 1000m",         sets: 1, reps: "1000", targetMuscle: "Upper Aerobic", notes: "Straight off run — no rest.", trackWeight: false, repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-run-1k-b", name: "Run 1000m",             sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "Recover pace on run legs.", trackWeight: false, repLabel: "Metres", supersetGroup: "B" },
      { id: "hx-sled-50",  name: "Sled Push 50m",         sets: 1, reps: "50",   targetMuscle: "Legs/Power",    notes: "Heavy — Hyrox competition weight (men 152kg / women 102kg incl. sled).", repLabel: "Metres", supersetGroup: "B" },
      { id: "hx-run-1k-c", name: "Run 1000m",             sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "", trackWeight: false, repLabel: "Metres", supersetGroup: "C" },
      { id: "hx-row-1k",   name: "Row 1000m",             sets: 1, reps: "1000", targetMuscle: "Full Body",     notes: "Strong legs, drive with hips.", trackWeight: false, repLabel: "Metres", supersetGroup: "C" },
      { id: "hx-run-1k-d", name: "Run 1000m",             sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "", trackWeight: false, repLabel: "Metres", supersetGroup: "D" },
      { id: "hx-farm-200", name: "Farmers Carry 200m",    sets: 1, reps: "200",  targetMuscle: "Grip/Traps",    notes: "2× 24kg kettlebells (men) / 16kg (women). Shoulders back.", repLabel: "Metres", supersetGroup: "D" },
    ],
  },
  {
    id: "hyrox-cr-sprint",
    name: "Hyrox · CR Wall Ball Sprint",
    icon: Zap,
    day: "Compromised Run",
    focus: "Short interval CR · Wall Balls",
    color: "from-orange-500/25 to-red-500/10",
    targetRir: "0-1",
    exercises: [
      { id: "hx-run-200",  name: "Run 200m",       sets: 8, reps: "200", targetMuscle: "Aerobic",    notes: "Faster than race pace. Straight into wall balls.", trackWeight: false, repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-wb-20",    name: "Wall Balls",     sets: 8, reps: "20",  targetMuscle: "Full Body",  notes: "6kg to 10ft target (men) / 4kg to 9ft (women). Full squat depth, unbroken if possible.", trackWeight: true, weightLabel: "Kg", repLabel: "Reps", supersetGroup: "A" },
      { id: "hx-rest-60",  name: "Rest 60s",       sets: 8, reps: "60",  targetMuscle: "Recovery",   notes: "Walk between rounds.", trackWeight: false, repLabel: "Sec" },
    ],
  },
  // ── Station Strength ───────────────────────────────────────────────
  {
    id: "hyrox-strength-posterior",
    name: "Hyrox · Posterior Strength",
    icon: Trophy,
    day: "Strength",
    focus: "Sled · RDL · Farmers · Lunges",
    color: "from-amber-500/25 to-orange-500/10",
    targetRir: "1-2",
    exercises: [
      { id: "hx-sled-push-20",  name: "Sled Push 20m",         sets: 4, reps: "20",    targetMuscle: "Legs/Power",       notes: "Heavy — heavier than race weight. Drive low, chest close to bar.", repLabel: "Metres" },
      { id: "hx-sled-pull-20",  name: "Sled Pull 20m",         sets: 4, reps: "20",    targetMuscle: "Back/Posterior",   notes: "Hand-over-hand rope pull. Stay low, drive hips back.", repLabel: "Metres" },
      { id: "fb2",              name: "Romanian Deadlift",     sets: 4, reps: "6",     targetMuscle: "Hamstrings/Glutes", notes: "Heavy hinge — carryover to sled pull and pick-ups.", targetRir: "1-2" },
      { id: "hx-farm-50",       name: "Farmers Carry 50m",     sets: 4, reps: "50",    targetMuscle: "Grip/Traps",       notes: "Heavier than race weight. Shoulders back, breathe.", repLabel: "Metres" },
      { id: "hx-sb-lunge-20",   name: "Sandbag Lunges 20m",    sets: 4, reps: "20",    targetMuscle: "Legs/Core",        notes: "20kg sandbag on shoulder (alternate shoulders each set). Full knee touch, no bounce.", repLabel: "Metres" },
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
      { id: "hx-bbj",           name: "Burpee Broad Jumps",    sets: 5, reps: "10",    targetMuscle: "Full Body Power",  notes: "Full chest to floor, explosive broad jump each rep. This is the wall — practice it.", trackWeight: false, repLabel: "Reps" },
      { id: "hx-wb-25",         name: "Wall Balls",            sets: 5, reps: "25",    targetMuscle: "Full Body",        notes: "Race weight. Unbroken sets — grind through the mental block.", repLabel: "Reps" },
      { id: "pw5",              name: "Kettlebell Swing",      sets: 5, reps: "20",    targetMuscle: "Hip Power",        notes: "Heavy KB. Hip snap — carryover to broad jump extension." },
      { id: "hx-box-jump",      name: "Box Jump",              sets: 5, reps: "8",     targetMuscle: "Explosive Power",  notes: "Max height, step down (do not jump down). Log box height in inches.", trackWeight: true, weightLabel: "Height (in)", repLabel: "Reps" },
    ],
  },
  // ── Erg Conditioning ───────────────────────────────────────────────
  {
    id: "hyrox-erg-threshold",
    name: "Hyrox · Erg Threshold",
    icon: Activity,
    day: "Conditioning",
    focus: "Row + Ski threshold intervals",
    color: "from-red-500/25 to-orange-500/10",
    targetRir: "0-1",
    exercises: [
      { id: "hx-row-500",  name: "Row 500m",   sets: 6, reps: "500", targetMuscle: "Full Body Aerobic", notes: "Threshold pace — hard but repeatable. Same split every round.", trackWeight: false, repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-ski-500",  name: "Ski Erg 500m", sets: 6, reps: "500", targetMuscle: "Upper Aerobic",    notes: "Straight from rower.", trackWeight: false, repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-rest-90b", name: "Rest 90s",   sets: 6, reps: "90",  targetMuscle: "Recovery",         notes: "", trackWeight: false, repLabel: "Sec" },
    ],
  },
  {
    id: "hyrox-erg-vo2",
    name: "Hyrox · Erg VO2",
    icon: Zap,
    day: "Conditioning",
    focus: "Short Row/Ski VO2 intervals",
    color: "from-red-500/25 to-orange-500/10",
    targetRir: "0-1",
    exercises: [
      { id: "hx-row-250",  name: "Row 250m",     sets: 10, reps: "250", targetMuscle: "VO2 Max",         notes: "All-out. Under 60s target.", trackWeight: false, repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-ski-250b", name: "Ski Erg 250m", sets: 10, reps: "250", targetMuscle: "VO2 Max",         notes: "All-out.", trackWeight: false, repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-rest-45",  name: "Rest 45s",     sets: 10, reps: "45",  targetMuscle: "Recovery",        notes: "Minimal — this is the point.", trackWeight: false, repLabel: "Sec" },
    ],
  },
  // ── Simulation ─────────────────────────────────────────────────────
  {
    id: "hyrox-halfrox",
    name: "Hyrox · HalfRox Simulation",
    icon: Trophy,
    day: "Race Simulation",
    focus: "4× Run + Station at race pace",
    color: "from-yellow-500/25 to-orange-500/10",
    targetRir: "0-1",
    exercises: [
      { id: "hx-sim-r1",   name: "Run 1000m",           sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "Race pace — this is a full simulation, no stopping between segments.", trackWeight: false, repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-sim-ski",  name: "Ski Erg 1000m",       sets: 1, reps: "1000", targetMuscle: "Upper Aerobic", notes: "Station 1.", trackWeight: false, repLabel: "Metres", supersetGroup: "A" },
      { id: "hx-sim-r2",   name: "Run 1000m",           sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "", trackWeight: false, repLabel: "Metres", supersetGroup: "B" },
      { id: "hx-sim-push", name: "Sled Push 50m",       sets: 1, reps: "50",   targetMuscle: "Legs/Power",    notes: "Station 2. Race weight.", repLabel: "Metres", supersetGroup: "B" },
      { id: "hx-sim-r3",   name: "Run 1000m",           sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "", trackWeight: false, repLabel: "Metres", supersetGroup: "C" },
      { id: "hx-sim-pull", name: "Sled Pull 50m",       sets: 1, reps: "50",   targetMuscle: "Back/Posterior", notes: "Station 3. Race weight.", repLabel: "Metres", supersetGroup: "C" },
      { id: "hx-sim-r4",   name: "Run 1000m",           sets: 1, reps: "1000", targetMuscle: "Aerobic",       notes: "", trackWeight: false, repLabel: "Metres", supersetGroup: "D" },
      { id: "hx-sim-bbj",  name: "Burpee Broad Jumps 80m", sets: 1, reps: "80", targetMuscle: "Full Body Power", notes: "Station 4. Grind through.", trackWeight: false, repLabel: "Metres", supersetGroup: "D" },
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
