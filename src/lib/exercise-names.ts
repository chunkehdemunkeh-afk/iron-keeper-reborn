/**
 * Single source of truth for resolving an exercise ID (possibly with variant
 * suffixes like `-rope`, `-sa`, `-r3`) to a human-readable name.
 *
 * Historically each query module built its own name map, and each one trusted
 * the stored `exercise_name` column whenever it differed from `exercise_id`.
 * That let raw IDs (e.g. `sub-up5a`, saved against `sub-up5a-sa`) leak into the
 * UI. Names always contain a space; IDs never do — that's the guard used here.
 */
import { WORKOUTS } from "./workout-data";
import { HOME_WORKOUTS } from "./home-workouts";
import { HYROX_WORKOUTS } from "./hyrox-workouts";
import { RUN_WORKOUTS } from "./run-workouts";

import { ACCESSORY_ROUTINES, ACCESSORY_SUBSTITUTIONS } from "./accessory-routines";
import { EXERCISE_SUBSTITUTIONS } from "./exercise-substitutions";
import { EXERCISE_LIBRARY } from "./exercise-library";
import { stripExerciseSuffixes } from "./muscle-mapping";

let _map: Record<string, string> | null = null;

/** id → display name across every static exercise source. */
export function exerciseNameMap(): Record<string, string> {
  if (_map) return _map;
  const m: Record<string, string> = {};
  const addDays = (days: { exercises: { id: string; name?: string }[] }[]) =>
    days.forEach((d) => d.exercises.forEach((ex) => { if (ex.name) m[ex.id] = ex.name; }));

  // Library first so hand-authored workout/substitution names win over it.
  EXERCISE_LIBRARY.forEach((ex) => { if (ex.name) m[ex.id] = ex.name; });
  addDays(HOME_WORKOUTS as never);
  addDays(HYROX_WORKOUTS as never);
  addDays(RUN_WORKOUTS as never);

  addDays(ACCESSORY_ROUTINES as never);
  Object.values(ACCESSORY_SUBSTITUTIONS).flat().forEach((s) => { if (s?.name) m[s.id] = s.name; });
  Object.values(EXERCISE_SUBSTITUTIONS).flat().forEach((s) => { if (s?.name) m[s.id] = s.name; });
  addDays(WORKOUTS as never);
  _map = m;
  return m;
}

/** A stored value is a real name only if it isn't an ID-shaped token. */
export function looksLikeExerciseName(value?: string | null): boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  if (v.includes(" ")) return true;
  // Single word without spaces: reject anything that looks like an ID slug.
  return !/^[a-z0-9]+(-[a-z0-9]+)+$/.test(v);
}

/**
 * Resolve a display name for an exercise.
 * Static definitions take priority; a stored name is used only when it is a
 * real name (not a raw ID); finally the ID is prettified as a last resort.
 */
export function resolveExerciseName(exerciseId: string, storedName?: string | null): string {
  const m = exerciseNameMap();
  const candidates: string[] = [];
  const push = (v: string) => { if (v && !candidates.includes(v)) candidates.push(v); };

  push(exerciseId);
  push(stripExerciseSuffixes(exerciseId));
  // Custom/duplicated exercises get ids like `acc-wrist1-added-1783069500255`.
  const withoutAdded = exerciseId.replace(/-added-\d+$/i, "").replace(/-copy(-\d+)?$/i, "");
  push(withoutAdded);
  push(stripExerciseSuffixes(withoutAdded));
  // Trailing numeric token (timestamps / dedupe counters).
  const withoutTrailingNum = withoutAdded.replace(/-\d{6,}$/, "");
  push(withoutTrailingNum);
  push(stripExerciseSuffixes(withoutTrailingNum));

  for (const c of candidates) {
    if (m[c]) return m[c];
  }
  if (looksLikeExerciseName(storedName)) return storedName!.trim();
  return prettifyId(candidates[candidates.length - 1] || exerciseId);
}

/** Last-resort readable label so raw slugs never surface verbatim. */
function prettifyId(id: string): string {
  return id
    .replace(/^(lib-db-|lib-|acc-|sub-|hx-)/i, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

