/**
 * awardXp — single chokepoint for all gamification side-effects.
 *
 * Pipeline:
 * 1. Dedupe (oncePerDay/Week/Lifetime).
 * 2. Apply streak multiplier to XP.
 * 3. Insert xp_events row.
 * 4. Update streak (if eligible source).
 * 5. Increment user_progress counters + level.
 * 6. Evaluate badges relevant to this source.
 * 7. Return payload for client toasts / level-up sheet.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  XP_REWARDS,
  STREAK_ELIGIBLE_SOURCES,
  WORKOUT_PER_SET_XP,
  WORKOUT_XP_CAP,
  levelFromXp,
  streakMultiplier,
  type XpSource,
} from "./config";
import { evaluateBadges, type UnlockedBadge } from "./badges";

export interface AwardXpInput {
  source: XpSource;
  /** Optional metadata stored on the xp_events row. */
  metadata?: Record<string, unknown>;
  /** For source="workout": number of sets logged (drives per-set bonus, capped). */
  setCount?: number;
  /** Override default XP (rare — used for personal_record where XP is fixed). */
  xpOverride?: number;
  /** Override default coins. */
  coinsOverride?: number;
}

export interface AwardXpResult {
  xp: number;
  coins: number;
  /** Streak after this event (0 if not affected). */
  newStreak: number;
  /** True if the user gained a level. */
  leveledUp: boolean;
  newLevel: number;
  unlockedBadges: UnlockedBadge[];
  /** True if reward was skipped because of dedupe rule. */
  skipped: boolean;
}

const NULL_RESULT: AwardXpResult = {
  xp: 0,
  coins: 0,
  newStreak: 0,
  leveledUp: false,
  newLevel: 1,
  unlockedBadges: [],
  skipped: true,
};

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}
function mondayStr(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

async function alreadyAwarded(
  userId: string,
  source: XpSource,
  reward: { oncePerDay?: boolean; oncePerWeek?: boolean; oncePerLifetime?: boolean },
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  if (!reward.oncePerDay && !reward.oncePerWeek && !reward.oncePerLifetime) return false;

  let query = supabase
    .from("xp_events")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .eq("source", source);

  if (reward.oncePerDay) {
    const start = `${todayStr()}T00:00:00.000Z`;
    query = query.gte("created_at", start);
  } else if (reward.oncePerWeek) {
    const start = `${mondayStr()}T00:00:00.000Z`;
    query = query.gte("created_at", start);
  }
  // For oncePerFeature with metadata.feature, dedupe by feature key
  if (source === "first_time_feature" && metadata?.feature) {
    query = query.contains("metadata", { feature: metadata.feature });
  }

  const { count } = await query;
  return (count ?? 0) > 0;
}

/**
 * Update streak counters. Returns the new streak value.
 * Rules:
 * - If last_active_date == today → no change.
 * - If last_active_date == yesterday → +1.
 * - If last_active_date < yesterday → consume freeze tokens to bridge gap (max 1 per missed day),
 *   else reset to 1.
 * - If no progress row → start at 1.
 */
async function updateStreak(userId: string): Promise<number> {
  const today = todayStr();
  const { data: row } = await supabase
    .from("user_progress")
    .select("current_streak, longest_streak, last_active_date, freeze_tokens")
    .eq("user_id", userId)
    .maybeSingle();

  const r = row as any;
  if (!r) {
    // user_progress row doesn't exist yet — caller will create it
    return 1;
  }
  if (r.last_active_date === today) return r.current_streak ?? 0;

  let newStreak: number;
  let freezeTokens = r.freeze_tokens ?? 0;
  if (r.last_active_date) {
    const lastDate = new Date(`${r.last_active_date}T00:00:00`);
    const todayDate = new Date(`${today}T00:00:00`);
    const dayDiff = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000);

    if (dayDiff === 1) {
      newStreak = (r.current_streak ?? 0) + 1;
    } else if (dayDiff > 1) {
      // Try to bridge with freeze tokens (1 per missed day, missed days = dayDiff - 1)
      const missed = dayDiff - 1;
      if (freezeTokens >= missed) {
        freezeTokens -= missed;
        newStreak = (r.current_streak ?? 0) + 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1; // shouldn't happen but safe
    }
  } else {
    newStreak = 1;
  }

  // Award a freeze token at every 7-day milestone (cap 3).
  if (newStreak > 0 && newStreak % 7 === 0 && freezeTokens < 3) {
    freezeTokens = Math.min(3, freezeTokens + 1);
  }

  const longestStreak = Math.max(r.longest_streak ?? 0, newStreak);

  await supabase
    .from("user_progress")
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_active_date: today,
      freeze_tokens: freezeTokens,
    } as never)
    .eq("user_id", userId);

  return newStreak;
}

async function ensureProgressRow(userId: string): Promise<{
  xp: number;
  coins: number;
  level: number;
  current_streak: number;
  season_rp: number;
}> {
  const { data } = await supabase
    .from("user_progress")
    .select("xp, coins, level, current_streak, season_rp")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data as any;
  await supabase.from("user_progress").insert({ user_id: userId } as never);
  return { xp: 0, coins: 0, level: 1, current_streak: 0, season_rp: 0 };
}

export async function awardXp(input: AwardXpInput): Promise<AwardXpResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NULL_RESULT;

  const reward = XP_REWARDS[input.source];
  if (!reward) return NULL_RESULT;

  if (await alreadyAwarded(user.id, input.source, reward, input.metadata)) {
    return NULL_RESULT;
  }

  // Ensure progress row exists; capture previous level.
  const before = await ensureProgressRow(user.id);
  const prevLevel = before.level ?? 1;

  // Calculate base XP/coins
  let xp = input.xpOverride ?? reward.xp;
  let coins = input.coinsOverride ?? reward.coins;

  if (input.source === "workout" && input.setCount && input.setCount > 0) {
    xp = Math.min(WORKOUT_XP_CAP, xp + input.setCount * WORKOUT_PER_SET_XP);
  }

  // Update streak (eligible sources only)
  let newStreak = before.current_streak ?? 0;
  if (STREAK_ELIGIBLE_SOURCES.has(input.source)) {
    newStreak = await updateStreak(user.id);
  }

  // Apply streak multiplier to XP (not coins)
  const mult = streakMultiplier(newStreak);
  xp = Math.round(xp * mult);

  // Insert ledger row
  await supabase.from("xp_events").insert({
    user_id: user.id,
    source: input.source,
    xp,
    coins,
    metadata: input.metadata ?? null,
  } as never);

  // Increment counters
  const newXp = (before.xp ?? 0) + xp;
  const newCoins = (before.coins ?? 0) + coins;
  const newLevel = levelFromXp(newXp);
  const rpGain = reward.seasonRp ?? 0;
  const newSeasonRp = (before.season_rp ?? 0) + rpGain;

  await supabase
    .from("user_progress")
    .update({
      xp: newXp,
      coins: newCoins,
      level: newLevel,
      ...(rpGain > 0 ? { season_rp: newSeasonRp } : {}),
    } as never)
    .eq("user_id", user.id);

  // Evaluate badges
  const unlockedBadges = await evaluateBadges({
    userId: user.id,
    source: input.source,
    currentStreak: newStreak,
  });

  return {
    xp,
    coins,
    newStreak,
    leveledUp: newLevel > prevLevel,
    newLevel,
    unlockedBadges,
    skipped: false,
  };
}
