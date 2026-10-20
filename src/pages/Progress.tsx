import { resolveExerciseName } from "@/lib/exercise-names";
import { useAuth } from "@/hooks/useAuth";
import { fetchVolumeData, deletePersonalRecord } from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";
import { WORKOUTS } from "@/lib/workout-data";
import { BarChart3, Trophy, Calendar, TrendingUp, Dumbbell, Clock, Trash2, Moon } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import RecoveryPanel from "@/components/recovery/RecoveryPanel";
import RecoveryTips from "@/components/RecoveryTips";

import { useWorkoutHistory } from "@/hooks/queries/useWorkoutHistory";
import { usePersonalRecords } from "@/hooks/queries/usePersonalRecords";
import DailyReviewChart from "@/components/DailyReviewChart";
import PRTrendChart from "@/components/PRTrendChart";
import HelpButton from "@/components/demo/HelpButton";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from "recharts";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { getUserPreferences } from "@/lib/user-preferences";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import PhotosTab from "@/components/progress/PhotosTab";
import StrengthLevelCard from "@/components/progress/StrengthLevelCard";
import WeeklyEnergyCard from "@/components/WeeklyEnergyCard";

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
            {pr.name || resolveExerciseName(exId)}
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


export default function Progress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = (tabParam === "photos" || tabParam === "recovery") ? tabParam : "stats";


  const { data: history = [], isLoading: historyLoading } = useWorkoutHistory();

  const { data: volumeData = [], isLoading: volumeLoading } = useQuery({
    queryKey: queryKeys.workoutVolume(user?.id ?? ""),
    queryFn: () => fetchVolumeData(),
    enabled: !!user,
  });

  const { data: prs = {}, isLoading: prsLoading } = usePersonalRecords();

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
    queryClient.invalidateQueries({ queryKey: queryKeys.personalRecords(user?.id ?? "") });
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
        <LoadingState label="Loading progress" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg md:max-w-2xl px-4 pt-6 pb-24 space-y-5">
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

        <SegmentedTabs
          value={tab}
          onChange={(v) => {
            const next = new URLSearchParams(searchParams);
            if (v === "stats") next.delete("tab");
            else next.set("tab", v);
            setSearchParams(next, { replace: true });
          }}
          options={[
            { value: "stats", label: "Stats" },
            { value: "recovery", label: "Recovery" },
            { value: "photos", label: "Photos" },
          ]}
          layoutId="progress-tab-pill"
        />

        {tab === "photos" && (
          <div className="mt-4">
            <PhotosTab />
          </div>
        )}

        {tab === "recovery" && (
          <div className="mt-4 space-y-5">
            <RecoveryPanel />
            {getUserPreferences(user.id)?.splitId !== "none" && (
              <RecoveryTips splitId={getUserPreferences(user.id)?.splitId} />
            )}
            <button
              onClick={() => navigate("/check-ins")}
              className="w-full glass-card rounded-2xl p-3.5 flex items-center justify-between text-left transition-transform active:scale-[0.99]"
            >
              <div>
                <p className="font-display text-sm font-bold">Check-in history</p>
                <p className="text-xs text-muted-foreground">Past readiness and biometric check-ins</p>
              </div>
              <Moon className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}


        {tab === "stats" && (
          <div className="space-y-5 mt-4">
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

            {/* Weekly Energy (kcal burned) */}
            <WeeklyEnergyCard />

            {/* Biometric trends moved to /recovery */}

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
                      pr={{ ...(pr as any), name: (pr as any).name || exerciseMap[exId] || resolveExerciseName(exId) }}
                      onDelete={() => handleDeletePR((pr as any).setId)}
                    />
                  ))}
                </div>
              )}
            </motion.div>

            {/* Empty state */}
            {history.length === 0 && (
              <EmptyState
                icon={BarChart3}
                title="No workout data yet"
                description="Complete sessions to see your progress charts."
                className="glass-card rounded-xl"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
