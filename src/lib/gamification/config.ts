/**
 * Gamification config — single source of truth for XP rewards,
 * level curve, and streak multipliers.
 */

export type XpSource =
  | "daily_open"
  | "workout"
  | "workout_programmed_bonus"
  | "sleep_log"
  | "sleep_log_with_stages"
  | "food_log_any"
  | "food_log_complete"
  | "protein_goal"
  | "water_goal"
  | "bodyweight"
  | "biometric_checkin"
  | "progress_photo"
  | "weekly_review"
  | "personal_record"
  | "first_time_feature";

export interface XpReward {
  xp: number;
  coins: number;
  /** Season RP awarded alongside XP (contributes to competitive tier). */
  seasonRp?: number;
  /** If true, only awarded once per UTC day per user (enforced via xp_events query). */
  oncePerDay?: boolean;
  /** If true, only awarded once per ISO week (Mon-based). */
  oncePerWeek?: boolean;
  /** If true, only ever awarded once per user. */
  oncePerLifetime?: boolean;
}

export const XP_REWARDS: Record<XpSource, XpReward> = {
  daily_open: { xp: 5, coins: 1, oncePerDay: true },
  workout: { xp: 50, coins: 5, seasonRp: 3 }, // base; per-set bonus added separately, capped 100
  workout_programmed_bonus: { xp: 25, coins: 3, seasonRp: 2 },
  sleep_log: { xp: 15, coins: 2, oncePerDay: true },
  sleep_log_with_stages: { xp: 5, coins: 0, oncePerDay: true }, // additive
  food_log_any: { xp: 10, coins: 1, oncePerDay: true },
  food_log_complete: { xp: 15, coins: 2, oncePerDay: true }, // additive on top of food_log_any
  protein_goal: { xp: 15, coins: 2, oncePerDay: true },
  water_goal: { xp: 10, coins: 1, oncePerDay: true },
  bodyweight: { xp: 10, coins: 2, oncePerDay: true },
  biometric_checkin: { xp: 20, coins: 3, seasonRp: 1, oncePerDay: true },
  progress_photo: { xp: 30, coins: 5, oncePerWeek: true },
  weekly_review: { xp: 75, coins: 10, seasonRp: 15, oncePerWeek: true },
  personal_record: { xp: 100, coins: 15, seasonRp: 10 },
  first_time_feature: { xp: 50, coins: 10, oncePerLifetime: true },
};

export const WORKOUT_PER_SET_XP = 1;
export const WORKOUT_XP_CAP = 100;

/** Streak rule sources: doing any of these on a day keeps the streak alive. */
export const STREAK_ELIGIBLE_SOURCES: ReadonlySet<XpSource> = new Set([
  "workout",
  "sleep_log",
  "food_log_any",
  "biometric_checkin",
]);

/**
 * Level curve: total XP required to *reach* a given level.
 * Quadratic with soft cap after 50.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= 50) return Math.round(50 * (level - 1) * level); // ~ 50*(L^2 - L)
  // After 50 the curve flattens
  const base = 50 * 49 * 50; // 122,500 to reach level 50
  return base + Math.round(2500 * (level - 50) * 1.6);
}

export function levelFromXp(totalXp: number): number {
  let lvl = 1;
  while (lvl < 100 && xpForLevel(lvl + 1) <= totalXp) lvl++;
  return lvl;
}

export function progressToNextLevel(totalXp: number): {
  level: number;
  current: number;
  needed: number;
  pct: number;
} {
  const level = levelFromXp(totalXp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const current = totalXp - floor;
  const needed = ceil - floor;
  return { level, current, needed, pct: needed > 0 ? Math.min(100, (current / needed) * 100) : 100 };
}

/** Streak multiplier on XP (not coins). */
export function streakMultiplier(streak: number): number {
  if (streak >= 100) return 1.5;
  if (streak >= 30) return 1.25;
  if (streak >= 7) return 1.1;
  return 1.0;
}

export function streakTier(streak: number): { label: string; icon: string } | null {
  if (streak >= 365) return { label: "Legend", icon: "👑" };
  if (streak >= 100) return { label: "Diamond", icon: "💎" };
  if (streak >= 30) return { label: "Blaze", icon: "🔥🔥" };
  if (streak >= 7) return { label: "Spark", icon: "🔥" };
  return null;
}

/** Tier thresholds for season RP (Phase 2, included for shared types). */
export const SEASON_TIERS = ["bronze", "silver", "gold", "platinum", "diamond", "champion"] as const;
export type SeasonTier = (typeof SEASON_TIERS)[number];
