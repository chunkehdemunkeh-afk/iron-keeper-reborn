/**
 * Coach/athlete roster — self-serve coach signup, invite-code join, roster management.
 */
import { supabase } from "@/integrations/supabase/client";

export interface RosterAthlete {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  joinedAt: string;
}

const c = supabase as unknown as {
  from: (t: string) => any;
  rpc: (n: string, p?: unknown) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export async function becomeCoach(): Promise<{ error: string | null }> {
  const { error } = await c.rpc("become_coach");
  return { error: error?.message ?? null };
}

export async function getOrCreateCoachInviteCode(): Promise<{ code: string | null; error: string | null }> {
  const { data, error } = await c.rpc("get_or_create_coach_invite_code");
  if (error) return { code: null, error: error.message };
  return { code: (data as string) ?? null, error: null };
}

export async function joinCoachByCode(code: string): Promise<{ coachName: string | null; error: string | null }> {
  const { data, error } = await c.rpc("join_coach_by_code", { _code: code });
  if (error) return { coachName: null, error: error.message };
  return { coachName: (data as string) ?? null, error: null };
}

export async function fetchMyRoster(): Promise<RosterAthlete[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: links } = await c
    .from("coach_athletes")
    .select("athlete_user_id, joined_at")
    .eq("coach_user_id", user.id);

  const rows = (links ?? []) as { athlete_user_id: string; joined_at: string }[];
  if (rows.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", rows.map((r) => r.athlete_user_id));

  const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  (profiles ?? []).forEach((p) => { profileMap[p.user_id] = p; });

  return rows.map((r) => ({
    userId: r.athlete_user_id,
    displayName: profileMap[r.athlete_user_id]?.display_name ?? null,
    avatarUrl: profileMap[r.athlete_user_id]?.avatar_url ?? null,
    joinedAt: r.joined_at,
  }));
}

export async function removeAthleteFromRoster(athleteUserId: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const { error } = await c
    .from("coach_athletes")
    .delete()
    .eq("coach_user_id", user.id)
    .eq("athlete_user_id", athleteUserId);
  return { error: error?.message ?? null };
}

export interface CoachMessage {
  id: string;
  senderId: string;
  body: string;
  read: boolean;
  createdAt: string;
}

/** For an athlete: who their coach is (there's currently at most one). */
export async function fetchMyCoach(): Promise<{ coachUserId: string; displayName: string | null } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: link } = await c
    .from("coach_athletes")
    .select("coach_user_id")
    .eq("athlete_user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!link) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", (link as { coach_user_id: string }).coach_user_id)
    .maybeSingle();

  return { coachUserId: (link as { coach_user_id: string }).coach_user_id, displayName: profile?.display_name ?? null };
}

export async function fetchThread(coachUserId: string, athleteUserId: string): Promise<CoachMessage[]> {
  const { data } = await c
    .from("coach_messages")
    .select("id, sender_id, body, read, created_at")
    .eq("coach_user_id", coachUserId)
    .eq("athlete_user_id", athleteUserId)
    .order("created_at", { ascending: true });

  return ((data ?? []) as { id: string; sender_id: string; body: string; read: boolean; created_at: string }[])
    .map((m) => ({ id: m.id, senderId: m.sender_id, body: m.body, read: m.read, createdAt: m.created_at }));
}

export async function sendCoachMessage(coachUserId: string, athleteUserId: string, body: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const { error } = await c
    .from("coach_messages")
    .insert({ coach_user_id: coachUserId, athlete_user_id: athleteUserId, sender_id: user.id, body });
  return { error: error?.message ?? null };
}

export async function markThreadRead(coachUserId: string, athleteUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await c
    .from("coach_messages")
    .update({ read: true })
    .eq("coach_user_id", coachUserId)
    .eq("athlete_user_id", athleteUserId)
    .neq("sender_id", user.id)
    .eq("read", false);
}
