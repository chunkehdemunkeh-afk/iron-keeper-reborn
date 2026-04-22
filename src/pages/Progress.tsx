import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchWorkoutHistory, fetchVolumeData, fetchPersonalRecords, deletePersonalRecord, fetchRecentSets, fetchSleepLogs } from "@/lib/cloud-data";
import { WORKOUTS } from "@/lib/workout-data";
import { BarChart3, Trophy, Calendar, TrendingUp, Dumbbell, Clock, Trash2, Activity, Moon } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import DailyReviewChart from "@/components/DailyReviewChart";
import PRTrendChart from "@/components/PRTrendChart";
import HelpButton from "@/components/demo/HelpButton";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BodyDiagram, { viewForMuscle } from "@/components/recovery/BodyDiagram";
import RecoverySettings from "@/components/recovery/RecoverySettings";
import { computeMuscleRecovery, statusColor, statusLabel } from "@/lib/recovery";
import { MUSCLE_REGIONS, MUSCLE_LABELS } from "@/lib/muscle-mapping";
import { getUserPreferences } from "@/lib/user-preferences";
import { useRecoverySettings } from "@/hooks/useRecoverySettings";
import AnimatedNumber from "@/components/AnimatedNumber";
import { useState } from "react";
import PhotosTab from "@/components/progress/PhotosTab";
import StrengthLevelCard from "@/components/progress/StrengthLevelCard";
import { fetchStrengthProfile } from "@/lib/cloud-data";
import {
  RATED_LIFTS,
  TIER_COLORS,
  TIER_SHORT_LABELS,
  epley1RM,
  getStrengthRating,
  inferLiftId,
  type LiftId,
  type StrengthRating,
} from "@/lib/strength-standards";

