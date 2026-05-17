import type { MuscleRegion } from "@/lib/muscle-mapping";
import { MUSCLE_LABELS } from "@/lib/muscle-mapping";

export type VolumeStatus =
  | "untrained"
  | "under_mev"
  | "minimum"
  | "optimal"
  | "approaching_mrv"
  | "over_mrv";

export interface VolumeStandard {
  mev: number;
  mavLow: number;
  mavHigh: number;
  mrv: number;
}

// MEV/MAV/MRV per muscle — from Renaissance Periodization (Israetel et al.)
// front_delts: MEV=0 because pressing movements provide substantial indirect volume.
// lower_back: low MRV due to injury risk; most volume comes from compounds.
export const VOLUME_STANDARDS: Record<MuscleRegion, VolumeStandard> = {
  chest:          { mev: 8,  mavLow: 12, mavHigh: 20, mrv: 22 },
  front_delts:    { mev: 0,  mavLow: 6,  mavHigh: 12, mrv: 16 },
  side_delts:     { mev: 8,  mavLow: 16, mavHigh: 22, mrv: 26 },
  rear_delts:     { mev: 6,  mavLow: 12, mavHigh: 18, mrv: 24 },
  biceps:         { mev: 8,  mavLow: 14, mavHigh: 20, mrv: 26 },
  triceps:        { mev: 6,  mavLow: 10, mavHigh: 14, mrv: 20 },
  forearms:       { mev: 4,  mavLow: 10, mavHigh: 14, mrv: 20 },
  abs:            { mev: 16, mavLow: 20, mavHigh: 26, mrv: 30 },
  obliques:       { mev: 8,  mavLow: 12, mavHigh: 16, mrv: 20 },
  quads:          { mev: 8,  mavLow: 12, mavHigh: 18, mrv: 20 },
  hamstrings:     { mev: 6,  mavLow: 10, mavHigh: 16, mrv: 20 },
  glutes:         { mev: 4,  mavLow: 12, mavHigh: 16, mrv: 20 },
  abductors:      { mev: 4,  mavLow: 8,  mavHigh: 12, mrv: 16 },
  adductors:      { mev: 4,  mavLow: 8,  mavHigh: 12, mrv: 16 },
  calves:         { mev: 8,  mavLow: 12, mavHigh: 20, mrv: 26 },
  lats:           { mev: 10, mavLow: 14, mavHigh: 22, mrv: 25 },
  traps:          { mev: 4,  mavLow: 10, mavHigh: 16, mrv: 20 },
  mid_back:       { mev: 6,  mavLow: 10, mavHigh: 16, mrv: 20 },
  lower_back:     { mev: 4,  mavLow: 6,  mavHigh: 10, mrv: 14 },
};

export function getVolumeStatus(muscle: MuscleRegion, sets: number): VolumeStatus {
  if (sets === 0) return "untrained";
  const { mev, mavLow, mavHigh, mrv } = VOLUME_STANDARDS[muscle];
  if (sets > mrv) return "over_mrv";
  if (sets > mavHigh) return "approaching_mrv";
  if (sets >= mavLow) return "optimal";
  if (mev === 0 || sets >= mev) return "minimum";
  return "under_mev";
}

export const VOLUME_STATUS_COLOR: Record<VolumeStatus, string> = {
  untrained:       "hsl(220 10% 45%)",
  under_mev:       "hsl(213 80% 58%)",
  minimum:         "hsl(38 90% 52%)",
  optimal:         "hsl(142 65% 48%)",
  approaching_mrv: "hsl(28 92% 55%)",
  over_mrv:        "hsl(0 72% 58%)",
};

export const VOLUME_STATUS_LABEL: Record<VolumeStatus, string> = {
  untrained:       "Untrained",
  under_mev:       "Below MEV",
  minimum:         "At MEV",
  optimal:         "Optimal",
  approaching_mrv: "Near MRV",
  over_mrv:        "Over MRV",
};

export const STATUS_SORT_ORDER: Record<VolumeStatus, number> = {
  over_mrv:        0,
  under_mev:       1,
  approaching_mrv: 2,
  minimum:         3,
  optimal:         4,
  untrained:       5,
};

/** Returns true when a set was performed at high enough intensity to count as strength-focused. */
export function isStrengthSet(
  rir: number | null,
  weight: number,
  pr: number | null,
): boolean {
  if (rir === null || pr === null || pr === 0) return false;
  return rir <= 1 && weight >= pr * 0.8;
}

/** Actionable one-liner for a muscle's status. */
export function getVolumeFeedback(
  muscle: MuscleRegion,
  status: VolumeStatus,
  sets: number,
  goal: "hypertrophy" | "strength",
): string {
  const label = MUSCLE_LABELS[muscle];
  const { mev, mavLow, mavHigh } = VOLUME_STANDARDS[muscle];

  if (goal === "strength") {
    switch (status) {
      case "untrained":
        return `${label}: no sets logged — add ${mev || 4}–${mavLow} quality sets at ≥80% 1RM.`;
      case "under_mev":
        return `${label}: add ${mev - sets} more heavy sets to reach minimum stimulus.`;
      case "minimum":
        return `${label}: at floor — ${mavLow - sets} more sets needed for optimal strength stimulus.`;
      case "optimal":
        return `${label}: volume is solid. Prioritise load progression over more sets.`;
      case "approaching_mrv":
        return `${label}: high volume — consider dropping a set and adding load instead.`;
      case "over_mrv":
        return `${label}: over MRV — cut ${sets - mavHigh} sets to avoid recovery debt.`;
    }
  }

  // Hypertrophy feedback
  switch (status) {
    case "untrained":
      return `${label}: start with ${mev || mavLow} sets per week to stimulate growth.`;
    case "under_mev":
      return `${label}: add ${mev - sets} set${mev - sets !== 1 ? "s" : ""} to cross the growth threshold.`;
    case "minimum":
      return `${label}: try adding ${mavLow - sets} more set${mavLow - sets !== 1 ? "s" : ""} to reach optimal range.`;
    case "optimal":
      return `${label}: in the sweet spot (${mavLow}–${mavHigh} sets) — keep it consistent.`;
    case "approaching_mrv":
      return `${label}: above optimal range — monitor recovery and hold volume here.`;
    case "over_mrv":
      return `${label}: over MRV — reduce by ${sets - mavHigh} set${sets - mavHigh !== 1 ? "s" : ""} to protect recovery.`;
  }
}
