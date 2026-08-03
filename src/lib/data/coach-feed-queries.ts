/**
 * Coach feed: every session logged by the coach's roster, with full set detail,
 * plus per-athlete status roll-ups for the roster view.
 *
 * Sets are fetched by `workout_history_id` (not `workout_sets.user_id`, which is
 * NULL on legacy rows) — the coach RLS policy authorises via the parent session.
 */
import { supabase } from "@/integrations/supabase/client";
import { resolveExerciseName } from "@/lib/exercise-names";
import { mondayOfWeek } from "@/lib/data/utils";

const c = supabase as unknown as { from: (t: string) => any };

export interface FeedSet {
  index: number;
  reps: number;
  weight: number;
  setType: string;
  rir: number | null;
  isPr: boolean;
  targetWeight: number | null;
  targetReps: number | null;
}

export interface FeedExercise {
  exerciseId: string;
  name: string;
  sets: FeedSet[];
  volume: number;
  isTimeBased: boolean;
}

export interface FeedSession {
  id: string;
  athleteId: string;
  athleteName: string;
  athleteAvatar: string | null;
  workoutName: string;
  date: string;
  duration: number;
  exercisesCompleted: number;
  totalExercises: number;
  effortRating: number | null;
  sessionNotes: string | null;
  caloriesBurned: number | null;
  totalVolume: number;
  workingSets: number;
  prCount: number;
  exercises: FeedExercise[];
  reviewedAt: string | null;
}

export interface RosterStat {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  lastSeen: string | null;
  lastSessionAt: string | null;
  sessionsThisWeek: number;
  volumeThisWeek: number;
  volumePrevWeek: number;
  recoveryScore: number | null;
  avgSleepHours: number | null;
  unread: number;
  status: "on-track" | "slipping" | "inactive";
}

function isTimeBasedId(exerciseId: string) {
  return /^hx-/.test(exerciseId) || exerciseId.includes("-run-") || exerciseId.includes("-ski-");
}

async function rosterIds(coachId: string): Promise<string[]> {
  const { data } = await c
    .from("coach_athletes")
    .select("athlete_user_id")
    .eq("coach_user_id", coachId);
  return ((data ?? []) as { athlete_user_id: string }[]).map((r) => r.athlete_user_id);
}

/** Chronological feed of roster sessions with full set breakdown. */
export async function fetchCoachFeed(limit = 60): Promise<FeedSession[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const ids = await rosterIds(user.id);
  if (ids.length === 0) return [];

  const [{ data: profiles }, { data: sessions }] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", ids),
    supabase
      .from("workout_history")
      .select("id, user_id, workout_name, date, duration, exercises_completed, total_exercises, effort_rating, session_notes, calories_burned")
      .in("user_id", ids)
      .order("date", { ascending: false })
      .limit(limit),
  ]);

  const sessionRows = sessions ?? [];
  if (sessionRows.length === 0) return [];

  const sessionIds = sessionRows.map((s) => s.id);

  const [{ data: setRows }, { data: reviews }] = await Promise.all([
    supabase
      .from("workout_sets")
      .select("workout_history_id, exercise_id, exercise_name, reps, weight, set_type, rir, is_pr, target_weight, target_reps, created_at")
      .in("workout_history_id", sessionIds)
      .order("created_at", { ascending: true }),
    c
      .from("coach_session_reviews")
      .select("workout_history_id, acknowledged_at")
      .eq("coach_user_id", user.id)
      .in("workout_history_id", sessionIds),
  ]);

  const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  (profiles ?? []).forEach((p) => { profileMap[p.user_id] = p; });

  const reviewMap: Record<string, string> = {};
  ((reviews ?? []) as { workout_history_id: string; acknowledged_at: string }[]).forEach((r) => {
    reviewMap[r.workout_history_id] = r.acknowledged_at;
  });

  const bySession: Record<string, FeedExercise[]> = {};
  (setRows ?? []).forEach((s: any) => {
    const list = (bySession[s.workout_history_id] ??= []);
    let ex = list.find((e) => e.exerciseId === s.exercise_id);
    if (!ex) {
      ex = {
        exerciseId: s.exercise_id,
        name: resolveExerciseName(s.exercise_id, s.exercise_name),
        sets: [],
        volume: 0,
        isTimeBased: isTimeBasedId(s.exercise_id),
      };
      list.push(ex);
    }
    const weight = Number(s.weight) || 0;
    const reps = Number(s.reps) || 0;
    ex.sets.push({
      index: ex.sets.length + 1,
      reps,
      weight,
      setType: s.set_type ?? "working",
      rir: s.rir ?? null,
      isPr: !!s.is_pr,
      targetWeight: s.target_weight != null ? Number(s.target_weight) : null,
      targetReps: s.target_reps != null ? Number(s.target_reps) : null,
    });
    if ((s.set_type ?? "working") !== "warmup") ex.volume += weight * reps;
  });

  return sessionRows.map((w: any) => {
    const exercises = bySession[w.id] ?? [];
    const allSets = exercises.flatMap((e) => e.sets);
    return {
      id: w.id,
      athleteId: w.user_id,
      athleteName: profileMap[w.user_id]?.display_name ?? "Athlete",
      athleteAvatar: profileMap[w.user_id]?.avatar_url ?? null,
      workoutName: w.workout_name,
      date: w.date,
      duration: w.duration,
      exercisesCompleted: w.exercises_completed,
      totalExercises: w.total_exercises,
      effortRating: w.effort_rating,
      sessionNotes: w.session_notes,
      caloriesBurned: w.calories_burned ?? null,
      totalVolume: Math.round(exercises.reduce((a, e) => a + e.volume, 0)),
      workingSets: allSets.filter((s) => s.setType !== "warmup").length,
      prCount: allSets.filter((s) => s.isPr).length,
      exercises,
      reviewedAt: reviewMap[w.id] ?? null,
    };
  });
}

