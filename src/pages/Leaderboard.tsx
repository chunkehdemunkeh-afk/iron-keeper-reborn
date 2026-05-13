import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronDown, Dumbbell, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchTopExercises,
  fetchLeaderboard1RM,
  fetchLeaderboardMaxWeight,
  fetchLeaderboardMaxReps,
  fetchLeaderboardSessionVolume,
  type TimeFilter,
  type LeaderboardEntry,
  type VolumeLeaderboardEntry,
} from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";
import { isBilateralDumbbell } from "@/lib/strength-standards";
import LeaderboardPodium from "@/components/leaderboard/LeaderboardPodium";
import LeaderboardRow from "@/components/leaderboard/LeaderboardRow";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { useUserProgress } from "@/hooks/queries/useUserProgress";
import { useCurrentSeason, daysRemaining } from "@/hooks/queries/useCurrentSeason";
import { tierFromRp, nextTier, tierProgress } from "@/lib/gamification/tiers";
import { TierBadge } from "@/components/gamification/TierBadge";

type Category = "1rm" | "maxweight" | "maxreps" | "volume";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "1rm",       label: "1RM"        },
  { id: "maxweight", label: "Max Weight" },
  { id: "maxreps",   label: "Max Reps"  },
  { id: "volume",    label: "Volume"     },
];

const TIME_OPTIONS: { value: "all" | "monthly" | "weekly"; label: string }[] = [
  { value: "all",     label: "All Time" },
  { value: "monthly", label: "Monthly"  },
  { value: "weekly",  label: "Weekly"   },
];

const SESSION_TYPES = ["All", "Push", "Pull", "Legs", "Upper", "Lower", "Full Body"];

function SkeletonRows() {
  return (
    <div className="space-y-0">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-border/20 animate-pulse">
          <div className="w-9 h-6 rounded bg-muted/30" />
          <div className="h-8 w-8 rounded-full bg-muted/30" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-muted/30" />
            <div className="h-2 w-16 rounded bg-muted/20" />
          </div>
          <div className="h-4 w-16 rounded bg-muted/30" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Trophy className="h-8 w-8 text-muted-foreground/20" />
      <p className="text-sm font-semibold text-muted-foreground/60">No records yet</p>
      <p className="text-xs text-muted-foreground/40 max-w-[180px] leading-relaxed">
        Complete workouts to appear on the leaderboard
      </p>
    </div>
  );
}

