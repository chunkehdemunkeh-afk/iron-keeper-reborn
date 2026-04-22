// Strength standards: rate user's lifts on a 6-tier scale from Untrained → Elite.
// Numbers are kg of estimated 1RM, blended from Lon Kilgore / ExRx published norms
// at typical bodyweights, with linear interpolation between rows.

export type Tier = "untrained" | "beginner" | "novice" | "intermediate" | "advanced" | "elite";

export const TIERS: Tier[] = ["untrained", "beginner", "novice", "intermediate", "advanced", "elite"];

export const TIER_LABELS: Record<Tier, string> = {
  untrained: "Untrained",
  beginner: "Beginner",
  novice: "Novice",
  intermediate: "Intermediate",
  advanced: "Advanced",
  elite: "Elite",
};

export const TIER_SHORT_LABELS: Record<Tier, string> = {
  untrained: "Unt.",
  beginner: "Beg.",
  novice: "Nov.",
  intermediate: "Int.",
  advanced: "Adv.",
  elite: "Elite",
};

// Colour tokens (oklch via hsl fallback, used inline for tier indicators)
export const TIER_COLORS: Record<Tier, string> = {
  untrained: "hsl(220 10% 50%)",
  beginner: "hsl(35 80% 55%)",
  novice: "hsl(28 92% 55%)",
  intermediate: "hsl(140 65% 48%)",
  advanced: "hsl(195 80% 50%)",
  elite: "hsl(280 75% 60%)",
};

// ---------- Lift definitions ----------

export type LiftId =
  | "bench"
  | "squat"
  | "deadlift"
  | "ohp"
  | "row"
  | "front_squat"
  | "hip_thrust"
  | "weighted_pullup";

export interface LiftDef {
  id: LiftId;
  name: string;
  primaryMuscle: string;
  // Lowercase substrings; match against `${exerciseName} ${exerciseId}`.toLowerCase()
  matchers: string[];
  // For weighted bodyweight movements, the user's bodyweight is added to the loaded weight
  addBodyweight?: boolean;
}

export const RATED_LIFTS: LiftDef[] = [
  {
    id: "bench",
    name: "Bench Press",
    primaryMuscle: "chest",
    matchers: ["bench press", "barbell bench", "flat bench"],
  },
  {
    id: "squat",
    name: "Back Squat",
    primaryMuscle: "quads",
    matchers: ["back squat", "barbell squat", "high bar squat", "low bar squat"],
  },
  {
    id: "deadlift",
    name: "Deadlift",
    primaryMuscle: "hamstrings",
    matchers: ["deadlift", "conventional deadlift", "sumo deadlift"],
  },
  {
    id: "ohp",
    name: "Overhead Press",
    primaryMuscle: "front_delts",
    matchers: ["overhead press", "military press", "ohp", "standing press", "shoulder press barbell", "barbell shoulder press"],
  },
  {
    id: "row",
    name: "Barbell Row",
    primaryMuscle: "mid_back",
    matchers: ["barbell row", "bent over row", "bent-over row", "pendlay row"],
  },
  {
    id: "front_squat",
    name: "Front Squat",
    primaryMuscle: "quads",
    matchers: ["front squat"],
  },
  {
    id: "hip_thrust",
    name: "Hip Thrust",
    primaryMuscle: "glutes",
    matchers: ["hip thrust", "barbell hip thrust"],
  },
  {
    id: "weighted_pullup",
    name: "Weighted Pull-Up",
    primaryMuscle: "lats",
    matchers: ["weighted pull-up", "weighted pullup", "weighted pull up", "pull-up", "pullup", "pull up"],
    addBodyweight: true,
  },
];

// ---------- Standards table ----------
// Source rows store ONLY [untrained, novice, intermediate, advanced, elite] in kg.
// At module load, we derive the Beginner column as untrained + 0.4 × (novice - untrained).
// This keeps existing thresholds stable for users already rated.

type SourceRow = { bw: number; tiers: [number, number, number, number, number] };

