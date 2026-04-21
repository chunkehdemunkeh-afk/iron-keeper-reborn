import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchWorkoutHistory, fetchActivityLogs } from "@/lib/cloud-data";
import { Flame, Target, Award, LogOut, Scale, BookOpen, User, Settings2, ChevronRight, Pencil, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import RecoveryTips from "@/components/RecoveryTips";
import { useQuery } from "@tanstack/react-query";
import { getUserPreferences, computeWeeklyStreak } from "@/lib/user-preferences";
import { WORKOUTS } from "@/lib/workout-data";
import { toast } from "sonner";
import { hapticSuccess } from "@/lib/haptics";

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
  const { user, profile, signOut, updateDisplayName } = useAuth();
  const navigate = useNavigate();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

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

  const { data: history = [] } = useQuery({
    queryKey: ["workout-history", user?.id],
    queryFn: fetchWorkoutHistory,
    enabled: !!user,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activity-logs", user?.id],
    queryFn: fetchActivityLogs,
    enabled: !!user,
  });

  const totalWorkouts = history.length;
  const totalMinutes = history.reduce((s, w) => s + (w.duration || 0), 0);

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
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-5">

        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Profile"
              className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/30"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-primary glow-primary">
              <User className="h-10 w-10 text-primary-foreground" />
            </div>
          )}
          <h1 className="font-display text-2xl font-bold mt-3">
            {profile?.display_name || "Athlete"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user?.email}
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Flame,  label: "Streak",   value: streak > 0 ? `${streak} week` : "—", color: streak > 0 ? "text-primary" : "text-muted-foreground", onClick: undefined },
            { icon: Target, label: "Workouts", value: totalWorkouts, color: "text-success", onClick: () => navigate("/history") },
            { icon: Award,  label: "Minutes",  value: totalMinutes, color: "text-foreground", onClick: undefined },
          ].map(({ icon: Icon, label, value, color, onClick }) => (
            <div
              key={label}
              className={`glass-card rounded-xl p-3 text-center ${onClick ? "cursor-pointer active:scale-[0.97] transition-transform" : ""}`}
              onClick={onClick}
            >
              <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
              <p className={`font-display text-xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2">
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

          {prefs && splitMeta ? (
            <div className="space-y-2">
              {/* Programme, Days/Week, Intensity, Focus rows */}
              {[
                { label: "Programme", value: prefs.splitName,              color: "text-foreground font-medium" },
                { label: "Days/Week", value: `${prefs.daysPerWeek} days`,  color: "text-foreground" },
                { label: "Intensity", value: splitMeta.intensity,          color: splitMeta.intensityColor },
                { label: "Focus",     value: splitMeta.focus,              color: "text-foreground font-semibold" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={color}>{value}</span>
                </div>
              ))}

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

        {/* Recovery / training tips specific to the user's split */}
        <RecoveryTips splitId={prefs?.splitId} />

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
