import { useState, useEffect } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Flame, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

interface Goals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface DayData {
  day: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function WeeklyNutritionChart({ goals }: { goals: Goals | null }) {
  const { user } = useAuth();
  const [data, setData] = useState<DayData[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const startDate = format(weekStart, "yyyy-MM-dd");
    const endDate = format(weekEnd, "yyyy-MM-dd");

    supabase
      .from("food_logs")
      .select("date, calories, protein_g, carbs_g, fat_g")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .then(({ data: logs }) => {
        // Build Mon-Sun array
        const days: DayData[] = [];
        for (let i = 0; i < 7; i++) {
          const d = addDays(weekStart, i);
          const dateStr = format(d, "yyyy-MM-dd");
          const dayLogs = (logs || []).filter((l: any) => l.date === dateStr);
          days.push({
            day: format(d, "EEE"),
            date: dateStr,
            calories: Math.round(dayLogs.reduce((s: number, l: any) => s + l.calories, 0)),
            protein: Math.round(dayLogs.reduce((s: number, l: any) => s + l.protein_g, 0)),
            carbs: Math.round(dayLogs.reduce((s: number, l: any) => s + l.carbs_g, 0)),
            fat: Math.round(dayLogs.reduce((s: number, l: any) => s + l.fat_g, 0)),
          });
        }
        setData(days);
        setLoading(false);
      });
  }, [user]);

  if (loading || data.every((d) => d.calories === 0)) return null;

  const trackedDays = data.filter((d) => d.calories > 0);
  const trackedCount = trackedDays.length || 1;
  const avgCals = Math.round(trackedDays.reduce((s, d) => s + d.calories, 0) / trackedCount);
  const avgProtein = Math.round(trackedDays.reduce((s, d) => s + d.protein, 0) / trackedCount);
  const avgCarbs = Math.round(trackedDays.reduce((s, d) => s + d.carbs, 0) / trackedCount);
  const avgFat = Math.round(trackedDays.reduce((s, d) => s + d.fat, 0) / trackedCount);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as DayData;
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="font-semibold mb-1">{d.day} — {d.calories} kcal</p>
        <p className="text-blue-400">P: {d.protein}g</p>
        <p className="text-amber-400">C: {d.carbs}g</p>
        <p className="text-rose-400">F: {d.fat}g</p>
      </div>
    );
  };

  return (
    <div className="mx-4 rounded-2xl bg-card border border-border overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3"
      >
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Weekly Overview</span>
          <span className="text-[10px] text-muted-foreground">avg {avgCals} kcal/day</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Calorie bar chart */}
            <div className="px-3 pb-2">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={data} barSize={20}>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide domain={[0, "auto"]} />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  {goals && (
                    <ReferenceLine
                      y={goals.calories}
                      stroke="hsl(var(--primary))"
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                    />
                  )}
                  <Bar dataKey="calories" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {goals && (
                <p className="text-[9px] text-muted-foreground text-center -mt-1">
                  Dashed line = {goals.calories} kcal goal
                </p>
              )}
            </div>

            {/* Macro averages */}
            <div className="grid grid-cols-3 gap-2 px-3 pb-3">
              {[
                { label: "Protein", value: avgProtein, target: goals?.protein_g, color: "text-blue-400" },
                { label: "Carbs", value: avgCarbs, target: goals?.carbs_g, color: "text-amber-400" },
                { label: "Fat", value: avgFat, target: goals?.fat_g, color: "text-rose-400" },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <p className={`text-sm font-bold ${m.color}`}>{m.value}g</p>
                  <p className="text-[9px] text-muted-foreground">
                    {m.label} avg{m.target ? ` / ${m.target}g` : ""}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
