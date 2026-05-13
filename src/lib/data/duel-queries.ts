/**
 * Duel queries — Phase 3.
 * Friend graph piggybacks on `profiles.leaderboard_visible`.
 */
import { supabase } from "@/integrations/supabase/client";

export type DuelType = "volume" | "sessions" | "one_rm_gain" | "streak" | "xp";
export type DuelStatus = "pending" | "active" | "completed" | "declined" | "cancelled";

export interface Duel {
  id: string;
  challenger_id: string;
  opponent_id: string;
  type: DuelType;
  exercise_id: string | null;
  target: number | null;
  duration_days: number;
  rp_stake: number;
  status: DuelStatus;
  starts_at: string | null;
  ends_at: string | null;
  winner_id: string | null;
  created_at: string;
}

export interface DuelWithParticipants extends Duel {
  challenger_name: string | null;
  challenger_avatar: string | null;
  opponent_name: string | null;
  opponent_avatar: string | null;
  challenger_value: number;
  opponent_value: number;
}

export interface ChallengeableUser {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  season_tier: string;
  season_rp: number;
  level: number;
}

export const DUEL_TYPE_LABELS: Record<DuelType, string> = {
  volume: "Total Volume (kg)",
  sessions: "Sessions Logged",
  one_rm_gain: "1RM Gain",
  streak: "Longest Streak",
  xp: "Most XP Earned",
};

export const DUEL_PRESETS: { type: DuelType; days: number; target?: number; stake: number; description: string }[] = [
  { type: "volume", days: 7, target: 10000, stake: 25, description: "Race to 10,000 kg in 7 days" },
  { type: "sessions", days: 7, target: 5, stake: 25, description: "Most sessions in 1 week" },
  { type: "xp", days: 7, target: 500, stake: 30, description: "Most XP in 1 week" },
  { type: "streak", days: 14, target: 14, stake: 40, description: "Longest streak over 14 days" },
  { type: "one_rm_gain", days: 28, stake: 50, description: "Best 1RM gain on a chosen lift (4 weeks)" },
];

export async function listChallengeableUsers(limit = 50): Promise<ChallengeableUser[]> {
  const { data, error } = await (supabase.rpc as any)("list_challengeable_users", { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as ChallengeableUser[];
}

export async function createDuel(input: {
  opponent_id: string;
  type: DuelType;
  duration_days: number;
  rp_stake: number;
  target?: number;
  exercise_id?: string;
}): Promise<Duel> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await (supabase.from as any)("duels").insert({
    challenger_id: user.id,
    opponent_id: input.opponent_id,
    type: input.type,
    duration_days: input.duration_days,
    rp_stake: input.rp_stake,
    target: input.target ?? null,
    exercise_id: input.exercise_id ?? null,
    status: "pending",
  }).select().single();
  if (error) throw error;
  return data as Duel;
}

export async function acceptDuel(duelId: string): Promise<void> {
  const startsAt = new Date();
  const { data: duel } = await (supabase.from as any)("duels")
    .select("duration_days").eq("id", duelId).single();
  const days = duel?.duration_days ?? 7;
  const endsAt = new Date(startsAt.getTime() + days * 86400_000);
  const { error } = await (supabase.from as any)("duels").update({
    status: "active",
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
  }).eq("id", duelId);
  if (error) throw error;
  // Seed progress rows for both players
  const { data: full } = await (supabase.from as any)("duels")
    .select("challenger_id,opponent_id").eq("id", duelId).single();
  if (full) {
    await (supabase.from as any)("duel_progress").upsert([
      { duel_id: duelId, user_id: full.challenger_id, value: 0 },
      { duel_id: duelId, user_id: full.opponent_id, value: 0 },
    ], { onConflict: "duel_id,user_id" });
  }
}

export async function declineDuel(duelId: string): Promise<void> {
  const { error } = await (supabase.from as any)("duels")
    .update({ status: "declined" }).eq("id", duelId);
  if (error) throw error;
}

export async function cancelDuel(duelId: string): Promise<void> {
  const { error } = await (supabase.from as any)("duels")
    .delete().eq("id", duelId);
  if (error) throw error;
}

export async function fetchMyDuels(): Promise<DuelWithParticipants[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: duels, error } = await (supabase.from as any)("duels")
    .select("*")
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .in("status", ["pending", "active", "completed"])
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!duels?.length) return [];

  const userIds: string[] = Array.from(new Set(duels.flatMap((d: any) => [d.challenger_id as string, d.opponent_id as string])));
  const duelIds = duels.map((d: any) => d.id);
  const [{ data: profiles }, { data: progress }] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds),
    (supabase.from as any)("duel_progress").select("*").in("duel_id", duelIds),
  ]);
  const pmap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
  const progMap = new Map<string, { c: number; o: number }>();
  for (const p of (progress ?? []) as any[]) {
    const d = duels.find((x: any) => x.id === p.duel_id);
    if (!d) continue;
    const entry = progMap.get(p.duel_id) ?? { c: 0, o: 0 };
    if (p.user_id === d.challenger_id) entry.c = Number(p.value);
    if (p.user_id === d.opponent_id) entry.o = Number(p.value);
    progMap.set(p.duel_id, entry);
  }
  return duels.map((d: any) => {
    const cp = pmap.get(d.challenger_id) as any;
    const op = pmap.get(d.opponent_id) as any;
    const v = progMap.get(d.id) ?? { c: 0, o: 0 };
    return {
      ...d,
      challenger_name: cp?.display_name ?? "Anonymous",
      challenger_avatar: cp?.avatar_url ?? null,
      opponent_name: op?.display_name ?? "Anonymous",
      opponent_avatar: op?.avatar_url ?? null,
      challenger_value: v.c,
      opponent_value: v.o,
    };
  });
}

