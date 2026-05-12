import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRecentSets } from "@/hooks/queries/useRecentSets";
import { useSleepLogs } from "@/hooks/queries/useSleepLogs";
import { usePersonalRecords } from "@/hooks/queries/usePersonalRecords";
import { useStrengthProfile } from "@/hooks/queries/useStrengthProfile";
import { bestOneRmForLift } from "@/lib/cloud-data";
import BodyDiagram, { viewForMuscle } from "@/components/recovery/BodyDiagram";
import RecoverySettings from "@/components/recovery/RecoverySettings";
import { computeMuscleRecovery, statusColor, statusLabel } from "@/lib/recovery";
import { MUSCLE_REGIONS, MUSCLE_LABELS } from "@/lib/muscle-mapping";
import { getUserPreferences } from "@/lib/user-preferences";
import { useRecoverySettings } from "@/hooks/useRecoverySettings";
import AnimatedNumber from "@/components/AnimatedNumber";
import RecoveryHero from "@/components/recovery/RecoveryHero";
import HRVTrendCard from "@/components/biometrics/HRVTrendCard";
import {
  RATED_LIFTS,
  TIER_COLORS,
  TIER_SHORT_LABELS,
  epley1RM,
  getStrengthRating,
  inferLiftId,
  isBilateralDumbbell,
  type StrengthRating,
} from "@/lib/strength-standards";

export default function RecoveryPanel() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const [view, setView] = useState<"front" | "back">("front");
  const [highlighted, setHighlighted] = useState<typeof MUSCLE_REGIONS[number] | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

  const { data: sets = [] } = useRecentSets();
  const { data: sleepLogs = [] } = useSleepLogs();
  const { data: prs = {} } = usePersonalRecords();
  const { data: profile } = useStrengthProfile();

  const splitId = user ? getUserPreferences(user.id)?.splitId : null;
  const settings = useRecoverySettings(user?.id);

  const states = useMemo(
    () => computeMuscleRecovery(sets, sleepLogs, splitId, new Date(), settings),
    [sets, sleepLogs, splitId, settings],
  );

  const muscleToRating: Partial<Record<typeof MUSCLE_REGIONS[number], StrengthRating>> = useMemo(() => {
    if (!profile?.bodyweight || !profile?.sex) return {};
    const out: Partial<Record<typeof MUSCLE_REGIONS[number], StrengthRating>> = {};
    RATED_LIFTS.forEach((def) => {
      const oneRm = bestOneRmForLift(
        prs,
        (exId, name) => inferLiftId(exId, name) === def.id,
        epley1RM,
        (exId, name) => isBilateralDumbbell(exId, name) ? 2 : 1,
      );
      if (!oneRm || oneRm <= 0) return;
      const rating = getStrengthRating(def.id, oneRm, {
        bodyweight: profile.bodyweight!,
        sex: profile.sex!,
        age: profile.age,
      });
      if (!rating) return;
      const region = def.primaryMuscle as typeof MUSCLE_REGIONS[number];
      const existing = out[region];
      if (!existing || rating.tierIndex > existing.tierIndex) out[region] = rating;
    });
    return out;
  }, [prs, profile]);

  const sortedRegions = useMemo(
    () => [...MUSCLE_REGIONS].sort((a, b) => states[a].score - states[b].score),
    [states],
  );

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

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Model: <span className="text-foreground font-medium capitalize">{settings.model}</span>
          {" · "}Sleep ×{settings.sleepWeight.toFixed(2)}
        </p>
        <RecoverySettings />
      </div>

      <motion.div
        ref={diagramRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Muscle Recovery
          </h3>
          <div className="flex bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setView("front")}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                view === "front" ? "bg-card text-foreground" : "text-muted-foreground"
              }`}
            >
              Front
            </button>
            <button
              onClick={() => setView("back")}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                view === "back" ? "bg-card text-foreground" : "text-muted-foreground"
              }`}
            >
              Back
            </button>
          </div>
        </div>
        <BodyDiagram states={states} view={view} interactive size="lg" highlighted={highlighted} />
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          {highlighted ? `Highlighting ${MUSCLE_LABELS[highlighted]} — tap again to clear` : "Tap a muscle for details"}
        </p>

        <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-border/30">
          {(["fatigued", "workable", "recovered"] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: statusColor(s) }} />
              <span className="text-[10px] text-muted-foreground">{statusLabel(s)}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card rounded-xl p-4"
      >
        <h3 className="text-sm font-semibold text-foreground mb-3">All Muscle Groups</h3>
        <motion.div layout className="space-y-1">
          {sortedRegions.map((region) => {
            const s = states[region];
            const color = statusColor(s.status);
            const isActive = highlighted === region;
            return (
              <motion.button
                key={region}
                layout
                type="button"
                onClick={() => {
                  if (isActive) {
                    setHighlighted(null);
                  } else {
                    setHighlighted(region);
                    setView(viewForMuscle(region));
                    setTimeout(() => {
                      diagramRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                  }
                }}
                transition={{ layout: { duration: 0.45, ease: [0.32, 0.72, 0, 1] } }}
                className={`w-full flex items-center justify-between py-2 border-b border-border/30 last:border-0 text-left transition-colors rounded-md px-2 -mx-2 ${
                  isActive ? "bg-primary/10" : "hover:bg-muted/40 active:bg-muted/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full transition-colors duration-500"
                    style={{ background: color }}
                  />
                  <div>
                    <p className={`text-sm font-medium flex items-center gap-1.5 ${isActive ? "text-primary" : "text-foreground"}`}>
                      {MUSCLE_LABELS[region]}
                      {muscleToRating[region] && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide"
                          style={{
                            background: `${TIER_COLORS[muscleToRating[region]!.tier]}22`,
                            color: TIER_COLORS[muscleToRating[region]!.tier],
                          }}
                        >
                          {TIER_SHORT_LABELS[muscleToRating[region]!.tier]}
                        </span>
                      )}
                    </p>
                    {s.lastWorkedAt ? (
                      <p className="text-[10px] text-muted-foreground">
                        Last: {new Date(s.lastWorkedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Not worked recently</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="text-sm font-bold tabular-nums transition-colors duration-500"
                    style={{ color }}
                  >
                    <AnimatedNumber value={Math.round(s.score * 100)} suffix="%" />
                  </p>
                  {s.hoursUntilReady > 0 && (
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      Ready in <AnimatedNumber value={Math.round(s.hoursUntilReady)} />h
                    </p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </motion.div>

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
