import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Dumbbell, Scale, Repeat2, BarChart3, ChevronDown } from "lucide-react";
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
import LeaderboardPodium from "@/components/leaderboard/LeaderboardPodium";
import LeaderboardRow from "@/components/leaderboard/LeaderboardRow";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

type Category = "1rm" | "maxweight" | "maxreps" | "volume";

const CATEGORIES: { id: Category; label: string; icon: typeof Trophy }[] = [
  { id: "1rm",       label: "1RM",       icon: Trophy    },
  { id: "maxweight", label: "Max Wt",    icon: Scale     },
  { id: "maxreps",   label: "Max Reps",  icon: Repeat2   },
  { id: "volume",    label: "Volume",    icon: BarChart3 },
];

const TIME_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: "all",     label: "All Time" },
  { value: "monthly", label: "Monthly"  },
  { value: "weekly",  label: "Weekly"   },
];

const SESSION_TYPES = ["All", "Push", "Pull", "Legs", "Upper", "Lower", "Full Body"];

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-card/40 animate-pulse">
          <div className="h-5 w-6 rounded bg-muted/50" />
          <div className="h-9 w-9 rounded-full bg-muted/50" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 rounded bg-muted/50" />
            <div className="h-2.5 w-16 rounded bg-muted/40" />
          </div>
          <div className="h-4 w-14 rounded bg-muted/50" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`rounded-t-lg bg-muted/20 border border-border/30 flex items-end justify-center ${
              i === 1 ? "h-16 w-8" : i === 0 ? "h-12 w-8" : "h-10 w-8"
            }`}
          >
            <span className="font-display text-xl font-black text-muted-foreground/30 mb-1">
              {[2, 1, 3][i]}
            </span>
          </div>
        ))}
      </div>
      <p className="text-sm font-semibold text-muted-foreground">No data yet</p>
      <p className="text-xs text-muted-foreground/70 max-w-[200px]">
        Complete some workouts to appear on the leaderboard
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
        <button className="flex items-center gap-2 rounded-xl bg-card/60 border border-border/40 px-3 py-2.5 text-left w-full active:scale-[0.98] transition-transform">
          <Dumbbell className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="flex-1 text-sm font-semibold text-foreground truncate">
            {selected?.exerciseName ?? "Select exercise"}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                onSelect={() => {
                  onSelect(ex.exerciseId);
                  setOpen(false);
                }}
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

function fmt1RM(e: LeaderboardEntry) {
  return `${e.value.toFixed(1)} kg`;
}
function fmtWeight(e: LeaderboardEntry) {
  return `${e.value} kg`;
}
function fmtReps(e: LeaderboardEntry) {
  return `${e.value} reps`;
}
function fmtVolume(e: LeaderboardEntry) {
  if (e.value >= 1000) return `${(e.value / 1000).toFixed(1)}t`;
  return `${Math.round(e.value)} kg`;
}

function sub1RM(e: LeaderboardEntry) {
  if (!e.weight || !e.reps) return undefined;
  return e.reps === 1 ? `${e.weight} kg × 1` : `${e.weight} kg × ${e.reps} reps (Epley)`;
}
function subWeight(e: LeaderboardEntry) {
  return e.reps ? `${e.reps} reps at this weight` : undefined;
}
function subReps(e: LeaderboardEntry) {
  return e.weight ? `at ${e.weight} kg` : undefined;
}

