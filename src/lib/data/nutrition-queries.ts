import { supabase } from "@/integrations/supabase/client";

export type DailyBurn = {
  date: string;
  strengthKcal: number;
  cardioKcal: number;
  totalKcal: number;
};

export type WeeklyBurn = {
  weekStart: string;
  totalKcal: number;
  strengthKcal: number;
  cardioKcal: number;
  dailyBreakdown: DailyBurn[];
};

/**
 * Look up the most recent body weight for burn calculations.
 * Falls back to TDEE weight from nutrition_goals, then to 75 kg.
 */
export async function lookupUserBodyweight(userId: string): Promise<number> {
  const [{ data: bm }, { data: ng }] = await Promise.all([
    supabase
      .from("body_measurements")
      .select("body_weight")
      .eq("user_id", userId)
      .not("body_weight", "is", null)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("nutrition_goals")
      .select("tdee_weight_kg")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const bw = bm?.body_weight ? Number(bm.body_weight) : null;
  const tdeeBw = ng?.tdee_weight_kg ? Number(ng.tdee_weight_kg) : null;
  return bw ?? tdeeBw ?? 75;
}

/** Sum strength + cardio kcal for a single date (local YYYY-MM-DD). */
export async function fetchDailyBurn(date: string): Promise<DailyBurn> {
  const { data: { user } } = await supabase.auth.getUser();
  const empty: DailyBurn = { date, strengthKcal: 0, cardioKcal: 0, totalKcal: 0 };
  if (!user) return empty;

  const startISO = `${date}T00:00:00.000Z`;
  const endISO = `${date}T23:59:59.999Z`;

  const [{ data: wh }, { data: al }] = await Promise.all([
    supabase
      .from("workout_history")
      .select("calories_burned")
      .eq("user_id", user.id)
      .gte("date", startISO)
      .lte("date", endISO),
    supabase
      .from("activity_logs")
      .select("calories_burned")
      .eq("user_id", user.id)
      .eq("date", date),
  ]);

  const strengthKcal = (wh || []).reduce((s, r: { calories_burned: number | null }) => s + (r.calories_burned ?? 0), 0);
  const cardioKcal = (al || []).reduce((s, r: { calories_burned: number | null }) => s + (r.calories_burned ?? 0), 0);
  return { date, strengthKcal, cardioKcal, totalKcal: strengthKcal + cardioKcal };
}

/**
 * Weekly burn rollup. `weekStart` should be a Monday in `YYYY-MM-DD`.
 * Returns daily breakdown for the 7 days starting at `weekStart`.
 */
export async function fetchWeeklyBurn(weekStart: string): Promise<WeeklyBurn> {
  const { data: { user } } = await supabase.auth.getUser();
  const start = new Date(weekStart + "T00:00:00");
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  const empty: WeeklyBurn = {
    weekStart,
    totalKcal: 0,
    strengthKcal: 0,
    cardioKcal: 0,
    dailyBreakdown: days.map((date) => ({ date, strengthKcal: 0, cardioKcal: 0, totalKcal: 0 })),
  };
  if (!user) return empty;

  const startISO = `${days[0]}T00:00:00.000Z`;
  const endISO = `${days[6]}T23:59:59.999Z`;

  const [{ data: wh }, { data: al }] = await Promise.all([
    supabase
      .from("workout_history")
      .select("date, calories_burned")
      .eq("user_id", user.id)
      .gte("date", startISO)
      .lte("date", endISO),
    supabase
      .from("activity_logs")
      .select("date, calories_burned")
      .eq("user_id", user.id)
      .gte("date", days[0])
      .lte("date", days[6]),
  ]);

  const dayMap: Record<string, DailyBurn> = {};
  days.forEach((d) => (dayMap[d] = { date: d, strengthKcal: 0, cardioKcal: 0, totalKcal: 0 }));

  (wh || []).forEach((r: { date: string; calories_burned: number | null }) => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (dayMap[key]) {
      dayMap[key].strengthKcal += r.calories_burned ?? 0;
    }
  });
  (al || []).forEach((r: { date: string; calories_burned: number | null }) => {
    if (dayMap[r.date]) {
      dayMap[r.date].cardioKcal += r.calories_burned ?? 0;
    }
  });

  const dailyBreakdown = days.map((d) => {
    const day = dayMap[d];
    return { ...day, totalKcal: day.strengthKcal + day.cardioKcal };
  });

  const strengthKcal = dailyBreakdown.reduce((s, d) => s + d.strengthKcal, 0);
  const cardioKcal = dailyBreakdown.reduce((s, d) => s + d.cardioKcal, 0);

  return {
    weekStart,
    strengthKcal,
    cardioKcal,
    totalKcal: strengthKcal + cardioKcal,
    dailyBreakdown,
  };
}
