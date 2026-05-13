import { useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchWorkoutHistory, fetchActivityLogs, fetchWeeklyBurn, mondayOfWeek, fetchLeaderboardVisibility, updateLeaderboardVisibility } from "@/lib/cloud-data";
import { backfillStrainScores } from "@/lib/data/biometric-queries";
import { queryKeys } from "@/lib/query-keys";
import { Flame, Target, LogOut, Scale, BookOpen, User, Settings2, ChevronRight, Pencil, Check, X, Camera, Loader2, Heart, Apple, Star, Activity, Trophy, RefreshCw, Dumbbell } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import RecoveryTips from "@/components/RecoveryTips";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserPreferences, computeWeeklyStreak } from "@/lib/user-preferences";
import { WORKOUTS } from "@/lib/workout-data";
import { toast } from "sonner";
import { hapticSuccess } from "@/lib/haptics";
import HelpButton from "@/components/demo/HelpButton";
import { supabase } from "@/integrations/supabase/client";
import BadgeShelf from "@/components/gamification/BadgeShelf";
import { TierBadge } from "@/components/gamification/TierBadge";
import { useUserProgress } from "@/hooks/queries/useUserProgress";
import { useCurrentSeason, daysRemaining } from "@/hooks/queries/useCurrentSeason";
import AvatarFrame from "@/components/gamification/AvatarFrame";
import { tierFromRp, nextTier, tierProgress } from "@/lib/gamification/tiers";

/** Per-split intensity label and training focus for the Training Programme card. */
const SPLIT_META: Record<string, { intensity: string; intensityColor: string; focus: string }> = {
  gk:          { intensity: "80–95% match-ready",           intensityColor: "text-amber-400",       focus: "Goalkeeper Development" },
  ppl:         { intensity: "100% — train to failure",      intensityColor: "text-red-400",          focus: "Muscle Hypertrophy" },
  upper_lower: { intensity: "Moderate–High (RPE 7–9)",      intensityColor: "text-sky-400",          focus: "Strength & Hypertrophy" },
  pplu:        { intensity: "High — RIR 0–2",               intensityColor: "text-orange-400",       focus: "Upper Body Frequency" },
  pplul:       { intensity: "High — 5-day frequency",       intensityColor: "text-rose-400",         focus: "Maximum Frequency" },
  fullbody:    { intensity: "Moderate (RPE 6–8)",            intensityColor: "text-green-400",        focus: "Whole Body Strength" },
  arnold:      { intensity: "High volume — 6-day push",     intensityColor: "text-purple-400",       focus: "Classic Bodybuilding" },
  bro:         { intensity: "High volume (slow eccentrics)", intensityColor: "text-pink-400",         focus: "Muscle Isolation" },
  "531":       { intensity: "% of training max (AMRAP)",    intensityColor: "text-yellow-400",       focus: "Powerlifting Strength" },
  custom:      { intensity: "Varies by day",                 intensityColor: "text-muted-foreground", focus: "Your Choice" },
};

import { changelog } from "@/lib/changelog";

/** The current version is always dynamically read from the top of the changelog */
const APP_VERSION = changelog[0]?.version || "1.0.0";

