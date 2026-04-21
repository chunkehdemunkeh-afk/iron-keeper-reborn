// Maps exercises (by id, name, or muscleGroup string) to canonical muscle regions
// used by the BodyDiagram and recovery calculations.

export const MUSCLE_REGIONS = [
  "chest",
  "front_delts",
  "side_delts",
  "rear_delts",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "obliques",
  "quads",
  "hamstrings",
  "glutes",
  "abductors",
  "adductors",
  "calves",
  "lats",
  "traps",
  "mid_back",
  "lower_back",
] as const;

export type MuscleRegion = typeof MUSCLE_REGIONS[number];

export const MUSCLE_LABELS: Record<MuscleRegion, string> = {
  chest: "Chest",
  front_delts: "Front Delts",
  side_delts: "Side Delts",
  rear_delts: "Rear Delts",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs",
  obliques: "Obliques",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  abductors: "Abductors",
  adductors: "Adductors",
  calves: "Calves",
  lats: "Lats",
  traps: "Traps",
  mid_back: "Mid Back",
  lower_back: "Lower Back",
};

// Recovery time per muscle group in hours
export const RECOVERY_HOURS: Record<MuscleRegion, number> = {
  abs: 24,
  obliques: 24,
  calves: 24,
  forearms: 24,
  biceps: 48,
  triceps: 48,
  side_delts: 48,
  rear_delts: 48,
  abductors: 48,
  adductors: 48,
  chest: 72,
  front_delts: 72,
  lats: 72,
  mid_back: 72,
  traps: 72,
  glutes: 72,
  quads: 96,
  hamstrings: 96,
  lower_back: 96,
};

export type MuscleHits = { primary: MuscleRegion[]; secondary: MuscleRegion[] };

// Lookup overrides for specific exercise IDs (compound lifts get sensible secondaries)
const ID_OVERRIDES: Record<string, MuscleHits> = {
  // Library — chest
  "lib-1": { primary: ["chest", "triceps"], secondary: ["front_delts"] }, // Bench
  "lib-2": { primary: ["chest", "front_delts"], secondary: ["triceps"] }, // Incline DB
  "lib-3": { primary: ["chest"], secondary: ["triceps", "front_delts", "abs"] }, // Push-ups
  "lib-4": { primary: ["chest"], secondary: ["front_delts"] }, // Cable flies
  "lib-5": { primary: ["chest", "triceps"], secondary: ["front_delts"] }, // Dips
  // Back
  "lib-6": { primary: ["lats", "biceps"], secondary: ["mid_back", "forearms"] }, // Pull-ups
  "lib-7": { primary: ["lats", "mid_back"], secondary: ["biceps", "rear_delts", "lower_back"] }, // Bb row
  "lib-8": { primary: ["lats"], secondary: ["biceps", "mid_back"] }, // Lat pulldown
  "lib-9": { primary: ["mid_back", "lats"], secondary: ["biceps", "rear_delts"] }, // Cable row
  "lib-10": { primary: ["lats", "mid_back"], secondary: ["biceps"] }, // 1-arm row
  // Shoulders
  "lib-11": { primary: ["front_delts", "triceps"], secondary: ["side_delts", "traps"] }, // OHP
  "lib-12": { primary: ["side_delts"], secondary: [] },
  "lib-13": { primary: ["rear_delts"], secondary: ["traps"] },
  "lib-14": { primary: ["front_delts", "side_delts"], secondary: ["triceps"] },
  "lib-15": { primary: ["rear_delts"], secondary: ["traps"] },
  // Biceps / Triceps
  "lib-16": { primary: ["biceps"], secondary: ["forearms"] },
  "lib-17": { primary: ["biceps", "forearms"], secondary: [] },
  "lib-18": { primary: ["biceps"], secondary: [] },
  "lib-19": { primary: ["triceps"], secondary: [] },
  "lib-20": { primary: ["triceps"], secondary: [] },
  "lib-21": { primary: ["triceps", "chest"], secondary: ["front_delts"] },
  // Quads
  "lib-22": { primary: ["quads", "glutes"], secondary: ["hamstrings", "lower_back"] }, // Back squat
  "lib-23": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "lib-24": { primary: ["quads"], secondary: [] },
  "lib-25": { primary: ["quads", "glutes"], secondary: ["abs"] },
  "lib-26": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  // Hamstrings
  "lib-27": { primary: ["hamstrings", "glutes"], secondary: ["lower_back"] }, // RDL
  "lib-28": { primary: ["hamstrings"], secondary: [] },
  "lib-29": { primary: ["hamstrings"], secondary: ["glutes"] },
  "lib-30": { primary: ["hamstrings", "lower_back"], secondary: ["glutes"] },
  // Glutes
  "lib-31": { primary: ["glutes"], secondary: ["hamstrings"] },
  "lib-32": { primary: ["glutes"], secondary: ["hamstrings"] },
  "lib-33": { primary: ["glutes"], secondary: [] },
  // Calves
  "lib-34": { primary: ["calves"], secondary: [] },
  "lib-35": { primary: ["calves"], secondary: [] },
  // Core
  "lib-36": { primary: ["abs"], secondary: ["obliques"] },
  "lib-37": { primary: ["abs"], secondary: [] },
  "lib-38": { primary: ["abs"], secondary: ["obliques"] },
  "lib-39": { primary: ["abs"], secondary: ["lats"] },
  "lib-40": { primary: ["obliques"], secondary: ["abs"] },
  "lib-41": { primary: ["obliques"], secondary: ["abs"] },
  // Forearms
  "lib-42": { primary: ["forearms"], secondary: [] },
  "lib-43": { primary: ["forearms", "traps"], secondary: [] },
};

