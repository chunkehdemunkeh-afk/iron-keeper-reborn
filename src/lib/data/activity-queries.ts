import { supabase } from "@/integrations/supabase/client";
import { lookupUserBodyweight } from "./nutrition-queries";

export type ActivityLog = {
  id: string;
  date: string;
  activityType: string;
  label: string | null;
  duration: number;
  notes: string | null;
  distanceKm: number | null;
  inclinePct: number | null;
  caloriesBurned: number | null;
};

export const ACTIVITY_PRESETS = [
  { type: "rest", label: "Rest Day", icon: "bed" },
  { type: "walk", label: "Walk", icon: "footprints" },
  { type: "running", label: "Running", icon: "run" },
  { type: "swimming", label: "Swimming", icon: "waves" },
  { type: "cycling", label: "Cycling", icon: "bike" },
  { type: "yoga", label: "Yoga", icon: "flower" },
  { type: "football", label: "Football", icon: "circle-dot" },
  { type: "other", label: "Other", icon: "pencil" },
];

export async function saveActivityLog(data: {
  date: string;
  activityType: string;
  label?: string;
  duration?: number;
  notes?: string;
  distanceKm?: number | null;
  inclinePct?: number | null;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { estimateCardioBurn } = await import("../calorie-burn");
  const bodyweight = await lookupUserBodyweight(user.id);
  const caloriesBurned = estimateCardioBurn({
    activityType: data.activityType,
    durationMin: data.duration || 0,
    distanceKm: data.distanceKm ?? null,
    inclinePct: data.inclinePct ?? null,
    weightKg: bodyweight,
  });

  const { error } = await supabase
    .from("activity_logs")
    .insert({
      user_id: user.id,
      date: data.date,
      activity_type: data.activityType,
      label: data.label || null,
      duration: data.duration || 0,
      notes: data.notes || null,
      distance_km: data.distanceKm ?? null,
      incline_pct: data.inclinePct ?? null,
      calories_burned: caloriesBurned,
    });

  if (!error && data.date === new Date().toISOString().split("T")[0]) {
    try {
      const { recomputeTodayStrain } = await import("./biometric-queries");
      await recomputeTodayStrain();
    } catch (e) {
      console.error("Strain recompute failed:", e);
    }
  }

  return !error;
}

export async function fetchActivityLogs(): Promise<ActivityLog[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error || !data) return [];

  return data.map(a => ({
    id: a.id,
    date: a.date,
    activityType: a.activity_type,
    label: a.label,
    duration: a.duration ?? 0,
    notes: a.notes,
    distanceKm: a.distance_km !== null && a.distance_km !== undefined ? Number(a.distance_km) : null,
    inclinePct: a.incline_pct ?? null,
    caloriesBurned: a.calories_burned ?? null,
  }));
}

export async function deleteActivityLog(id: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("activity_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return !error;
}
