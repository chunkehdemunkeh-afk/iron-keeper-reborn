import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Flame, Beef, Wheat, Droplets, Droplet, ChevronRight, Activity, Dumbbell, Footprints } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { fetchDailyBurn } from "@/lib/cloud-data";

interface Props {
  date?: string;
}

type ViewMode = "macros" | "burn";
const VIEW_KEY = "ik-home-summary-view";

export default function HomeDailySummary({ date }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const targetDate = date || format(new Date(), "yyyy-MM-dd");
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [goals, setGoals] = useState<{ calories: number; protein_g: number; carbs_g: number; fat_g: number; water_goal_ml?: number; adjust_for_activity?: boolean } | null>(null);
  const [waterMl, setWaterMl] = useState(0);
  const [burn, setBurn] = useState<{ totalKcal: number; strengthKcal: number; cardioKcal: number }>({ totalKcal: 0, strengthKcal: 0, cardioKcal: 0 });
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "macros";
    return (localStorage.getItem(VIEW_KEY) as ViewMode) || "macros";
  });

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("food_logs")
        .select("calories, protein_g, carbs_g, fat_g")
        .eq("user_id", user.id)
        .eq("date", targetDate),
      supabase
        .from("nutrition_goals")
        .select("calories, protein_g, carbs_g, fat_g, water_goal_ml")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("water_intake")
        .select("amount_ml")
        .eq("user_id", user.id)
        .eq("date", targetDate),
    ]).then(([logsRes, goalsRes, waterRes]) => {
      const logs = logsRes.data || [];
      setTotals(logs.reduce(
        (a, l: any) => ({
          calories: a.calories + l.calories,
          protein: a.protein + l.protein_g,
          carbs: a.carbs + l.carbs_g,
          fat: a.fat + l.fat_g,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ));
      if (goalsRes.data) setGoals(goalsRes.data as any);
      const water = waterRes.data || [];
      setWaterMl(water.reduce((s: number, e: any) => s + e.amount_ml, 0));
    });
    fetchDailyBurn(targetDate).then((b) => setBurn(b));
  }, [user, targetDate]);

  if (!goals) return null;

  const pct = (val: number, target: number) => Math.min(100, Math.round((val / target) * 100));
  const waterGoal = goals.water_goal_ml || 2500;
  const caloriesOver = goals.calories > 0 && totals.calories / goals.calories >= 1.1;
  const waterLow = waterGoal > 0 && waterMl / waterGoal < 0.9;
  const calorieColor = caloriesOver ? "text-amber-400" : "text-primary";
  const calorieBar = caloriesOver ? "bg-amber-400" : "bg-primary";
  const waterTextColor = waterLow ? "text-blue-400/70" : "text-blue-400";
  const waterBar = waterLow ? "bg-blue-400/50" : "bg-blue-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => navigate("/nutrition")}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {view === "macros" ? "Nutrition" : "Energy Balance"}
        </p>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-0.5 bg-secondary rounded-full p-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setView("macros")}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                view === "macros" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
              aria-label="Show macros"
            >
              Macros
            </button>
            <button
              onClick={() => setView("burn")}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                view === "burn" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
              aria-label="Show burn"
            >
              Burn
            </button>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Calories + Water row (always visible) */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center">
          <Flame className={`h-4 w-4 mx-auto mb-1 transition-colors duration-500 ${calorieColor}`} />
          <p className={`text-lg font-bold transition-colors duration-500 ${calorieColor}`}>{Math.round(totals.calories)}</p>
          <p className="text-[10px] text-muted-foreground">/ {goals.calories} kcal</p>
          <div className="h-1 bg-secondary rounded-full mt-1.5 overflow-hidden">
            <div className={`h-full rounded-full ${calorieBar} transition-[width,background-color] duration-500 ease-out`} style={{ width: `${pct(totals.calories, goals.calories)}%` }} />
          </div>
        </div>
        <div className="text-center">
          <Droplet className={`h-4 w-4 mx-auto mb-1 transition-colors duration-500 ${waterTextColor}`} />
          <p className={`text-lg font-bold transition-colors duration-500 ${waterTextColor}`}>{(waterMl / 1000).toFixed(1)}L</p>
          <p className="text-[10px] text-muted-foreground">/ {(waterGoal / 1000).toFixed(1)}L</p>
          <div className="h-1 bg-secondary rounded-full mt-1.5 overflow-hidden">
            <div className={`h-full rounded-full ${waterBar} transition-[width,background-color] duration-500 ease-out`} style={{ width: `${pct(waterMl, waterGoal)}%` }} />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {view === "macros" ? (
          <motion.div
            key="macros"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-3 gap-2"
          >
            {[
              { label: "Protein", value: totals.protein, target: goals.protein_g, color: "bg-blue-400", icon: Beef },
              { label: "Carbs", value: totals.carbs, target: goals.carbs_g, color: "bg-amber-400", icon: Wheat },
              { label: "Fat", value: totals.fat, target: goals.fat_g, color: "bg-rose-400", icon: Droplets },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <m.icon className="h-3 w-3 mx-auto mb-0.5 text-muted-foreground" />
                <p className="text-xs font-semibold">{Math.round(m.value)}g</p>
                <div className="h-1 bg-secondary rounded-full mt-1 overflow-hidden">
                  <div className={`h-full rounded-full ${m.color} transition-all`} style={{ width: `${pct(m.value, m.target)}%` }} />
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{m.label}</p>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="burn"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => {
              e.stopPropagation();
              navigate("/progress");
            }}
            className="space-y-2"
          >
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <Activity className="h-3.5 w-3.5 mx-auto mb-0.5 text-amber-400" />
                <p className="text-base font-bold text-amber-400">{burn.totalKcal}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Total kcal</p>
              </div>
              <div className="text-center">
                <Dumbbell className="h-3.5 w-3.5 mx-auto mb-0.5 text-muted-foreground" />
                <p className="text-base font-bold">{burn.strengthKcal}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Strength</p>
              </div>
              <div className="text-center">
                <Footprints className="h-3.5 w-3.5 mx-auto mb-0.5 text-muted-foreground" />
                <p className="text-base font-bold">{burn.cardioKcal}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Cardio</p>
              </div>
            </div>
            {burn.totalKcal > 0 && (
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(burn.strengthKcal / burn.totalKcal) * 100}%` }}
                />
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${(burn.cardioKcal / burn.totalKcal) * 100}%` }}
                />
              </div>
            )}
            <p className="text-[10px] text-muted-foreground text-right">View weekly trend →</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
