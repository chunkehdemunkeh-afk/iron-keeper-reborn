/**
 * Community challenges — server-wide goals.
 * Contributions are user-scoped; sum across all users = total progress.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CommunityChallenge {
  id: string;
  code: string;
  title: string;
  description: string;
  metric: string;
  target: number;
  reward_coins: number;
  reward_cosmetic_code: string | null;
  starts_at: string;
  ends_at: string;
}

export interface ChallengeStats {
  challenge: CommunityChallenge;
  totalProgress: number;
  myContribution: number;
  contributorCount: number;
  pct: number;
}

const c = supabase as unknown as { from: (t: string) => any };

export async function fetchActiveCommunityChallenges(): Promise<CommunityChallenge[]> {
  const now = new Date().toISOString();
  const { data, error } = await c
    .from("community_challenges")
    .select("*")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("ends_at");
  if (error) throw error;
  return (data ?? []) as CommunityChallenge[];
}

export async function fetchChallengeStats(challengeId: string, userId: string): Promise<{ totalProgress: number; myContribution: number; contributorCount: number }> {
  const { data, error } = await c
    .from("community_contributions")
    .select("user_id, value")
    .eq("challenge_id", challengeId);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ user_id: string; value: number }>;
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  const mine = rows.find((r) => r.user_id === userId)?.value ?? 0;
  return { totalProgress: total, myContribution: Number(mine), contributorCount: rows.length };
}

export async function contributeToChallenge(_userId: string, challengeId: string, addValue: number): Promise<void> {
  if (addValue <= 0) return;
  // Value is written server-side by a SECURITY DEFINER function which validates
  // the challenge window and clamps the delta — clients cannot set it directly.
  const { error } = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>;
  }).rpc("record_challenge_contribution", {
    p_challenge_id: challengeId,
    p_add: addValue,
  });
  if (error) throw error;
}

