import { fetchWorkoutHistory, fetchActivityLogs } from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";
import { Flame, Target, Dumbbell } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getUserPreferences } from "@/lib/user-preferences";
import { supabase } from "@/integrations/supabase/client";

export default function StatsBar() {
  const { user } = useAuth();
  const prefs = user ? getUserPreferences(user.id) : null;
  const weekGoal = prefs?.daysPerWeek ?? 4;

  const { data: history = [] } = useQuery({
    queryKey: queryKeys.workoutHistory(user?.id ?? ""),
    queryFn: fetchWorkoutHistory,
    enabled: !!user,
  });

  const { data: activities = [] } = useQuery({
    queryKey: queryKeys.activityLogs(user?.id ?? ""),
    queryFn: fetchActivityLogs,
    enabled: !!user,
  });

  // Fetch food log dates & water intake dates for streak
  const { data: foodDates = new Set<string>() } = useQuery({
    queryKey: queryKeys.foodLogDates(user?.id ?? ""),
    queryFn: async () => {
      const { data } = await supabase
        .from("food_logs")
        .select("date")
        .eq("user_id", user!.id);
      return new Set((data || []).map((d: any) => d.date));
    },
    enabled: !!user,
  });

  const { data: waterDates = new Set<string>() } = useQuery({
    queryKey: queryKeys.waterIntakeDates(user?.id ?? ""),
    queryFn: async () => {
      const { data } = await supabase
        .from("water_intake")
        .select("date")
        .eq("user_id", user!.id);
      return new Set((data || []).map((d: any) => d.date));
    },
    enabled: !!user,
  });

  // ── This week's session count ──────────────────────────────────────────────
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (now.getDay() || 7) + 1); // Monday
  weekStart.setHours(0, 0, 0, 0);

  const weekDays = new Set<string>();
  history.forEach((w) => {
    const d = new Date(w.date);
    if (d >= weekStart) weekDays.add(d.toISOString().split("T")[0]);
  });
  activities.forEach((a) => {
    const d = new Date(a.date + "T00:00:00");
    if (d >= weekStart) weekDays.add(a.date);
  });
  const thisWeek = weekDays.size;

  // ── Daily streak: days where user logged exercise + nutrition + water ─────
  const exerciseDates = new Set<string>();
  history.forEach((w) => exerciseDates.add(w.date.split("T")[0]));
  activities.forEach((a) => exerciseDates.add(a.date));

  const computeDailyStreak = (): number => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];

      const hasExercise = exerciseDates.has(ds);
      const hasFood = foodDates.has(ds);
      const hasWater = waterDates.has(ds);

      if (hasExercise && hasFood && hasWater) {
        streak++;
      } else if (i === 0) {
        // Today hasn't been completed yet — check yesterday
        continue;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = computeDailyStreak();

  // ── Total weight lifted ──────────────────────────────────────────────────
  const { data: totalWeightData } = useQuery({
    queryKey: queryKeys.totalWeightLifted(user?.id ?? ""),
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_sets")
        .select("weight, reps")
        .eq("user_id", user!.id);
      return (data || []).reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
    },
    enabled: !!user,
  });

  const totalKg = totalWeightData ?? 0;
  const formatWeight = (kg: number) => {
    if (kg >= 1000000) return `${(kg / 1000000).toFixed(1)}M kg`;
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}K kg`;
    return `${Math.round(kg)} kg`;
  };

  const items = [
    {
      icon: Flame,
      value: streak > 0 ? `${streak} day${streak !== 1 ? "s" : ""}` : "—",
      label: "Streak",
      color: streak > 0 ? "text-primary" : "text-muted-foreground",
    },
    {
      icon: Target,
      value: `${thisWeek}/${weekGoal}`,
      label: "This Week",
      color: thisWeek >= weekGoal ? "text-primary" : "text-foreground",
    },
    {
      icon: Dumbbell,
      value: formatWeight(totalKg),
      label: "Total Lifted",
      color: "text-foreground",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-3 gap-2"
    >
      {items.map(({ icon: Icon, value, label, color }) => (
        <div key={label} className="glass-card rounded-xl px-3 py-3 text-center">
          <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
          <p className={`font-display text-lg font-bold ${color}`}>{value}</p>
          <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
        </div>
      ))}
    </motion.div>
  );
}