/**
 * Recompute the current user's progress in an active duel and write to duel_progress.
 * Lightweight aggregations against existing tables — no special triggers.
 */
export async function recomputeMyDuelProgress(duel: Duel): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  if (duel.status !== "active" || !duel.starts_at) return 0;
  const start = duel.starts_at;
  const end = duel.ends_at ?? new Date().toISOString();
  let value = 0;

  if (duel.type === "volume") {
    const { data } = await supabase
      .from("workout_sets")
      .select("weight,reps,workout_history!inner(user_id,date)")
      .eq("workout_history.user_id", user.id)
      .gte("workout_history.date", start)
      .lte("workout_history.date", end);
    value = ((data ?? []) as any[]).reduce((s, r) => s + Number(r.weight) * Number(r.reps), 0);
  } else if (duel.type === "sessions") {
    const { count } = await supabase
      .from("workout_history")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end);
    value = count ?? 0;
  } else if (duel.type === "xp") {
    const { data } = await supabase
      .from("xp_events")
      .select("xp")
      .eq("user_id", user.id)
      .gte("created_at", start)
      .lte("created_at", end);
    value = ((data ?? []) as any[]).reduce((s, r) => s + Number(r.xp), 0);
  } else if (duel.type === "streak") {
    const { data } = await supabase
      .from("user_progress")
      .select("current_streak")
      .eq("user_id", user.id)
      .maybeSingle();
    value = (data as any)?.current_streak ?? 0;
  } else if (duel.type === "one_rm_gain" && duel.exercise_id) {
    const { data } = await supabase
      .from("workout_sets")
      .select("weight,reps,created_at")
      .eq("user_id", user.id)
      .eq("exercise_id", duel.exercise_id)
      .gte("created_at", start)
      .lte("created_at", end)
      .gt("weight", 0);
    const rms = ((data ?? []) as any[]).map(r => Number(r.weight) * (1 + Number(r.reps) / 30));
    value = rms.length ? Math.max(...rms) : 0;
  }

  await (supabase.from as any)("duel_progress").upsert(
    { duel_id: duel.id, user_id: user.id, value },
    { onConflict: "duel_id,user_id" }
  );
  return value;
}

export async function settleDuel(duelId: string): Promise<void> {
  const { error } = await (supabase.rpc as any)("settle_duel", { p_duel_id: duelId });
  if (error) throw error;
}