// Standards in kg (1RM). Bodyweight rows from 50kg → 140kg.
// Numbers blended from Strength Level / ExRx tables.
const RAW: Record<LiftId, { male: SourceRow[]; female: SourceRow[] }> = {
  bench: {
    male: [
      { bw: 50, tiers: [25, 45, 65, 95, 125] },
      { bw: 60, tiers: [30, 55, 80, 115, 150] },
      { bw: 70, tiers: [35, 65, 95, 130, 170] },
      { bw: 80, tiers: [40, 75, 105, 145, 185] },
      { bw: 90, tiers: [45, 82, 115, 158, 200] },
      { bw: 100, tiers: [50, 90, 125, 170, 215] },
      { bw: 110, tiers: [55, 95, 132, 180, 225] },
      { bw: 120, tiers: [58, 100, 138, 188, 235] },
      { bw: 140, tiers: [62, 108, 148, 200, 248] },
    ],
    female: [
      { bw: 50, tiers: [12, 22, 35, 55, 75] },
      { bw: 60, tiers: [15, 27, 42, 65, 88] },
      { bw: 70, tiers: [18, 32, 50, 75, 100] },
      { bw: 80, tiers: [20, 36, 55, 82, 110] },
      { bw: 90, tiers: [22, 40, 60, 88, 118] },
      { bw: 100, tiers: [25, 44, 65, 95, 125] },
      { bw: 110, tiers: [27, 47, 68, 100, 132] },
      { bw: 120, tiers: [28, 50, 72, 105, 138] },
      { bw: 140, tiers: [30, 54, 78, 112, 146] },
    ],
  },
  squat: {
    male: [
      { bw: 50, tiers: [35, 60, 90, 130, 175] },
      { bw: 60, tiers: [42, 75, 110, 158, 210] },
      { bw: 70, tiers: [50, 88, 128, 180, 235] },
      { bw: 80, tiers: [55, 100, 142, 200, 255] },
      { bw: 90, tiers: [60, 110, 155, 215, 275] },
      { bw: 100, tiers: [65, 120, 168, 230, 295] },
      { bw: 110, tiers: [70, 128, 178, 242, 308] },
      { bw: 120, tiers: [73, 134, 188, 252, 320] },
      { bw: 140, tiers: [78, 144, 200, 268, 338] },
    ],
    female: [
      { bw: 50, tiers: [18, 32, 52, 80, 110] },
      { bw: 60, tiers: [22, 40, 62, 95, 130] },
      { bw: 70, tiers: [26, 48, 72, 108, 145] },
      { bw: 80, tiers: [30, 54, 80, 118, 158] },
      { bw: 90, tiers: [33, 60, 88, 128, 170] },
      { bw: 100, tiers: [36, 65, 95, 135, 180] },
      { bw: 110, tiers: [38, 68, 100, 142, 188] },
      { bw: 120, tiers: [40, 72, 105, 148, 195] },
      { bw: 140, tiers: [43, 77, 112, 156, 205] },
    ],
  },
  deadlift: {
    male: [
      { bw: 50, tiers: [50, 80, 115, 160, 215] },
      { bw: 60, tiers: [60, 95, 138, 195, 258] },
      { bw: 70, tiers: [68, 110, 158, 220, 290] },
      { bw: 80, tiers: [75, 122, 175, 245, 318] },
      { bw: 90, tiers: [82, 135, 192, 265, 340] },
      { bw: 100, tiers: [90, 145, 208, 285, 365] },
      { bw: 110, tiers: [95, 155, 220, 300, 382] },
      { bw: 120, tiers: [100, 162, 230, 312, 398] },
      { bw: 140, tiers: [108, 175, 245, 332, 422] },
    ],
    female: [
      { bw: 50, tiers: [25, 42, 65, 100, 138] },
      { bw: 60, tiers: [30, 52, 78, 118, 162] },
      { bw: 70, tiers: [35, 60, 90, 135, 182] },
      { bw: 80, tiers: [40, 68, 100, 148, 198] },
      { bw: 90, tiers: [44, 74, 108, 158, 212] },
      { bw: 100, tiers: [48, 80, 116, 168, 225] },
      { bw: 110, tiers: [50, 84, 122, 176, 235] },
      { bw: 120, tiers: [52, 88, 128, 182, 244] },
      { bw: 140, tiers: [56, 94, 136, 194, 258] },
    ],
  },
  ohp: {
    male: [
      { bw: 50, tiers: [15, 28, 42, 62, 85] },
      { bw: 60, tiers: [18, 35, 52, 75, 100] },
      { bw: 70, tiers: [22, 42, 60, 85, 113] },
      { bw: 80, tiers: [25, 47, 67, 93, 122] },
      { bw: 90, tiers: [28, 52, 72, 100, 130] },
      { bw: 100, tiers: [30, 56, 78, 108, 140] },
      { bw: 110, tiers: [32, 60, 82, 113, 146] },
      { bw: 120, tiers: [34, 63, 86, 118, 152] },
      { bw: 140, tiers: [37, 68, 92, 126, 162] },
    ],
    female: [
      { bw: 50, tiers: [7, 14, 22, 35, 50] },
      { bw: 60, tiers: [9, 17, 27, 42, 58] },
      { bw: 70, tiers: [11, 20, 32, 48, 66] },
      { bw: 80, tiers: [12, 23, 36, 53, 72] },
      { bw: 90, tiers: [14, 25, 39, 57, 77] },
      { bw: 100, tiers: [15, 27, 42, 61, 82] },
      { bw: 110, tiers: [16, 29, 44, 64, 86] },
      { bw: 120, tiers: [17, 30, 46, 67, 90] },
      { bw: 140, tiers: [18, 32, 49, 71, 95] },
    ],
  },
  row: {
    male: [
      { bw: 50, tiers: [25, 45, 65, 92, 122] },
      { bw: 60, tiers: [30, 55, 78, 110, 145] },
      { bw: 70, tiers: [35, 62, 90, 125, 162] },
      { bw: 80, tiers: [40, 70, 100, 138, 178] },
      { bw: 90, tiers: [44, 76, 108, 148, 190] },
      { bw: 100, tiers: [48, 82, 115, 158, 202] },
      { bw: 110, tiers: [50, 86, 120, 165, 212] },
      { bw: 120, tiers: [52, 90, 125, 172, 220] },
      { bw: 140, tiers: [56, 96, 132, 182, 232] },
    ],
    female: [
      { bw: 50, tiers: [13, 23, 36, 55, 76] },
      { bw: 60, tiers: [16, 28, 42, 64, 88] },
      { bw: 70, tiers: [19, 32, 48, 72, 98] },
      { bw: 80, tiers: [21, 36, 53, 78, 106] },
      { bw: 90, tiers: [23, 39, 57, 84, 113] },
      { bw: 100, tiers: [25, 42, 61, 89, 120] },
      { bw: 110, tiers: [26, 44, 64, 93, 125] },
      { bw: 120, tiers: [28, 46, 67, 97, 130] },
      { bw: 140, tiers: [30, 49, 71, 103, 138] },
    ],
  },
  front_squat: {
    male: [
      { bw: 50, tiers: [25, 45, 70, 105, 142] },
      { bw: 60, tiers: [30, 55, 88, 128, 170] },
      { bw: 70, tiers: [35, 65, 102, 145, 192] },
      { bw: 80, tiers: [40, 75, 115, 162, 210] },
      { bw: 90, tiers: [44, 82, 124, 175, 225] },
      { bw: 100, tiers: [48, 90, 134, 188, 240] },
      { bw: 110, tiers: [50, 95, 142, 197, 252] },
      { bw: 120, tiers: [53, 100, 150, 205, 262] },
      { bw: 140, tiers: [57, 108, 160, 218, 278] },
    ],
    female: [
      { bw: 50, tiers: [13, 24, 40, 62, 88] },
      { bw: 60, tiers: [16, 30, 48, 75, 105] },
      { bw: 70, tiers: [19, 35, 56, 86, 118] },
      { bw: 80, tiers: [22, 40, 62, 94, 128] },
      { bw: 90, tiers: [24, 44, 68, 102, 138] },
      { bw: 100, tiers: [26, 48, 73, 108, 146] },
      { bw: 110, tiers: [28, 50, 77, 114, 153] },
      { bw: 120, tiers: [29, 53, 80, 118, 158] },
      { bw: 140, tiers: [31, 56, 86, 125, 167] },
    ],
  },
  hip_thrust: {
    male: [
      { bw: 50, tiers: [55, 90, 138, 195, 258] },
      { bw: 60, tiers: [65, 108, 165, 232, 308] },
      { bw: 70, tiers: [75, 125, 188, 262, 345] },
      { bw: 80, tiers: [85, 140, 208, 288, 378] },
      { bw: 90, tiers: [92, 152, 225, 310, 405] },
      { bw: 100, tiers: [100, 165, 242, 332, 432] },
      { bw: 110, tiers: [105, 175, 255, 348, 452] },
      { bw: 120, tiers: [110, 182, 265, 362, 470] },
      { bw: 140, tiers: [118, 195, 282, 384, 498] },
    ],
    female: [
      { bw: 50, tiers: [35, 62, 100, 152, 215] },
      { bw: 60, tiers: [42, 75, 120, 180, 252] },
      { bw: 70, tiers: [48, 86, 138, 202, 282] },
      { bw: 80, tiers: [54, 96, 152, 220, 305] },
      { bw: 90, tiers: [60, 105, 164, 235, 325] },
      { bw: 100, tiers: [64, 112, 175, 248, 342] },
      { bw: 110, tiers: [68, 118, 184, 258, 357] },
      { bw: 120, tiers: [72, 124, 192, 268, 370] },
      { bw: 140, tiers: [78, 132, 204, 282, 388] },
    ],
  },
  weighted_pullup: {
    // Standards represent total system load (bodyweight + added weight).
    male: [
      { bw: 50, tiers: [40, 55, 75, 105, 140] },
      { bw: 60, tiers: [50, 70, 95, 130, 170] },
      { bw: 70, tiers: [60, 85, 115, 155, 200] },
      { bw: 80, tiers: [70, 100, 132, 175, 225] },
      { bw: 90, tiers: [78, 112, 148, 195, 248] },
      { bw: 100, tiers: [85, 122, 160, 212, 268] },
      { bw: 110, tiers: [92, 130, 170, 225, 285] },
      { bw: 120, tiers: [98, 138, 180, 238, 300] },
      { bw: 140, tiers: [108, 152, 198, 260, 326] },
    ],
    female: [
      { bw: 50, tiers: [25, 36, 52, 75, 105] },
      { bw: 60, tiers: [32, 46, 65, 92, 126] },
      { bw: 70, tiers: [40, 56, 78, 108, 145] },
      { bw: 80, tiers: [46, 64, 88, 122, 162] },
      { bw: 90, tiers: [52, 72, 98, 134, 178] },
      { bw: 100, tiers: [56, 78, 106, 145, 192] },
      { bw: 110, tiers: [60, 84, 113, 155, 204] },
      { bw: 120, tiers: [64, 89, 120, 163, 215] },
      { bw: 140, tiers: [70, 98, 132, 178, 234] },
    ],
  },
};

