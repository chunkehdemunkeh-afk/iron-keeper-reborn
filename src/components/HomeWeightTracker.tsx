import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, TrendingUp, TrendingDown, Minus, Plus, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type TimeRange = "7d" | "30d" | "90d";

interface Props {
  date?: string;
}

export default function HomeWeightTracker({ date }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const targetDate = date || format(new Date(), "yyyy-MM-dd");

  const [measurements, setMeasurements] = useState<{ date: string; weight: number }[]>([]);
  const [dayLogged, setDayLogged] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [range, setRange] = useState<TimeRange>("7d");

  const fetchData = async () => {
    if (!user) return;
    const cutoff = format(subDays(new Date(), 90), "yyyy-MM-dd");
    const { data } = await supabase
      .from("body_measurements")
      .select("date, body_weight")
      .eq("user_id", user.id)
      .gte("date", cutoff)
      .not("body_weight", "is", null)
      .order("date", { ascending: true });

    if (data) {
      const mapped = data.map((m: any) => ({
        date: typeof m.date === "string" ? m.date.split("T")[0] : m.date,
        weight: Number(m.body_weight),
      }));
      setMeasurements(mapped);
      setDayLogged(mapped.some((m) => m.date === targetDate));
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, targetDate]);

  const handleLog = async () => {
    if (!weight || !user) return;
    setSaving(true);
    // Use target date for the measurement
    const dateObj = new Date(targetDate + "T12:00:00");
    const { error } = await supabase.from("body_measurements").insert({
      user_id: user.id,
      body_weight: Number(weight),
      date: dateObj.toISOString(),
    });
    setSaving(false);
    if (!error) {
      toast.success("Weight logged!");
      setWeight("");
      setShowInput(false);
      fetchData();
    } else {
      toast.error("Failed to save weight");
    }
  };

  // Filter by range
  const rangeDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoffDate = format(subDays(new Date(), rangeDays), "yyyy-MM-dd");
  const filtered = measurements.filter((m) => m.date >= cutoffDate);

  // Weekly average — Monday to Sunday (current calendar week)
  const thisWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const thisWeekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const thisWeek = measurements.filter((m) => m.date >= thisWeekStart && m.date <= thisWeekEnd);
  const weekAvg = thisWeek.length > 0 ? thisWeek.reduce((s, m) => s + m.weight, 0) / thisWeek.length : null;

  // Latest weight
  const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null;

  // Trend: compare this week avg to previous calendar week avg (Mon-Sun)
  const prevWeekStart = format(startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const prevWeekEnd = format(endOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const prevWeek = measurements.filter((m) => m.date >= prevWeekStart && m.date <= prevWeekEnd);
  const prevAvg = prevWeek.length > 0 ? prevWeek.reduce((s, m) => s + m.weight, 0) / prevWeek.length : null;

  const trendDiff = weekAvg && prevAvg ? weekAvg - prevAvg : null;
  const TrendIcon = trendDiff === null ? Minus : trendDiff > 0.1 ? TrendingUp : trendDiff < -0.1 ? TrendingDown : Minus;
  const trendColor = trendDiff === null ? "text-muted-foreground" : trendDiff > 0.1 ? "text-amber-400" : trendDiff < -0.1 ? "text-green-400" : "text-muted-foreground";

  // Mini sparkline bars
  const maxW = filtered.length > 0 ? Math.max(...filtered.map((m) => m.weight)) : 0;
  const minW = filtered.length > 0 ? Math.min(...filtered.map((m) => m.weight)) : 0;
  const wRange = maxW - minW || 1;

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card rounded-xl p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Body Weight
        </p>
        <div className="flex items-center gap-2">
          {!dayLogged && !showInput && (
            <button
              onClick={() => setShowInput(true)}
              className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1"
            >
              <Plus className="h-3 w-3" /> Log
            </button>
          )}
          <button
            onClick={() => navigate("/body")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quick log input */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 75.2"
                autoFocus
                className="flex-1 h-9 rounded-lg bg-muted/50 border border-border/50 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
                style={{ fontSize: "16px" }}
                onKeyDown={(e) => e.key === "Enter" && handleLog()}
              />
              <button
                onClick={handleLog}
                disabled={saving || !weight}
                className="rounded-lg gradient-primary px-4 h-9 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                {saving ? "..." : "Save"}
              </button>
              <button
                onClick={() => { setShowInput(false); setWeight(""); }}
                className="h-9 px-2 text-muted-foreground text-xs"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day logged badge */}
      {dayLogged && (
        <div className="flex items-center gap-1.5 mb-3 text-[10px] text-green-400 font-medium">
          <Scale className="h-3 w-3" /> Weight logged for this day
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <Scale className="h-3.5 w-3.5 mx-auto mb-0.5 text-primary" />
          <p className="text-base font-bold text-foreground">{latest ? `${latest.weight}` : "—"}</p>
          <p className="text-[9px] text-muted-foreground">Latest (kg)</p>
        </div>
        <div className="text-center">
          <Minus className="h-3.5 w-3.5 mx-auto mb-0.5 text-blue-400" />
          <p className="text-base font-bold text-foreground">{weekAvg ? weekAvg.toFixed(1) : "—"}</p>
          <p className="text-[9px] text-muted-foreground">Week Avg (Mon–Sun)</p>
        </div>
        <div className="text-center">
          <TrendIcon className={`h-3.5 w-3.5 mx-auto mb-0.5 ${trendColor}`} />
          <p className={`text-base font-bold ${trendColor}`}>
            {trendDiff !== null ? `${trendDiff > 0 ? "+" : ""}${trendDiff.toFixed(1)}` : "—"}
          </p>
          <p className="text-[9px] text-muted-foreground">vs Prev Week</p>
        </div>
      </div>

      {/* Range tabs */}
      <div className="flex gap-1 mb-2">
        {(["7d", "30d", "90d"] as TimeRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 text-[10px] font-semibold py-1 rounded-md transition-colors ${
              range === r
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {r === "7d" ? "Week" : r === "30d" ? "Month" : "3 Months"}
          </button>
        ))}
      </div>

      {/* Mini bar chart */}
      {filtered.length > 0 ? (
        <div className="flex items-end gap-[2px] h-12">
          {filtered.map((m) => {
            const pct = ((m.weight - minW) / wRange) * 70 + 30;
            return (
              <div
                key={m.date}
                className="flex-1 rounded-t bg-primary/60 hover:bg-primary transition-colors relative group"
                style={{ height: `${pct}%` }}
                title={`${m.date}: ${m.weight}kg`}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] text-foreground bg-card px-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                  {m.weight}kg
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-3">
          <p className="text-xs text-muted-foreground">No weight data yet</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Start logging daily to see your trend</p>
        </div>
      )}

      {/* Encouragement if not logging daily */}
      {!dayLogged && measurements.length > 0 && (
        <p className="text-[10px] text-amber-400/80 mt-2 text-center">
          Log your weight daily for a more accurate weekly average
        </p>
      )}
    </motion.div>
  );
}