/** Same shape as the feed, scoped to a single athlete. */
export async function fetchAthleteSessions(athleteId: string, limit = 40): Promise<FeedSession[]> {
  const all = await fetchCoachFeed(300);
  return all.filter((s) => s.athleteId === athleteId).slice(0, limit);
}

export async function acknowledgeSession(
  sessionId: string,
  athleteUserId: string,
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const { error } = await c.from("coach_session_reviews").upsert(
    {
      coach_user_id: user.id,
      athlete_user_id: athleteUserId,
      workout_history_id: sessionId,
      acknowledged_at: new Date().toISOString(),
    },
    { onConflict: "coach_user_id,workout_history_id" },
  );
  return { error: error?.message ?? null };
}

export async function unacknowledgeSession(sessionId: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const { error } = await c
    .from("coach_session_reviews")
    .delete()
    .eq("coach_user_id", user.id)
    .eq("workout_history_id", sessionId);
  return { error: error?.message ?? null };
}

/** Per-athlete status roll-ups for the roster tab. */
export async function fetchRosterStats(): Promise<RosterStat[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const ids = await rosterIds(user.id);
  if (ids.length === 0) return [];

  const weekStart = new Date(mondayOfWeek(new Date()));
  const prevStart = new Date(weekStart);
  prevStart.setDate(prevStart.getDate() - 7);

  const [{ data: profiles }, { data: sessions }, { data: scores }, { data: sleep }, { data: msgs }] =
    await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url, last_seen_at").in("user_id", ids),
      supabase
        .from("workout_history")
        .select("id, user_id, date")
        .in("user_id", ids)
        .gte("date", prevStart.toISOString())
        .order("date", { ascending: false }),
      supabase
        .from("daily_scores")
        .select("user_id, recovery_score, date")
        .in("user_id", ids)
        .order("date", { ascending: false }),
      supabase
        .from("sleep_logs")
        .select("user_id, hours, date")
        .in("user_id", ids)
        .order("date", { ascending: false })
        .limit(200),
      c
        .from("coach_messages")
        .select("athlete_user_id, sender_id, read")
        .eq("coach_user_id", user.id)
        .eq("read", false),
    ]);

  const sessionRows = sessions ?? [];
  const setVolumes: Record<string, number> = {};
  if (sessionRows.length > 0) {
    const { data: setRows } = await supabase
      .from("workout_sets")
      .select("workout_history_id, reps, weight, set_type")
      .in("workout_history_id", sessionRows.map((s) => s.id));
    (setRows ?? []).forEach((s: any) => {
      if ((s.set_type ?? "working") === "warmup") return;
      setVolumes[s.workout_history_id] =
        (setVolumes[s.workout_history_id] ?? 0) + (Number(s.weight) || 0) * (Number(s.reps) || 0);
    });
  }

  const { data: lastSessions } = await supabase
    .from("workout_history")
    .select("user_id, date")
    .in("user_id", ids)
    .order("date", { ascending: false })
    .limit(500);
  const lastByUser: Record<string, string> = {};
  (lastSessions ?? []).forEach((s) => { if (!lastByUser[s.user_id]) lastByUser[s.user_id] = s.date; });

  const recoveryByUser: Record<string, number | null> = {};
  (scores ?? []).forEach((s: any) => {
    if (!(s.user_id in recoveryByUser)) {
      recoveryByUser[s.user_id] = s.recovery_score != null ? Number(s.recovery_score) : null;
    }
  });

  const sleepByUser: Record<string, number[]> = {};
  (sleep ?? []).forEach((s: any) => {
    const arr = (sleepByUser[s.user_id] ??= []);
    if (arr.length < 7) arr.push(Number(s.hours));
  });

  const unreadByUser: Record<string, number> = {};
  ((msgs ?? []) as { athlete_user_id: string; sender_id: string }[]).forEach((m) => {
    if (m.sender_id === user.id) return;
    unreadByUser[m.athlete_user_id] = (unreadByUser[m.athlete_user_id] ?? 0) + 1;
  });

  return ids
    .map((uid) => {
      const p = (profiles ?? []).find((x) => x.user_id === uid) as
        | { display_name: string | null; avatar_url: string | null; last_seen_at?: string | null }
        | undefined;
      const mine = sessionRows.filter((s) => s.user_id === uid);
      const thisWeek = mine.filter((s) => new Date(s.date) >= weekStart);
      const prevWeek = mine.filter((s) => new Date(s.date) < weekStart);
      const sum = (rows: typeof mine) => Math.round(rows.reduce((a, s) => a + (setVolumes[s.id] ?? 0), 0));
      const last = lastByUser[uid] ?? null;
      const daysSince = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000) : 99;
      const hours = sleepByUser[uid] ?? [];

      return {
        userId: uid,
        displayName: p?.display_name ?? "Athlete",
        avatarUrl: p?.avatar_url ?? null,
        lastSeen: p?.last_seen_at ?? null,
        lastSessionAt: last,
        sessionsThisWeek: thisWeek.length,
        volumeThisWeek: sum(thisWeek),
        volumePrevWeek: sum(prevWeek),
        recoveryScore: recoveryByUser[uid] ?? null,
        avgSleepHours: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : null,
        unread: unreadByUser[uid] ?? 0,
        status: (daysSince >= 10 ? "inactive" : daysSince >= 5 ? "slipping" : "on-track") as RosterStat["status"],
      };
    })
    .sort((a, b) => {
      const order = { inactive: 0, slipping: 1, "on-track": 2 } as const;
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return a.displayName.localeCompare(b.displayName);
    });
}
