import { supabase } from "@/integrations/supabase/client";
import { stripExerciseSuffixes } from "../muscle-mapping";
import { awardXpAndNotify } from "@/lib/gamification/notify";
import { WORKOUTS } from "../workout-data";
import { EXERCISE_SUBSTITUTIONS } from "../exercise-substitutions";
import { ACCESSORY_ROUTINES, ACCESSORY_SUBSTITUTIONS } from "../accessory-routines";
import { EXERCISE_LIBRARY } from "../exercise-library";

export interface WeeklyReview {
  id: string;
  weekStart: string;
  rating: number;
  wentWell: string | null;
  toImprove: string | null;
  focusNext: string | null;
  photoId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeekSummary {
  weekStart: string;
  weekEnd: string;
  workouts: { count: number; totalMinutes: number };
  activities: { restDays: number; otherCount: number };
  food: { daysLogged: number; avgCalories: number | null };
  water: { daysAtGoal: number; totalMl: number };
  weight: { entries: number; deltaKg: number | null; latestKg: number | null };
  sleep: { avgHours: number | null; avgQuality: number | null };
  prs: { count: number; names: string[] };
}

function mapReview(r: any): WeeklyReview {
  return {
    id: r.id,
    weekStart: r.week_start,
    rating: r.rating,
    wentWell: r.went_well,
    toImprove: r.to_improve,
    focusNext: r.focus_next,
    photoId: r.photo_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function fetchWeeklyReview(weekStart: string): Promise<WeeklyReview | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  return data ? mapReview(data) : null;
}

export async function fetchAllWeeklyReviews(): Promise<WeeklyReview[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false });

  if (error || !data) return [];
  return data.map(mapReview);
}

export async function upsertWeeklyReview(input: {
  weekStart: string;
  rating: number;
  wentWell?: string | null;
  toImprove?: string | null;
  focusNext?: string | null;
  photoId?: string | null;
}): Promise<WeeklyReview | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("weekly_reviews")
    .upsert(
      {
        user_id: user.id,
        week_start: input.weekStart,
        rating: input.rating,
        went_well: input.wentWell ?? null,
        to_improve: input.toImprove ?? null,
        focus_next: input.focusNext ?? null,
        photo_id: input.photoId ?? null,
      },
      { onConflict: "user_id,week_start" },
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to save weekly review:", error);
    return null;
  }
  void awardXpAndNotify({ source: "weekly_review", metadata: { weekStart: input.weekStart } });
  return mapReview(data);
}

export async function deleteWeeklyReview(id: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from("weekly_reviews")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  return !error;
}

