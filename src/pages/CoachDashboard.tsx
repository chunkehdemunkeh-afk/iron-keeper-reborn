import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WORKOUTS } from "@/lib/workout-data";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Dumbbell, Clock, Calendar, User, LogOut,
  CheckCircle2, XCircle, Activity, Trophy, Bell, X, Star, MessageSquare, Users,
  UserPlus, Copy, UserMinus,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { getOrCreateCoachInviteCode, removeAthleteFromRoster } from "@/lib/data/coach-queries";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type WorkoutRow = {
  id: string;
  user_id: string;
  workout_name: string;
  date: string;
  duration: number;
  exercises_completed: number;
  total_exercises: number;
  effort_rating: number | null;
  session_notes: string | null;
};

type SetRow = {
  exercise_name: string;
  exercise_id: string;
  reps: number;
  weight: number;
  workout_history_id: string;
};

type Profile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
};

type AthleteInfo = {
  profile: Profile;
  todayStretched: boolean;
  lastSeen: string | null;
  workoutCount: number;
};

type PBNotification = {
  id: string;
  user_id: string;
  exercise_name: string;
  previous_weight: number;
  new_weight: number;
  reps: number;
  read: boolean;
  created_at: string;
};

export default function CoachDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [athletes, setAthletes] = useState<Record<string, AthleteInfo>>({});
  const [notifications, setNotifications] = useState<PBNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);
  const [filterAthlete, setFilterAthlete] = useState<string>("all");
  const [exerciseSearch, setExerciseSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const today = new Date().toISOString().split("T")[0];

    const [wRes, pRes, stretchRes, notifRes] = await Promise.all([
      supabase.from("workout_history").select("*").order("date", { ascending: false }).limit(200),
      supabase.from("profiles").select("user_id, display_name, avatar_url, last_seen_at"),
      supabase.from("stretch_completions").select("user_id, date").eq("date", today),
      supabase.from("coach_notifications").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    setNotifications((notifRes.data ?? []) as PBNotification[]);

    const wData = wRes.data ?? [];
    setWorkouts(wData);

    const stretchedToday = new Set<string>();
    stretchRes.data?.forEach((s) => stretchedToday.add(s.user_id));

    const workoutCounts: Record<string, number> = {};
    wData.forEach((w) => { workoutCounts[w.user_id] = (workoutCounts[w.user_id] || 0) + 1; });

    const athleteMap: Record<string, AthleteInfo> = {};
    pRes.data?.forEach((p) => {
      athleteMap[p.user_id] = {
        profile: p as Profile,
        todayStretched: stretchedToday.has(p.user_id),
        lastSeen: (p as any).last_seen_at ?? null,
        workoutCount: workoutCounts[p.user_id] || 0,
      };
    });
    setAthletes(athleteMap);

    if (wData.length > 0) {
      const ids = wData.map((w) => w.id);
      const { data: sData } = await supabase
        .from("workout_sets")
        .select("exercise_name, exercise_id, reps, weight, workout_history_id")
        .in("workout_history_id", ids);
      setSets(sData ?? []);
    }

    setLoading(false);
  }

  async function handleToggleInvite() {
    setShowInvite((prev) => !prev);
    if (!inviteCode) {
      setLoadingCode(true);
      const { code, error } = await getOrCreateCoachInviteCode();
      setLoadingCode(false);
      if (error) {
        toast.error(error);
        return;
      }
      setInviteCode(code);
    }
  }

  async function copyInviteCode() {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    toast.success("Invite code copied");
  }

  async function confirmRemoveAthlete() {
    if (!removeTarget) return;
    const { error } = await removeAthleteFromRoster(removeTarget.userId);
    if (error) {
      toast.error(error);
    } else {
      toast.success(`${removeTarget.name} removed from your roster`);
      loadData();
    }
    setRemoveTarget(null);
  }

  const allExercises = WORKOUTS.flatMap((w) => w.exercises);
  const getExerciseMeta = (id: string) => allExercises.find((e) => e.id === id);

  const formatSet = (s: SetRow) => {
    const ex = getExerciseMeta(s.exercise_id);
    const isTimeBased = ex?.repLabel === "Sec";
    if (isTimeBased) return `${s.reps}s`;
    const showWeight = ex?.trackWeight !== false;
    if (showWeight && Number(s.weight) > 0) return `${s.reps} reps × ${Number(s.weight)} kg`;
    return `${s.reps} ${(ex?.repLabel || "reps").toLowerCase()}`;
  };

  const setsForWorkout = (id: string) => sets.filter((s) => s.workout_history_id === id);

  const getUserName = (userId: string) =>
    athletes[userId]?.profile.display_name || "Unknown User";

  const formatLastSeen = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("coach_notifications").update({ read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const searchLower = exerciseSearch.trim().toLowerCase();
  const filteredWorkouts = workouts.filter((w) => {
    if (filterAthlete !== "all" && w.user_id !== filterAthlete) return false;
    if (!searchLower) return true;
    if (w.workout_name.toLowerCase().includes(searchLower)) return true;
    return setsForWorkout(w.id).some((s) => (s.exercise_name || "").toLowerCase().includes(searchLower));
  });

  const uniqueAthletes = Object.values(athletes)
    .filter((a) => a.profile.user_id)
    .sort((a, b) => {
      const aDate = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
      const bDate = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
      return bDate - aDate;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState label="Loading workouts" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-4 flex items-center justify-between"
        style={{ paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))" }}
      >
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">Coach Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {uniqueAthletes.length} athlete{uniqueAthletes.length !== 1 ? "s" : ""} · {workouts.length} workout{workouts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleInvite}
            className="flex items-center justify-center h-9 w-9 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Invite an athlete"
          >
            <UserPlus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-xl bg-card px-3 py-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>

      {/* PB Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-b border-border bg-card/50 overflow-hidden"
          >
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  Personal Best Alerts
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifications(false)} aria-label="Close notifications">
                    <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No personal bests yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs ${
                        n.read ? "bg-muted/20" : "bg-primary/10 border border-primary/20"
                      }`}
                    >
                      <Trophy className={`h-4 w-4 shrink-0 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {getUserName(n.user_id)} — {n.exercise_name}
                        </p>
                        <p className="text-muted-foreground">
                          {Number(n.previous_weight) > 0
                            ? `${n.previous_weight}kg → ${n.new_weight}kg`
                            : `${n.new_weight}kg`}{" "}
                          × {n.reps} reps
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatLastSeen(n.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite panel */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-b border-border bg-card/50 overflow-hidden"
          >
            <div className="px-4 py-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Invite an athlete
              </h3>
              {loadingCode ? (
                <p className="text-xs text-muted-foreground">Generating code…</p>
              ) : inviteCode ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 rounded-lg bg-muted/40 border border-border/40 px-3 py-2 text-sm font-mono tracking-widest text-center">
                    {inviteCode}
                  </span>
                  <button
                    onClick={copyInviteCode}
                    className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0"
                    aria-label="Copy invite code"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Couldn't load an invite code.</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">
                Share this code — athletes enter it in their Profile to join your roster.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Athletes summary strip */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Athletes Today</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {uniqueAthletes.map((a) => (
            <div
              key={a.profile.user_id}
              onClick={() => navigate(`/coach/athlete/${a.profile.user_id}`)}
              className="relative shrink-0 rounded-xl bg-card border border-border/40 px-3 py-2.5 min-w-[140px] cursor-pointer hover:border-primary/40 transition-colors"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRemoveTarget({ userId: a.profile.user_id, name: a.profile.display_name || "This athlete" });
                }}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground"
                aria-label="Remove athlete"
              >
                <UserMinus className="h-2.5 w-2.5" />
              </button>
              <p className="text-xs font-semibold truncate">{a.profile.display_name || "Unknown"}</p>
              <div className="flex items-center gap-1 mt-1.5">
                {a.todayStretched ? (
                  <CheckCircle2 className="h-3 w-3 text-success" />
                ) : (
                  <XCircle className="h-3 w-3 text-destructive/60" />
                )}
                <span className="text-[10px] text-muted-foreground">
                  {a.todayStretched ? "Stretched" : "Not stretched"}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {formatLastSeen(a.lastSeen)}
                </span>
              </div>
            </div>
          ))}
          {uniqueAthletes.length === 0 && (
            <p className="text-xs text-muted-foreground">No athletes yet.</p>
          )}
        </div>
      </div>

      {/* Workout list */}
      <div className="px-4 py-2 pb-8 mx-auto md:max-w-5xl">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Workouts</h2>

        {workouts.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <select
              value={filterAthlete}
              onChange={(e) => setFilterAthlete(e.target.value)}
              className="rounded-lg bg-card border border-border/40 px-3 py-2 text-xs"
            >
              <option value="all">All athletes</option>
              {uniqueAthletes.map((a) => (
                <option key={a.profile.user_id} value={a.profile.user_id}>
                  {a.profile.display_name || "Unknown"}
                </option>
              ))}
            </select>
            <input
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              placeholder="Search exercise or workout name…"
              className="flex-1 rounded-lg bg-card border border-border/40 px-3 py-2 text-xs"
            />
          </div>
        )}

        {workouts.length === 0 && (
          <EmptyState
            icon={Users}
            title="No workouts yet"
            description="Once your athletes complete sessions, they'll show up here."
          />
        )}

        {workouts.length > 0 && filteredWorkouts.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-4 text-center">No workouts match this filter.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {filteredWorkouts.map((w, i) => {
          const expanded = expandedId === w.id;
          const wSets = setsForWorkout(w.id);

          return (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5), duration: 0.3 }}
              className="rounded-2xl bg-card border border-border/40 overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expanded ? null : w.id)}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{getUserName(w.user_id)}</p>
                  <p className="text-xs text-muted-foreground truncate">{w.workout_name}</p>
                </div>
                <div className="text-right shrink-0 mr-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(w.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Clock className="h-3 w-3" />
                    {w.duration} min
                  </div>
                </div>
                {expanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-border/30 px-4 py-3 space-y-2"
                >
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Dumbbell className="h-3 w-3" />
                      {w.exercises_completed}/{w.total_exercises} exercises
                    </span>
                    {w.effort_rating && (
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3 w-3 ${s <= w.effort_rating! ? "text-primary fill-primary" : "text-muted-foreground/20"}`} />
                        ))}
                      </span>
                    )}
                  </div>

                  {w.session_notes && (
                    <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 mb-2">
                      <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">{w.session_notes}</p>
                    </div>
                  )}

                  {wSets.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No set data recorded.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {wSets.map((s, si) => (
                        <div
                          key={si}
                          className="flex items-center justify-between text-xs rounded-lg bg-muted/30 px-3 py-2"
                        >
                          <span className="font-medium text-foreground truncate mr-3">
                            {s.exercise_name || "Exercise"}
                          </span>
                          <span className="text-muted-foreground whitespace-nowrap">
                            {formatSet(s)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}
        </div>
      </div>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll be removed from your roster and you'll no longer see their workouts, recovery, or nutrition data. They can rejoin later with your invite code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveAthlete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
