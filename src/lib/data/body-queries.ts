import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { awardXpAndNotify } from "@/lib/gamification/notify";

export interface DailyLog {
  id: string;
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  calorie_goal: number;
  protein_goal_g: number;
  carbs_goal_g: number;
  fat_goal_g: number;
  water_goal_ml: number;
  weight_kg: number | null;
  created_at: string;
}

export async function saveBodyMeasurement(data: {
  bodyWeight?: number;
  bodyFatPct?: number;
  notes?: string;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("body_measurements")
    .insert({
      user_id: user.id,
      body_weight: data.bodyWeight || null,
      body_fat_pct: data.bodyFatPct || null,
      notes: data.notes || null,
    });

  return !error;
}

export async function fetchBodyMeasurements(): Promise<{
  id: string;
  date: string;
  bodyWeight: number | null;
  bodyFatPct: number | null;
  notes: string | null;
}[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  if (error || !data) return [];

  return data.map(m => ({
    id: m.id,
    date: m.date,
    bodyWeight: m.body_weight ? Number(m.body_weight) : null,
    bodyFatPct: m.body_fat_pct ? Number(m.body_fat_pct) : null,
    notes: m.notes,
  }));
}

export async function saveDailyLog(data: {
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  calorie_goal: number;
  protein_goal_g: number;
  carbs_goal_g: number;
  fat_goal_g: number;
  water_goal_ml: number;
  weight_kg?: number | null;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("daily_logs")
    .upsert(
      {
        user_id: user.id,
        date: data.date,
        calories: data.calories,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g,
        water_ml: data.water_ml,
        calorie_goal: data.calorie_goal,
        protein_goal_g: data.protein_goal_g,
        carbs_goal_g: data.carbs_goal_g,
        fat_goal_g: data.fat_goal_g,
        water_goal_ml: data.water_goal_ml,
        weight_kg: data.weight_kg ?? null,
      },
      { onConflict: "user_id,date" }
    );

  if (error) {
    console.error("Error saving daily log:", error);
    toast.error("Failed to save: " + error.message);
  }

  return !error;
}

export async function hasDayBeenCompleted(date: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("daily_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  return !!data;
}

export async function fetchDailyLogs(): Promise<DailyLog[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  if (error || !data) return [];

  return data.map((r: any) => ({
    id: r.id,
    date: r.date,
    calories: r.calories,
    protein_g: Number(r.protein_g),
    carbs_g: Number(r.carbs_g),
    fat_g: Number(r.fat_g),
    water_ml: r.water_ml,
    calorie_goal: r.calorie_goal,
    protein_goal_g: Number(r.protein_goal_g),
    carbs_goal_g: Number(r.carbs_goal_g),
    fat_goal_g: Number(r.fat_goal_g),
    water_goal_ml: r.water_goal_ml,
    weight_kg: r.weight_kg ? Number(r.weight_kg) : null,
    created_at: r.created_at,
  }));
}