export default function Profile() {
  const { user, profile, signOut, updateDisplayName, updateAvatar, removeAvatar } = useAuth();
  const navigate = useNavigate();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [backfilling, setBackfilling] = useState(false);

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const days = await backfillStrainScores(30);
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyScores(user!.id) });
      hapticSuccess();
      toast.success(`Recomputed strain for ${days} day${days === 1 ? "" : "s"}`);
    } catch (e) {
      console.error(e);
      toast.error("Backfill failed");
    } finally {
      setBackfilling(false);
    }
  };

  const startEditName = () => {
    setNameInput(profile?.display_name || "");
    setEditingName(true);
  };

  const saveName = async () => {
    setSavingName(true);
    const { error } = await updateDisplayName(nameInput);
    setSavingName(false);
    if (error) {
      toast.error(error);
      return;
    }
    hapticSuccess();
    toast.success("Name updated");
    setEditingName(false);
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    const { error } = await updateAvatar(file);
    setUploadingAvatar(false);
    if (error) {
      toast.error(error);
      return;
    }
    hapticSuccess();
    toast.success("Photo updated");
  };

  const handleRemoveAvatar = async () => {
    if (!profile?.avatar_url) return;
    setRemovingAvatar(true);
    const { error } = await removeAvatar();
    setRemovingAvatar(false);
    if (error) {
      toast.error(error);
      return;
    }
    hapticSuccess();
    toast.success("Photo removed");
  };

  const { data: history = [] } = useQuery({
    queryKey: queryKeys.workoutHistory(user?.id ?? ""),
    queryFn: fetchWorkoutHistory,
    enabled: !!user,
  });

  const { data: activities = [] } = useQuery({
    queryKey: queryKeys.activityLogs(user?.id ?? ""),
    queryFn: fetchActivityLogs,
    enabled: !!user,
  });

  const totalWorkouts = history.length;

  const { data: lifetimeKg = 0 } = useQuery({
    queryKey: queryKeys.totalWeightLifted(user?.id ?? ""),
    queryFn: async () => {
      // Page through all sets (Supabase caps responses at 1000 rows).
      // Join via workout_history.user_id because workout_sets.user_id is NULL on older rows.
      const PAGE = 1000;
      let from = 0;
      let total = 0;
      // Exclude warmups so the number reflects real working volume.
      while (true) {
        const { data, error } = await supabase
          .from("workout_sets")
          .select("weight, reps, workout_history!inner(user_id)")
          .eq("workout_history.user_id", user!.id)
          .neq("set_type", "warmup")
          .range(from, from + PAGE - 1);
        if (error || !data) break;
        for (const s of data as Array<{ weight: number | null; reps: number | null }>) {
          total += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        }
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return total;
    },
    enabled: !!user,
  });

  const thisWeekStart = mondayOfWeek(new Date());
  const { data: weekBurn } = useQuery({
    queryKey: queryKeys.weeklyBurn(user?.id ?? "", thisWeekStart),
    queryFn: () => fetchWeeklyBurn(thisWeekStart),
    enabled: !!user,
  });
  const weekKcal = weekBurn?.totalKcal ?? 0;

  const { data: leaderboardVisible = true } = useQuery({
    queryKey: queryKeys.leaderboardVisibility(user?.id ?? ""),
    queryFn: fetchLeaderboardVisibility,
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const handleLeaderboardToggle = async (visible: boolean) => {
    await updateLeaderboardVisibility(visible);
    queryClient.setQueryData(queryKeys.leaderboardVisibility(user?.id ?? ""), visible);
    queryClient.invalidateQueries({ queryKey: ["leaderboard-1rm"] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard-max-weight"] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard-max-reps"] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard-session-volume"] });
    toast.success(visible ? "You're on the leaderboard" : "Hidden from leaderboard");
  };

  const prefs = user ? getUserPreferences(user.id) : null;
  const weekGoal = prefs?.daysPerWeek ?? 4;

  const allDates = new Set<string>();
  history.forEach((w) => allDates.add(w.date.split("T")[0]));
  activities.forEach((a) => allDates.add(a.date));
  const streak = computeWeeklyStreak(allDates, weekGoal);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const splitMeta = prefs ? (SPLIT_META[prefs.splitId] ?? {
    intensity: "Varies",
    intensityColor: "text-muted-foreground",
    focus: prefs.splitName,
  }) : null;

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg md:max-w-2xl px-4 pt-6 pb-24 space-y-5">
        <div className="flex justify-end -mb-4"><HelpButton /></div>

        {/* Avatar hero card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-card p-5"
        >
          <div className="flex flex-col items-center text-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Change profile photo"
              className="relative group active:scale-95 transition-transform disabled:opacity-70"
            >
              <AvatarFrame userId={user?.id} size={80}>
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-primary glow-primary">
                    <User className="h-10 w-10 text-primary-foreground" />
                  </div>
                )}
              </AvatarFrame>
              <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-background shadow-md">
                {uploadingAvatar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFile}
            />
            {profile?.avatar_url && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={removingAvatar || uploadingAvatar}
                className="mt-2 text-[11px] text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
              >
                {removingAvatar ? "Removing…" : "Remove photo"}
              </button>
            )}
            {editingName ? (
              <div className="mt-3 flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  placeholder="Your name"
                  className="bg-card/60 border border-border/30 rounded-xl px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 text-center"
                />
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform disabled:opacity-50"
                  aria-label="Save name"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-muted text-muted-foreground active:scale-95 transition-transform"
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={startEditName}
                className="mt-3 inline-flex items-center gap-1.5 group"
                aria-label="Edit name"
              >
                <h1 className="font-display text-2xl font-bold">
                  {profile?.display_name || "Athlete"}
                </h1>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>

          {/* Inline metric chips — lifetime / identity */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {(() => {
              const createdAt = user?.created_at ? new Date(user.created_at) : null;
              const monthsSince = createdAt
                ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)))
                : 0;
              const memberValue = createdAt
                ? monthsSince < 1
                  ? "New"
                  : monthsSince < 12
                    ? `${monthsSince}mo`
                    : `${(monthsSince / 12).toFixed(1)}y`
                : "—";
              const memberSub = createdAt
                ? `Joined ${createdAt.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
                : "";
              const volFmt = (kg: number) => {
                if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}kt`;
                if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)}t`;
                return `${Math.round(kg)}kg`;
              };
              const volSub = lifetimeKg >= 1_000 ? "all-time (tonnes)" : "all-time (kg)";
              return [
                { icon: Star,     label: "Member",   value: memberValue,                                sub: memberSub,           color: "text-primary",                                              onClick: undefined as undefined | (() => void),         tooltip: "How long you've been on Iron Keeper." },
                { icon: Target,   label: "Workouts", value: `${totalWorkouts}`,                         sub: "all-time sessions", color: "text-success",                                              onClick: () => navigate("/history"),                    tooltip: "Total workouts you've ever logged." },
                { icon: Dumbbell, label: "Volume",   value: lifetimeKg > 0 ? volFmt(lifetimeKg) : "—",  sub: volSub,              color: lifetimeKg > 0 ? "text-amber-400" : "text-muted-foreground", onClick: () => navigate("/progress"),                   tooltip: "Cumulative weight × reps from every working set you've ever logged (excludes warm-ups). Shown in tonnes once over 1,000 kg." },
              ];
            })().map(({ icon: Icon, label, value, sub, color, onClick, tooltip }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                disabled={!onClick}
                title={tooltip}
                className={`rounded-xl bg-card/40 hairline border p-3 text-center ${onClick ? "active:scale-[0.97] transition-transform" : ""}`}
              >
                <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
                <p className={`font-display text-xl font-bold tabular-nums ${color}`}>{value}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
                <p className="text-[9px] text-muted-foreground/70 mt-0.5 truncate">{sub}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Level + Tier hero */}
        <ProfileLevelTier />

        {/* Badge shelf */}
        <div className="glass-card rounded-xl p-4">
          <BadgeShelf variant="compact" />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/sessions")}
            className="glass-card rounded-xl p-4 flex items-center gap-3 text-left hover:ring-1 hover:ring-primary/30 transition-all col-span-2"
          >
            <Dumbbell className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Sessions</p>
              <p className="text-[10px] text-muted-foreground">Browse and start workouts</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/body")}
            className="glass-card rounded-xl p-4 flex items-center gap-3 text-left hover:ring-1 hover:ring-primary/30 transition-all"
          >
            <Scale className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Body Tracking</p>
              <p className="text-[10px] text-muted-foreground">Weight & body fat</p>
            </div>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/exercises")}
            className="glass-card rounded-xl p-4 flex items-center gap-3 text-left hover:ring-1 hover:ring-primary/30 transition-all"
          >
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Exercise Library</p>
              <p className="text-[10px] text-muted-foreground">Browse 58+ exercises</p>
            </div>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/history")}
            className="glass-card rounded-xl p-4 flex items-center gap-3 text-left hover:ring-1 hover:ring-primary/30 transition-all"
          >
            <Star className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Weekly Reviews</p>
              <p className="text-[10px] text-muted-foreground">Reflect & track progress</p>
            </div>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/progress?tab=photos")}
            className="glass-card rounded-xl p-4 flex items-center gap-3 text-left hover:ring-1 hover:ring-primary/30 transition-all"
          >
            <Camera className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Progress Photos</p>
              <p className="text-[10px] text-muted-foreground">Compare over time</p>
            </div>
          </motion.button>
        </div>

        {/* Training Programme card */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold">Training Programme</h3>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/onboarding?from=profile")}
              className="flex items-center gap-1 text-xs text-primary bg-primary/10 rounded-full px-2.5 py-1 hover:bg-primary/20 transition-colors"
            >
              <Settings2 className="h-3 w-3" />
              {prefs ? "Change" : "Set up"}
            </motion.button>
          </div>

          {prefs && prefs.splitId === "none" ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 flex-shrink-0">
                  <Heart className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">You're tracking health only</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Nutrition, weight, and activity tracking — no workout programme set.
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/onboarding?from=profile")}
                className="w-full flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-left hover:bg-primary/15 transition-colors"
              >
                <p className="text-sm font-semibold text-foreground">Add a workout plan</p>
                <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/food?edit-goals=1")}
                className="w-full flex items-center justify-between rounded-xl bg-muted/40 border border-border/40 px-4 py-3 text-left hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Apple className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Edit nutrition goals</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </motion.button>
            </div>
          ) : prefs && splitMeta ? (
            <div className="space-y-2">
              {/* Programme, Days/Week, Focus rows */}
              {[
                { label: "Programme", value: prefs.splitName,              color: "text-foreground font-medium" },
                { label: "Days/Week", value: `${prefs.daysPerWeek} days`,  color: "text-foreground" },
                { label: "Focus",     value: splitMeta.focus,              color: "text-foreground font-semibold" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={color}>{value}</span>
                </div>
              ))}
              {/* Intensity as coloured chip */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Intensity</span>
                <span className={`inline-flex items-center rounded-full bg-card/60 hairline border px-2.5 py-1 text-[11px] font-semibold ${splitMeta.intensityColor}`}>
                  {splitMeta.intensity}
                </span>
              </div>

              <div className="h-px bg-border/50" />

              {/* Day pills */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {prefs.schedule.map((day, i) => {
                  const workout = WORKOUTS.find((w) => w.id === day.workoutId);
                  const Icon = workout?.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      {Icon && <Icon className="h-2.5 w-2.5" />}
                      {day.label}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/onboarding?from=profile")}
              className="w-full flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-left hover:bg-primary/15 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">Set up your training programme</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Personalise your session recommendations</p>
              </div>
              <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
            </motion.button>
          )}
        </div>

        {/* Recovery / training tips specific to the user's split — hidden in no-workout mode */}
        {prefs?.splitId !== "none" && <RecoveryTips splitId={prefs?.splitId} />}

        {/* Recompute historical strain — useful after scoring algorithm updates */}
        <button
          onClick={handleBackfill}
          disabled={backfilling}
          className="glass-card rounded-xl p-4 flex items-center justify-between gap-3 w-full text-left hover:bg-card/60 transition-colors disabled:opacity-60"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 flex-shrink-0">
              {backfilling ? <Loader2 className="h-4 w-4 text-primary animate-spin" /> : <RefreshCw className="h-4 w-4 text-primary" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Recalculate recovery scores</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Refresh strain for the last 30 days</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
        </button>

        {/* Leaderboard privacy */}
        <div className="glass-card rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 flex-shrink-0">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Show me on leaderboards</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Others can see your rank and stats</p>
            </div>
          </div>
          <button
            onClick={() => handleLeaderboardToggle(!leaderboardVisible)}
            className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
              leaderboardVisible ? "bg-primary" : "bg-muted"
            }`}
            aria-checked={leaderboardVisible}
            role="switch"
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                leaderboardVisible ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Sign out */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-destructive/10 text-destructive py-3 text-sm font-medium hover:bg-destructive/15 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </motion.button>

        {/* Version */}
        <p className="text-center text-[11px] text-muted-foreground/50 pt-2">
          v{APP_VERSION}
        </p>
      </div>
    </div>
  );
}

