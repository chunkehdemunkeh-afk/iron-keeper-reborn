/**
 * Season finale — settle ended seasons and surface a recap.
 */
import { supabase } from "@/integrations/supabase/client";

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
}

const c = supabase as unknown as { from: (t: string) => any; rpc: (n: string, p?: unknown) => Promise<{ data: unknown; error: unknown }> };

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
  if (error) throw error;
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
