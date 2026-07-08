import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { WORKOUTS } from "@/lib/workout-data";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calendar, Clock, Dumbbell, Star, MessageSquare,
  ChevronDown, ChevronUp, Trophy, Moon, HeartPulse,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/hooks/useAuth";
import MessageThread from "@/components/coach/MessageThread";

type WorkoutRow = {
  id: string;
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

type PersonalRecord = {
  exerciseId: string;
  name: string;
  weight: number;
  reps: number;
  date: string;
};

export default function CoachAthleteDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; last_seen_at: string | null } | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<{ recovery_score: number | null; strain_score: number | null; sleep_performance: number | null; date: string } | null>(null);
  const [avgSleepHours, setAvgSleepHours] = useState<number | null>(null);

  useEffect(() => {
    if (userId) loadData(userId);
  }, [userId]);

  async function loadData(uid: string) {
    setLoading(true);

    const [pRes, wRes, scoreRes, sleepRes] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url, last_seen_at").eq("user_id", uid).maybeSingle(),
      supabase.from("workout_history").select("id, workout_name, date, duration, exercises_completed, total_exercises, effort_rating, session_notes")
        .eq("user_id", uid).order("date", { ascending: false }).limit(20),
      supabase.from("daily_scores").select("recovery_score, strain_score, sleep_performance, date")
        .eq("user_id", uid).order("date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("sleep_logs").select("hours").eq("user_id", uid).order("date", { ascending: false }).limit(7),
    ]);

    setProfile(pRes.data ?? null);

    const wData = wRes.data ?? [];
    setWorkouts(wData);
    setRecovery(scoreRes.data ?? null);

    const sleepHours = (sleepRes.data ?? []).map((s) => Number(s.hours));
    setAvgSleepHours(sleepHours.length > 0 ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length : null);

    if (wData.length > 0) {
      const ids = wData.map((w) => w.id);
      const { data: sData } = await supabase
        .from("workout_sets")
        .select("exercise_name, exercise_id, reps, weight, workout_history_id")
        .in("workout_history_id", ids);
      setSets(sData ?? []);
    }

    const { data: allSets } = await supabase
      .from("workout_sets")
      .select("exercise_id, exercise_name, reps, weight, created_at, set_type")
      .eq("user_id", uid)
      .order("weight", { ascending: false })
      .limit(2000);

    const prMap: Record<string, PersonalRecord> = {};
    (allSets ?? []).forEach((s) => {
      const setType = (s as { set_type?: string }).set_type ?? "working";
      const reps = Number(s.reps);
      const weight = Number(s.weight);
      if (setType === "warmup" || reps < 1) return;
      if (!prMap[s.exercise_id] || weight > prMap[s.exercise_id].weight) {
        prMap[s.exercise_id] = { exerciseId: s.exercise_id, name: s.exercise_name, weight, reps, date: s.created_at };
      }
    });
    setPrs(Object.values(prMap).sort((a, b) => b.weight - a.weight).slice(0, 10));

    setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState label="Loading athlete" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-4 flex items-center gap-3"
        style={{ paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))" }}
      >
        <button onClick={() => navigate("/coach")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-display text-lg font-bold tracking-tight">{profile?.display_name || "Athlete"}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{workouts.length} recent workout{workouts.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="px-4 py-4 mx-auto md:max-w-3xl space-y-4">
        {/* Recovery snapshot */}
        {(recovery || avgSleepHours !== null) && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-card border border-border/40 p-3 text-center">
              <HeartPulse className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
              <p className="text-sm font-bold">{recovery?.recovery_score != null ? Math.round(recovery.recovery_score) : "—"}</p>
              <p className="text-[10px] text-muted-foreground">Recovery</p>
            </div>
            <div className="rounded-xl bg-card border border-border/40 p-3 text-center">
              <Dumbbell className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
              <p className="text-sm font-bold">{recovery?.strain_score != null ? Number(recovery.strain_score).toFixed(1) : "—"}</p>
              <p className="text-[10px] text-muted-foreground">Strain</p>
            </div>
            <div className="rounded-xl bg-card border border-border/40 p-3 text-center">
              <Moon className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
              <p className="text-sm font-bold">{avgSleepHours != null ? avgSleepHours.toFixed(1) + "h" : "—"}</p>
              <p className="text-[10px] text-muted-foreground">Avg sleep (7d)</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {user && userId && (
          <div className="rounded-2xl bg-card border border-border/40 p-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Messages
            </h2>
            <MessageThread coachUserId={user.id} athleteUserId={userId} currentUserId={user.id} />
          </div>
        )}

        {/* Personal records */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Personal Records</h2>
          {prs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No recorded sets yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {prs.map((pr) => (
                <div key={pr.exerciseId} className="rounded-xl bg-card border border-border/40 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Trophy className="h-3 w-3 text-primary shrink-0" />
                    <p className="text-xs font-semibold truncate">{pr.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{pr.weight}kg × {pr.reps}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent workouts */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Workouts</h2>
          {workouts.length === 0 && (
            <EmptyState icon={Dumbbell} title="No workouts yet" description="Once this athlete completes a session, it'll show up here." />
          )}
          <div className="space-y-2">
            {workouts.map((w) => {
              const expanded = expandedId === w.id;
              const wSets = setsForWorkout(w.id);
              return (
                <motion.div key={w.id} className="rounded-2xl bg-card border border-border/40 overflow-hidden">
                  <button onClick={() => setExpandedId(expanded ? null : w.id)} className="w-full px-4 py-3.5 flex items-center gap-3 text-left">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{w.workout_name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(w.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{w.duration} min</span>
                      </div>
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>
                  {expanded && (
                    <div className="border-t border-border/30 px-4 py-3 space-y-2">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" />{w.exercises_completed}/{w.total_exercises} exercises</span>
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
                            <div key={si} className="flex items-center justify-between text-xs rounded-lg bg-muted/30 px-3 py-2">
                              <span className="font-medium text-foreground truncate mr-3">{s.exercise_name || "Exercise"}</span>
                              <span className="text-muted-foreground whitespace-nowrap">{formatSet(s)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
