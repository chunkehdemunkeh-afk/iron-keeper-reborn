/**
 * Auto-progression: double-progression model.
 *
 * Rule: when every working set hits the TOP of the prescribed rep range at
 * (or above) the current target weight, suggest a small weight bump and
 * reset the target reps to the bottom of the range.
 *
 * Storage: one row per (user_id, exercise_id) in `exercise_progression`.
 * exercise_id is the *effective* id (includes attachment suffix like
 * `pl3-rope`) so each cable attachment / dumbbell variant progresses
 * independently — matching how PR history is tracked.
 */
import { supabase } from "@/integrations/supabase/client";
import { WORKOUTS } from "@/lib/workout-data";
import { EXERCISE_LIBRARY } from "@/lib/exercise-library";
import { ACCESSORY_ROUTINES, ACCESSORY_SUBSTITUTIONS } from "@/lib/accessory-routines";
import { EXERCISE_SUBSTITUTIONS } from "@/lib/exercise-substitutions";
import { stripExerciseSuffixes } from "@/lib/muscle-mapping";

/** Build base-id → "6-8" lookup once. */
let _repsMap: Map<string, string> | null = null;
function repRangeForExercise(exerciseId: string): [number, number] | null {
  if (!_repsMap) {
    _repsMap = new Map();
    WORKOUTS.forEach(w => w.exercises.forEach(ex => _repsMap!.set(ex.id, ex.reps)));
    ACCESSORY_ROUTINES.forEach(r => r.exercises.forEach(ex => _repsMap!.set(ex.id, ex.reps)));
    Object.values(EXERCISE_SUBSTITUTIONS).flat().forEach(s => {
      if (!_repsMap!.has(s.id)) _repsMap!.set(s.id, "8-10");
    });
    Object.values(ACCESSORY_SUBSTITUTIONS).flat().forEach(s => {
      if (!_repsMap!.has(s.id)) _repsMap!.set(s.id, "8-10");
    });
    EXERCISE_LIBRARY.forEach(ex => {
      if (!_repsMap!.has(ex.id)) _repsMap!.set(ex.id, "8-12");
    });
  }
  const range =
    _repsMap.get(exerciseId) ??
    _repsMap.get(stripExerciseSuffixes(exerciseId)) ??
    null;
  if (!range) return null;
  return parseRepRange(range);
}

export type ProgressionSuggestion = {
  type: "increase" | "deload";
  suggestedWeight: number;
  suggestedRepsLow: number;
  suggestedRepsHigh: number;
  prevWeight: number;
  /** Weight on the trigger set (the set that earned the suggestion). */
  triggerWeight: number;
  /** Reps achieved on the trigger set. */
  triggerReps: number;
  /** How many reps above the prescribed cap (0 if just-at-cap). */
  repsOver: number;
  reason: string;
};

export type ProgressionRow = {
  exerciseId: string;
  exerciseName: string;
  targetWeight: number;
  targetRepsLow: number;
  targetRepsHigh: number;
  pendingSuggestion: ProgressionSuggestion | null;
  lastEvaluatedAt: string | null;
};

type DbRow = {
  exercise_id: string;
  exercise_name: string;
  target_weight: number;
  target_reps_low: number;
  target_reps_high: number;
  pending_suggestion: ProgressionSuggestion | null;
  last_evaluated_at: string | null;
};

const tbl = () =>
  (supabase as unknown as { from: (t: string) => any }).from("exercise_progression");

function rowToProgression(r: DbRow): ProgressionRow {
  return {
    exerciseId: r.exercise_id,
    exerciseName: r.exercise_name,
    targetWeight: Number(r.target_weight) || 0,
    targetRepsLow: r.target_reps_low,
    targetRepsHigh: r.target_reps_high,
    pendingSuggestion: r.pending_suggestion,
    lastEvaluatedAt: r.last_evaluated_at,
  };
}

/** Parse "8-10", "6 - 8", "12" → [low, high]. Returns null if no digits. */
export function parseRepRange(reps: string): [number, number] | null {
  const nums = (reps.match(/\d+/g) ?? []).map(n => parseInt(n, 10));
  if (nums.length === 0) return null;
  if (nums.length === 1) return [nums[0], nums[0]];
  return [nums[0], nums[1]];
}

/** Exercise class for picking a sensible weight step. */
function exerciseClass(exerciseName: string, exerciseId: string): "lower" | "upper" | "isolation" {
  const t = `${exerciseName} ${exerciseId}`.toLowerCase();
  if (/(squat|deadlift|leg press|hip thrust|romanian|rdl|good morning)/.test(t)) return "lower";
  if (/(bench|overhead press|ohp|military|barbell row|pendlay|t-bar|pulldown|chin[- ]?up|pull[- ]?up|dip)/.test(t)) return "upper";
  return "isolation";
}

/** Smallest sensible plate jump for this lift. */
function baseStep(cls: "lower" | "upper" | "isolation"): number {
  if (cls === "lower") return 5;
  if (cls === "upper") return 2.5;
  return 1.25;
}

