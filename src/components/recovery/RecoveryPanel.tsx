import { useMemo } from "react";
import { motion } from "framer-motion";
import { Moon } from "lucide-react";
import { useSleepLogs } from "@/hooks/queries/useSleepLogs";
import AnimatedNumber from "@/components/AnimatedNumber";
import RecoveryHero from "@/components/recovery/RecoveryHero";
import HRVTrendCard from "@/components/biometrics/HRVTrendCard";

export default function RecoveryPanel() {
  const today = new Date().toISOString().split("T")[0];
  const { data: sleepLogs = [] } = useSleepLogs();

  const last7Sleep = useMemo(() => {
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);
    const out: { date: string; hours: number; quality: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ds = d.toISOString().split("T")[0];
      const log = sleepLogs.find((l) => l.date === ds);
      out.push({ date: ds, hours: log?.hours ?? 0, quality: log?.quality ?? 0 });
    }
    return out;
  }, [sleepLogs]);

  const sleepWithData = last7Sleep.filter((s) => s.hours > 0);
  const avgHours = sleepWithData.length
    ? (sleepWithData.reduce((s, x) => s + x.hours, 0) / sleepWithData.length).toFixed(1)
    : "—";
  const avgQuality = sleepWithData.length
    ? (sleepWithData.reduce((s, x) => s + x.quality, 0) / sleepWithData.length).toFixed(1)
    : "—";

  return (
    <div className="space-y-5">
      <RecoveryHero date={today} />

      <HRVTrendCard />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-4"
      >
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Moon className="h-4 w-4 text-primary" />
          Sleep — Last 7 Nights
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-foreground">{avgHours}<span className="text-sm text-muted-foreground font-normal">h</span></p>
            <p className="text-[10px] text-muted-foreground">Avg duration</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-foreground">{avgQuality}<span className="text-sm text-muted-foreground font-normal">/5</span></p>
            <p className="text-[10px] text-muted-foreground">Avg quality</p>
          </div>
        </div>
        <div className="flex items-end gap-1 h-16">
          {last7Sleep.map((s) => {
            const pct = s.hours > 0 ? (s.hours / 10) * 100 : 0;
            return (
              <div key={s.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t bg-primary/60 transition-all"
                    style={{ height: `${pct}%`, minHeight: s.hours > 0 ? 4 : 0 }}
                    title={s.hours > 0 ? `${s.hours}h · quality ${s.quality}` : "no log"}
                  />
                </div>
                <p className="text-[8px] text-muted-foreground">
                  {new Date(s.date).toLocaleDateString("en-GB", { weekday: "narrow" })}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