// Map muscleGroup string from EXERCISE_LIBRARY to canonical regions
const MUSCLE_GROUP_MAP: Record<string, MuscleHits> = {
  Chest: { primary: ["chest"], secondary: ["triceps", "front_delts"] },
  Back: { primary: ["lats", "mid_back"], secondary: ["biceps"] },
  Shoulders: { primary: ["side_delts", "front_delts"], secondary: [] },
  Biceps: { primary: ["biceps"], secondary: ["forearms"] },
  Triceps: { primary: ["triceps"], secondary: [] },
  Quads: { primary: ["quads"], secondary: ["glutes"] },
  Hamstrings: { primary: ["hamstrings"], secondary: ["glutes"] },
  Glutes: { primary: ["glutes"], secondary: ["hamstrings"] },
  Calves: { primary: ["calves"], secondary: [] },
  Core: { primary: ["abs"], secondary: ["obliques"] },
  Forearms: { primary: ["forearms"], secondary: [] },
  "Full Body": { primary: ["quads", "chest", "lats"], secondary: ["glutes", "abs"] },
};

// Parse "Quads/Glutes" style targetMuscle strings from WORKOUTS
function parseTargetMuscleString(s: string): MuscleRegion[] {
  const tokens = s.toLowerCase().split(/[\/,&+]| and /).map((t) => t.trim());
  const out: MuscleRegion[] = [];
  for (const tok of tokens) {
    if (tok.includes("quad")) out.push("quads");
    else if (tok.includes("hamstring")) out.push("hamstrings");
    else if (tok.includes("glute")) out.push("glutes");
    else if (tok.includes("calf") || tok.includes("calves")) out.push("calves");
    else if (tok.includes("chest") || tok.includes("pec")) out.push("chest");
    else if (tok.includes("rear delt")) out.push("rear_delts");
    else if (tok.includes("side delt") || tok.includes("lateral")) out.push("side_delts");
    else if (tok.includes("front delt")) out.push("front_delts");
    else if (tok.includes("delt") || tok.includes("shoulder")) out.push("side_delts");
    else if (tok.includes("bicep")) out.push("biceps");
    else if (tok.includes("tricep")) out.push("triceps");
    else if (tok.includes("forearm") || tok.includes("grip")) out.push("forearms");
    else if (tok.includes("oblique")) out.push("obliques");
    else if (tok.includes("core") || tok.includes("ab")) out.push("abs");
    else if (tok.includes("lat ") || tok === "lats" || tok.includes("back")) {
      if (tok.includes("lower")) out.push("lower_back");
      else if (tok.includes("upper") || tok.includes("trap")) out.push("traps");
      else out.push("lats");
    }
    else if (tok.includes("trap")) out.push("traps");
  }
  return out;
}

