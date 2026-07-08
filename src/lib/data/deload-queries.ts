/**
 * Supabase queries + evaluator for smart deload recommendations.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  buildDeloadPlan,
  computeDeloadSignals,
  deloadWeekBounds,
  shouldRecommendDeload,
  type DeloadDailyScore,
  type DeloadPlanEntry,
  type DeloadProgressionRow,
  type DeloadSetRecord,
  type DeloadSignals,
} from "@/lib/deload";

export type DeloadStatus = "pending" | "accepted" | "dismissed" | "completed" | "expired";

export type DeloadRecommendation = {
  id: string;
  status: DeloadStatus;
  signals: DeloadSignals;
  plan: DeloadPlanEntry[] | null;
  weekStart: string | null;
  weekEnd: string | null;
  acceptedAt: string | null;
  createdAt: string;
};

const tbl = () =>
  (supabase as unknown as { from: (t: string) => any }).from("deload_recommendations");

function rowToRec(r: any): DeloadRecommendation {
  return {
    id: r.id,
    status: r.status,
    signals: r.signals,
    plan: r.plan ?? null,
    weekStart: r.week_start ?? null,
    weekEnd: r.week_end ?? null,
    acceptedAt: r.accepted_at ?? null,
    createdAt: r.created_at,
  };
}

const SETTINGS_KEY = (uid: string) => `ik-deload-enabled-${uid}`;

export function isDeloadEnabled(userId: string | undefined | null): boolean {
  if (!userId) return false;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY(userId));
    return raw == null ? true : raw === "1";
  } catch {
    return true;
  }
}

export function setDeloadEnabled(userId: string, enabled: boolean) {
  try {
    localStorage.setItem(SETTINGS_KEY(userId), enabled ? "1" : "0");
  } catch {
    /* noop */
  }
}

/** Latest pending or in-flight (accepted) recommendation for the current user. */
export async function fetchActiveDeload(): Promise<DeloadRecommendation | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await tbl()
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("fetchActiveDeload failed:", error);
    return null;
  }
  return data && data.length > 0 ? rowToRec(data[0]) : null;
}

/** Most-recent ACCEPTED deload, used for the 3-week time guard. */
async function lastAcceptedAt(userId: string): Promise<string | null> {
  const { data } = await tbl()
    .select("accepted_at")
    .eq("user_id", userId)
    .in("status", ["accepted", "completed"])
    .order("accepted_at", { ascending: false })
    .limit(1);
  return data && data.length > 0 ? (data[0].accepted_at ?? null) : null;
}

export async function dismissDeload(id: string) {
  const { error } = await tbl().update({ status: "dismissed" }).eq("id", id);
  if (error) {
    console.error("dismissDeload failed:", error);
    throw error;
  }
}

export async function expireOldPending(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const cutoff = new Date(Date.now() - 14 * 86400_000).toISOString();
  await tbl()
    .update({ status: "expired" })
    .eq("user_id", user.id)
    .eq("status", "pending")
    .lt("created_at", cutoff);
}

/**
 * Accept the pending recommendation. Builds the plan NOW (not at creation) and
 * writes week_start / week_end / accepted_at.
 */
export async function acceptDeload(id: string): Promise<DeloadRecommendation | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Load current progressions to build the plan against.
  const { fetchAllProgressions } = await import("./progression-queries");
  const rows = await fetchAllProgressions();
  const progressions: DeloadProgressionRow[] = rows.map(r => ({
    exerciseId: r.exerciseId,
    exerciseName: r.exerciseName,
    targetWeight: r.targetWeight,
    targetRepsLow: r.targetRepsLow,
    targetRepsHigh: r.targetRepsHigh,
    lastEvaluatedAt: r.lastEvaluatedAt,
  }));

  // Approximate current per-lift working set counts from the most recent
  // session per exercise. Reuse the existing recent-sets query.
  const setsByEx = new Map<string, number>();
  const { data: recent } = await (supabase as any)
    .from("workout_sets")
    .select("exercise_id, set_type, workout_history_id, workout_history!inner(date)")
    .eq("workout_history.user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1000);
  const seenSession = new Map<string, string>(); // exId → most recent workout_history_id
  for (const r of (recent ?? []) as any[]) {
    if ((r.set_type ?? "working") !== "working") continue;
    const prevSession = seenSession.get(r.exercise_id);
    if (prevSession && prevSession !== r.workout_history_id) continue;
    seenSession.set(r.exercise_id, r.workout_history_id);
    setsByEx.set(r.exercise_id, (setsByEx.get(r.exercise_id) ?? 0) + 1);
  }

  const plan = buildDeloadPlan(progressions, setsByEx);
  const { start, end } = deloadWeekBounds(new Date());
  const { data, error } = await tbl()
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      week_start: start,
      week_end: end,
      plan,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("acceptDeload failed:", error);
    throw error;
  }
  return data ? rowToRec(data) : null;
}

