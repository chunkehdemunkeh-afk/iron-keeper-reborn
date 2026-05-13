/**
 * Quest queries — surfaces active daily/weekly quests with computed progress.
 * Daily quests rotate (3 per day, deterministic by date hash).
 */
import { supabase } from "@/integrations/supabase/client";
import { mondayOfWeek } from "./utils";

export interface Quest {
  id: string;
  code: string;
  title: string;
  description: string;
  type: "daily" | "weekly";
  criteria: { metric: string; target: number };
  xp_reward: number;
  coin_reward: number;
}

export interface QuestWithProgress extends Quest {
  progress: number;
  completed: boolean;
  pct: number;
}

const DAILY_ROTATION = 3;

function hashDate(d: Date): number {
  const s = d.toISOString().slice(0, 10);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export async function fetchActiveQuests(): Promise<{ daily: QuestWithProgress[]; weekly: QuestWithProgress[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { daily: [], weekly: [] };

  const { data: all } = await (supabase.from as any)("quests")
    .select("*")
    .lte("active_from", new Date().toISOString())
    .gte("active_to", new Date().toISOString());

  const allQuests = (all ?? []) as Quest[];
  const dailyPool = allQuests.filter(q => q.type === "daily").sort((a, b) => a.code.localeCompare(b.code));
  const weeklyAll = allQuests.filter(q => q.type === "weekly");

  // Rotate daily: pick DAILY_ROTATION starting from today's hash
  const seed = hashDate(new Date()) % Math.max(1, dailyPool.length);
  const daily: Quest[] = [];
  for (let i = 0; i < Math.min(DAILY_ROTATION, dailyPool.length); i++) {
    daily.push(dailyPool[(seed + i) % dailyPool.length]);
  }

  // For weekly, pick first 5 by code (deterministic per week could rotate; keep stable for now).
  const mondayStr = mondayOfWeek(new Date());
  const weekSeed = hashDate(new Date(mondayStr)) % Math.max(1, weeklyAll.length);
  const weekly: Quest[] = [];
  for (let i = 0; i < Math.min(5, weeklyAll.length); i++) {
    weekly.push(weeklyAll[(weekSeed + i) % weeklyAll.length]);
  }

  const [dailyP, weeklyP] = await Promise.all([
    Promise.all(daily.map(q => withProgress(user.id, q, "daily"))),
    Promise.all(weekly.map(q => withProgress(user.id, q, "weekly"))),
  ]);
  return { daily: dailyP, weekly: weeklyP };
}

async function withProgress(userId: string, q: Quest, scope: "daily" | "weekly"): Promise<QuestWithProgress> {
  const since = scope === "daily"
    ? new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z").toISOString()
    : new Date(mondayOfWeek(new Date()) + "T00:00:00.000Z").toISOString();
  const progress = await computeMetric(userId, q.criteria.metric, since);
  const target = q.criteria.target;
  const completed = progress >= target;
  return {
    ...q,
    progress,
    completed,
    pct: target > 0 ? Math.min(100, (progress / target) * 100) : 0,
  };
}

async function computeMetric(userId: string, metric: string, since: string): Promise<number> {
  switch (metric) {
    case "workouts": {
      const { count } = await supabase.from("workout_history")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", userId).gte("date", since);
      return count ?? 0;
    }
    case "sleep_logs": {
      const { count } = await supabase.from("sleep_logs")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", userId).gte("date", since.slice(0, 10));
      return count ?? 0;
    }
    case "protein_goal":
    case "water_goal":
    case "biometric_checkin":
    case "personal_record":
    case "bodyweight":
    case "food_log": {
      const sourceMap: Record<string, string> = {
        protein_goal: "protein_goal",
        water_goal: "water_goal",
        biometric_checkin: "biometric_checkin",
        personal_record: "personal_record",
        bodyweight: "bodyweight",
        food_log: "food_log_any",
      };
      const { count } = await supabase.from("xp_events")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", userId).eq("source", sourceMap[metric]).gte("created_at", since);
      return count ?? 0;
    }
    case "volume_kg": {
      const { data } = await supabase
        .from("workout_sets")
        .select("weight,reps,workout_history!inner(user_id,date)")
        .eq("workout_history.user_id", userId)
        .gte("workout_history.date", since);
      return ((data ?? []) as any[]).reduce((s, r) => s + Number(r.weight) * Number(r.reps), 0);
    }
    default:
      return 0;
  }
}
