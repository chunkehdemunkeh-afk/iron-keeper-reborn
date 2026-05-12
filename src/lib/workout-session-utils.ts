/** Round to nearest 2.5 kg (typical smallest plate increment). */
export function roundToPlate(weight: number): number {
  return Math.round(weight / 2.5) * 2.5;
}

/** Warm-up ramp anchored to the working weight `W`. Returns absolute kg + reps,
 *  snapped to the nearest 2.5 kg plate. Reps descend as weight rises so the lifter
 *  primes the nervous system without burning out before the working sets.
 *
 *    1 warm-up  → ~50% × 5
 *    2 warm-ups → ~40% × 8, halfway × 5
 *    3 warm-ups → ~40% × 8, halfway × 5, ~10kg-below × 3
 *
 *  Floor: 20 kg for barbell-style lifts, 2.5 kg for dumbbells (per-dumbbell weight). */
export function warmupRamp(W: number, idx: number, total: number, isDumbbell: boolean): { weight: number; reps: number } {
  const floor = isDumbbell ? 2.5 : 20;
  if (!W || W <= floor) return { weight: 0, reps: total <= 1 ? 5 : (idx === 0 ? 8 : idx === 1 ? 5 : 3) };
  const wu1 = Math.max(floor, roundToPlate(W * 0.4));
  const wu2 = roundToPlate((W + wu1) / 2);
  const wu3 = roundToPlate(Math.max(W - 10, W * 0.9));
  if (total <= 1) return { weight: roundToPlate(W * 0.5), reps: 5 };
  if (total === 2) return idx === 0 ? { weight: wu1, reps: 8 } : { weight: wu2, reps: 5 };
  if (idx === 0) return { weight: wu1, reps: 8 };
  if (idx === 1) return { weight: wu2, reps: 5 };
  return { weight: wu3, reps: 3 };
}

export function formatWorkoutTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function attachmentKey(att: string): string {
  return att.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/** Returns true for any cable-stack or lat machine exercise that benefits from attachment tracking */
export function isCableAttachmentExercise(name: string): boolean {
  const dn = name.toLowerCase();
  // "Seated Row Machine" is a plate-loaded/selectorized machine with a fixed
  // handle (Low Row vs Machine Row variant pill), not a cable attachment exercise.
  if (dn.includes("seated row machine")) return false;
  return [
    "cable", "pushdown", "push down", "face pull", "facepull", "pallof",
    "crossover", "straight-arm", "lat pull", "pulldown", "pull down",
    "seated row", "lat row", "cable row",
  ].some((kw) => dn.includes(kw));
}