export async function computeWeekStats(weekStart: string): Promise<WeekSummary> {
  const { data: { user } } = await supabase.auth.getUser();
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  // Local calendar date, not toISOString()'s UTC date — plain `date`-typed
  // columns (activity_logs, food_logs, water_intake, sleep_logs) are compared
  // against these directly, and a UTC round-trip can shift the boundary by a
  // day depending on the user's offset, dropping/including the wrong day.
  const localDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const startDate = weekStart;
  const endDateExclusive = (() => {
    const d = new Date(start);
    d.setDate(d.getDate() + 7);
    return localDateStr(d);
  })();

  const empty: WeekSummary = {
    weekStart,
    weekEnd: (() => {
      const d = new Date(start);
      d.setDate(d.getDate() + 6);
      return localDateStr(d);
    })(),
    workouts: { count: 0, totalMinutes: 0 },
    activities: { restDays: 0, otherCount: 0 },
    food: { daysLogged: 0, avgCalories: null },
    water: { daysAtGoal: 0, totalMl: 0 },
    weight: { entries: 0, deltaKg: null, latestKg: null },
    sleep: { avgHours: null, avgQuality: null },
    prs: { count: 0, names: [] },
  };

  if (!user) return empty;

  const [
    workoutsRes,
    activitiesRes,
    foodRes,
    waterRes,
    bodyRes,
    sleepRes,
    nutritionGoalsRes,
  ] = await Promise.all([
    supabase
      .from("workout_history")
      .select("id, date, duration, workout_name")
      .eq("user_id", user.id)
      .gte("date", startIso)
      .lt("date", endIso),
    supabase
      .from("activity_logs")
      .select("activity_type, date")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lt("date", endDateExclusive),
    supabase
      .from("food_logs")
      .select("date, calories")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lt("date", endDateExclusive),
    supabase
      .from("water_intake")
      .select("date, amount_ml")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lt("date", endDateExclusive),
    supabase
      .from("body_measurements")
      .select("date, body_weight")
      .eq("user_id", user.id)
      .gte("date", startIso)
      .lt("date", endIso)
      .order("date", { ascending: true }),
    supabase
      .from("sleep_logs")
      .select("date, hours, quality")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lt("date", endDateExclusive),
    supabase
      .from("nutrition_goals")
      .select("water_goal_ml")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const workouts = workoutsRes.data || [];
  const activities = activitiesRes.data || [];
  const foods = foodRes.data || [];
  const waters = waterRes.data || [];
  const bodies = bodyRes.data || [];
  const sleeps = sleepRes.data || [];
  const waterGoal = nutritionGoalsRes.data?.water_goal_ml || 2500;

  empty.workouts.count = workouts.length;
  empty.workouts.totalMinutes = workouts.reduce((s: number, w: any) => s + (w.duration || 0), 0);

  empty.activities.restDays = activities.filter((a: any) => a.activity_type === "rest").length;
  empty.activities.otherCount = activities.length - empty.activities.restDays;

  const foodDays = new Set(foods.map((f: any) => f.date));
  empty.food.daysLogged = foodDays.size;
  if (foodDays.size > 0) {
    const dailyTotals: Record<string, number> = {};
    foods.forEach((f: any) => {
      dailyTotals[f.date] = (dailyTotals[f.date] || 0) + Number(f.calories || 0);
    });
    const totals = Object.values(dailyTotals);
    empty.food.avgCalories = Math.round(totals.reduce((s, x) => s + x, 0) / totals.length);
  }

  const waterByDay: Record<string, number> = {};
  waters.forEach((w: any) => {
    waterByDay[w.date] = (waterByDay[w.date] || 0) + (w.amount_ml || 0);
    empty.water.totalMl += w.amount_ml || 0;
  });
  empty.water.daysAtGoal = Object.values(waterByDay).filter((ml) => ml >= waterGoal).length;

  empty.weight.entries = bodies.filter((b: any) => b.body_weight != null).length;
  if (bodies.length > 0) {
    const last = bodies[bodies.length - 1];
    if (last?.body_weight != null) empty.weight.latestKg = Number(last.body_weight);
  }
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - 7);
  const { data: prevWeights } = await supabase
    .from("body_measurements")
    .select("date, body_weight")
    .eq("user_id", user.id)
    .gte("date", prevStart.toISOString())
    .lt("date", startIso)
    .order("date", { ascending: false })
    .limit(1);
  const prevLast = prevWeights?.[0]?.body_weight;
  if (empty.weight.latestKg != null && prevLast != null) {
    empty.weight.deltaKg = Number((empty.weight.latestKg - Number(prevLast)).toFixed(1));
  }

  if (sleeps.length > 0) {
    empty.sleep.avgHours = Number(
      (sleeps.reduce((s: number, x: any) => s + Number(x.hours || 0), 0) / sleeps.length).toFixed(1),
    );
    empty.sleep.avgQuality = Number(
      (sleeps.reduce((s: number, x: any) => s + Number(x.quality || 0), 0) / sleeps.length).toFixed(1),
    );
  }

  if (workouts.length > 0) {
    const historyIds = workouts.map((w: any) => w.id);
    const { data: weekSets } = await supabase
      .from("workout_sets")
      .select("exercise_id, exercise_name, weight, created_at")
      .in("workout_history_id", historyIds)
      .gt("weight", 0);
    const { data: priorSets } = await supabase
      .from("workout_sets")
      .select("exercise_id, weight, created_at")
      .eq("user_id", user.id)
      .gt("weight", 0)
      .lt("created_at", startIso);

    const priorMax: Record<string, number> = {};
    (priorSets || []).forEach((s: any) => {
      const base = stripExerciseSuffixes(s.exercise_id);
      const w = Number(s.weight);
      if (!priorMax[base] || w > priorMax[base]) priorMax[base] = w;
    });

    const nameMap: Record<string, string> = {};
    WORKOUTS.forEach((w) => w.exercises.forEach((ex: any) => { if (ex.name) nameMap[ex.id] = ex.name; }));
    ACCESSORY_ROUTINES.forEach((r) => r.exercises.forEach((ex: any) => { if (ex.name) nameMap[ex.id] = ex.name; }));
    Object.values(EXERCISE_SUBSTITUTIONS).flat().forEach((sub: any) => { if (sub.name) nameMap[sub.id] = sub.name; });
    Object.values(ACCESSORY_SUBSTITUTIONS).flat().forEach((sub: any) => { if (sub.name) nameMap[sub.id] = sub.name; });
    EXERCISE_LIBRARY.forEach((ex) => { if (ex.name) nameMap[ex.id] = ex.name; });

    const newMax: Record<string, { weight: number; name: string }> = {};
    (weekSets || []).forEach((s: any) => {
      const base = stripExerciseSuffixes(s.exercise_id);
      const w = Number(s.weight);
      const prior = priorMax[base] || 0;
      if (w > prior) {
        if (!newMax[base] || w > newMax[base].weight) {
          const resolvedName =
            nameMap[s.exercise_id] ?? nameMap[base] ??
            (looksLikeExerciseName(s.exercise_name) ? s.exercise_name : base);
          newMax[base] = { weight: w, name: resolvedName };
        }
      }
    });
    const prList = Object.values(newMax);
    empty.prs.count = prList.length;
    empty.prs.names = prList.map((p) => p.name).slice(0, 6);
  }

  return empty;
}