// 6-tier table derived at load
type Sex = "male" | "female";
interface TableRow {
  bw: number;
  tiers: [number, number, number, number, number, number]; // untrained..elite
}
const STANDARDS_TABLE: Record<LiftId, Record<Sex, TableRow[]>> = (() => {
  const out: any = {};
  (Object.keys(RAW) as LiftId[]).forEach((liftId) => {
    out[liftId] = { male: [], female: [] };
    (["male", "female"] as Sex[]).forEach((sex) => {
      out[liftId][sex] = RAW[liftId][sex].map((r) => {
        const [u, n, i, a, e] = r.tiers;
        const beginner = Math.round(u + 0.4 * (n - u));
        return { bw: r.bw, tiers: [u, beginner, n, i, a, e] as [number, number, number, number, number, number] };
      });
    });
  });
  return out;
})();

// ---------- Helpers ----------

export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function inferLiftId(exerciseId: string, exerciseName: string): LiftId | null {
  const hay = `${exerciseName} ${exerciseId}`.toLowerCase();
  // Check most-specific matchers first (front_squat before squat, weighted_pullup before pullup)
  const order: LiftId[] = ["front_squat", "weighted_pullup", "hip_thrust", "deadlift", "ohp", "row", "bench", "squat"];
  for (const liftId of order) {
    const def = RATED_LIFTS.find((l) => l.id === liftId);
    if (!def) continue;
    if (def.matchers.some((m) => hay.includes(m))) return liftId;
  }
  return null;
}

