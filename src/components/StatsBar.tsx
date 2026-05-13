import { fetchWorkoutHistory, fetchActivityLogs } from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";
import { Flame, Target, Dumbbell } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getUserPreferences } from "@/lib/user-preferences";
import { supabase } from "@/integrations/supabase/client";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { mondayOfWeek } from "@/lib/data/utils";

type VolumeWindow = "week" | "month" | "all";

const VOLUME_LABELS: Record<VolumeWindow, string> = {
  week: "this week",
  month: "this month",
  all: "all time",
};

const VOLUME_TOOLTIPS: Record<VolumeWindow, string> = {
  week: "Total weight × reps from every working set this week (Mon–Sun). Tap to switch window.",
  month: "Total weight × reps from every working set in the last 30 days. Tap to switch window.",
  all: "Total weight × reps from every working set you've ever logged. Tap to switch window.",
};

function formatWeight(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M`;
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)}K`;
  return `${Math.round(kg)}`;
}

export default function StatsBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const prefs = user ? getUserPreferences(user.id) : null;
  const weekGoal = prefs?.daysPerWeek ?? 4;
  const hasGoal = !!prefs?.daysPerWeek;

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

  // Sets with their workout date — for windowed volume.
  const { data: setsWithDate = [] } = useQuery<Array<{ weight: number; reps: number; date: string }>>({
    queryKey: ["sets-with-date", user?.id ?? ""],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_sets")
        .select("weight, reps, workout_history!inner(date, user_id)")
        .eq("workout_history.user_id", user!.id);
      return (data || []).map((s: any) => ({
        weight: s.weight || 0,
        reps: s.reps || 0,
        date: (s.workout_history?.date || "").split("T")[0],
      }));
    },
    enabled: !!user,
  });

  // ── Volume window (cycle on tap) ──────────────────────────────────────────
  const [volumeWindow, setVolumeWindow] = useState<VolumeWindow>("week");
  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(STORAGE_KEYS.statsBarVolumeWindow(user.id));
    if (stored === "week" || stored === "month" || stored === "all") {
      setVolumeWindow(stored);
    }
  }, [user]);

  const cycleVolumeWindow = () => {
    const order: VolumeWindow[] = ["week", "month", "all"];
    const next = order[(order.indexOf(volumeWindow) + 1) % order.length];
    setVolumeWindow(next);
    if (user) localStorage.setItem(STORAGE_KEYS.statsBarVolumeWindow(user.id), next);
  };

  const volumeKg = useMemo(() => {
    if (!setsWithDate.length) return 0;
    if (volumeWindow === "all") {
      return setsWithDate.reduce((sum, s) => sum + s.weight * s.reps, 0);
    }
    const cutoff = new Date();
    if (volumeWindow === "week") {
      cutoff.setTime(new Date(mondayOfWeek(new Date()) + "T00:00:00").getTime());
    } else {
      cutoff.setDate(cutoff.getDate() - 30);
      cutoff.setHours(0, 0, 0, 0);
    }
    return setsWithDate.reduce((sum, s) => {
      if (!s.date) return sum;
      const d = new Date(s.date + "T00:00:00");
      return d >= cutoff ? sum + s.weight * s.reps : sum;
    }, 0);
  }, [setsWithDate, volumeWindow]);

  // ── This week's session count ──────────────────────────────────────────────
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (now.getDay() || 7) + 1);
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

  // ── Daily streak: any activity counts (workout OR food OR water) ──────────
  const exerciseDates = new Set<string>();
  history.forEach((w) => exerciseDates.add(w.date.split("T")[0]));
  activities.forEach((a) => exerciseDates.add(a.date));

  const computeStreak = (): number => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const logged = exerciseDates.has(ds) || foodDates.has(ds) || waterDates.has(ds);
      if (logged) {
        streak++;
      } else if (i === 0) {
        // today not yet logged — don't break streak
        continue;
      } else {
        break;
      }
    }
    return streak;
  };
  const streak = computeStreak();

  const goalReached = hasGoal && thisWeek >= weekGoal;

  const items = [
    {
      icon: Flame,
      value: streak > 0 ? `${streak}` : "—",
      unit: streak > 0 ? (streak === 1 ? "day" : "days") : null,
      label: streak > 0 ? "Streak" : "No streak yet",
      subLabel: streak > 0 ? "any activity logged" : "log a workout, meal or water",
      tooltip: "Counts each day you logged a workout, a meal, or water. Today doesn't break it until tomorrow.",
      active: streak > 0,
      onClick: () => navigate("/history"),
    },
    {
      icon: Target,
      value: `${thisWeek}`,
      unit: hasGoal ? `/${weekGoal}` : null,
      label: hasGoal ? "Sessions" : "Sessions",
      subLabel: hasGoal
        ? goalReached
          ? "weekly goal hit ✓"
          : `Mon–Sun · goal ${weekGoal}`
        : "tap to set a goal",
      tooltip: hasGoal
        ? `Workouts + cardio sessions this week (Mon–Sun). Your goal is ${weekGoal}/week.`
        : "Workouts + cardio sessions this week. Tap to set a weekly goal.",
      active: thisWeek > 0,
      onClick: () => navigate(hasGoal ? "/sessions" : "/onboarding"),
    },
    {
      icon: Dumbbell,
      value: volumeKg > 0 ? formatWeight(volumeKg) : "—",
      unit: volumeKg > 0 ? "kg" : null,
      label: "Volume",
      subLabel: VOLUME_LABELS[volumeWindow],
      tooltip: VOLUME_TOOLTIPS[volumeWindow],
      active: volumeKg > 0,
      onClick: cycleVolumeWindow,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-3 gap-2"
    >
      {items.map(({ icon: Icon, value, unit, label, subLabel, tooltip, active, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          title={tooltip}
          className={`glass-card rounded-xl px-2.5 py-3 text-center active:scale-[0.97] transition-transform ${active ? "" : "opacity-70"}`}
        >
          <Icon className={`h-4 w-4 mx-auto mb-1 ${active ? "text-primary" : "text-muted-foreground/60"}`} />
          <p className={`font-display text-lg font-bold tabular-nums leading-tight ${active ? "text-foreground" : "text-muted-foreground"}`}>
            {value}
            {unit && <span className="text-[11px] text-muted-foreground font-normal ml-0.5">{unit}</span>}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-tight">{label}</p>
          <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-tight truncate">{subLabel}</p>
        </button>
      ))}
    </motion.div>
  );
}