function ProfileLevelTier() {
  const { data: progress } = useUserProgress();
  const { data: season } = useCurrentSeason();
  if (!progress) return null;
  const rp = progress.seasonRp;
  const tier = tierFromRp(rp);
  const next = nextTier(rp);
  const pct = tierProgress(rp) * 100;
  const days = daysRemaining(season);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-gradient-to-br ${tier.gradient} ring-1 ring-border/40 p-4 space-y-4`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary font-semibold">Level</p>
          <p className="font-display text-4xl font-bold leading-none mt-1">{progress.level}</p>
        </div>
        <TierBadge rp={rp} />
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums mb-1.5">
          <span>{progress.levelProgress.current.toLocaleString()} / {progress.levelProgress.needed.toLocaleString()} XP</span>
          <span>L{progress.level + 1}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress.levelProgress.pct}%` }}
            transition={{ duration: 0.6 }}
            className="h-full bg-gradient-to-r from-primary to-primary/70"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-border/40">
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Season {season?.number ?? 1} · {rp.toLocaleString()} RP
          </p>
          <p className="text-[10px] text-muted-foreground">{days}d left</p>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6 }}
            className="h-full bg-gradient-to-r from-primary/70 to-primary/40"
          />
        </div>
        {next && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {(next.minRp - rp).toLocaleString()} RP to {next.label}
          </p>
        )}
      </div>
    </motion.div>
  );
}
