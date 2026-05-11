import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { fetchDailyScores, fetchDailyBiometrics } from "@/lib/cloud-data";
import { recoveryColor } from "@/lib/recovery-scores";
import { format, parseISO } from "date-fns";

type Metric = "recovery" | "stress" | "rhr" | "sleep";

const METRICS: { key: Metric; label: string; unit: string; color: string }[] = [
  { key: "recovery", label: "Recovery", unit: "%",    color: "hsl(152 70% 50%)" },
  { key: "stress",   label: "Stress",   unit: "/100", color: "hsl(38 95% 60%)"  },
  { key: "rhr",      label: "Rest HR",  unit: "bpm",  color: "hsl(351 85% 60%)" },
  { key: "sleep",    label: "Sleep",    unit: "%",    color: "hsl(217 91% 60%)" },
];

export default function HRVTrendCard() {
  const { user } = useAuth();
  const [active, setActive] = useState<Metric>("recovery");

  const { data: scores14d = [] } = useQuery({
    queryKey: ["daily-scores", user?.id, "14d"],
    queryFn: () => fetchDailyScores(14),
    enabled: !!user,
    staleTime: 120_000,
  });

  const { data: biometrics14d = [] } = useQuery({
    queryKey: ["daily-biometrics", user?.id, "14d"],
    queryFn: () => fetchDailyBiometrics(14),
    enabled: !!user,
    staleTime: 120_000,
  });

  const { color, unit } = METRICS.find(m => m.key === active)!;

  // Merge and sort all dates ascending
  const allDates = Array.from(new Set([
    ...scores14d.map(s => s.date),
    ...biometrics14d.map(b => b.date),
  ])).sort();

  const chartData = allDates.map(date => {
    const score = scores14d.find(s => s.date === date);
    const bio   = biometrics14d.find(b => b.date === date);
    return {
      date,
      label: format(parseISO(date), "d MMM"),
      recovery: score?.recoveryScore ?? null,
      stress:   bio?.samsungStressScore ?? null,
      rhr:      bio?.restingHr ?? null,
      sleep:    score?.sleepPerformance ?? null,
    };
  });

  const hasData = chartData.some(d => d[active] !== null);

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-4"
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Biometric Trends · 14 Days
      </p>

      {/* Metric pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {METRICS.map(({ key, label, color: c }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
              active === key
                ? "text-background"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
            style={active === key ? { background: c } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {hasData ? (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`grad-${active}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip
                formatter={(v: number) => [`${active === "rhr" ? v : Math.round(v)}${unit}`, METRICS.find(m => m.key === active)!.label]}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              />
              <Area
                type="monotone"
                dataKey={active}
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${active})`}
                connectNulls
                dot={false}
                activeDot={{ r: 4, fill: color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-36 flex items-center justify-center">
          <p className="text-xs text-muted-foreground text-center">
            Log a morning check-in to start tracking trends
          </p>
        </div>
      )}
    </motion.div>
  );
}
