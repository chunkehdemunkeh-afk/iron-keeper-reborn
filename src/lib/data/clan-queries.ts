/**
 * Clans — small crews (3-10) with shared identity.
 * Owner-based RLS; members join/leave themselves.
 */
import { supabase } from "@/integrations/supabase/client";

export interface Clan {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  owner_id: string;
  created_at: string;
}

export interface ClanMember {
  clan_id: string;
  user_id: string;
  role: "owner" | "officer" | "member";
  joined_at: string;
  display_name?: string;
  avatar_url?: string | null;
}

const c = supabase as unknown as { from: (t: string) => any };

export async function fetchAllClans(): Promise<Array<Clan & { memberCount: number }>> {
  const { data: clans, error } = await c.from("clans").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  const list = (clans ?? []) as Clan[];
  if (list.length === 0) return [];

  const { data: members } = await c
    .from("clan_members")
    .select("clan_id")
    .in("clan_id", list.map((cl) => cl.id));
  const counts = new Map<string, number>();
  for (const m of (members ?? []) as Array<{ clan_id: string }>) {
    counts.set(m.clan_id, (counts.get(m.clan_id) ?? 0) + 1);
  }
  return list.map((cl) => ({ ...cl, memberCount: counts.get(cl.id) ?? 0 }));
}

export async function fetchMyClan(userId: string): Promise<Clan | null> {
  const { data: rows } = await c.from("clan_members").select("clan_id").eq("user_id", userId).limit(1);
  const first = ((rows ?? []) as Array<{ clan_id: string }>)[0];
  if (!first) return null;
  const { data: clan } = await c.from("clans").select("*").eq("id", first.clan_id).maybeSingle();
  return (clan as Clan | null) ?? null;
}

export async function fetchClanMembers(clanId: string): Promise<ClanMember[]> {
  const { data: members } = await c.from("clan_members").select("clan_id, user_id, role, joined_at").eq("clan_id", clanId);
  const list = (members ?? []) as ClanMember[];
  if (list.length === 0) return [];
  const { data: profs } = await c.from("profiles").select("user_id, display_name, avatar_url").in("user_id", list.map((m) => m.user_id));
  const pmap = new Map<string, { display_name?: string; avatar_url?: string | null }>();
  for (const p of (profs ?? []) as Array<{ user_id: string; display_name?: string; avatar_url?: string | null }>) {
    pmap.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url });
  }
  return list.map((m) => ({ ...m, ...pmap.get(m.user_id) }));
}

export async function createClan(userId: string, name: string, tag: string, description?: string): Promise<Clan> {
  const { data, error } = await c.from("clans").insert({
    name,
    tag,
    description: description ?? null,
    owner_id: userId,
  }).select().single();
  if (error) throw error;
  // Owner auto-joins as member
  await c.from("clan_members").insert({
    clan_id: (data as Clan).id,
    user_id: userId,
    role: "owner",
  });
  return data as Clan;
}

export async function joinClan(userId: string, clanId: string): Promise<void> {
  const { error } = await c.from("clan_members").insert({
    clan_id: clanId,
    user_id: userId,
    role: "member",
  });
  if (error) throw error;
}

export async function leaveClan(userId: string, clanId: string): Promise<void> {
  const { error } = await c.from("clan_members").delete().eq("clan_id", clanId).eq("user_id", userId);
  if (error) throw error;
}