// Heuristic on exercise name when no override exists
function nameHeuristic(name: string): MuscleHits | null {
  const n = name.toLowerCase();
  // Order matters — most specific first
  if (n.includes("deadlift")) return { primary: ["hamstrings", "glutes", "lower_back"], secondary: ["lats", "traps", "forearms"] };
  if (n.includes("squat")) return { primary: ["quads", "glutes"], secondary: ["hamstrings", "lower_back"] };
  if (n.includes("hip thrust") || n.includes("glute bridge")) return { primary: ["glutes"], secondary: ["hamstrings"] };
  if (n.includes("rdl") || n.includes("romanian")) return { primary: ["hamstrings", "glutes"], secondary: ["lower_back"] };
  if (n.includes("good morning")) return { primary: ["hamstrings", "lower_back"], secondary: ["glutes"] };
  if (n.includes("hamstring curl") || n.includes("leg curl") || n.includes("lying curl")) return { primary: ["hamstrings"], secondary: [] };
  if (n.includes("leg extension")) return { primary: ["quads"], secondary: [] };
  if (n.includes("leg press")) return { primary: ["quads", "glutes"], secondary: ["hamstrings"] };
  if (n.includes("calf")) return { primary: ["calves"], secondary: [] };
  if (n.includes("hip abduction") || n.includes("abductor")) return { primary: ["abductors"], secondary: ["glutes"] };
  if (n.includes("hip adduction") || n.includes("adductor") || n.includes("inner thigh")) return { primary: ["adductors"], secondary: [] };
  if (n.includes("lunge") || n.includes("split squat")) return { primary: ["quads", "glutes"], secondary: ["hamstrings", "adductors"] };

  if (n.includes("bench") || n.includes("chest press") || n.includes("dip") || n.includes("push-up") || n.includes("pushup")) {
    return { primary: ["chest", "triceps"], secondary: ["front_delts"] };
  }
  if (n.includes("fly") || n.includes("flies") || n.includes("flye")) return { primary: ["chest"], secondary: ["front_delts"] };

  if (n.includes("pull-up") || n.includes("pullup") || n.includes("chin")) return { primary: ["lats", "biceps"], secondary: ["mid_back", "forearms"] };
  if (n.includes("pulldown")) return { primary: ["lats"], secondary: ["biceps"] };
  if (n.includes("row")) return { primary: ["lats", "mid_back"], secondary: ["biceps", "rear_delts"] };
  if (n.includes("face pull")) return { primary: ["rear_delts"], secondary: ["traps"] };
  if (n.includes("shrug")) return { primary: ["traps"], secondary: [] };

  if (n.includes("overhead press") || n.includes("ohp") || n.includes("military press") || n.includes("shoulder press")) {
    return { primary: ["front_delts", "triceps"], secondary: ["side_delts", "traps"] };
  }
  if (n.includes("lateral raise")) return { primary: ["side_delts"], secondary: [] };
  if (n.includes("rear delt") || n.includes("reverse fly")) return { primary: ["rear_delts"], secondary: ["traps"] };
  if (n.includes("arnold press")) return { primary: ["front_delts", "side_delts"], secondary: ["triceps"] };

  if (n.includes("curl") && (n.includes("hammer") || n.includes("forearm") || n.includes("wrist"))) {
    return { primary: ["forearms"], secondary: ["biceps"] };
  }
  if (n.includes("curl")) return { primary: ["biceps"], secondary: ["forearms"] };

  if (n.includes("pushdown") || n.includes("tricep extension") || n.includes("skull") || n.includes("kickback")) {
    return { primary: ["triceps"], secondary: [] };
  }
  if (n.includes("close grip")) return { primary: ["triceps", "chest"], secondary: ["front_delts"] };

  if (n.includes("plank") || n.includes("ab ") || n.includes("crunch") || n.includes("sit-up") || n.includes("dead bug") || n.includes("leg raise")) {
    return { primary: ["abs"], secondary: ["obliques"] };
  }
  if (n.includes("oblique") || n.includes("side bend") || n.includes("russian twist")) {
    return { primary: ["obliques"], secondary: ["abs"] };
  }
  if (n.includes("farmer")) return { primary: ["forearms", "traps"], secondary: [] };

  if (n.includes("hyperextension") || n.includes("back extension")) return { primary: ["lower_back"], secondary: ["glutes", "hamstrings"] };

  return null;
}

