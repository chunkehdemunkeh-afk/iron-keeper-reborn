/**
 * Exercises where a LOWER logged weight is the better performance.
 *
 * Assisted machines (assisted pull-up / assisted dip) log the *assistance*
 * load, so progress means reducing the number. PR tracking and the
 * double-progression engine must invert their comparisons for these.
 */
import { stripExerciseSuffixes } from "./muscle-mapping";

const REVERSE_IDS = new Set(["lib-69"]);
const REVERSE_NAME_RE = /assist(ed|ance)/i;

export function isReverseLoadExercise(exerciseId?: string | null, exerciseName?: string | null): boolean {
  if (exerciseId) {
    const base = stripExerciseSuffixes(exerciseId);
    if (REVERSE_IDS.has(exerciseId) || REVERSE_IDS.has(base)) return true;
  }
  if (exerciseName && REVERSE_NAME_RE.test(exerciseName)) return true;
  return false;
}
