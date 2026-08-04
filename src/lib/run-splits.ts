/**
 * Target paces for every logged run split.
 *
 * Run sessions store elapsed **seconds** in `workout_sets.weight` and the
 * fixed distance in **metres** in `workout_sets.reps`. This module turns those
 * raw rows into a target/actual comparison so a session can be marked as
 * "splits hit" or not.
 *
 * A target is either a fixed pace (seconds per km) or the athlete's goal race
 * pace with an optional offset (positive = slower than race pace).
 */

export type SplitTarget =
  | { kind: "pace"; secPerKm: number }
  | { kind: "goal"; offsetSec?: number };

/** Base exercise id (round suffixes `-r{n}` matched automatically) → target. */
const TARGETS: Record<string, SplitTarget> = {
  // Easy / aerobic
  "rn-easy-5k": { kind: "pace", secPerKm: 435 },
  "rn-easy-5k-b": { kind: "pace", secPerKm: 435 },
  "rn-easy-6k": { kind: "pace", secPerKm: 435 },
  "rn-easy-7k": { kind: "pace", secPerKm: 435 },
  "rn-stride-100": { kind: "pace", secPerKm: 200 },

  // Intervals
  "rn-int-200": { kind: "pace", secPerKm: 275 },
  "rn-int-400": { kind: "pace", secPerKm: 300 },
  "rn-int-800": { kind: "pace", secPerKm: 313 },
  "rn-int-1k": { kind: "pace", secPerKm: 315 },

  // Tempo / threshold
  "rn-tempo-3k": { kind: "pace", secPerKm: 345 },
  "rn-tempo-5k": { kind: "pace", secPerKm: 345 },
  "rn-thr-3k": { kind: "pace", secPerKm: 335 },
  "rn-prog-1": { kind: "pace", secPerKm: 405 },
  "rn-prog-2": { kind: "goal" },
  "rn-prog-3": { kind: "pace", secPerKm: 330 },

  // Long runs
  "rn-long-8k": { kind: "pace", secPerKm: 420 },
  "rn-long-10k": { kind: "pace", secPerKm: 420 },
  "rn-long-12k": { kind: "pace", secPerKm: 420 },
  "rn-long-13k": { kind: "pace", secPerKm: 420 },
  "rn-long-15k": { kind: "pace", secPerKm: 420 },
  "rn-long-18k": { kind: "pace", secPerKm: 420 },
  "rn-lrp-easy": { kind: "pace", secPerKm: 405 },
  "rn-lrp-rp1": { kind: "goal" },
  "rn-lrp-rp2": { kind: "goal" },

  // Race splits
  "rn-race-5k-1": { kind: "goal", offsetSec: 4 },
  "rn-race-5k-2": { kind: "goal" },
  "rn-race-5k-3": { kind: "goal" },
  "rn-race-5k-4": { kind: "goal" },
  "rn-race-1k1": { kind: "goal" },
  "rn-race-21k": { kind: "goal" },
};

const BASE_IDS = Object.keys(TARGETS).sort((a, b) => b.length - a.length);

/** Strip round suffixes (`-r3`) and resolve the base id we hold a target for. */
export function baseRunExerciseId(exerciseId: string): string | null {
  for (const base of BASE_IDS) {
    if (exerciseId === base || exerciseId.startsWith(`${base}-r`)) return base;
  }
  return null;
}

/** Target elapsed seconds for a split, or null when the split isn't paced. */
export function targetSecondsFor(
  exerciseId: string,
  metres: number,
  goalPaceSecPerKm: number,
): number | null {
  const base = baseRunExerciseId(exerciseId);
  if (!base || !metres || metres <= 0) return null;
  const t = TARGETS[base];
  const pace = t.kind === "pace" ? t.secPerKm : goalPaceSecPerKm + (t.offsetSec ?? 0);
  return Math.round((pace * metres) / 1000);
}

/** Format seconds as m:ss (or h:mm:ss over an hour). */
export function formatSplit(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

/** Signed difference string, e.g. "-12s" (faster) or "+8s". */
export function formatDelta(actual: number, target: number): string {
  const d = Math.round(actual - target);
  return `${d > 0 ? "+" : d < 0 ? "−" : "±"}${formatSplit(Math.abs(d))}`;
}