/** Snap a weight to the nearest loadable plate for this lift class. */
function snapToPlate(weight: number, cls: "lower" | "upper" | "isolation"): number {
  const step = cls === "isolation" ? 1.25 : 2.5;
  return Math.round(weight / step) * step;
}

/**
 * Contextual weight increment. Scales by how far the user blew past the rep
 * cap on the trigger set, and caps as a % of current target so isolation
 * lifts don't make absurd jumps.
 *
 * Back-compat: also callable as `suggestIncrement(name, id)` (returns base step).
 */
export function suggestIncrement(
  ctxOrName:
    | string
    | { exerciseName: string; exerciseId: string; currentTarget: number; repsOver: number },
  exerciseId?: string,
): number {
  if (typeof ctxOrName === "string") {
    return baseStep(exerciseClass(ctxOrName, exerciseId ?? ""));
  }
  const { exerciseName, exerciseId: id, currentTarget, repsOver } = ctxOrName;
  const cls = exerciseClass(exerciseName, id);
  const step = baseStep(cls);
  const multiplier = repsOver <= 1 ? 1 : repsOver === 2 ? 2 : 3;
  const scaled = step * multiplier;
  const pctCap = cls === "lower" ? 0.05 : cls === "upper" ? 0.06 : 0.08;
  const cap = Math.max(step, snapToPlate(currentTarget * pctCap, cls));
  return Math.max(step, Math.min(scaled, cap));
}


export async function fetchAllProgressions(): Promise<ProgressionRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await tbl().select("*").eq("user_id", user.id);
  if (error) {
    console.error("fetchAllProgressions failed:", error);
    return [];
  }
  return ((data ?? []) as DbRow[]).map(rowToProgression);
}

export async function fetchPendingProgressions(): Promise<ProgressionRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await tbl()
    .select("*")
    .eq("user_id", user.id)
    .not("pending_suggestion", "is", null);
  if (error) {
    console.error("fetchPendingProgressions failed:", error);
    return [];
  }
  return ((data ?? []) as DbRow[]).map(rowToProgression);
}

/** Accept the pending suggestion → it becomes the new target. */
export async function acceptProgression(exerciseId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data, error: fetchErr } = await tbl()
    .select("pending_suggestion")
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId)
    .maybeSingle();
  if (fetchErr || !data?.pending_suggestion) return;
  const sug = data.pending_suggestion as ProgressionSuggestion;
  const { error } = await tbl()
    .update({
      target_weight: sug.suggestedWeight,
      target_reps_low: sug.suggestedRepsLow,
      target_reps_high: sug.suggestedRepsHigh,
      pending_suggestion: null,
    })
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId);
  if (error) {
    console.error("acceptProgression failed:", error);
    throw error;
  }
}

/** Dismiss the pending suggestion without changing the target. */
export async function dismissProgression(exerciseId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await tbl()
    .update({ pending_suggestion: null })
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId);
  if (error) {
    console.error("dismissProgression failed:", error);
    throw error;
  }
}

/** Wipe all progression data for the current user (used by settings). */
export async function resetAllProgressions(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await tbl().delete().eq("user_id", user.id);
}

type EvalSet = {
  exerciseId: string;
  exerciseName: string;
  reps: number;
  weight: number;
  setType?: string;
  /** the rep range the user was prescribed for this exercise this session */
  targetRepsLow?: number;
  targetRepsHigh?: number;
};

/**
 * Pure helper — exposed for unit testing. Given the prescribed range, prior
 * stored target, and the working sets the user just completed, decide what
 * the new effective target weight should be and whether to fire a suggestion.
 */
export function computeProgressionDecision(args: {
  exerciseName: string;
  exerciseId: string;
  workingSets: { weight: number; reps: number }[];
  repsLow: number;
  repsHigh: number;
  storedTarget: number; // 0 if no prior row
  hasPrev: boolean;
}): {
  currentTarget: number;
  suggestion: ProgressionSuggestion | null;
} {
  const { exerciseName, exerciseId, workingSets, repsLow, repsHigh, storedTarget, hasPrev } = args;
  if (workingSets.length === 0) return { currentTarget: storedTarget, suggestion: null };

  const heaviest = Math.max(...workingSets.map(s => s.weight));
  const allMetRepsLowAtHeaviest =
    workingSets.every(s => s.weight >= heaviest && s.reps >= repsLow);
  const promotedTarget =
    storedTarget > 0 && heaviest > storedTarget && allMetRepsLowAtHeaviest
      ? heaviest
      : storedTarget;
  const currentTarget = hasPrev ? promotedTarget : heaviest;

  const qualifying = workingSets
    .filter(s => currentTarget <= 0 || s.weight >= currentTarget)
    .map(s => ({ ...s, overflow: s.reps - repsHigh }));

  const hitTopOnAll =
    qualifying.length === workingSets.length &&
    qualifying.length > 0 &&
    qualifying.every(s => s.overflow >= 0);
  const anyOver = qualifying.some(s => s.overflow >= 1);
  const shouldFire = currentTarget > 0 && (hitTopOnAll || anyOver);

  if (!shouldFire) return { currentTarget, suggestion: null };

  const trigger = qualifying
    .slice()
    .sort((a, b) => b.overflow - a.overflow || b.weight - a.weight)[0];
  const repsOver = Math.max(0, trigger.overflow);
  const cls = exerciseClass(exerciseName, exerciseId);
  const inc = suggestIncrement({ exerciseName, exerciseId, currentTarget, repsOver });
  const suggestedWeight = snapToPlate(currentTarget + inc, cls);
  const reason =
    repsOver >= 1
      ? `You hit ${trigger.reps} reps at ${trigger.weight}kg (${repsOver} over the ${repsHigh} cap) — time to add weight.`
      : `Hit top of range on every set — bump to ${suggestedWeight}kg.`;
  return {
    currentTarget,
    suggestion: {
      type: "increase",
      suggestedWeight,
      suggestedRepsLow: repsLow,
      suggestedRepsHigh: repsHigh,
      prevWeight: currentTarget,
      triggerWeight: trigger.weight,
      triggerReps: trigger.reps,
      repsOver,
      reason,
    },
  };
}