function ExercisePicker({
  exercises,
  selectedId,
  onSelect,
}: {
  exercises: { exerciseId: string; exerciseName: string; logCount: number }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = exercises.find((e) => e.exerciseId === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 w-full py-2.5 border-b border-border/30 text-left active:opacity-70 transition-opacity">
          <Dumbbell className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
          <span className="flex-1 text-sm font-semibold text-foreground truncate">
            {selected?.exerciseName ?? "Select exercise"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[340px]" align="start">
        <Command>
          <CommandInput placeholder="Search exercises…" className="h-9" />
          <CommandList>
            <CommandEmpty>No exercises found.</CommandEmpty>
            {exercises.map((ex) => (
              <CommandItem
                key={ex.exerciseId}
                value={ex.exerciseName}
                onSelect={() => { onSelect(ex.exerciseId); setOpen(false); }}
                className="flex items-center justify-between"
              >
                <span>{ex.exerciseName}</span>
                <span className="text-xs text-muted-foreground ml-2 tabular-nums">
                  {ex.logCount.toLocaleString()} sets
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function fmt1RM(e: LeaderboardEntry)    { return `${e.value.toFixed(1)} kg`; }
function fmtWeight(e: LeaderboardEntry) { return `${e.value} kg`; }
function fmtReps(e: LeaderboardEntry)   { return `${e.value} reps`; }
function fmtVolume(e: LeaderboardEntry) {
  return e.value >= 1000 ? `${(e.value / 1000).toFixed(1)}t` : `${Math.round(e.value)} kg`;
}

function sub1RM(e: LeaderboardEntry) {
  if (e.isTested) return "Actual test";
  if ((e.reps ?? 0) <= 1) return `${e.weight} kg × 1`;
  return `${e.weight} kg × ${e.reps} reps (Epley)`;
}
function subWeight(e: LeaderboardEntry) { return e.reps ? `${e.reps} reps at this weight` : undefined; }
function subReps(e: LeaderboardEntry)   { return e.weight ? `at ${e.weight} kg` : undefined; }
function subVolume(e: LeaderboardEntry) {
  const sc = (e as VolumeLeaderboardEntry).sessionCount ?? 0;
  return `${sc} session${sc !== 1 ? "s" : ""}`;
}

function YourRankBanner({
  entry, total, valueFn,
}: {
  entry: LeaderboardEntry;
  total: number;
  valueFn: (e: LeaderboardEntry) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between rounded-xl border border-primary/25 bg-card/95 backdrop-blur-md px-5 py-3.5 shadow-lg"
    >
      <div>
        <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground/60 mb-0.5">Your rank</p>
        <p className="font-display text-3xl font-black text-primary leading-none">
          #{entry.rank}
          <span className="font-display text-sm font-semibold text-muted-foreground/50 ml-1.5">
            / {total}
          </span>
        </p>
      </div>
      <div className="text-right">
        <p className="font-display text-2xl font-black text-foreground leading-none">{valueFn(entry)}</p>
        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
          {total !== 1 ? `${total} athletes` : "1 athlete"}
        </p>
      </div>
    </motion.div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [category, setCategory] = useState<Category>("1rm");
  const [timeFilter, setTimeFilter] = useState<"all" | "monthly" | "weekly">("all");
  const [sessionType, setSessionType] = useState("All");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");

  const isExerciseCategory = category !== "volume";

  // Comparison time filter for trend arrows (prev period vs current)
  const compTimeFilter: TimeFilter | null =
    timeFilter === "weekly"  ? "prev_weekly"  :
    timeFilter === "monthly" ? "prev_monthly" :
    null;

  // ── Main queries ─────────────────────────────────────────────────────────────

  const { data: topExercises = [], isLoading: exercisesLoading } = useQuery({
    queryKey: queryKeys.leaderboardTopExercises(timeFilter),
    queryFn: () => fetchTopExercises(timeFilter),
    staleTime: 5 * 60_000,
    enabled: !!user && isExerciseCategory,
  });

  const exerciseId = selectedExerciseId || topExercises[0]?.exerciseId || "";
  const exerciseName = topExercises.find((e) => e.exerciseId === exerciseId)?.exerciseName ?? "";
  const isPerDB = category === "1rm" && isBilateralDumbbell(exerciseId, exerciseName);

  const { data: entries1rm = [], isLoading: loading1rm } = useQuery({
    queryKey: queryKeys.leaderboard1rm(exerciseId, timeFilter),
    queryFn: () => fetchLeaderboard1RM(exerciseId, timeFilter),
    staleTime: 5 * 60_000,
    enabled: !!user && category === "1rm" && !!exerciseId,
  });

  const { data: entriesMaxWeight = [], isLoading: loadingMaxWeight } = useQuery({
    queryKey: queryKeys.leaderboardMaxWeight(exerciseId, timeFilter),
    queryFn: () => fetchLeaderboardMaxWeight(exerciseId, timeFilter),
    staleTime: 5 * 60_000,
    enabled: !!user && category === "maxweight" && !!exerciseId,
  });

  const { data: entriesMaxReps = [], isLoading: loadingMaxReps } = useQuery({
    queryKey: queryKeys.leaderboardMaxReps(exerciseId, timeFilter),
    queryFn: () => fetchLeaderboardMaxReps(exerciseId, timeFilter),
    staleTime: 5 * 60_000,
    enabled: !!user && category === "maxreps" && !!exerciseId,
  });

  const { data: entriesVolume = [], isLoading: loadingVolume } = useQuery({
    queryKey: queryKeys.leaderboardSessionVolume(sessionType, timeFilter),
    queryFn: () => fetchLeaderboardSessionVolume(sessionType, timeFilter),
    staleTime: 5 * 60_000,
    enabled: !!user && category === "volume",
  });

  // ── Comparison queries (prev period) for trend arrows ────────────────────────

  const { data: comp1rm = [] } = useQuery({
    queryKey: queryKeys.leaderboard1rm(exerciseId, compTimeFilter ?? ""),
    queryFn: () => fetchLeaderboard1RM(exerciseId, compTimeFilter!),
    staleTime: 5 * 60_000,
    enabled: !!user && category === "1rm" && !!exerciseId && !!compTimeFilter,
  });

  const { data: compMaxWeight = [] } = useQuery({
    queryKey: queryKeys.leaderboardMaxWeight(exerciseId, compTimeFilter ?? ""),
    queryFn: () => fetchLeaderboardMaxWeight(exerciseId, compTimeFilter!),
    staleTime: 5 * 60_000,
    enabled: !!user && category === "maxweight" && !!exerciseId && !!compTimeFilter,
  });

  const { data: compMaxReps = [] } = useQuery({
    queryKey: queryKeys.leaderboardMaxReps(exerciseId, compTimeFilter ?? ""),
    queryFn: () => fetchLeaderboardMaxReps(exerciseId, compTimeFilter!),
    staleTime: 5 * 60_000,
    enabled: !!user && category === "maxreps" && !!exerciseId && !!compTimeFilter,
  });

  const { data: compVolume = [] } = useQuery({
    queryKey: queryKeys.leaderboardSessionVolume(sessionType, compTimeFilter ?? ""),
    queryFn: () => fetchLeaderboardSessionVolume(sessionType, compTimeFilter!),
    staleTime: 5 * 60_000,
    enabled: !!user && category === "volume" && !!compTimeFilter,
  });

  // ── Derived state ────────────────────────────────────────────────────────────

  const activeEntries: LeaderboardEntry[] =
    category === "1rm"       ? entries1rm :
    category === "maxweight" ? entriesMaxWeight :
    category === "maxreps"   ? entriesMaxReps :
    entriesVolume;

  const compEntries: LeaderboardEntry[] =
    category === "1rm"       ? comp1rm :
    category === "maxweight" ? compMaxWeight :
    category === "maxreps"   ? compMaxReps :
    compVolume;

  const prevRankMap = useMemo(() => {
    const map = new Map<string, number>();
    compEntries.forEach((e) => map.set(e.userId, e.rank));
    return map;
  }, [compEntries]);

  const getRankDelta = (entry: LeaderboardEntry): number | null => {
    if (!compTimeFilter) return null;
    const prev = prevRankMap.get(entry.userId);
    return prev !== undefined ? prev - entry.rank : null;
  };

  const isLoading =
    category === "1rm"       ? (loading1rm || (isExerciseCategory && exercisesLoading)) :
    category === "maxweight" ? (loadingMaxWeight || (isExerciseCategory && exercisesLoading)) :
    category === "maxreps"   ? (loadingMaxReps || (isExerciseCategory && exercisesLoading)) :
    loadingVolume;

  const valueFn =
    category === "1rm"       ? fmt1RM :
    category === "maxweight" ? fmtWeight :
    category === "maxreps"   ? fmtReps :
    fmtVolume;

  const subFn =
    category === "1rm"       ? sub1RM :
    category === "maxweight" ? subWeight :
    category === "maxreps"   ? subReps :
    subVolume;

  const podiumEntries = activeEntries.slice(0, 3);
  const listEntries   = activeEntries.slice(3);
  const myEntry       = activeEntries.find((e) => e.isCurrentUser);

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg md:max-w-2xl px-4 pt-6 pb-36">

        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/50 mb-0.5">
                Iron Warrior
              </p>
              <h1 className="font-display text-5xl font-black tracking-tight leading-none text-foreground">
                RANKINGS
              </h1>
            </div>
            {/* Time filter — right of header */}
            <div className="flex flex-col gap-1 pt-1 flex-shrink-0">
              {TIME_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTimeFilter(value)}
                  className={`text-right text-xs font-semibold transition-colors ${
                    timeFilter === value ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground/70"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* Thin rule */}
          <div className="mt-4 h-px bg-border/40" />
        </motion.div>

        {/* Tier banner — current season standing */}
        <YourTierBanner />


        {/* ── Category tabs — segmented pill ────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-5 flex items-center gap-2"
        >
          <SegmentedTabs
            value={category}
            onChange={(v) => setCategory(v as Category)}
            options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
            layoutId="ranks-cat-pill"
          />
          {category === "1rm" && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-full hairline border bg-card/60 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  aria-label="About 1RM"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="text-xs max-w-[220px] p-3 leading-relaxed">
                Estimated via the Epley formula: 1RM = weight × (1 + reps ÷ 30). Actual 1RM test sets use the recorded weight directly.
              </PopoverContent>
            </Popover>
          )}
        </motion.div>

        {/* ── Exercise / Session picker ───────────────────────────── */}
        <AnimatePresence mode="wait">
          {isExerciseCategory && (
            <motion.div
              key="ex-picker"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-5"
            >
              {exercisesLoading ? (
                <div className="h-10 w-full rounded bg-muted/20 animate-pulse" />
              ) : topExercises.length > 0 ? (
                <ExercisePicker
                  exercises={topExercises}
                  selectedId={exerciseId}
                  onSelect={setSelectedExerciseId}
                />
              ) : null}
            </motion.div>
          )}

          {category === "volume" && (
            <motion.div
              key="sess-picker"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-5"
            >
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {SESSION_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSessionType(type)}
                    className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      sessionType === type
                        ? "bg-primary/15 text-primary border border-primary/25"
                        : "text-muted-foreground/50 border border-transparent hover:text-muted-foreground/80"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Content ────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Skeleton podium */}
              <div className="rounded-2xl border border-border/20 p-5 mb-3 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-muted/30" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 w-16 rounded bg-muted/30" />
                    <div className="h-4 w-24 rounded bg-muted/30" />
                    <div className="h-8 w-28 rounded bg-muted/30" />
                  </div>
                </div>
              </div>
              <SkeletonRows />
            </motion.div>
          ) : activeEntries.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState />
            </motion.div>
          ) : (
            <motion.div
              key={`${category}-${timeFilter}-${exerciseId}-${sessionType}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Podium */}
              {podiumEntries.length > 0 && (
                <div className="mb-2">
                  <LeaderboardPodium
                    entries={podiumEntries}
                    valueLabel={valueFn}
                    getRankDelta={getRankDelta}
                    isPerDB={isPerDB}
                  />
                </div>
              )}

              {/* Ranked list */}
              {listEntries.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/40 mb-1">
                    Rankings
                  </p>
                  {listEntries.map((entry, i) => (
                    <LeaderboardRow
                      key={entry.userId}
                      entry={entry}
                      valueLabel={valueFn(entry)}
                      subLabel={subFn(entry)}
                      index={i}
                      rankDelta={getRankDelta(entry)}
                      isPerDB={isPerDB}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Sticky your-rank banner ─────────────────────────────── */}
      {!isLoading && myEntry && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-[calc(60px+env(safe-area-inset-bottom))]">
          <YourRankBanner entry={myEntry} total={activeEntries.length} valueFn={valueFn} />
        </div>
      )}
    </div>
  );
}

function YourTierBanner() {
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
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-5 rounded-2xl bg-gradient-to-br ${tier.gradient} ring-1 ring-border/40 p-4`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TierBadge rp={rp} />
          <span className="text-[11px] text-muted-foreground">
            Season {season?.number ?? 1} · {days}d left
          </span>
        </div>
        <span className="font-display text-lg font-bold tabular-nums">{rp.toLocaleString()} <span className="text-[10px] uppercase tracking-widest text-muted-foreground">RP</span></span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
          className="h-full bg-gradient-to-r from-primary to-primary/60"
        />
      </div>
      {next && (
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {(next.minRp - rp).toLocaleString()} RP to {next.label}
        </p>
      )}
    </motion.div>
  );
}
