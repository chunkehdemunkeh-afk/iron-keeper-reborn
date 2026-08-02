import { supabase } from "@/integrations/supabase/client";
import { WORKOUTS } from "../workout-data";
import { EXERCISE_SUBSTITUTIONS } from "../exercise-substitutions";
import { ACCESSORY_ROUTINES, ACCESSORY_SUBSTITUTIONS } from "../accessory-routines";
import { EXERCISE_LIBRARY } from "../exercise-library";
import { stripExerciseSuffixes } from "../muscle-mapping";
import { looksLikeExerciseName, resolveExerciseName } from "../exercise-names";

function buildExerciseNameMap(): Record<string, string> {
  const m: Record<string, string> = {};
  WORKOUTS.forEach((w) => w.exercises.forEach((ex: any) => { if (ex.name) m[ex.id] = ex.name; }));
  ACCESSORY_ROUTINES.forEach((r) => r.exercises.forEach((ex: any) => { if (ex.name) m[ex.id] = ex.name; }));
  Object.values(EXERCISE_SUBSTITUTIONS).flat().forEach((sub: any) => { if (sub.name) m[sub.id] = sub.name; });
  Object.values(ACCESSORY_SUBSTITUTIONS).flat().forEach((sub: any) => { if (sub.name) m[sub.id] = sub.name; });
  EXERCISE_LIBRARY.forEach((ex) => { if (ex.name) m[ex.id] = ex.name; });
  return m;
}

export type TimeFilter = 'all' | 'monthly' | 'weekly' | 'prev_weekly' | 'prev_monthly';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  rank: number;
  value: number;
  weight?: number;
  reps?: number;
  isTested?: boolean;
  loggedAt?: string;
  isCurrentUser: boolean;
}

export interface VolumeLeaderboardEntry extends LeaderboardEntry {
  sessionCount: number;
}

export interface TopExercise {
  exerciseId: string;
  exerciseName: string;
  logCount: number;
}

export async function fetchTopExercises(timeFilter: TimeFilter = 'all'): Promise<TopExercise[]> {
  const { data, error } = await supabase.rpc('get_top_exercises', {
    p_time_filter: timeFilter,
    p_limit: 20,
  });
  if (error || !data) return [];
  const nameMap = buildExerciseNameMap();
  return (data as any[]).map((r) => {
    const base = stripExerciseSuffixes(r.exercise_id);
    const resolvedName =
      nameMap[r.exercise_id] ?? nameMap[base] ??
      (looksLikeExerciseName(r.exercise_name) ? r.exercise_name : base || r.exercise_id);
    return {
      exerciseId: r.exercise_id,
      exerciseName: resolvedName,
      logCount: Number(r.log_count),
    };
  });
}

export async function fetchLeaderboard1RM(exerciseId: string, timeFilter: TimeFilter): Promise<LeaderboardEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.rpc('get_1rm_leaderboard', {
    p_exercise_id: exerciseId,
    p_time_filter: timeFilter,
  });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    avatarUrl: r.avatar_url ?? null,
    rank: Number(r.rank),
    value: Number(r.best_1rm),
    weight: Number(r.weight),
    reps: Number(r.reps),
    isTested: Boolean(r.is_tested),
    loggedAt: r.logged_at,
    isCurrentUser: r.user_id === user?.id,
  }));
}

export async function fetchLeaderboardMaxWeight(exerciseId: string, timeFilter: TimeFilter): Promise<LeaderboardEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.rpc('get_max_weight_leaderboard', {
    p_exercise_id: exerciseId,
    p_time_filter: timeFilter,
  });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    avatarUrl: r.avatar_url ?? null,
    rank: Number(r.rank),
    value: Number(r.max_weight),
    reps: Number(r.reps),
    loggedAt: r.logged_at,
    isCurrentUser: r.user_id === user?.id,
  }));
}

export async function fetchLeaderboardMaxReps(exerciseId: string, timeFilter: TimeFilter): Promise<LeaderboardEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.rpc('get_max_reps_leaderboard', {
    p_exercise_id: exerciseId,
    p_time_filter: timeFilter,
  });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    avatarUrl: r.avatar_url ?? null,
    rank: Number(r.rank),
    value: Number(r.max_reps),
    weight: Number(r.heaviest_weight),
    loggedAt: r.logged_at,
    isCurrentUser: r.user_id === user?.id,
  }));
}

export async function fetchLeaderboardSessionVolume(sessionType: string, timeFilter: TimeFilter): Promise<VolumeLeaderboardEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.rpc('get_session_volume_leaderboard', {
    p_session_type: sessionType,
    p_time_filter: timeFilter,
  });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    avatarUrl: r.avatar_url ?? null,
    rank: Number(r.rank),
    value: Number(r.total_volume),
    sessionCount: Number(r.session_count),
    isCurrentUser: r.user_id === user?.id,
  }));
}

export async function updateLeaderboardVisibility(visible: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('profiles')
    .update({ leaderboard_visible: visible })
    .eq('user_id', user.id);
}

export async function fetchLeaderboardVisibility(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return true;
  const { data } = await supabase
    .from('profiles')
    .select('leaderboard_visible')
    .eq('user_id', user.id)
    .maybeSingle();
  return data?.leaderboard_visible ?? true;
}