// Standard age coefficient: 1.00 for 18–30, gentle decline thereafter.
// Loosely follows the Foster/Sinclair masters curves used by powerlifting feds.
export function ageCoefficient(age: number | null | undefined): number {
  if (!age || age < 18) return 1.0;
  if (age <= 30) return 1.0;
  if (age <= 40) return 1.0 - (age - 30) * 0.005;   // 1.00 → 0.95
  if (age <= 50) return 0.95 - (age - 40) * 0.008;  // 0.95 → 0.87
  if (age <= 60) return 0.87 - (age - 50) * 0.011;  // 0.87 → 0.76
  if (age <= 70) return 0.76 - (age - 60) * 0.014;  // 0.76 → 0.62
  return Math.max(0.5, 0.62 - (age - 70) * 0.015);
}

function interpolateRow(table: TableRow[], bw: number): [number, number, number, number, number, number] {
  if (table.length === 0) return [0, 0, 0, 0, 0, 0];
  if (bw <= table[0].bw) return [...table[0].tiers] as any;
  if (bw >= table[table.length - 1].bw) return [...table[table.length - 1].tiers] as any;
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (bw >= a.bw && bw <= b.bw) {
      const t = (bw - a.bw) / (b.bw - a.bw);
      const out: number[] = [];
      for (let k = 0; k < 6; k++) {
        out.push(a.tiers[k] + (b.tiers[k] - a.tiers[k]) * t);
      }
      return out as any;
    }
  }
  return [...table[table.length - 1].tiers] as any;
}

