import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingDown, Timer, Trophy } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useRunBenchmarks } from "@/hooks/queries/useRunBenchmarks";
import { paceSecPerKm, projectHalfTime } from "@/lib/data/run-benchmark-queries";
import { useAuth } from "@/hooks/useAuth";
import {
  getHMProgress,
  goalPaceSecPerKm,
  formatDuration,
  DEFAULT_GOAL_SECONDS,
} from "@/lib/half-marathon-program";
import RunSessionHistory from "@/components/run/RunSessionHistory";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";


const CATEGORY_LABEL: Record<string, string> = {
  speed: "Speed & VO2",
  tempo: "Tempo & Race Pace",
  long: "Long Runs",
  race: "Race",
};

export default function RunBenchmarks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: series, isLoading } = useRunBenchmarks();
  const [tab, setTab] = useState<"benchmarks" | "history">("benchmarks");


  const goalSeconds = useMemo(() => {
    if (!user) return DEFAULT_GOAL_SECONDS;
    return getHMProgress(user.id)?.goalSeconds ?? DEFAULT_GOAL_SECONDS;
  }, [user]);
  const goalPace = goalPaceSecPerKm(goalSeconds);

  const projection = useMemo(() => (series ? projectHalfTime(series) : null), [series]);
  const withData = (series ?? []).filter((s) => s.points.length > 0);

  const grouped = useMemo(() => {
    const g: Record<string, typeof withData> = {};
    withData.forEach((s) => { (g[s.def.category] ??= []).push(s); });
    return g;
  }, [withData]);

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg md:max-w-2xl px-4 pt-6 pb-24 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-card/60 hairline border text-muted-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold">Run Benchmarks</h1>
            <p className="text-sm text-muted-foreground">Pace PBs & finish-time projection</p>
          </div>
        </div>

        {/* Projection */}
        <div className="glass-card-elevated rounded-2xl p-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-4 w-4 text-emerald-500" />
            <h2 className="font-display text-sm font-bold">Projected half marathon</h2>
          </div>
          {projection ? (
            <>
              <div className="flex items-end gap-2">
                <span className="font-display text-3xl font-bold">{formatDuration(projection.seconds)}</span>
                <span className={`text-xs font-semibold mb-1 ${projection.seconds <= goalSeconds ? "text-success" : "text-muted-foreground"}`}>
                  {projection.seconds <= goalSeconds
                    ? `${formatDuration(goalSeconds - projection.seconds)} inside goal`
                    : `${formatDuration(projection.seconds - goalSeconds)} off goal`}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Based on your best {projection.from} · goal {formatDuration(goalSeconds)} ({formatDuration(goalPace)}/km)
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Log a run session and your projected finish time will appear here.
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-card/60 hairline border">
          {(["benchmarks", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t === "benchmarks" ? "Benchmarks" : "Session history"}
            </button>
          ))}
        </div>

        {tab === "history" && <RunSessionHistory goalPace={goalPace} />}

        {tab === "benchmarks" && isLoading && <LoadingState label="Loading benchmarks" />}

        {tab === "benchmarks" && !isLoading && withData.length === 0 && (
          <EmptyState
            icon={Timer}
            title="No run data yet"
            description="Complete a run session from the half marathon plan and your paces will chart here."
          />
        )}


        {tab === "benchmarks" && (["speed", "tempo", "long", "race"] as const).map((cat) => {
          const items = grouped[cat];
          if (!items?.length) return null;

          return (
            <div key={cat} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {CATEGORY_LABEL[cat]}
              </p>
              {items.map((s) => {
                const chartData = s.points.map((p) => ({
                  date: new Date(p.date).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
                  pace: Math.round(paceSecPerKm(p.value, s.def.distance)),
                  time: p.value,
                }));
                const bestPace = s.best !== null ? paceSecPerKm(s.best, s.def.distance) : null;
                return (
                  <div key={s.def.key} className="glass-card rounded-2xl p-3.5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.def.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Best {formatDuration(s.best ?? 0)} · {bestPace ? `${formatDuration(bestPace)}/km` : "—"}
                        </p>
                      </div>
                      {s.delta !== null && s.delta > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-success">
                          <TrendingDown className="h-3 w-3" />
                          {formatDuration(s.delta)} faster
                        </span>
                      )}
                    </div>
                    {chartData.length > 1 && (
                      <div className="h-28">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
                            <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis
                              tick={{ fontSize: 9 }}
                              stroke="hsl(var(--muted-foreground))"
                              domain={["dataMin - 15", "dataMax + 15"]}
                              tickFormatter={(v: number) => formatDuration(v)}
                              reversed
                            />
                            <Tooltip
                              formatter={(v: number) => [`${formatDuration(v)}/km`, "Pace"]}
                              contentStyle={{
                                background: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: 12,
                                fontSize: 11,
                              }}
                            />
                            <ReferenceLine
                              y={Math.round(goalPace)}
                              stroke="hsl(var(--success))"
                              strokeDasharray="4 4"
                            />
                            <Line
                              type="monotone"
                              dataKey="pace"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              dot={{ r: 2.5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
