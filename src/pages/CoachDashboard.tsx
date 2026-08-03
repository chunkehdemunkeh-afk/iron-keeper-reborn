import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Users, Inbox as InboxIcon, UserPlus, Copy, LogOut, Bell, Trophy, X,
  Dumbbell, Filter, CheckCircle2,
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { AsyncBoundary } from "@/components/ui/async-boundary";
import { getOrCreateCoachInviteCode } from "@/lib/data/coach-queries";
import { useCoachFeed, useRosterStats, useSessionReview } from "@/hooks/queries/useCoachFeed";
import { useInboxThreads, useUnreadMessages } from "@/hooks/queries/useInbox";
import CoachFeedCard from "@/components/coach/CoachFeedCard";
import AthleteStatusCard from "@/components/coach/AthleteStatusCard";
import InboxList from "@/components/coach/InboxList";
import type { FeedSession } from "@/lib/data/coach-feed-queries";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { useQueryClient } from "@tanstack/react-query";

type Tab = "feed" | "athletes" | "inbox";
type Range = 7 | 30 | 0;

function dayHeading(d: Date) {
  const now = new Date();
  if (isSameDay(d, now)) return "Today";
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (isSameDay(d, y)) return "Yesterday";
  return format(d, "EEEE d MMMM");
}

