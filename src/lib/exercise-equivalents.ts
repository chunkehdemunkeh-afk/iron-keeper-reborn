/**
 * Equivalent-exercise resolution.
 *
 * The same movement can end up stored under several exercise IDs over time:
 *  - a workout slot ID and the substitution IDs that can fill that slot
 *    (e.g. `pu1` ↔ `sub-pu1b` ↔ the library ID now used in the slot)
 *  - renamed / remapped exercises that share an identical display name
 *
 * This module builds the union of those aliases so history lookups can fall
 * back to "the same exercise, logged under a different ID" instead of showing
 * zeroes.
 */
import { EXERCISE_SUBSTITUTIONS } from "./exercise-substitutions";
import { ACCESSORY_SUBSTITUTIONS } from "./accessory-routines";
import { stripExerciseSuffixes } from "./muscle-mapping";
import { exerciseNameMap, resolveExerciseName } from "./exercise-names";

const normName = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

let _groups: Map<string, Set<string>> | null = null;

/** id → set of equivalent ids (including itself). */
function groups(): Map<string, Set<string>> {
  if (_groups) return _groups;

  // Union-find style merge over base IDs.
  const parent = new Map<string, string>();
  const find = (a: string): string => {
    let r = parent.get(a) ?? a;
    if (r !== a) { r = find(r); parent.set(a, r); }
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  const touch = (a: string) => { if (!parent.has(a)) parent.set(a, a); };

  // 1. Substitution slots: slot ID ↔ each of its substitutes.
  const subSources: Record<string, { id: string }[]>[] = [
    EXERCISE_SUBSTITUTIONS as unknown as Record<string, { id: string }[]>,
    ACCESSORY_SUBSTITUTIONS as unknown as Record<string, { id: string }[]>,
  ];
  for (const src of subSources) {
    for (const [slotId, subs] of Object.entries(src)) {
      touch(slotId);
      (subs || []).forEach((s) => { if (s?.id) { touch(s.id); union(slotId, s.id); } });
    }
  }

  // 2. Identical display names across every static source (covers renames and
  //    library IDs that replaced a hand-written slot ID).
  const byName = new Map<string, string[]>();
  for (const [id, name] of Object.entries(exerciseNameMap())) {
    if (!name) continue;
    const key = normName(name);
    if (!key) continue;
    const arr = byName.get(key);
    if (arr) arr.push(id); else byName.set(key, [id]);
  }
  for (const ids of byName.values()) {
    if (ids.length < 2) continue;
    ids.forEach(touch);
    for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
  }

  const out = new Map<string, Set<string>>();
  for (const id of parent.keys()) {
    const root = find(id);
    let set = out.get(root);
    if (!set) { set = new Set(); out.set(root, set); }
    set.add(id);
  }
  const result = new Map<string, Set<string>>();
  for (const set of out.values()) {
    for (const id of set) result.set(id, set);
  }
  _groups = result;
  return result;
}

/**
 * All base exercise IDs that represent the same movement as `exerciseId`.
 * The passed ID's base form is always first; suffixed variants are handled by
 * callers via `LIKE '<id>-%'` matching.
 */
export function equivalentExerciseIds(exerciseId: string, limit = 24): string[] {
  const base = stripExerciseSuffixes(exerciseId) || exerciseId;
  const ordered: string[] = [];
  const push = (id: string) => { if (id && !ordered.includes(id)) ordered.push(id); };
  push(base);
  push(exerciseId);

  groups().get(base)?.forEach(push);

  // Also match anything sharing the resolved display name but missing from the
  // static maps' grouping (defensive: resolveExerciseName has extra fallbacks).
  const name = normName(resolveExerciseName(base));
  if (name) {
    for (const [id, n] of Object.entries(exerciseNameMap())) {
      if (normName(n) === name) push(id);
      if (ordered.length >= limit) break;
    }
  }

  return ordered.slice(0, limit);
}
