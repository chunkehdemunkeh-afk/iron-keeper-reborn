import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Flame, TrendingDown, TrendingUp, Sparkles, Target, Trophy } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine } from "recharts";
import { toast } from "sonner";
import { useHyroxBenchmarks } from "@/hooks/queries/useHyroxBenchmarks";
import { useAuth } from "@/hooks/useAuth";
import {
  formatSeconds,
  formatPace,
  type HyroxBenchmarkSeries,
} from "@/lib/data/hyrox-benchmark-queries";
import {
  consumeGoalAchievement,
  getGoalHistory,
  getGoals,
  goalProgress,
  isGoalAchieved,
  type HyroxGoal,
  type HyroxGoalHistoryEntry,
} from "@/lib/hyrox-goals";
import { HyroxGoalSheet } from "@/components/hyrox/HyroxGoalSheet";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { hapticSuccess } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "all",       label: "All" },
  { id: "run",       label: "Running" },
  { id: "erg",       label: "Erg" },
  { id: "carry",     label: "Carries" },
  { id: "strength",  label: "Strength" },
  { id: "power",     label: "Power" },
] as const;

export default function HyroxBenchmarks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data: series = [], isLoading } = useHyroxBenchmarks();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [goalSheetFor, setGoalSheetFor] = useState<HyroxBenchmarkSeries | null>(null);
  const [goalsVersion, setGoalsVersion] = useState(0);

  const goals = useMemo<Record<string, HyroxGoal>>(
    () => (userId ? getGoals(userId) : {}),
    [userId, goalsVersion],
  );

  // Fire one-shot toast + haptic when a goal is newly hit.
  const alertedRef = useRef(false);
  useEffect(() => {
    if (!userId || alertedRef.current || series.length === 0) return;
    for (const s of series) {
      const goal = goals[s.def.key];
      if (!goal) continue;
      const achieved = isGoalAchieved(s.best, goal.target, s.def.metric === "time");
      if (consumeGoalAchievement(userId, s.def.key, achieved)) {
        hapticSuccess();
        toast.success(`🎯 Goal hit: ${s.def.label}`, {
          description:
            s.def.metric === "time"
              ? `You beat ${formatSeconds(goal.target)}`
              : `You lifted ${goal.target} kg or more`,
          duration: 6000,
        });
      }
    }
    alertedRef.current = true;
  }, [series, goals, userId]);

  const filtered = useMemo(
    () =>
      series
        .filter((s) => category === "all" || s.def.category === category)
        .sort((a, b) => {
          const aHas = a.points.length > 0 ? 0 : 1;
          const bHas = b.points.length > 0 ? 0 : 1;
          return aHas - bHas;
        }),
    [series, category],
  );

  const hasAny = series.some((s) => s.points.length > 0);
  const goalCount = Object.keys(goals).length;
  const achievedCount = series.filter((s) => {
    const g = goals[s.def.key];
    return g && isGoalAchieved(s.best, g.target, s.def.metric === "time");
  }).length;

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg md:max-w-2xl px-4 pt-6 pb-24 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted/50"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20">
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
              <h1 className="font-display text-xl font-bold">Hyrox Benchmarks</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track splits, pace, station strength — and hit your targets.
            </p>
          </div>
        </div>

        {/* Goal summary */}
        {goalCount > 0 && (
          <div className="glass-card-elevated rounded-2xl p-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15">
              <Trophy className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-bold">
                {achievedCount} / {goalCount} goals hit
              </p>
              <p className="text-[11px] text-muted-foreground">
                Alerts fire the moment you beat a target.
              </p>
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
                category === c.id
                  ? "bg-orange-500 text-white"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingState label="Loading benchmarks" />
        ) : !hasAny ? (
          <EmptyState
            icon={Sparkles}
            title="No benchmarks yet"
            description="Complete a Hyrox session and log your times/weights — your progress will appear here."
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((s) => (
              <BenchmarkCard
                key={s.def.key}
                userId={userId}
                series={s}
                goal={goals[s.def.key] ?? null}
                goalsVersion={goalsVersion}
                expanded={expandedKey === s.def.key}
                onToggle={() => setExpandedKey(expandedKey === s.def.key ? null : s.def.key)}
                onSetGoal={() => setGoalSheetFor(s)}
              />
            ))}
          </div>
        )}
      </div>

      <HyroxGoalSheet
        open={!!goalSheetFor}
        onOpenChange={(v) => !v && setGoalSheetFor(null)}
        userId={userId}
        series={goalSheetFor}
        currentGoal={goalSheetFor ? goals[goalSheetFor.def.key]?.target ?? null : null}
        onChanged={() => {
          setGoalsVersion((v) => v + 1);
          alertedRef.current = false;
        }}
      />
    </div>
  );
}

