import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchDailyLogs, fetchWorkoutHistory, type DailyLog } from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { CalendarCheck, GitCompare } from "lucide-react";
import { format, subDays, subWeeks, subMonths, subYears, parseISO, startOfMonth, startOfWeek, endOfWeek, addDays, getDaysInMonth, startOfYear, getMonth, setMonth } from "date-fns";

type Period = "week" | "month" | "year";
type Metric = "weight" | "calories" | "water" | "volume";

const PERIOD_LABELS: Record<Period, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
};

const METRIC_CONFIG: Record<Metric, { label: string; short: string; color: string; unit: string; areaOpacity: number }> = {
  weight: { label: "Body Weight", short: "Body Weight", color: "hsl(280, 70%, 70%)", unit: "kg", areaOpacity: 0.35 },
  calories: { label: "Calories", short: "Calories", color: "hsl(36, 95%, 60%)", unit: "kcal", areaOpacity: 0.45 },
  water: { label: "Water Intake", short: "Water", color: "hsl(190, 90%, 60%)", unit: "L", areaOpacity: 0.35 },
  volume: { label: "Total Lifted", short: "Volume", color: "hsl(36, 95%, 60%)", unit: "kg", areaOpacity: 0.35 },
};

const tooltipStyle = {
  contentStyle: { background: "hsl(220, 18%, 11%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 12, fontSize: 12 },
  labelStyle: { color: "hsl(40, 10%, 95%)" },
};

function avg(arr: number[], skipZeros = true) {
  const filtered = skipZeros ? arr.filter(v => typeof v === "number" && v > 0) : arr.filter(v => typeof v === "number");
  return filtered.length ? filtered.reduce((s, v) => s + v, 0) / filtered.length : undefined;
}

export default function DailyReviewChart() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("week");
  const [metric, setMetric] = useState<Metric>("calories");
  // Optional compare could be preserved, but might be simpler to just hide it for now, let's keep it if possible
  const [compare, setCompare] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: queryKeys.dailyLogs(user?.id ?? ""),
    queryFn: fetchDailyLogs,
    enabled: !!user,
  });

  const { data: volumeByDate = {} } = useQuery({
    queryKey: queryKeys.dailyVolume(user?.id ?? ""),
    queryFn: async () => {
      if (!user) return {};
      const { data: hData } = await supabase.from("workout_history").select("id, date").eq("user_id", user.id);
      if (!hData || hData.length === 0) return {};
      // Safely transform UTC timestamp into correctly shifted local YYYY-MM-DD
      const historyToDate = Object.fromEntries(hData.map((h: any) => [h.id, format(new Date(h.date), "yyyy-MM-dd")]));
      
      const historyIds = Object.keys(historyToDate);
      if (historyIds.length === 0) return {};
      
      const vMap: Record<string, number> = {};
      const chunkSize = 30; // Max 30 UUIDs per query to prevent 414 URI Too Long errors
      for (let i = 0; i < historyIds.length; i += chunkSize) {
        const chunk = historyIds.slice(i, i + chunkSize);
        const { data: sData } = await supabase.from("workout_sets").select("workout_history_id, reps, weight").in("workout_history_id", chunk);
        if (sData) {
          sData.forEach((s: any) => {
            const date = historyToDate[s.workout_history_id];
            if (date) vMap[date] = (vMap[date] || 0) + (s.reps * s.weight);
          });
        }
      }
      return vMap;
    },
    enabled: !!user
  });

  const chartData = useMemo(() => {
    const todayLog = logs.find(l => l.date === format(new Date(), "yyyy-MM-dd"));
    
    // Helper to get day value securely
    const getVal = (dateKey: string, isPrev = false) => {
      // Find the specific date from the logs
      const log = logs.find(l => l.date === dateKey);
      const data = {
        weight: log?.weight_kg && log.weight_kg > 0 ? log.weight_kg : undefined,
        calories: log?.calories && log.calories > 0 ? log.calories : undefined,
        water: log?.water_ml && log.water_ml > 0 ? log.water_ml / 1000 : undefined,
        volume: volumeByDate[dateKey] && volumeByDate[dateKey] > 0 ? volumeByDate[dateKey] : undefined
      };
      return data;
    };

    if (period === "week") {
      // Current week (Mon-Sun)
      const start = startOfWeek(new Date(), { weekStartsOn: 1 });
      const prevStart = subWeeks(start, 1);

      return Array.from({ length: 7 }).map((_, i) => {
        const curDate = format(addDays(start, i), "yyyy-MM-dd");
        const prevDate = format(addDays(prevStart, i), "yyyy-MM-dd");
        const v = getVal(curDate);
        const pv = getVal(prevDate);
        
        return {
          label: format(addDays(start, i), "EEE"), // Mon, Tue...
          weight: v.weight, calories: v.calories, water: v.water, volume: v.volume,
          prevWeight: pv.weight, prevCalories: pv.calories, prevWater: pv.water, prevVolume: pv.volume,
        };
      });
    }

    if (period === "month") {
      // Weeks of current month
      const start = startOfMonth(new Date());
      const daysInMonth = getDaysInMonth(new Date());
      const numWeeks = Math.ceil(daysInMonth / 7);
      
      const prevMonthStart = startOfMonth(subMonths(new Date(), 1));

      return Array.from({ length: Math.max(numWeeks, 4) }).map((_, wIndex) => {
        // Collect days for this week
        const curVals = { weight: [] as number[], calories: [] as number[], water: [] as number[], volume: [] as number[] };
        const prevVals = { weight: [] as number[], calories: [] as number[], water: [] as number[], volume: [] as number[] };
        
        for (let d = 0; d < 7; d++) {
          const dayOffset = (wIndex * 7) + d;
          if (dayOffset < daysInMonth) {
             const cDate = format(addDays(start, dayOffset), "yyyy-MM-dd");
             const cData = getVal(cDate);
             if (cData.weight) curVals.weight.push(cData.weight);
             if (cData.calories) curVals.calories.push(cData.calories);
             if (cData.water) curVals.water.push(cData.water);
             if (cData.volume) curVals.volume.push(cData.volume);
          }
          // For prev month, rough estimate of weeks to compare against
          const pDayOffset = (wIndex * 7) + d;
          if (pDayOffset < getDaysInMonth(prevMonthStart)) {
             const pDate = format(addDays(prevMonthStart, pDayOffset), "yyyy-MM-dd");
             const pData = getVal(pDate);
             if (pData.weight) prevVals.weight.push(pData.weight);
             if (pData.calories) prevVals.calories.push(pData.calories);
             if (pData.water) prevVals.water.push(pData.water);
             if (pData.volume) prevVals.volume.push(pData.volume);
          }
        }

        return {
          label: `Wk ${wIndex + 1}`,
          weight: avg(curVals.weight), calories: avg(curVals.calories), water: avg(curVals.water), volume: avg(curVals.volume),
          prevWeight: avg(prevVals.weight), prevCalories: avg(prevVals.calories), prevWater: avg(prevVals.water), prevVolume: avg(prevVals.volume),
        };
      });
    }

    if (period === "year") {
      // 12 months of the year
      const year = new Date().getFullYear();
      
      return Array.from({ length: 12 }).map((_, mIndex) => {
        const curVals = { weight: [] as number[], calories: [] as number[], water: [] as number[], volume: [] as number[] };
        const prevVals = { weight: [] as number[], calories: [] as number[], water: [] as number[], volume: [] as number[] };
        
        // Find all logs that fall into this month index for current year
        logs.forEach(l => {
           const d = parseISO(l.date);
           const v = volumeByDate[l.date];
           if (d.getFullYear() === year && d.getMonth() === mIndex) {
              if (l.weight_kg) curVals.weight.push(l.weight_kg);
              if (l.calories) curVals.calories.push(l.calories);
              if (l.water_ml) curVals.water.push(l.water_ml / 1000);
              if (v) curVals.volume.push(v);
           }
           if (d.getFullYear() === year - 1 && d.getMonth() === mIndex) {
              if (l.weight_kg) prevVals.weight.push(l.weight_kg);
              if (l.calories) prevVals.calories.push(l.calories);
              if (l.water_ml) prevVals.water.push(l.water_ml / 1000);
              if (v) prevVals.volume.push(v);
           }
        });

        return {
          label: format(setMonth(new Date(), mIndex), "MMM"),
          weight: avg(curVals.weight), calories: avg(curVals.calories), water: avg(curVals.water), volume: avg(curVals.volume),
          prevWeight: avg(prevVals.weight), prevCalories: avg(prevVals.calories), prevWater: avg(prevVals.water), prevVolume: avg(prevVals.volume),
        };
      });
    }

    return [];
  }, [logs, period, compare, volumeByDate]);

  if (isLoading) return null;

  if (logs.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 text-center">
        <CalendarCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No daily logs yet</p>
        <p className="text-xs text-muted-foreground mt-1">Press "Complete Day" on the home screen to start logging</p>
      </motion.div>
    );
  }

  const selectedMetricConfig = METRIC_CONFIG[metric];
  
  const formatYAxis = (val: number) => {
    if (val === 0) return "";
    let formatted = val >= 1000 && (metric === "calories" || metric === "volume") ? `${(val / 1000).toFixed(1)}k` : val.toString();
    if (metric === "weight" || metric === "volume") formatted += selectedMetricConfig.unit;
    return formatted;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-emerald-400" />
          Daily Review
        </h3>
        
        <button
          onClick={() => setCompare(c => !c)}
          className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors ${compare ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          <GitCompare className="h-3 w-3" /> Compare
        </button>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Metric Selector Pill Strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x mask-edges">
        {(Object.keys(METRIC_CONFIG) as Metric[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`shrink-0 snap-start px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-lg border transition-colors ${metric === m ? "bg-secondary text-foreground border-border/80" : "bg-transparent text-muted-foreground border-transparent hover:bg-secondary/40"}`}
          >
            {METRIC_CONFIG[m].short}
          </button>
        ))}
      </div>

      {/* Area Chart rendering logic */}
      <div className="h-44 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ left: -5, right: 0, bottom: 0, top: 10 }}>
            <defs>
              <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={selectedMetricConfig.color} stopOpacity={selectedMetricConfig.areaOpacity} />
                <stop offset="95%" stopColor={selectedMetricConfig.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(220, 10%, 55%)" }} tickFormatter={formatYAxis} axisLine={false} tickLine={false} width={42} />
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
            <Tooltip 
              {...tooltipStyle} 
              formatter={(val: number) => [
                `${Number(val).toFixed(metric === 'water' || metric === 'weight' ? 1 : 0)}${selectedMetricConfig.unit}`, 
                period === "week" ? selectedMetricConfig.label : `Avg ${selectedMetricConfig.label}`
              ]} 
            />
            <Area 
              type="monotone" 
              dataKey={metric} 
              name={period === "week" ? selectedMetricConfig.label : `Avg ${selectedMetricConfig.label}`} 
              stroke={selectedMetricConfig.color} 
              fill="url(#metricGrad)" 
              strokeWidth={2.5}
              connectNulls
              dot={{ r: 4, strokeWidth: 0, fill: selectedMetricConfig.color }}
              activeDot={{ r: 6, strokeWidth: 0, fill: selectedMetricConfig.color }}
            />
            {compare && (
              <Area 
                type="monotone" 
                dataKey={`prev${metric.charAt(0).toUpperCase() + metric.slice(1)}`} 
                name={period === "week" ? `Prev ${selectedMetricConfig.label}` : `Prev Avg ${selectedMetricConfig.label}`} 
                stroke={selectedMetricConfig.color} 
                fill="none" 
                strokeWidth={1.5} 
                strokeDasharray="4 2" 
                opacity={0.5} 
                connectNulls 
                dot={{ r: 3, fill: "transparent", stroke: selectedMetricConfig.color }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      {chartData.length > 0 && (
        <div className="flex gap-4 mt-2 justify-center">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: selectedMetricConfig.color }} /> {selectedMetricConfig.label}
          </span>
          {compare && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground opacity-60">
              <span className="h-1.5 w-4 border-t-2 border-dashed inline-block" style={{ borderColor: selectedMetricConfig.color }} /> Prev {period}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