export interface StrengthRating {
  liftId: LiftId;
  liftName: string;
  oneRm: number;            // estimated 1RM (kg) — bodyweight already added for weighted pullup
  ratio: number;            // oneRm / bodyweight
  tier: Tier;
  tierIndex: number;        // 0..5
  thresholds: [number, number, number, number, number, number]; // tier minimums (age-adjusted)
  kgToNextTier: number | null; // null if at Elite
  nextTier: Tier | null;
}

export interface StrengthInputs {
  bodyweight: number; // kg
  sex: Sex;
  age?: number | null;
}

export function getStrengthRating(
  liftId: LiftId,
  rawOneRm: number,
  inputs: StrengthInputs,
): StrengthRating | null {
  const def = RATED_LIFTS.find((l) => l.id === liftId);
  if (!def) return null;
  const table = STANDARDS_TABLE[liftId][inputs.sex];
  if (!table) return null;

  const baseThresholds = interpolateRow(table, inputs.bodyweight);
  const ageMult = ageCoefficient(inputs.age);
  // Apply age coefficient by lowering the targets for older lifters
  // (a 50yr old hitting 90% of a 30yr old's standard is rated the same).
  const thresholds = baseThresholds.map((t) => Math.round(t * ageMult)) as [number, number, number, number, number, number];

  const effectiveOneRm = def.addBodyweight ? rawOneRm + inputs.bodyweight : rawOneRm;

  // Find tier: highest threshold the user has reached
  let tierIndex = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (effectiveOneRm >= thresholds[i]) tierIndex = i;
  }
  const tier = TIERS[tierIndex];
  const nextIdx = tierIndex < 5 ? tierIndex + 1 : null;
  const kgToNextTier =
    nextIdx !== null ? Math.max(0, Math.round(thresholds[nextIdx] - effectiveOneRm)) : null;
  const nextTier = nextIdx !== null ? TIERS[nextIdx] : null;

  return {
    liftId,
    liftName: def.name,
    oneRm: Math.round(effectiveOneRm),
    ratio: inputs.bodyweight > 0 ? +(effectiveOneRm / inputs.bodyweight).toFixed(2) : 0,
    tier,
    tierIndex,
    thresholds,
    kgToNextTier,
    nextTier,
  };
}

// ---------- Dumbbell bilateral detection ----------
// Bilateral DB exercises are logged as weight-per-dumbbell; total load = logged × 2.
// Unilateral exercises (curls, single-arm rows, kickbacks) are logged as the single
// working weight and must NOT be doubled.

const UNILATERAL_INDICATORS = [
  "one arm", "one-arm", "single arm", "single-arm", "1-arm",
  "alternating", "alternate",
  "concentration",
  "preacher",
  "cross body", "cross-body",
  "kickback",
  "curl",
];

const DB_INDICATORS = ["dumbbell", " db ", "db bench", "db press", "db fly", "db row", "db squat", "db shoulder", "db ohp"];

/**
 * Returns true when an exercise uses two dumbbells simultaneously (bilateral),
 * meaning the logged weight is per-dumbbell and must be doubled for total load.
 * Returns false for unilateral movements (curls, single-arm rows, etc.).
 */
export function isBilateralDumbbell(exerciseId: string, exerciseName: string): boolean {
  const hay = `${exerciseName} ${exerciseId}`.toLowerCase();
  if (!DB_INDICATORS.some((d) => hay.includes(d))) return false;
  if (UNILATERAL_INDICATORS.some((u) => hay.includes(u))) return false;
  return true;
}

// Convenience: median tier across an array of ratings → overall strength label
export function overallTier(ratings: StrengthRating[]): Tier | null {
  if (ratings.length === 0) return null;
  const indices = ratings.map((r) => r.tierIndex).sort((a, b) => a - b);
  const mid = Math.floor(indices.length / 2);
  const median = indices.length % 2 ? indices[mid] : Math.round((indices[mid - 1] + indices[mid]) / 2);
  return TIERS[median];
}