export default function CoachDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("feed");
  const [athleteFilter, setAthleteFilter] = useState<string>("all");
  const [range, setRange] = useState<Range>(7);
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showPRs, setShowPRs] = useState(false);
  const [prs, setPrs] = useState<
    { id: string; user_id: string; exercise_name: string; previous_weight: number; new_weight: number; reps: number; read: boolean; created_at: string }[]
  >([]);

  const { data: feed, isLoading: feedLoading } = useCoachFeed();
  const { data: roster, isLoading: rosterLoading } = useRosterStats();
  const { data: threads } = useInboxThreads();
  const { data: unread } = useUnreadMessages();
  const { acknowledge, undo } = useSessionReview();

  const ptr = usePullToRefresh({
    onRefresh: async () => {
      await qc.invalidateQueries();
    },
  });

  const filtered = useMemo(() => {
    const cutoff = range === 0 ? 0 : Date.now() - range * 86_400_000;
    return (feed ?? []).filter((s) => {
      if (athleteFilter !== "all" && s.athleteId !== athleteFilter) return false;
      if (unreviewedOnly && s.reviewedAt) return false;
      if (cutoff && new Date(s.date).getTime() < cutoff) return false;
      return true;
    });
  }, [feed, athleteFilter, range, unreviewedOnly]);

  const grouped = useMemo(() => {
    const out: { label: string; items: FeedSession[] }[] = [];
    filtered.forEach((s) => {
      const label = dayHeading(new Date(s.date));
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(s);
      else out.push({ label, items: [s] });
    });
    return out;
  }, [filtered]);

  const unreviewedCount = (feed ?? []).filter((s) => !s.reviewedAt).length;

  async function toggleInvite() {
    setShowInvite((v) => !v);
    if (!inviteCode) {
      const { code, error } = await getOrCreateCoachInviteCode();
      if (error) return toast.error(error);
      setInviteCode(code);
    }
  }

  async function loadPRs() {
    setShowPRs((v) => !v);
    if (prs.length === 0) {
      const { data } = await supabase
        .from("coach_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setPrs((data ?? []) as never);
    }
  }

  const handleComment = (s: FeedSession) => navigate(`/inbox/${s.athleteId}?session=${s.id}`);
  const handleToggleReview = (s: FeedSession) => {
    if (s.reviewedAt) undo.mutate(s.id);
    else acknowledge.mutate({ sessionId: s.id, athleteId: s.athleteId });
  };

  return (
    <AsyncBoundary>
      <div className="min-h-screen bg-background text-foreground">
        <PullToRefreshIndicator {...ptr} />

        {/* Header */}
        <div
          className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl hairline border-b px-4 py-4"
          style={{ paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))" }}
        >
          <div className="mx-auto max-w-lg md:max-w-2xl">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="font-display text-xl font-bold tracking-tight">Coach Dashboard</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {roster?.length ?? 0} athlete{(roster?.length ?? 0) === 1 ? "" : "s"} ·{" "}
                  {unreviewedCount} to review · {unread ?? 0} unread
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleInvite}
                  className="h-9 w-9 rounded-xl bg-card flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Invite an athlete"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
                <button
                  onClick={loadPRs}
                  className="h-9 w-9 rounded-xl bg-card flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Personal best alerts"
                >
                  <Bell className="h-4 w-4" />
                </button>
                <button
                  onClick={signOut}
                  className="h-9 w-9 rounded-xl bg-card flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-muted/30 p-1">
              {([
                { id: "feed" as const, label: "Feed", icon: Activity, badge: unreviewedCount },
                { id: "athletes" as const, label: "Athletes", icon: Users, badge: 0 },
                { id: "inbox" as const, label: "Inbox", icon: InboxIcon, badge: unread ?? 0 },
              ]).map(({ id, label, icon: Icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`relative flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors ${
                    tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {badge > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Invite panel */}
        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden hairline border-b bg-card/50"
            >
              <div className="mx-auto max-w-lg md:max-w-2xl px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Invite code</p>
                  <p className="font-display text-2xl font-bold tracking-widest">{inviteCode ?? "…"}</p>
                </div>
                <button
                  onClick={async () => {
                    if (!inviteCode) return;
                    await navigator.clipboard.writeText(inviteCode);
                    toast.success("Invite code copied");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary/15 px-3 py-2 text-xs font-semibold text-primary"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
                <button onClick={() => setShowInvite(false)} aria-label="Close invite panel">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PR alerts */}
        <AnimatePresence>
          {showPRs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden hairline border-b bg-card/50"
            >
              <div className="mx-auto max-w-lg md:max-w-2xl px-4 py-3 space-y-1.5 max-h-[260px] overflow-y-auto">
                {prs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No personal bests yet.</p>
                ) : (
                  prs.map((n) => (
                    <div key={n.id} className="flex items-center gap-3 rounded-xl bg-muted/25 px-3 py-2 text-xs">
                      <Trophy className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{n.exercise_name}</p>
                        <p className="text-muted-foreground">
                          {Number(n.previous_weight) > 0
                            ? `${n.previous_weight}kg → ${n.new_weight}kg`
                            : `${n.new_weight}kg`}{" "}
                          × {n.reps}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(n.created_at), "d MMM")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mx-auto max-w-lg md:max-w-2xl px-4 py-4 pb-28 space-y-4">
          {tab === "feed" && (
            <>
              {/* Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <div className="inline-flex items-center gap-1 rounded-xl bg-muted/30 p-1">
                  {([7, 30, 0] as Range[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                        range === r ? "bg-card text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {r === 0 ? "All" : `${r}d`}
                    </button>
                  ))}
                </div>
                <select
                  value={athleteFilter}
                  onChange={(e) => setAthleteFilter(e.target.value)}
                  className="shrink-0 rounded-xl bg-muted/30 px-3 py-2 text-[11px] font-semibold"
                >
                  <option value="all">All athletes</option>
                  {(roster ?? []).map((r) => (
                    <option key={r.userId} value={r.userId}>
                      {r.displayName}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setUnreviewedOnly((v) => !v)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold ${
                    unreviewedOnly ? "bg-primary/15 text-primary" : "bg-muted/30 text-muted-foreground"
                  }`}
                >
                  <Filter className="h-3 w-3" />
                  Needs review
                </button>
              </div>

              {feedLoading ? (
                <LoadingState label="Loading athlete sessions" />
              ) : grouped.length === 0 ? (
                <EmptyState
                  icon={Dumbbell}
                  title="Nothing logged yet"
                  description="Sessions your athletes complete will appear here automatically."
                />
              ) : (
                grouped.map((g) => (
                  <div key={g.label} className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {g.label}
                    </p>
                    {g.items.map((s) => (
                      <CoachFeedCard
                        key={s.id}
                        session={s}
                        onComment={handleComment}
                        onToggleReview={handleToggleReview}
                        onOpenAthlete={(id) => navigate(`/coach/athlete/${id}`)}
                      />
                    ))}
                  </div>
                ))
              )}
            </>
          )}

          {tab === "athletes" && (
            <>
              {rosterLoading ? (
                <LoadingState label="Loading roster" />
              ) : (roster ?? []).length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No athletes yet"
                  description="Share your invite code so athletes can join your roster."
                />
              ) : (
                <div className="space-y-2">
                  {(roster ?? []).map((r) => (
                    <AthleteStatusCard
                      key={r.userId}
                      stat={r}
                      onOpen={() => navigate(`/coach/athlete/${r.userId}`)}
                      onMessage={() => navigate(`/inbox/${r.userId}`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "inbox" && (
            <>
              {(threads ?? []).length === 0 ? (
                <EmptyState
                  icon={InboxIcon}
                  title="No conversations"
                  description="Add athletes to your roster to start messaging them."
                />
              ) : (
                <InboxList threads={threads!} />
              )}
            </>
          )}
        </div>

        {unreviewedCount > 0 && tab === "feed" && (
          <div className="fixed bottom-4 left-0 right-0 flex justify-center pointer-events-none">
            <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-card hairline border px-3 py-2 text-[11px] font-semibold shadow-lg">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {unreviewedCount} session{unreviewedCount === 1 ? "" : "s"} awaiting review
            </div>
          </div>
        )}
      </div>
    </AsyncBoundary>
  );
}
