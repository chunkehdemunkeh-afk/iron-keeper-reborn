import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchExercisePRHistory, type ExercisePRTrend } from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot,
} from "recharts";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

/**
 * Per-exercise PR trend chart. Lets the user pick any exercise they've trained
 * and shows the running PR over time. PR jumps are marked with a dot.
 *
 * Recovery scores normalise fatigue against `weight / userPR` (clamped 0.3–1.1).
 * When PR rises, the same absolute weight contributes less fatigue → less
 * "fatigued" colouring on the body diagram. This chart visualises that input.
 */
export default function PRTrendChart() {
  const { user } = useAuth();

  const { data: trends = [], isLoading } = useQuery({
    queryKey: queryKeys.prTrends(user?.id ?? ""),
    queryFn: fetchExercisePRHistory,
    enabled: !!user,
    staleTime: 60_000,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Default selection: top exercise by current PR
  const activeId = selectedId ?? trends[0]?.baseId ?? null;
  const active: ExercisePRTrend | null = useMemo(
    () => trends.find((t) => t.baseId === activeId) ?? null,
    [trends, activeId],
  );

  const chartData = useMemo(() => {
    if (!active) return [];
    return active.points.map((p, i) => ({
      idx: i,
      date: p.date,
      label: new Date(p.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      weight: p.weight,
      reps: p.reps,
      isNewPR: p.isNewPR,
    }));
  }, [active]);

  // Compute first/current PR + delta for the header
  const summary = useMemo(() => {
    if (!active || active.points.length === 0) return null;
    const first = active.points[0].weight;
    const current = active.currentPR;
    const delta = current - first;
    const pct = first > 0 ? ((delta / first) * 100) : 0;
    const prJumps = active.points.filter((p) => p.isNewPR).length;
    return { first, current, delta, pct, prJumps };
  }, [active]);

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="h-40 animate-pulse" />
      </div>
    );
  }

  if (trends.length === 0) {
    return null; // no PRs yet; the existing PR list already shows an empty state
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-card rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          PR Trend
        </h3>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors max-w-[180px]"
            >
              <span className="truncate">{active?.name ?? "Select exercise"}</span>
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="end">
            <Command>
              <CommandInput placeholder="Search exercises..." />
              <CommandList>
                <CommandEmpty>No exercises.</CommandEmpty>
                <CommandGroup>
                  {trends.map((t) => (
                    <CommandItem
                      key={t.baseId}
                      value={t.name}
                      onSelect={() => {
                        setSelectedId(t.baseId);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-between gap-2",
                        t.baseId === activeId && "bg-muted",
                      )}
                    >
                      <span className="truncate">{t.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {t.currentPR}kg
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <p className="font-display text-lg font-bold text-foreground tabular-nums">
              {summary.current}<span className="text-xs text-muted-foreground font-normal">kg</span>
            </p>
            <p className="text-[10px] text-muted-foreground">Current PR</p>
          </div>
          <div className="text-center">
            <p className={cn(
              "font-display text-lg font-bold tabular-nums",
              summary.delta > 0 ? "text-primary" : "text-foreground",
            )}>
              {summary.delta > 0 ? "+" : ""}{summary.delta}
              <span className="text-xs text-muted-foreground font-normal">kg</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              {summary.delta > 0 ? `+${summary.pct.toFixed(0)}% gain` : "No change"}
            </p>
          </div>
          <div className="text-center">
            <p className="font-display text-lg font-bold text-foreground tabular-nums">
              {summary.prJumps}
            </p>
            <p className="text-[10px] text-muted-foreground">PR jumps</p>
          </div>
        </div>
      )}

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="prGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(36, 95%, 55%)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(36, 95%, 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "hsl(220, 10%, 55%)" }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(220, 10%, 55%)" }}
              axisLine={false}
              tickLine={false}
              width={32}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{ background: "hsl(220, 18%, 11%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "hsl(40, 10%, 95%)" }}
              formatter={(value: any, _name, item: any) => {
                const p = item?.payload as { reps: number; isNewPR: boolean } | undefined;
                const tag = p?.isNewPR ? " 🏆 New PR" : "";
                return [`${value}kg × ${p?.reps ?? "?"}${tag}`, "PR"];
              }}
            />
            <Area
              type="stepAfter"
              dataKey="weight"
              stroke="hsl(36, 95%, 55%)"
              fill="url(#prGrad)"
              strokeWidth={2}
              isAnimationActive
            />
            {chartData.map((d, i) =>
              d.isNewPR ? (
                <ReferenceDot
                  key={i}
                  x={d.label}
                  y={d.weight}
                  r={3}
                  fill="hsl(36, 95%, 55%)"
                  stroke="hsl(220, 18%, 11%)"
                  strokeWidth={1.5}
                  isFront
                />
              ) : null,
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Recovery scores normalise effort against your PR — as it climbs, the same
        weight feels lighter and adds less fatigue.
      </p>
    </motion.div>
  );
}
