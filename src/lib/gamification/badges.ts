/**
 * Badge engine — evaluates whether the user has unlocked any new badges
 * after an XP event. Pure functions where possible; DB hits batched.
 */

import { supabase } from "@/integrations/supabase/client";
import type { XpSource } from "./config";

export interface BadgeRecord {
  code: string;
  name: string;
  description: string;
  category: string;
  tier: "bronze" | "silver" | "gold";
  icon: string;
  xp_reward: number;
  coin_reward: number;
  criteria: BadgeCriteria;
  hidden: boolean;
}

export type BadgeCriteria =
  | { type: "streak"; value: number }
  | { type: "session_count"; value: number }
  | { type: "sleep_logs"; value: number }
  | { type: "food_logs"; value: number }
  | { type: "pr_count"; value: number }
  | { type: "lifetime_volume_kg"; value: number };

/** Map of XP sources to the badge criteria types that should be re-evaluated. */
const SOURCE_TO_CRITERIA: Record<XpSource, BadgeCriteria["type"][]> = {
  daily_open: ["streak"],
  workout: ["session_count", "streak", "lifetime_volume_kg"],
  workout_programmed_bonus: [],
  sleep_log: ["sleep_logs", "streak"],
  sleep_log_with_stages: [],
  food_log_any: ["food_logs", "streak"],
  food_log_complete: [],
  protein_goal: [],
  water_goal: [],
  bodyweight: [],
  biometric_checkin: ["streak"],
  progress_photo: [],
  weekly_review: [],
  personal_record: ["pr_count"],
  first_time_feature: [],
};

interface EvaluateContext {
  userId: string;
  source: XpSource;
  currentStreak: number;
}

export interface UnlockedBadge {
  code: string;
  name: string;
  icon: string;
  tier: string;
  xpReward: number;
  coinReward: number;
}

/**
 * After an XP event, check whether any new badges should unlock.
 * Returns the newly-unlocked badges (already inserted into user_badges).
 */
export async function evaluateBadges(ctx: EvaluateContext): Promise<UnlockedBadge[]> {
  const relevantTypes = SOURCE_TO_CRITERIA[ctx.source];
  if (!relevantTypes || relevantTypes.length === 0) return [];

  // Fetch candidate badges + which the user already has.
  const [{ data: badges }, { data: owned }] = await Promise.all([
    supabase.from("badges").select("*").in("criteria->>type", relevantTypes as string[]),
    supabase.from("user_badges").select("badge_code").eq("user_id", ctx.userId),
  ]);

  if (!badges || badges.length === 0) return [];
  const ownedCodes = new Set((owned ?? []).map((r: any) => r.badge_code));
  const candidates = (badges as unknown as BadgeRecord[]).filter((b) => !ownedCodes.has(b.code));
  if (candidates.length === 0) return [];

  // Compute the metrics needed (only fetch what's relevant).
  const metrics = await computeMetrics(ctx.userId, relevantTypes, ctx.currentStreak);

  const unlocked: BadgeRecord[] = [];
  for (const badge of candidates) {
    const c = badge.criteria;
    let metricValue = 0;
    if (c.type === "streak") metricValue = metrics.streak;
    else if (c.type === "session_count") metricValue = metrics.sessionCount;
    else if (c.type === "sleep_logs") metricValue = metrics.sleepLogs;
    else if (c.type === "food_logs") metricValue = metrics.foodLogs;
    else if (c.type === "pr_count") metricValue = metrics.prCount;
    else if (c.type === "lifetime_volume_kg") metricValue = metrics.lifetimeVolumeKg;

    if (metricValue >= c.value) unlocked.push(badge);
  }

  if (unlocked.length === 0) return [];

  // Insert into user_badges.
  await supabase.from("user_badges").insert(
    unlocked.map((b) => ({
      user_id: ctx.userId,
      badge_code: b.code,
    })) as never,
  );

  // Award badge XP/coins via a single bulk xp_event.
  const totalXp = unlocked.reduce((s, b) => s + (b.xp_reward ?? 0), 0);
  const totalCoins = unlocked.reduce((s, b) => s + (b.coin_reward ?? 0), 0);
  if (totalXp > 0 || totalCoins > 0) {
    await supabase.from("xp_events").insert({
      user_id: ctx.userId,
      source: "badge_unlock",
      xp: totalXp,
      coins: totalCoins,
      metadata: { codes: unlocked.map((b) => b.code) },
    } as never);
    await incrementProgressFallback(ctx.userId, totalXp, totalCoins);
  }

  return unlocked.map((b) => ({
    code: b.code,
    name: b.name,
    icon: b.icon,
    tier: b.tier,
    xpReward: b.xp_reward,
    coinReward: b.coin_reward,
  }));
}

async function incrementProgressFallback(userId: string, xp: number, coins: number) {
  const { data } = await supabase
    .from("user_progress")
    .select("xp, coins")
    .eq("user_id", userId)
    .maybeSingle();
  const newXp = ((data as any)?.xp ?? 0) + xp;
  const newCoins = ((data as any)?.coins ?? 0) + coins;
  const { levelFromXp } = await import("./config");
  await supabase
    .from("user_progress")
    .update({ xp: newXp, coins: newCoins, level: levelFromXp(newXp) } as never)
    .eq("user_id", userId);
}

interface Metrics {
  streak: number;
  sessionCount: number;
  sleepLogs: number;
  foodLogs: number;
  prCount: number;
  lifetimeVolumeKg: number;
}

async function computeMetrics(
  userId: string,
  needed: BadgeCriteria["type"][],
  currentStreak: number,
): Promise<Metrics> {
  const m: Metrics = {
    streak: currentStreak,
    sessionCount: 0,
    sleepLogs: 0,
    foodLogs: 0,
    prCount: 0,
    lifetimeVolumeKg: 0,
  };

  const wants = (k: BadgeCriteria["type"]) => needed.includes(k);

  const tasks: Promise<void>[] = [];

  if (wants("session_count")) {
    tasks.push((async () => {
      const { count } = await supabase
        .from("workout_history")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      m.sessionCount = count ?? 0;
    })());
  }
  if (wants("sleep_logs")) {
    tasks.push((async () => {
      const { count } = await supabase
        .from("sleep_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      m.sleepLogs = count ?? 0;
    })());
  }
  if (wants("food_logs")) {
    tasks.push((async () => {
      const { data } = await supabase
        .from("food_logs")
        .select("date")
        .eq("user_id", userId);
      const days = new Set((data ?? []).map((r: any) => r.date));
      m.foodLogs = days.size;
    })());
  }
  if (wants("pr_count")) {
    tasks.push((async () => {
      const { count } = await supabase
        .from("xp_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("source", "personal_record");
      m.prCount = count ?? 0;
    })());
  }
  if (wants("lifetime_volume_kg")) {
    tasks.push(computeLifetimeVolume(userId).then((v) => { m.lifetimeVolumeKg = v; }));
  }

  await Promise.all(tasks);
  return m;
}

async function computeLifetimeVolume(userId: string): Promise<number> {
  // Paginated sum of weight*reps from workout_sets (joined via workout_history).
  // Mirrors the Profile page logic so values are consistent.
  let total = 0;
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("workout_sets")
      .select("weight, reps, workout_history!inner(user_id)")
      .eq("workout_history.user_id", userId)
      .neq("set_type", "warmup")
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    for (const r of data as any[]) {
      total += (Number(r.weight) || 0) * (Number(r.reps) || 0);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return total;
}