/**
 * Evaluate a just-completed session and write progression rows / suggestions.
 *
 * For each exercise in the payload:
 *   • Filter to working sets only (excludes warmup, 1rm_test).
 *   • Skip if every set is bodyweight (weight === 0).
 *   • Determine current target (existing row, else seed from this session).
 *   • If every working set met BOTH the rep_high AND the current target weight
 *     → write a `pending_suggestion` to bump weight + reset reps to low.
 *   • Otherwise just refresh target_weight to the heaviest working set used.
 */
export async function evaluateAndStoreProgression(sets: EvalSet[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Group by exercise_id
  const byEx = new Map<string, EvalSet[]>();
  for (const s of sets) {
    if ((s.setType ?? "working") !== "working") continue;
    if (!s.exerciseId) continue;
    if (!byEx.has(s.exerciseId)) byEx.set(s.exerciseId, []);
    byEx.get(s.exerciseId)!.push(s);
  }
  if (byEx.size === 0) return;

  const exIds = Array.from(byEx.keys());
  const { data: existingRows } = await tbl()
    .select("*")
    .eq("user_id", user.id)
    .in("exercise_id", exIds);
  const existing = new Map<string, DbRow>();
  ((existingRows ?? []) as DbRow[]).forEach(r => existing.set(r.exercise_id, r));

  const upserts: Array<Record<string, unknown>> = [];
  const now = new Date().toISOString();

  for (const [exId, exSets] of byEx) {
    // Need at least one set with weight > 0; otherwise it's bodyweight/skip.
    if (!exSets.some(s => s.weight > 0)) continue;

    const exName = exSets[0].exerciseName || exId;

    // Resolve the prescribed rep range: caller-provided first, else static defs.
    const sessionHighRaw = Math.max(0, ...exSets.map(s => s.targetRepsHigh ?? 0));
    const sessionLowRaw = Math.max(0, ...exSets.map(s => s.targetRepsLow ?? 0));
    const staticRange = repRangeForExercise(exId);
    const prev = existing.get(exId);

    const repsHigh =
      sessionHighRaw ||
      staticRange?.[1] ||
      prev?.target_reps_high ||
      10;
    const repsLow =
      sessionLowRaw ||
      staticRange?.[0] ||
      prev?.target_reps_low ||
      Math.max(1, repsHigh - 2);

    const heaviest = Math.max(...exSets.map(s => s.weight));
    const storedTarget = prev ? Number(prev.target_weight) || 0 : 0;

    const { currentTarget, suggestion: pendingSuggestion } = computeProgressionDecision({
      exerciseName: exName,
      exerciseId: exId,
      workingSets: exSets.map(s => ({ weight: s.weight, reps: s.reps })),
      repsLow,
      repsHigh,
      storedTarget,
      hasPrev: !!prev,
    });

    // Staleness guard: clear an old pending suggestion the user already
    // surpassed (heaviest this session ≥ both old target and old suggestion).
    let carriedPrev: ProgressionSuggestion | null = prev?.pending_suggestion ?? null;
    if (carriedPrev && !pendingSuggestion) {
      const surpassed =
        heaviest >= (Number(prev?.target_weight) || 0) &&
        heaviest >= (carriedPrev.suggestedWeight ?? 0);
      if (surpassed) carriedPrev = null;
    }

    upserts.push({
      user_id: user.id,
      exercise_id: exId,
      exercise_name: exName,
      target_weight: currentTarget || heaviest,
      target_reps_low: repsLow,
      target_reps_high: repsHigh,
      pending_suggestion: pendingSuggestion ?? carriedPrev,
      last_evaluated_at: now,
    });
  }


  if (upserts.length === 0) return;
  const { error } = await tbl().upsert(upserts, { onConflict: "user_id,exercise_id" });
  if (error) console.error("evaluateAndStoreProgression upsert failed:", error);
}
