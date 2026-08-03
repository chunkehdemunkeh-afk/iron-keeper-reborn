/**
 * Inbox: thread list + conversation for both sides of a coach/athlete pair.
 *
 * A "thread" is uniquely identified by the pair (coach_user_id, athlete_user_id).
 * Whichever side the current user is on, the *other* participant's user id is
 * used as the route param (`/inbox/:threadUserId`).
 */
import { supabase } from "@/integrations/supabase/client";

const c = supabase as unknown as { from: (t: string) => any };

export interface InboxThread {
  /** The other participant */
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  coachUserId: string;
  athleteUserId: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastSenderId: string | null;
  unread: number;
}

export interface CoachMessage {
  id: string;
  senderId: string;
  body: string;
  read: boolean;
  createdAt: string;
  sessionId: string | null;
}

export interface ThreadContext {
  coachUserId: string;
  athleteUserId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  /** true when the current user is the coach in this thread */
  iAmCoach: boolean;
}

type MessageRow = {
  id: string;
  coach_user_id: string;
  athlete_user_id: string;
  sender_id: string;
  body: string;
  read: boolean;
  created_at: string;
  session_id: string | null;
};

async function profileMap(ids: string[]) {
  const map: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", ids);
  (data ?? []).forEach((p) => { map[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url }; });
  return map;
}

/**
 * All threads visible to the current user.
 * Coaches get one row per roster athlete (even with zero messages).
 * Athletes get a single row for their coach, if they have one.
 */
export async function fetchInboxThreads(): Promise<InboxThread[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: asCoach }, { data: asAthlete }] = await Promise.all([
    c.from("coach_athletes").select("athlete_user_id").eq("coach_user_id", user.id),
    c.from("coach_athletes").select("coach_user_id").eq("athlete_user_id", user.id),
  ]);

  const pairs: { coachUserId: string; athleteUserId: string; partnerId: string }[] = [];
  ((asCoach ?? []) as { athlete_user_id: string }[]).forEach((r) =>
    pairs.push({ coachUserId: user.id, athleteUserId: r.athlete_user_id, partnerId: r.athlete_user_id }),
  );
  ((asAthlete ?? []) as { coach_user_id: string }[]).forEach((r) =>
    pairs.push({ coachUserId: r.coach_user_id, athleteUserId: user.id, partnerId: r.coach_user_id }),
  );
  if (pairs.length === 0) return [];

  const { data: msgs } = await c
    .from("coach_messages")
    .select("id, coach_user_id, athlete_user_id, sender_id, body, read, created_at, session_id")
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (msgs ?? []) as MessageRow[];
  const profiles = await profileMap(pairs.map((p) => p.partnerId));

  return pairs
    .map((p) => {
      const threadMsgs = rows.filter(
        (m) => m.coach_user_id === p.coachUserId && m.athlete_user_id === p.athleteUserId,
      );
      const last = threadMsgs[0];
      const unread = threadMsgs.filter((m) => !m.read && m.sender_id !== user.id).length;
      return {
        partnerId: p.partnerId,
        partnerName: profiles[p.partnerId]?.display_name ?? "Athlete",
        partnerAvatar: profiles[p.partnerId]?.avatar_url ?? null,
        coachUserId: p.coachUserId,
        athleteUserId: p.athleteUserId,
        lastMessage: last?.body ?? null,
        lastMessageAt: last?.created_at ?? null,
        lastSenderId: last?.sender_id ?? null,
        unread,
      };
    })
    .sort((a, b) => {
      if (a.unread !== b.unread) return b.unread - a.unread;
      const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bt - at;
    });
}

/** Total unread messages across every thread (for nav / header badges). */
export async function fetchUnreadMessageCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data } = await c
    .from("coach_messages")
    .select("id, sender_id, read")
    .eq("read", false)
    .neq("sender_id", user.id)
    .limit(500);
  return (data ?? []).length;
}

/** Resolve the (coach, athlete) pair for a conversation with `partnerId`. */
export async function resolveThreadContext(partnerId: string): Promise<ThreadContext | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: asCoach } = await c
    .from("coach_athletes")
    .select("athlete_user_id")
    .eq("coach_user_id", user.id)
    .eq("athlete_user_id", partnerId)
    .maybeSingle();

  let coachUserId: string;
  let athleteUserId: string;
  if (asCoach) {
    coachUserId = user.id;
    athleteUserId = partnerId;
  } else {
    const { data: asAthlete } = await c
      .from("coach_athletes")
      .select("coach_user_id")
      .eq("athlete_user_id", user.id)
      .eq("coach_user_id", partnerId)
      .maybeSingle();
    if (!asAthlete) return null;
    coachUserId = partnerId;
    athleteUserId = user.id;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("user_id", partnerId)
    .maybeSingle();

  return {
    coachUserId,
    athleteUserId,
    partnerId,
    partnerName: profile?.display_name ?? (coachUserId === partnerId ? "Your coach" : "Athlete"),
    partnerAvatar: profile?.avatar_url ?? null,
    iAmCoach: coachUserId === user.id,
  };
}

export async function fetchThreadMessages(coachUserId: string, athleteUserId: string): Promise<CoachMessage[]> {
  const { data } = await c
    .from("coach_messages")
    .select("id, sender_id, body, read, created_at, session_id")
    .eq("coach_user_id", coachUserId)
    .eq("athlete_user_id", athleteUserId)
    .order("created_at", { ascending: true });

  return ((data ?? []) as MessageRow[]).map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    body: m.body,
    read: m.read,
    createdAt: m.created_at,
    sessionId: m.session_id ?? null,
  }));
}

export async function sendMessage(
  coachUserId: string,
  athleteUserId: string,
  body: string,
  sessionId?: string | null,
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const { error } = await c.from("coach_messages").insert({
    coach_user_id: coachUserId,
    athlete_user_id: athleteUserId,
    sender_id: user.id,
    body,
    session_id: sessionId ?? null,
  });
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

/** Minimal session info for rendering an attached-session chip in a thread. */
export async function fetchSessionSummaries(ids: string[]): Promise<Record<string, { name: string; date: string }>> {
  const out: Record<string, { name: string; date: string }> = {};
  if (ids.length === 0) return out;
  const { data } = await supabase
    .from("workout_history")
    .select("id, workout_name, date")
    .in("id", ids);
  (data ?? []).forEach((w) => { out[w.id] = { name: w.workout_name, date: w.date }; });
  return out;
}