function YourRankBanner({ entry, valueFn }: { entry?: LeaderboardEntry; valueFn: (e: LeaderboardEntry) => string }) {
  if (!entry) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky bottom-[72px] mx-0 z-10 rounded-xl border border-primary/40 bg-card/90 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-lg"
    >
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Your rank</p>
        <p className="font-display text-2xl font-black text-primary leading-none">#{entry.rank}</p>
      </div>
      <div className="text-right">
        <p className="font-display text-xl font-bold text-foreground">{valueFn(entry)}</p>
        <p className="text-[10px] text-muted-foreground">of {entry.rank} ranked athletes</p>
      </div>
    </motion.div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [category, setCategory] = useState<Category>("1rm");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [sessionType, setSessionType] = useState("All");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");

  const isExerciseCategory = category !== "volume";

  const { data: topExercises = [], isLoading: exercisesLoading } = useQuery({
    queryKey: ["leaderboard-top-exercises", timeFilter],
    queryFn: () => fetchTopExercises(timeFilter),
    staleTime: 5 * 60_000,
    enabled: !!user && isExerciseCategory,
  });

  const exerciseId = selectedExerciseId || topExercises[0]?.exerciseId || "";

  const { data: entries1rm = [], isLoading: loading1rm } = useQuery({
    queryKey: ["leaderboard-1rm", exerciseId, timeFilter],
    queryFn: () => fetchLeaderboard1RM(exerciseId, timeFilter),
    staleTime: 5 * 60_000,
    enabled: !!user && category === "1rm" && !!exerciseId,
  });

  const { data: entriesMaxWeight = [], isLoading: loadingMaxWeight } = useQuery({
    queryKey: ["leaderboard-max-weight", exerciseId, timeFilter],
    queryFn: () => fetchLeaderboardMaxWeight(exerciseId, timeFilter),
    staleTime: 5 * 60_000,
    enabled: !!user && category === "maxweight" && !!exerciseId,
  });

  const { data: entriesMaxReps = [], isLoading: loadingMaxReps } = useQuery({
    queryKey: ["leaderboard-max-reps", exerciseId, timeFilter],
    queryFn: () => fetchLeaderboardMaxReps(exerciseId, timeFilter),
    staleTime: 5 * 60_000,
    enabled: !!user && category === "maxreps" && !!exerciseId,
  });

  const { data: entriesVolume = [], isLoading: loadingVolume } = useQuery({
    queryKey: ["leaderboard-session-volume", sessionType, timeFilter],
    queryFn: () => fetchLeaderboardSessionVolume(sessionType, timeFilter),
    staleTime: 5 * 60_000,
    enabled: !!user && category === "volume",
  });

  const activeEntries: LeaderboardEntry[] =
    category === "1rm"       ? entries1rm :
    category === "maxweight" ? entriesMaxWeight :
    category === "maxreps"   ? entriesMaxReps :
    entriesVolume;

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
    (e: LeaderboardEntry) => (e as VolumeLeaderboardEntry).workoutName;

  const podiumEntries = activeEntries.slice(0, 3);
  const listEntries = activeEntries.slice(3);
  const myEntry = activeEntries.find((e) => e.isCurrentUser);

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-36 space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary glow-primary flex-shrink-0">
            <Trophy className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight leading-none">
              IRON RANKINGS
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Compete with every athlete on the platform</p>
          </div>
        </motion.div>

        {/* Time filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="flex gap-2"
        >
          {TIME_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimeFilter(value)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                timeFilter === value
                  ? "gradient-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {label}
            </button>
          ))}
        </motion.div>

        {/* Category tabs */}
        <Tabs value={category} onValueChange={(v) => setCategory(v as Category)}>
          <TabsList className="grid grid-cols-4 w-full h-auto p-0.5">
            {CATEGORIES.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id} className="flex flex-col items-center gap-0.5 py-2 text-[10px] h-auto">
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Exercise picker (for non-volume categories) */}
          <AnimatePresence mode="wait">
            {isExerciseCategory && (
              <motion.div
                key="exercise-picker"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                {exercisesLoading ? (
                  <div className="h-10 w-full rounded-xl bg-muted/30 animate-pulse" />
                ) : topExercises.length > 0 ? (
                  <ExercisePicker
                    exercises={topExercises}
                    selectedId={exerciseId}
                    onSelect={setSelectedExerciseId}
                  />
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Session type picker (volume only) */}
          <AnimatePresence mode="wait">
            {category === "volume" && (
              <motion.div
                key="session-picker"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {SESSION_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSessionType(type)}
                      className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        sessionType === type
                          ? "gradient-primary text-primary-foreground"
                          : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content for each tab (shared layout) */}
          {CATEGORIES.map(({ id }) => (
            <TabsContent key={id} value={id} className="mt-4 space-y-3">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <SkeletonRows />
                  </motion.div>
                ) : activeEntries.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <EmptyState />
                  </motion.div>
                ) : (
                  <motion.div key={`${id}-${timeFilter}-${exerciseId}-${sessionType}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    {/* Podium */}
                    {podiumEntries.length > 0 && (
                      <div className="glass-card rounded-xl p-4">
                        <LeaderboardPodium entries={podiumEntries} valueLabel={valueFn} />
                      </div>
                    )}

                    {/* Ranked list (positions 4+) */}
                    {listEntries.length > 0 && (
                      <div className="space-y-2">
                        {listEntries.map((entry, i) => (
                          <LeaderboardRow
                            key={entry.userId}
                            entry={entry}
                            valueLabel={valueFn(entry)}
                            subLabel={subFn(entry)}
                            index={i}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Sticky your-rank banner */}
      {!isLoading && myEntry && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-[calc(64px+env(safe-area-inset-bottom))]">
          <YourRankBanner entry={myEntry} valueFn={valueFn} />
        </div>
      )}
    </div>
  );
}
