/**
 * Calorie burn estimation — mirrors the SQL functions in
 * `estimate_cardio_burn` and `estimate_strength_burn`.
 *
 * Used at log time on the client so the user sees an immediate estimate
 * without round-tripping to the DB. The same formulas run server-side
 * for backfills and aggregation.
 *
 * Sources: 2011 Compendium of Physical Activities (Ainsworth et al.) MET
 * values, plus a mechanical-work term for resistance training derived from
 * Scott (1989) gross-efficiency studies (~25% efficiency → 0.0035 kcal/kg/rep).
 */

export type CardioActivity =
  | "rest"
  | "walking"
  | "walk"
  | "running"
  | "cycling"
  | "swimming"
  | "yoga"
  | "football"
  | "other";

export interface CardioInput {
  activityType: string;
  durationMin: number;
  distanceKm?: number | null;
  inclinePct?: number | null;
  weightKg: number;
}

/** Round to nearest 5 kcal — keeps numbers digestible. */
const round5 = (n: number) => Math.max(0, Math.round(n / 5) * 5);

/**
 * Estimate kcal burned for a cardio activity.
 * Returns null when inputs are insufficient (no duration / weight).
 */
export function estimateCardioBurn(input: CardioInput): number | null {
  const { activityType, durationMin, distanceKm, inclinePct, weightKg } = input;
  if (!durationMin || durationMin <= 0 || !weightKg || weightKg <= 0) return null;

  const hours = durationMin / 60;
  const type = (activityType || "").toLowerCase();
  const paceKmh = distanceKm && distanceKm > 0 ? distanceKm / hours : null;

  let met: number;

  if (type === "rest") return 0;

  if (type === "running") {
    if (paceKmh === null) met = 9.8;
    else if (paceKmh < 8) met = 8.3;
    else if (paceKmh < 9.7) met = 9.8;
    else if (paceKmh < 11.3) met = 11.0;
    else if (paceKmh < 12.9) met = 11.8;
    else met = 12.8;
  } else if (type === "walking" || type === "walk") {
    if (paceKmh === null) met = 3.5;
    else if (paceKmh < 4) met = 2.8;
    else if (paceKmh < 5.6) met = 3.5;
    else if (paceKmh < 6.5) met = 5.0;
    else met = 6.3;
    if (inclinePct && inclinePct > 0 && paceKmh !== null) {
      met += 0.05 * inclinePct * paceKmh * 0.1;
    }
  } else if (type === "cycling") {
    if (paceKmh === null) met = 6.8;
    else if (paceKmh < 16) met = 4.0;
    else if (paceKmh < 19.1) met = 6.8;
    else if (paceKmh < 22.5) met = 8.0;
    else if (paceKmh < 25.7) met = 10.0;
    else met = 12.0;
  } else if (type === "swimming") {
    met = 7.0;
  } else if (type === "yoga") {
    met = 3.0;
  } else if (type === "football") {
    met = 7.0;
  } else {
    met = 4.0;
  }

  return round5(met * weightKg * hours);
}

export type StrengthSet = {
  weight: number;
  reps: number;
  setType?: "working" | "warmup" | "1rm_test";
};

export interface StrengthInput {
  sets: StrengthSet[];
  durationMin: number;
  weightKg: number;
}

/**
 * Estimate kcal burned during a strength session.
 *
 * Two terms:
 * 1. Mechanical work: weight × reps × 0.0035 across all non-warmup sets.
 *    Bodyweight-style sets (weight = 0) get a smaller per-rep cost.
 * 2. Baseline metabolic cost: MET 5.5 × bodyweight × hours — covers warm-up
 *    sets, transitions, and rest periods at a moderate intensity.
 */
export function estimateStrengthBurn(input: StrengthInput): number | null {
  const { sets, durationMin, weightKg } = input;
  if (!durationMin || durationMin <= 0 || !weightKg || weightKg <= 0) return null;

  const hours = durationMin / 60;

  const workKcal = sets.reduce((sum, s) => {
    if (s.setType === "warmup") return sum;
    if (s.weight > 0) return sum + s.weight * s.reps * 0.0035;
    // Bodyweight movement — cost scales with the lifter's mass.
    return sum + weightKg * s.reps * 0.0025;
  }, 0);

  const metabolicKcal = 5.5 * weightKg * hours;

  return round5(workKcal + metabolicKcal);
}
