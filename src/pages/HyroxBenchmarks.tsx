import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Flame, TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { useHyroxBenchmarks } from "@/hooks/queries/useHyroxBenchmarks";
import {
  formatSeconds,
  formatPace,
  type HyroxBenchmarkSeries,
} from "@/lib/data/hyrox-benchmark-queries";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
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
  const { data: series = [], isLoading } = useHyroxBenchmarks();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      series
        .filter((s) => category === "all" || s.def.category === category)
        .sort((a, b) => {
          // Populated series first, then by category order
          const aHas = a.points.length > 0 ? 0 : 1;
          const bHas = b.points.length > 0 ? 0 : 1;
          return aHas - bHas;
        }),
    [series, category],
  );

  const hasAny = series.some((s) => s.points.length > 0);

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
              Track erg splits, run pace and station strength.
            </p>
          </div>
        </div>

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
                series={s}
                expanded={expandedKey === s.def.key}
                onToggle={() => setExpandedKey(expandedKey === s.def.key ? null : s.def.key)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BenchmarkCard({
  series,
  expanded,
  onToggle,
}: {
  series: HyroxBenchmarkSeries;
  expanded: boolean;
  onToggle: () => void;
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-card-elevated rounded-2xl overflow-hidden",
        empty && "opacity-60",
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
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              {points.length} {points.length === 1 ? "entry" : "entries"} · PRs marked
            </p>
          </div>
        )}
      </button>
    </motion.div>
  );
}
