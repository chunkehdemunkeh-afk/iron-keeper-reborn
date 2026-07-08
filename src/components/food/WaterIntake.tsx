import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Droplet, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { awardXpAndNotify } from "@/lib/gamification/notify";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface Props {
  date: string;
}

const GLASS_ML = 250;

export default function WaterIntake({ date }: Props) {
  const { user } = useAuth();
  const [totalMl, setTotalMl] = useState(0);
  const [entryIds, setEntryIds] = useState<string[]>([]);
  const [goalMl, setGoalMl] = useState(2500);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const invalidateLive = useCallback(() => {
    if (!user) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.waterIntakeDates(user.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dailyScores(user.id) });
  }, [queryClient, user]);

  // Fetch user's water goal
  useEffect(() => {
    if (!user) return;
    supabase
      .from("nutrition_goals")
      .select("water_goal_ml")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.water_goal_ml) setGoalMl(data.water_goal_ml);
      })
      .catch(() => {});
  }, [user]);

  const fetchWater = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("water_intake")
      .select("id, amount_ml")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("created_at");
    const entries = data || [];
    setEntryIds(entries.map((e: any) => e.id));
    setTotalMl(entries.reduce((s: number, e: any) => s + e.amount_ml, 0));
    setLoading(false);
  }, [user, date]);

  useEffect(() => { fetchWater(); }, [fetchWater]);

  const addGlass = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("water_intake")
      .insert({ user_id: user.id, date, amount_ml: GLASS_ML })
      .select("id")
      .single();
    if (error) { toast.error("Failed to log water"); return; }
    setEntryIds((prev) => [...prev, data.id]);
    const newTotal = totalMl + GLASS_ML;
    setTotalMl(newTotal);
    if (totalMl < goalMl && newTotal >= goalMl) {
      void awardXpAndNotify({ source: "water_goal" });
    }
    invalidateLive();
  };

  const removeGlass = async () => {
    if (!user || entryIds.length === 0) return;
    const lastId = entryIds[entryIds.length - 1];
    await supabase.from("water_intake").delete().eq("id", lastId);
    setEntryIds((prev) => prev.slice(0, -1));
    setTotalMl((prev) => Math.max(0, prev - GLASS_ML));
    invalidateLive();
  };

  const glasses = Math.round(totalMl / GLASS_ML);
  const goalGlasses = Math.round(goalMl / GLASS_ML);
  const pct = Math.min(100, Math.round((totalMl / goalMl) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 rounded-xl bg-card border border-border p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
            <Droplet className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Water</p>
            <p className="text-[10px] text-muted-foreground">{glasses}/{goalGlasses} glasses · {(totalMl / 1000).toFixed(1)}L / {(goalMl / 1000).toFixed(1)}L</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={removeGlass}
            disabled={glasses === 0}
            className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all active:scale-95"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={addGlass}
            className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/25 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-blue-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Glass icons */}
      <div className="flex flex-wrap gap-1 mt-2">
        {Array.from({ length: goalGlasses }).map((_, i) => (
          <Droplet
            key={i}
            className={`h-3.5 w-3.5 transition-colors ${
              i < glasses ? "text-blue-400 fill-blue-400/30" : "text-muted-foreground/20"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}