function PRSwipeRow({ exId, pr, onDelete }: { exId: string; pr: any; onDelete: () => void }) {
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-110, -40], [1, 0]);

  function handleDragEnd(_: any, info: PanInfo) {
    if (info.offset.x < -90) {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      onDelete();
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  }

  return (
    <div className="relative overflow-hidden">
      <motion.div
        style={{ opacity: bgOpacity }}
        className="absolute inset-0 flex items-center justify-end pr-4 bg-destructive rounded-lg"
      >
        <Trash2 className="h-4 w-4 text-white" />
      </motion.div>
      <motion.div
        style={{ x, touchAction: "pan-y" }}
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={{ left: 0.1, right: 0 }}
        onDragEnd={handleDragEnd}
        className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0 bg-transparent"
      >
        <div>
          <p className="text-sm font-medium text-foreground">
            {pr.name || exId}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {new Date(pr.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-primary">{pr.weight}kg</p>
          <p className="text-[10px] text-muted-foreground">{pr.reps} reps</p>
        </div>
      </motion.div>
    </div>
  );
}

function RecoveryTabContent() {
  const { user } = useAuth();
  const [view, setView] = useState<"front" | "back">("front");
  const [highlighted, setHighlighted] = useState<typeof MUSCLE_REGIONS[number] | null>(null);

  const { data: sets = [] } = useQuery({
    queryKey: ["recent-sets", user?.id],
    queryFn: () => fetchRecentSets(7),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: sleepLogs = [] } = useQuery({
    queryKey: ["sleep-logs", user?.id],
    queryFn: () => fetchSleepLogs(14),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: prs = {} } = useQuery({
    queryKey: ["personal-records", user?.id],
    queryFn: () => import("@/lib/cloud-data").then((m) => m.fetchPersonalRecords()),
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["strength-profile", user?.id],
    queryFn: fetchStrengthProfile,
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const splitId = user ? getUserPreferences(user.id)?.splitId : null;
  const settings = useRecoverySettings(user?.id);

  const states = useMemo(
    () => computeMuscleRecovery(sets, sleepLogs, splitId, new Date(), settings),
    [sets, sleepLogs, splitId, settings],
  );

  // Map each muscle region → best strength rating (from the lift that targets it)
  const muscleToRating: Partial<Record<typeof MUSCLE_REGIONS[number], StrengthRating>> = useMemo(() => {
    if (!profile?.bodyweight || !profile?.sex) return {};
    const bestPerLift: Record<LiftId, number> = {} as any;
    Object.entries(prs).forEach(([exId, pr]: [string, any]) => {
      const liftId = inferLiftId(exId, pr.name);
      if (!liftId) return;
      const oneRm = epley1RM(pr.weight, pr.reps);
      if (!bestPerLift[liftId] || oneRm > bestPerLift[liftId]) bestPerLift[liftId] = oneRm;
    });
    const out: Partial<Record<typeof MUSCLE_REGIONS[number], StrengthRating>> = {};
    RATED_LIFTS.forEach((def) => {
      const oneRm = bestPerLift[def.id];
      if (!oneRm) return;
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


  const sortedRegions = useMemo(() => {
    return [...MUSCLE_REGIONS].sort((a, b) => states[a].score - states[b].score);
  }, [states]);

  const last7Sleep = useMemo(() => {
    // Current calendar week: Monday → Sunday
    const now = new Date();
    const day = now.getDay() || 7; // Sunday = 7
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
      {/* Settings row */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Model: <span className="text-foreground font-medium capitalize">{settings.model}</span>
          {" · "}Sleep ×{settings.sleepWeight.toFixed(2)}
        </p>
        <RecoverySettings />
      </div>

      {/* Body diagram */}
      <motion.div
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

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-border/30">
          {(["fatigued", "workable", "recovered"] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: statusColor(s) }} />
              <span className="text-[10px] text-muted-foreground">{statusLabel(s)}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Per-muscle list */}
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

      {/* Sleep summary */}
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

export default function Progress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = tabParam === "recovery" || tabParam === "photos" ? tabParam : "stats";

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["workout-history", user?.id],
    queryFn: fetchWorkoutHistory,
    enabled: !!user,
  });

  const { data: volumeData = [], isLoading: volumeLoading } = useQuery({
    queryKey: ["volume-data", user?.id],
    queryFn: fetchVolumeData,
    enabled: !!user,
  });

  const { data: prs = {}, isLoading: prsLoading } = useQuery({
    queryKey: ["personal-records", user?.id],
    queryFn: fetchPersonalRecords,
    enabled: !!user,
  });

  const loading = historyLoading || volumeLoading || prsLoading;

  // Weekly frequency data (last 8 weeks)
  const weeklyFrequency = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (weekStart.getDay() || 7) + 1 - (i * 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const count = history.filter(w => {
      const d = new Date(w.date);
      return d >= weekStart && d < weekEnd;
    }).length;

    return {
      label: i === 0 ? "Now" : `${i}w`,
      count,
    };
  }).reverse();

  const totalVolume = volumeData.reduce((sum, v) => sum + v.volume, 0);
  const prList = Object.entries(prs);

  async function handleDeletePR(setId: string) {
    await deletePersonalRecord(setId);
    queryClient.invalidateQueries({ queryKey: ["personal-records"] });
  }

  const exerciseMap: Record<string, string> = {};
  WORKOUTS.forEach(w => w.exercises.forEach(ex => { exerciseMap[ex.id] = ex.name; }));

  if (!user) {
    return (
      <div className="min-h-screen bg-background safe-bottom flex items-center justify-center px-4">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Sign in to track your progress</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background safe-bottom flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading progress...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-5">
        <div className="flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-display text-2xl font-bold"
          >
            Progress
          </motion.h1>
          <HelpButton />
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams);
            if (v === "stats") next.delete("tab");
            else next.set("tab", v);
            setSearchParams(next, { replace: true });
          }}
        >
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="recovery">Recovery</TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="mt-4">
            <PhotosTab />
          </TabsContent>

          <TabsContent value="stats" className="space-y-5 mt-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Dumbbell, label: "Workouts", value: history.length, color: "text-primary" },
                { icon: Clock, label: "Total Mins", value: history.reduce((s, w) => s + w.duration, 0), color: "text-primary" },
                { icon: TrendingUp, label: "Volume (kg)", value: totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume, color: "text-foreground" },
              ].map(({ icon: Icon, label, value, color }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-xl p-3 text-center"
                >
                  <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
                  <p className={`font-display text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                </motion.div>
              ))}
            </div>

            {/* Volume over time chart */}
            {volumeData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-xl p-4"
              >
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Volume Over Time
                </h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={volumeData}>
                      <defs>
                        <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(36, 95%, 55%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(36, 95%, 55%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} width={35} />
                      <Tooltip
                        contentStyle={{ background: "hsl(220, 18%, 11%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 12, fontSize: 12 }}
                        labelStyle={{ color: "hsl(40, 10%, 95%)" }}
                        itemStyle={{ color: "hsl(36, 95%, 55%)" }}
                      />
                      <Area type="monotone" dataKey="volume" stroke="hsl(36, 95%, 55%)" fill="url(#volumeGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* Workout frequency */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-xl p-4"
            >
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Weekly Frequency
              </h3>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyFrequency}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(220, 18%, 11%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: "hsl(40, 10%, 95%)" }}
                    />
                    <Bar dataKey="count" fill="hsl(36, 95%, 55%)" radius={[4, 4, 0, 0]} name="Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Daily Review */}
            <DailyReviewChart />

            {/* PR trend per exercise */}
            <PRTrendChart />

            {/* Strength Level (vs published standards) */}
            <StrengthLevelCard />

            {/* Personal Records */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-xl p-4"
            >
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Personal Records
              </h3>
              {prList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Complete workouts with weights to see your PRs here
                </p>
              ) : (
                <div className="space-y-0">
                  <p className="text-[10px] text-muted-foreground mb-2">Swipe left to delete an incorrect PR</p>
                  {prList.map(([exId, pr]) => (
                    <PRSwipeRow
                      key={exId}
                      exId={exId}
                      pr={{ ...(pr as any), name: (pr as any).name || exerciseMap[exId] || exId }}
                      onDelete={() => handleDeletePR((pr as any).setId)}
                    />
                  ))}
                </div>
              )}
            </motion.div>

            {/* Empty state */}
            {history.length === 0 && (
              <div className="glass-card rounded-xl p-8 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No workout data yet</p>
                <p className="text-xs text-muted-foreground mt-1">Complete sessions to see your progress charts</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recovery" className="mt-4">
            <RecoveryTabContent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
