import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Dumbbell, Trophy, Moon, HeartPulse, Activity, MessageSquare, Flame,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { AsyncBoundary } from "@/components/ui/async-boundary";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteSessions, useSessionReview } from "@/hooks/queries/useCoachFeed";
import CoachFeedCard from "@/components/coach/CoachFeedCard";
import ConversationView from "@/components/coach/ConversationView";
import AthleteAvatar from "@/components/coach/AthleteAvatar";
import { resolveExerciseName } from "@/lib/exercise-names";
import type { FeedSession } from "@/lib/data/coach-feed-queries";

type Tab = "overview" | "sessions" | "messages";

type PersonalRecord = { exerciseId: string; name: string; weight: number; reps: number };

export default function CoachAthleteDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [recovery, setRecovery] = useState<{ recovery_score: number | null; strain_score: number | null } | null>(null);
  const [avgSleepHours, setAvgSleepHours] = useState<number | null>(null);

  const { data: sessions, isLoading: sessionsLoading } = useAthleteSessions(userId);
  const { acknowledge, undo } = useSessionReview();

  useEffect(() => {
    if (userId) void loadData(userId);
  }, [userId]);

  async function loadData(uid: string) {
    setLoading(true);
    const [pRes, scoreRes, sleepRes, setsRes] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url").eq("user_id", uid).maybeSingle(),
      supabase.from("daily_scores").select("recovery_score, strain_score").eq("user_id", uid)
        .order("date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("sleep_logs").select("hours").eq("user_id", uid).order("date", { ascending: false }).limit(7),
      supabase.from("workout_sets").select("exercise_id, exercise_name, reps, weight, set_type")
        .eq("user_id", uid).order("weight", { ascending: false }).limit(2000),
    ]);

    setProfile(pRes.data ?? null);
    setRecovery(scoreRes.data ?? null);
    const hrs = (sleepRes.data ?? []).map((s) => Number(s.hours));
    setAvgSleepHours(hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null);

    const map: Record<string, PersonalRecord> = {};
    (setsRes.data ?? []).forEach((s) => {
      const setType = (s as { set_type?: string }).set_type ?? "working";
      const reps = Number(s.reps);
      const weight = Number(s.weight);
      if (setType === "warmup" || reps < 1) return;
      if (!map[s.exercise_id] || weight > map[s.exercise_id].weight) {
        map[s.exercise_id] = {
          exerciseId: s.exercise_id,
          name: resolveExerciseName(s.exercise_id, s.exercise_name),
          weight,
          reps,
        };
      }
    });
    setPrs(Object.values(map).sort((a, b) => b.weight - a.weight).slice(0, 10));
    setLoading(false);
  }

  const weekSessions = (sessions ?? []).filter(
    (s) => Date.now() - new Date(s.date).getTime() < 7 * 86_400_000,
  );
  const weekVolume = weekSessions.reduce((a, s) => a + s.totalVolume, 0);
  const weekSets = weekSessions.reduce((a, s) => a + s.workingSets, 0);

  const handleToggleReview = (s: FeedSession) => {
    if (s.reviewedAt) undo.mutate(s.id);
    else acknowledge.mutate({ sessionId: s.id, athleteId: s.athleteId });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState label="Loading athlete" />
      </div>
    );
  }

  const name = profile?.display_name || "Athlete";

  return (
    <AsyncBoundary>
      <div className="min-h-screen bg-background text-foreground">
        <div
          className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl hairline border-b px-4 py-4"
          style={{ paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))" }}
        >
          <div className="mx-auto max-w-lg md:max-w-2xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/coach")}
                className="h-9 w-9 rounded-xl bg-card flex items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <AthleteAvatar name={name} url={profile?.avatar_url ?? null} size={36} />
              <div className="min-w-0">
                <h1 className="font-display text-lg font-bold tracking-tight truncate">{name}</h1>
                <p className="text-xs text-muted-foreground">
                  {weekSessions.length} session{weekSessions.length === 1 ? "" : "s"} this week
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-muted/30 p-1">
              {([
                { id: "overview" as const, label: "Overview", icon: Activity },
                { id: "sessions" as const, label: "Sessions", icon: Dumbbell },
                { id: "messages" as const, label: "Messages", icon: MessageSquare },
              ]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors ${
                    tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tab === "messages" && user && userId ? (
          <div className="mx-auto max-w-lg md:max-w-2xl h-[calc(100dvh-140px)] flex flex-col">
            <ConversationView coachUserId={user.id} athleteUserId={userId} />
          </div>
        ) : (
          <div className="mx-auto max-w-lg md:max-w-2xl px-4 py-4 pb-28 space-y-5">
            {tab === "overview" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Dumbbell, label: "Volume (7d)", value: `${Math.round(weekVolume).toLocaleString()} kg` },
                    { icon: Flame, label: "Working sets (7d)", value: `${weekSets}` },
                    { icon: HeartPulse, label: "Recovery", value: recovery?.recovery_score != null ? String(Math.round(recovery.recovery_score)) : "—" },
                    { icon: Moon, label: "Avg sleep (7d)", value: avgSleepHours != null ? `${avgSleepHours.toFixed(1)}h` : "—" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-2xl bg-card hairline border p-3">
                      <Icon className="h-4 w-4 text-primary mb-1.5" />
                      <p className="font-display text-lg font-bold tabular-nums">{value}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Personal records
                  </h2>
                  {prs.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No recorded sets yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {prs.map((pr) => (
                        <div key={pr.exerciseId} className="rounded-xl bg-card hairline border px-3 py-2.5">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Trophy className="h-3 w-3 text-primary shrink-0" />
                            <p className="text-xs font-semibold truncate">{pr.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {pr.weight}kg × {pr.reps}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === "sessions" && (
              sessionsLoading ? (
                <LoadingState label="Loading sessions" />
              ) : (sessions ?? []).length === 0 ? (
                <EmptyState
                  icon={Dumbbell}
                  title="No sessions yet"
                  description="Completed workouts will appear here automatically."
                />
              ) : (
                <div className="space-y-2">
                  {(sessions ?? []).map((s) => (
                    <CoachFeedCard
                      key={s.id}
                      session={s}
                      onComment={() => navigate(`/inbox/${s.athleteId}?session=${s.id}`)}
                      onToggleReview={handleToggleReview}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </AsyncBoundary>
  );
}