export async function markCompletedIfPast(rec: DeloadRecommendation): Promise<void> {
  if (rec.status !== "accepted" || !rec.weekEnd) return;
  const today = new Date().toISOString().slice(0, 10);
  if (today > rec.weekEnd) {
    await tbl().update({ status: "completed" }).eq("id", rec.id);
  }
}

/**
 * Evaluate the user's recent training history and (if criteria met) insert a
 * `pending` recommendation. Called from `saveWorkoutToCloud` after every save.
 * Never inserts a plan — only signals. Plan is built on acceptance.
 */
export async function evaluateDeload(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (!isDeloadEnabled(user.id)) return;

  // Expire stale pending rows and complete any accepted weeks that have ended.
  await expireOldPending();
  const today = new Date().toISOString().slice(0, 10);
  await tbl()
    .update({ status: "completed" })
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .lt("week_end", today);

  // Don't stack recommendations.
  const active = await fetchActiveDeload();
  if (active) return;

  // 8 weeks of working sets, joined to workout_history for the session date.
  const cutoffIso = new Date(Date.now() - 56 * 86400_000).toISOString();
  const { data: setsRaw } = await (supabase as any)
    .from("workout_sets")
    .select("exercise_id, weight, reps, set_type, workout_history!inner(date, user_id, created_at)")
    .eq("workout_history.user_id", user.id)
    .gte("workout_history.created_at", cutoffIso);
  const sets: DeloadSetRecord[] = ((setsRaw ?? []) as any[]).map(r => ({
    exerciseId: r.exercise_id,
    weight: Number(r.weight) || 0,
    reps: Number(r.reps) || 0,
    setType: r.set_type,
    workoutDate: r.workout_history?.date ?? r.workout_history?.created_at,
  }));

  // 28d of recovery/sleep scores.
  const scoresCutoff = new Date(Date.now() - 28 * 86400_000).toISOString().slice(0, 10);
  const { data: scoresRaw } = await (supabase as any)
    .from("daily_scores")
    .select("date, recovery_score, sleep_performance")
    .eq("user_id", user.id)
    .gte("date", scoresCutoff);
  const scores: DeloadDailyScore[] = ((scoresRaw ?? []) as any[]).map(r => ({
    date: r.date,
    recoveryScore: r.recovery_score,
    sleepPerformance: r.sleep_performance,
  }));

  const { fetchAllProgressions } = await import("./progression-queries");
  const progRows = await fetchAllProgressions();
  const progressions: DeloadProgressionRow[] = progRows.map(r => ({
    exerciseId: r.exerciseId,
    exerciseName: r.exerciseName,
    targetWeight: r.targetWeight,
    targetRepsLow: r.targetRepsLow,
    targetRepsHigh: r.targetRepsHigh,
    lastEvaluatedAt: r.lastEvaluatedAt,
  }));

  const signals = computeDeloadSignals(sets, scores, progressions, new Date());
  const lastAt = await lastAcceptedAt(user.id);
  if (!shouldRecommendDeload(signals, lastAt)) return;

  const { error } = await tbl().insert({
    user_id: user.id,
    status: "pending",
    signals,
  });
  if (error) console.error("evaluateDeload insert failed:", error);
}