/**
 * Strips known modifier suffixes (cable attachment, heavy stack, two-hand variant)
 * from an exercise ID to get the underlying base ID. WorkoutSession produces IDs
 * like "up1-mag-grip", "up8-heavy-v-bar", "acc-abs1-handles", "lg5-2h", etc.
 *
 * Suffix tokens (matched right-to-left, repeatedly):
 *   handles, rope, straight-bar, v-bar, mag-grip, cuff-lat-bar, heavy, 2h
 * Note: tokens themselves can contain hyphens.
 */
const SUFFIX_TOKENS = [
  "cuff-lat-bar",
  "straight-bar",
  "mag-grip",
  "v-bar",
  "handles",
  "rope",
  "heavy",
  "2h",
];

export function stripExerciseSuffixes(id: string): string {
  let current = id;
  let changed = true;
  while (changed) {
    changed = false;
    for (const tok of SUFFIX_TOKENS) {
      const suf = `-${tok}`;
      if (current.toLowerCase().endsWith(suf) && current.length > suf.length) {
        current = current.slice(0, -suf.length);
        changed = true;
      }
    }
  }
  return current;
}

/**
 * Returns the muscles worked by an exercise. Looks up in this order:
 * 1. Hard-coded ID overrides (compound lifts, library entries) — base ID
 * 2. Name keyword heuristic (only if name differs from ID — i.e. real name)
 * 3. targetMuscle string parsing (for WORKOUTS exercises)
 * 4. EXERCISE_LIBRARY muscleGroup mapping
 */
export function getMusclesWorked(
  exerciseId: string,
  exerciseName: string,
  targetMuscle?: string,
  muscleGroup?: string,
): MuscleHits {
  // 1. ID override on base id (after stripping attachment / heavy / 2h suffixes)
  const baseId = stripExerciseSuffixes(exerciseId);
  if (ID_OVERRIDES[baseId]) return ID_OVERRIDES[baseId];

  // 2. Name heuristic — skip if the "name" is actually just the id
  // (some legacy rows store name = id for cable-attachment variants).
  const nameIsRealName = exerciseName && exerciseName !== exerciseId && exerciseName !== baseId;
  if (nameIsRealName) {
    const heuristic = nameHeuristic(exerciseName);
    if (heuristic) return heuristic;
  }

  // 3. targetMuscle string
  if (targetMuscle) {
    const parsed = parseTargetMuscleString(targetMuscle);
    if (parsed.length) return { primary: parsed, secondary: [] };
  }

  // 4. muscleGroup mapping
  if (muscleGroup && MUSCLE_GROUP_MAP[muscleGroup]) {
    return MUSCLE_GROUP_MAP[muscleGroup];
  }

  // 5. Last-resort: if name was the id, try heuristic anyway (catches cases
  // where the id text itself contains keywords, e.g. "lib-db-Hack_Squat").
  if (!nameIsRealName) {
    const fromId = nameHeuristic(exerciseName.replace(/[_-]+/g, " "));
    if (fromId) return fromId;
  }

  return { primary: [], secondary: [] };
}
