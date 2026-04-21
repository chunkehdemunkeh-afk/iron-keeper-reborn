import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Scale, Utensils, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { toast } from "sonner";
import CompleteDaySummary from "@/components/food/CompleteDaySummary";
import { saveDailyLog, hasDayBeenCompleted } from "@/lib/cloud-data";

interface DayStatus {
  weightLogged: boolean;
  foodLogged: boolean;
  waterLogged: boolean;
  totals: { calories: number; protein: number; carbs: number; fat: number };
  goals: { calories: number; protein_g: number; carbs_g: number; fat_g: number } | null;
  waterMl: number;
  waterGoalMl: number;
  weightKg: number | null;
}

interface Props {
  date?: string;
}

export default function HomeCompleteDay({ date }: Props) {
  const { user } = useAuth();
  const targetDate = date || format(new Date(), "yyyy-MM-dd");
  const [status, setStatus] = useState<DayStatus | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [dayCompleted, setDayCompleted] = useState(false);

  const fetchStatus = async () => {
    if (!user) return null;
    const [weightRes, foodRes, waterRes, goalsRes, completed] = await Promise.all([
      supabase
        .from("body_measurements")
        .select("body_weight")
        .eq("user_id", user.id)
        .gte("date", targetDate + "T00:00:00")
        .lte("date", targetDate + "T23:59:59")
        .order("date", { ascending: false })
        .limit(1),
      supabase
        .from("food_logs")
        .select("calories, protein_g, carbs_g, fat_g")
        .eq("user_id", user.id)
        .eq("date", targetDate),
      supabase
        .from("water_intake")
        .select("amount_ml")
        .eq("user_id", user.id)
        .eq("date", targetDate),
      supabase
        .from("nutrition_goals")
        .select("calories, protein_g, carbs_g, fat_g, water_goal_ml")
        .eq("user_id", user.id)
        .maybeSingle(),
      hasDayBeenCompleted(targetDate),
    ]);

    const foods = foodRes.data || [];
    const totals = foods.reduce(
      (a: any, l: any) => ({
        calories: a.calories + l.calories,
        protein: a.protein + l.protein_g,
        carbs: a.carbs + l.carbs_g,
        fat: a.fat + l.fat_g,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    const waterEntries = waterRes.data || [];
    const waterMl = waterEntries.reduce((s: number, e: any) => s + e.amount_ml, 0);
    const goals = goalsRes.data as any;
    const latestWeight = weightRes.data?.[0]?.body_weight ?? null;

    const next: DayStatus = {
      weightLogged: (weightRes.data || []).length > 0,
      foodLogged: foods.length > 0,
      waterLogged: waterMl > 0,
      totals,
      goals: goals
        ? { calories: goals.calories, protein_g: goals.protein_g, carbs_g: goals.carbs_g, fat_g: goals.fat_g }
        : null,
      waterMl,
      waterGoalMl: goals?.water_goal_ml || 2500,
      weightKg: latestWeight ? Number(latestWeight) : null,
    };

    setStatus(next);
    setDayCompleted(completed as boolean);
    return next;
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, targetDate]);

  // Refresh when tab regains focus / page becomes visible (catches edits in other components)
  useEffect(() => {
    const onFocus = () => fetchStatus();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchStatus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, targetDate]);

  if (!user || !status) return null;

  const missingItems: { icon: typeof Scale; label: string }[] = [];
  if (!status.weightLogged) missingItems.push({ icon: Scale, label: "Body weight" });
  if (!status.foodLogged) missingItems.push({ icon: Utensils, label: "Nutrition" });
  if (!status.waterLogged) missingItems.push({ icon: Droplet, label: "Water intake" });

  const handleComplete = async () => {
    // Refetch right before deciding so we don't show stale "missing" warnings
    // when the user has just logged water/food/weight elsewhere on the page.
    const fresh = await fetchStatus();
    const s = fresh ?? status;
    if (!s) return;

    const stillMissing =
      !s.weightLogged || !s.foodLogged || !s.waterLogged;

    if (stillMissing) {
      setShowWarning(true);
    } else {
      openSummary();
    }
  };

  const openSummary = async () => {
    setShowWarning(false);

    // Save the snapshot to the database
    if (status.goals) {
      await saveDailyLog({
        date: targetDate,
        calories: Math.round(status.totals.calories),
        protein_g: status.totals.protein,
        carbs_g: status.totals.carbs,
        fat_g: status.totals.fat,
        water_ml: status.waterMl,
        calorie_goal: status.goals.calories,
        protein_goal_g: status.goals.protein_g,
        carbs_goal_g: status.goals.carbs_g,
        fat_goal_g: status.goals.fat_g,
        water_goal_ml: status.waterGoalMl,
        weight_kg: status.weightKg,
      });
    } else {
      // No goals set — still save what we have with zero goals
      await saveDailyLog({
        date: targetDate,
        calories: Math.round(status.totals.calories),
        protein_g: status.totals.protein,
        carbs_g: status.totals.carbs,
        fat_g: status.totals.fat,
        water_ml: status.waterMl,
        calorie_goal: 0,
        protein_goal_g: 0,
        carbs_goal_g: 0,
        fat_goal_g: 0,
        water_goal_ml: status.waterGoalMl,
        weight_kg: status.weightKg,
      });
    }

    setDayCompleted(true);

    if (status.goals) {
      // Show the tips summary sheet
      setShowSummary(true);
    } else {
      toast.success("Day completed!");
    }
  };

  return (
    <>
      {/* Button OR badge — never both */}
      {dayCompleted ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3"
        >
          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          <span className="text-sm font-semibold text-green-400">Day Logged</span>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Button
            onClick={handleComplete}
            className="w-full rounded-xl gradient-primary py-6 text-sm font-bold text-primary-foreground glow-primary"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Complete Day
          </Button>
        </motion.div>
      )}

      {/* Missing items warning — always in the tree so AnimatePresence works */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowWarning(false)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-5"
              style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
            >
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />

              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-bold font-display">Before you finish...</h2>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                You haven't logged the following:
              </p>

              <div className="space-y-2 mb-5">
                {missingItems.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
                    <Icon className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-foreground">{label}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowWarning(false)} className="flex-1">
                  Go back &amp; log
                </Button>
                <Button onClick={openSummary} className="flex-1">
                  Complete anyway
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary sheet — always in the tree, only opens when showSummary is true */}
      {status.goals && (
        <CompleteDaySummary
          open={showSummary}
          onClose={() => setShowSummary(false)}
          totals={status.totals}
          goals={status.goals}
          waterMl={status.waterMl}
          waterGoalMl={status.waterGoalMl}
        />
      )}
    </>
  );
}
