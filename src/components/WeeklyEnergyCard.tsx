import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, Dumbbell, Activity } from "lucide-react";
import { fetchWeeklyBurn, mondayOfWeek, recentMondays } from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/useAuth";

/**
 * Weekly energy expenditure card.
 * Top: total kcal this week + a stacked bar (strength | cardio).
 * Bottom: 4-week sparkline of weekly totals for trend.
 */
export default function WeeklyEnergyCard() {
  const { user } = useAuth();
  const thisWeekStart = mondayOfWeek(new Date());

  const { data: thisWeek } = useQuery({
    queryKey: queryKeys.weeklyBurn(user?.id ?? "", thisWeekStart),
    queryFn: () => fetchWeeklyBurn(thisWeekStart),
    enabled: !!user,
  });

  const mondays = recentMondays(4);
  const { data: trend = [] } = useQuery({
    queryKey: queryKeys.weeklyBurnTrend(user?.id ?? "", mondays.join(",")),
    queryFn: async () => {
      const results = await Promise.all(mondays.map((m) => fetchWeeklyBurn(m)));
      return results.map((r) => r.totalKcal);
    },
    enabled: !!user,
  });

  if (!thisWeek) return null;

  const total = thisWeek.totalKcal;
  const strengthPct = total > 0 ? (thisWeek.strengthKcal / total) * 100 : 0;
  const cardioPct = total > 0 ? (thisWeek.cardioKcal / total) * 100 : 0;
  const maxTrend = Math.max(1, ...trend);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-400" />
          Weekly Energy
        </h3>
        <p className="font-display text-2xl font-bold text-foreground">
          {total.toLocaleString()}
          <span className="text-xs font-normal text-muted-foreground ml-1">kcal</span>
        </p>
      </div>

      {/* Stacked bar */}
      <div className="h-2 rounded-full bg-muted/40 overflow-hidden flex mb-2">
        {strengthPct > 0 && (
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${strengthPct}%` }}
          />
        )}
        {cardioPct > 0 && (
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: `${cardioPct}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-4">
        <span className="flex items-center gap-1.5">
          <Dumbbell className="h-3 w-3 text-primary" />
          Strength <span className="font-semibold text-foreground">{thisWeek.strengthKcal}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-amber-400" />
          Cardio <span className="font-semibold text-foreground">{thisWeek.cardioKcal}</span>
        </span>
      </div>

      {/* 4-week sparkline */}
      {trend.length > 0 && (() => {
        const avg = trend.reduce((s, k) => s + k, 0) / trend.length;
        const targetPct = avg > 0 ? (avg / maxTrend) * 100 : 0;
        return (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                Last 4 weeks
              </p>
              <p className="text-[10px] text-muted-foreground/60 tabular-nums">
                avg {Math.round(avg).toLocaleString()}
              </p>
            </div>
            <div className="relative flex items-end gap-1.5 h-14">
              {/* Dotted target line */}
              <div
                className="absolute left-0 right-0 border-t border-dashed border-primary/40 pointer-events-none"
                style={{ bottom: `${targetPct}%` }}
              />
              {trend.map((kcal, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className={`w-full rounded-md transition-all ${
                        i === trend.length - 1
                          ? "bg-gradient-to-t from-primary to-amber-300"
                          : "bg-gradient-to-t from-muted-foreground/40 to-muted-foreground/10"
                      }`}
                      style={{ height: `${(kcal / maxTrend) * 100}%`, minHeight: kcal > 0 ? "3px" : "0" }}
                    />
                  </div>
                  <span className={`text-[9px] tabular-nums ${i === trend.length - 1 ? "text-primary font-semibold" : "text-muted-foreground/60"}`}>
                    {i === trend.length - 1 ? "Now" : `${trend.length - 1 - i}w`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
}
