/**
 * Season data — active season, finale, objectives, tier rewards, cosmetics unlocked.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "@/lib/gamification/tiers";

export interface SeasonResult {
  season_id: string;
  user_id: string;
  final_rp: number;
  final_tier: string;
  final_rank: number | null;
  created_at: string;
}

export interface Season {
  id: string;
  number: number;
  starts_at: string;
  ends_at: string;
  status: string;
  theme?: string | null;
  theme_gradient?: string | null;
}

export interface SeasonObjective {
  code: string;
  title: string;
  description: string;
  metric: string;
  target: number;
  xp_reward: number;
  coin_reward: number;
  progress: number;
  pct: number;
  completed: boolean;
}

export interface UnlockedCosmetic {
  code: string;
  name: string;
  kind: string;
  rarity: string;
  payload: Record<string, unknown>;
}

const c = supabase as unknown as {
  from: (t: string) => any;
  rpc: (n: string, p?: unknown) => Promise<{ data: unknown; error: unknown }>;
};

export async function fetchPendingSeasonFinale(): Promise<Season | null> {
  const now = new Date().toISOString();
  const { data } = await c
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .lt("ends_at", now)
    .order("ends_at", { ascending: false })
    .limit(1);
  return ((data ?? []) as Season[])[0] ?? null;
}

export async function settleSeason(seasonId: string): Promise<void> {
  const { error } = await c.rpc("settle_season", { p_season_id: seasonId });
  if (error) {
    // Surface the real error to the caller so the UI can show it.
    const msg = (error as { message?: string }).message ?? "settle_season failed";
    throw new Error(msg);
  }
}

export async function fetchMyLatestSeasonResult(userId: string): Promise<SeasonResult | null> {
  const { data } = await c
    .from("season_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  return ((data ?? []) as SeasonResult[])[0] ?? null;
}

/**
 * Season objectives: long-form goals stored in the `quests` table with
 * `scope = 'season'`. Progress is computed against the current season window.
 */
export async function fetchSeasonObjectives(seasonStart: string): Promise<SeasonObjective[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await c.from("quests")
    .select("*")
    .eq("scope", "season")
    .lte("active_from", new Date().toISOString())
    .order("code");

  const rows = (data ?? []) as Array<{
    code: string; title: string; description: string;
    criteria: { metric: string; target: number };
    xp_reward: number; coin_reward: number;
  }>;

  return Promise.all(rows.map(async (q) => {
    const progress = await computeSeasonMetric(user.id, q.criteria.metric, seasonStart);
    const target = q.criteria.target;
    const pct = target > 0 ? Math.min(100, (progress / target) * 100) : 0;
    return {
      code: q.code,
      title: q.title,
      description: q.description,
      metric: q.criteria.metric,
      target,
      xp_reward: q.xp_reward,
      coin_reward: q.coin_reward,
      progress,
      pct,
      completed: progress >= target,
    };
  }));
}

async function computeSeasonMetric(userId: string, metric: string, since: string): Promise<number> {
  switch (metric) {
    case "workouts": {
      const { count } = await supabase.from("workout_history")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", userId).gte("date", since.slice(0, 10));
      return count ?? 0;
    }
    case "personal_record": {
      const { count } = await supabase.from("xp_events")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", userId).eq("source", "personal_record").gte("created_at", since);
      return count ?? 0;
    }
    case "weekly_review": {
      const { count } = await supabase.from("weekly_reviews")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", userId).gte("week_start", since.slice(0, 10));
      return count ?? 0;
    }
    case "volume_kg": {
      const { data } = await supabase
        .from("workout_sets")
        .select("weight,reps,workout_history!inner(user_id,date)")
        .eq("workout_history.user_id", userId)
        .gte("workout_history.date", since.slice(0, 10));
      return ((data ?? []) as Array<{ weight: number; reps: number }>)
        .reduce((s, r) => s + Number(r.weight) * Number(r.reps), 0);
    }
    case "current_streak": {
      const { data } = await supabase.from("user_progress")
        .select("current_streak").eq("user_id", userId).maybeSingle();
      return (data as { current_streak?: number } | null)?.current_streak ?? 0;
    }
    default:
      return 0;
  }
}

/**
 * Cosmetics unlocked during a specific season (used in finale recap).
 */
export async function fetchCosmeticsUnlockedInSeason(
  userId: string,
  since: string
): Promise<UnlockedCosmetic[]> {
  const { data } = await c.from("user_cosmetics")
    .select("cosmetic_code, source, acquired_at")
    .eq("user_id", userId)
    .gte("acquired_at", since);
  const rows = (data ?? []) as Array<{ cosmetic_code: string; source: string }>;
  if (rows.length === 0) return [];

  const codes = rows.map(r => r.cosmetic_code);
  const { data: cosmetics } = await c.from("cosmetics")
    .select("code, name, kind, rarity, payload")
    .in("code", codes);
  return (cosmetics ?? []) as UnlockedCosmetic[];
}

/**
 * Tier reward preview: what a user unlocks by finishing at each tier.
 * Static definition — mirrors settle_season() reward table.
 */
export interface TierReward {
  tier: Tier;
  coins: number;
  cosmeticCode: string;
  cosmeticName: string;
}

export const TIER_REWARDS: TierReward[] = [
  { tier: "bronze",   coins: 150,  cosmeticCode: "reward_bronze",   cosmeticName: "Bronze Ascent Banner" },
  { tier: "silver",   coins: 400,  cosmeticCode: "reward_silver",   cosmeticName: "Silver Ascent Banner" },
  { tier: "gold",     coins: 800,  cosmeticCode: "reward_gold",     cosmeticName: "Golden Iron Title" },
  { tier: "platinum", coins: 1500, cosmeticCode: "reward_platinum", cosmeticName: "Platinum XP Theme" },
  { tier: "diamond",  coins: 2500, cosmeticCode: "reward_diamond",  cosmeticName: "Diamond Edge Frame" },
  { tier: "champion", coins: 5000, cosmeticCode: "reward_champion", cosmeticName: "Champion of the Iron" },
];