function BenchmarkCard({
  userId,
  series,
  goal,
  goalsVersion,
  expanded,
  onToggle,
  onSetGoal,
}: {
  userId: string;
  series: HyroxBenchmarkSeries;
  goal: HyroxGoal | null;
  goalsVersion: number;
  expanded: boolean;
  onToggle: () => void;
  onSetGoal: () => void;
}) {
  const { def, best, latest, delta, points } = series;
  const isTime = def.metric === "time";
  const empty = points.length === 0;

  const bestDisplay = best === null
    ? "—"
    : isTime
      ? formatSeconds(best)
      : `${best.toFixed(1).replace(/\.0$/, "")} kg`;

  const latestDisplay = latest === null
    ? "—"
    : isTime
      ? formatSeconds(latest)
      : `${latest.toFixed(1).replace(/\.0$/, "")} kg`;

  const paceDisplay =
    isTime && def.distance && best !== null
      ? def.category === "erg"
        ? formatPace(best, def.distance, "500m")
        : formatPace(best, def.distance, "1km")
      : null;

  const deltaDisplay = delta !== null && delta > 0
    ? isTime
      ? `−${formatSeconds(delta)}`
      : `+${delta.toFixed(1).replace(/\.0$/, "")} kg`
    : null;

  const firstValue = points.length ? points[0].value : null;
  const achieved = goal ? isGoalAchieved(best, goal.target, isTime) : false;
  const progress = goal ? goalProgress(best, firstValue, goal.target, isTime) : 0;

  const goalDisplay = goal
    ? isTime
      ? formatSeconds(goal.target)
      : `${goal.target} kg`
    : null;

  const remaining = goal && best !== null
    ? isTime
      ? Math.max(0, best - goal.target)
      : Math.max(0, goal.target - best)
    : null;

  const chartData = useMemo(
    () =>
      points.map((p, i) => ({
        idx: i,
        date: new Date(p.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        value: p.value,
        display: isTime ? formatSeconds(p.value) : `${p.value} kg`,
        isPr: p.isPr,
      })),
    [points, isTime],
  );

  const history = useMemo<HyroxGoalHistoryEntry[]>(
    () => (userId ? getGoalHistory(userId, def.key) : []),
    // goalsVersion bumps whenever set/clear happens; achievedAt updates via consumeGoalAchievement
    // which fires on mount effect — series identity changes when data reloads.
    [userId, def.key, goalsVersion, series],
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-card-elevated rounded-2xl overflow-hidden",
        empty && "opacity-60",
        achieved && "ring-1 ring-emerald-500/40",
      )}
    >
      <button
        onClick={onToggle}
        disabled={empty}
        className="w-full text-left p-3.5 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-sm font-bold text-foreground">{def.label}</h3>
              <span className="text-[9px] font-bold uppercase tracking-wide text-orange-500 bg-orange-500/15 rounded-full px-1.5 py-0.5">
                {def.category}
              </span>
              {achieved && (
                <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-500 bg-emerald-500/15 rounded-full px-1.5 py-0.5">
                  Goal hit
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Best </span>
                <span className="font-display text-lg font-bold text-foreground tabular-nums">
                  {bestDisplay}
                </span>
              </div>
              {paceDisplay && (
                <span className="text-[11px] text-muted-foreground tabular-nums">{paceDisplay}</span>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            {deltaDisplay ? (
              <div className={cn(
                "flex items-center gap-0.5 text-xs font-semibold tabular-nums",
                "text-emerald-500",
              )}>
                {isTime ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {deltaDisplay}
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                {empty ? "No data" : "First entry"}
              </span>
            )}
            {!empty && (
              <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                Last: {latestDisplay}
              </p>
            )}
          </div>
        </div>

        {/* Goal row */}
        {goal ? (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Target className="h-3 w-3 text-orange-500" />
                Target <span className="text-foreground font-semibold tabular-nums">{goalDisplay}</span>
              </span>
              <span className={cn(
                "tabular-nums font-semibold",
                achieved ? "text-emerald-500" : "text-muted-foreground",
              )}>
                {achieved
                  ? "Achieved ✓"
                  : remaining !== null
                    ? isTime
                      ? `−${formatSeconds(remaining)} to go`
                      : `+${remaining.toFixed(1).replace(/\.0$/, "")} kg to go`
                    : `${Math.round(progress * 100)}%`}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  achieved ? "bg-emerald-500" : "bg-orange-500",
                )}
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        ) : !empty ? (
          <div className="mt-3">
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSetGoal();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onSetGoal();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 text-[11px] font-semibold px-2.5 py-1 transition-colors"
            >
              <Target className="h-3 w-3" />
              Set target
            </div>
          </div>
        ) : null}

        {!empty && expanded && (
          <div className="mt-3 -mx-1">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${def.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(24 95% 55%)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(24 95% 55%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  reversed={isTime}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (isTime ? formatSeconds(v) : `${v}`)}
                  domain={["auto", "auto"]}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  formatter={(_v, _k, p: any) => [p.payload.display, isTime ? "Time" : "Load"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(24 95% 55%)"
                  strokeWidth={2}
                  fill={`url(#grad-${def.key})`}
                />
                {goal && (
                  <ReferenceLine
                    y={goal.target}
                    stroke="hsl(142 71% 45%)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: "Target",
                      position: "insideTopRight",
                      fill: "hsl(142 71% 45%)",
                      fontSize: 10,
                    }}
                  />
                )}
                {chartData.map((p) =>
                  p.isPr ? (
                    <ReferenceDot
                      key={p.idx}
                      x={p.date}
                      y={p.value}
                      r={4}
                      fill="hsl(24 95% 55%)"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  ) : null,
                )}
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-between mt-1 px-1">
              <p className="text-[10px] text-muted-foreground">
                {points.length} {points.length === 1 ? "entry" : "entries"} · PRs marked
              </p>
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onSetGoal();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onSetGoal();
                  }
                }}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-500 hover:text-orange-400"
              >
                <Target className="h-3 w-3" />
                {goal ? "Edit target" : "Set target"}
              </div>
            </div>

            {history.length > 0 && (
              <GoalHistoryTimeline history={history} isTime={isTime} />
            )}
          </div>
        )}
      </button>
    </motion.div>
  );
}

function GoalHistoryTimeline({
  history,
  isTime,
}: {
  history: HyroxGoalHistoryEntry[];
  isTime: boolean;
}) {
  const fmtTarget = (t: number) =>
    isTime ? formatSeconds(t) : `${t.toFixed(1).replace(/\.0$/, "")} kg`;

  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusMeta = (status: HyroxGoalHistoryEntry["status"]) => {
    switch (status) {
      case "achieved":
        return { label: "Achieved", dot: "bg-emerald-500", text: "text-emerald-500" };
      case "active":
        return { label: "In progress", dot: "bg-orange-500", text: "text-orange-500" };
      case "replaced":
        return { label: "Replaced", dot: "bg-muted-foreground", text: "text-muted-foreground" };
      case "cleared":
        return { label: "Cleared", dot: "bg-muted-foreground", text: "text-muted-foreground" };
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-1">
        Goal history
      </p>
      <ol className="relative pl-4">
        <span className="absolute left-[7px] top-1 bottom-1 w-px bg-border/60" aria-hidden />
        {history.map((entry, i) => {
          const meta = statusMeta(entry.status);
          return (
            <li key={`${entry.setAt}-${i}`} className="relative pb-2.5 last:pb-0">
              <span
                className={cn(
                  "absolute -left-[13px] top-1 h-2 w-2 rounded-full ring-2 ring-background",
                  meta.dot,
                )}
                aria-hidden
              />
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-display text-sm font-bold tabular-nums text-foreground">
                    {fmtTarget(entry.target)}
                  </span>
                  <span className={cn("text-[10px] font-semibold uppercase tracking-wide", meta.text)}>
                    {meta.label}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                Set {fmtDateTime(entry.setAt)}
                {entry.achievedAt && (
                  <>
                    {" · "}
                    <span className="text-emerald-500">Hit {fmtDateTime(entry.achievedAt)}</span>
                  </>
                )}
                {!entry.achievedAt && entry.clearedAt && (
                  <>
                    {" · "}
                    {entry.status === "replaced" ? "Replaced" : "Cleared"} {fmtDateTime(entry.clearedAt)}
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
