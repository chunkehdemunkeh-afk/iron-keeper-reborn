import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, Shuffle, Dumbbell, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSplitsForDays, type TrainingSplit, type SplitDay } from "@/lib/training-splits";
import { saveUserPreferences } from "@/lib/user-preferences";
import { WORKOUTS } from "@/lib/workout-data";
import { toast } from "sonner";
import { STORAGE_KEYS } from "@/lib/storage-keys";

const DAYS_OPTIONS = [2, 3, 4, 5, 6];

const dayLabels: Record<number, string> = {
  2: "2 days",
  3: "3 days",
  4: "4 days",
  5: "5 days",
  6: "6 days",
};

const daySubLabels: Record<number, string> = {
  2: "Minimum effective dose",
  3: "Sweet spot for most people",
  4: "Optimal for hypertrophy",
  5: "High frequency",
  6: "Advanced training",
};

/** All unique workouts the user can assign to custom days */
const ASSIGNABLE_WORKOUTS = WORKOUTS.filter((w) =>
  ["push", "pull", "legs", "upper", "fullbody", "squat", "bench", "deadlift", "press",
    "chest_back", "shoulders_arms", "chest", "back", "shoulders", "arms",
    "power", "strength", "agility", "plyo"].includes(w.id)
);

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromProfile = new URLSearchParams(location.search).get("from") === "profile";

  const [step, setStep] = useState(0); // 0=days, 1=split, 2=custom, 3=summary
  const [days, setDays] = useState<number | null>(null);
  const [noWorkout, setNoWorkout] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<TrainingSplit | null>(null);
  const [customSchedule, setCustomSchedule] = useState<SplitDay[]>([]);

  const availableSplits = days ? getSplitsForDays(days) : [];

  const handleSelectDays = (d: number) => {
    setNoWorkout(false);
    setDays(d);
  };

  const handleSelectNoWorkout = () => {
    setNoWorkout(true);
    setDays(null);
    setSelectedSplit(null);
  };

  const continueAfterOnboarding = () => {
    if (!user) return;
    if (fromProfile) {
      navigate("/profile", { replace: true });
    } else {
      localStorage.setItem(STORAGE_KEYS.onboardingTip(user.id), "pending");
      navigate("/onboarding/nutrition", { replace: true });
    }
  };

  const handleNoWorkoutFinish = () => {
    if (!user) return;
    saveUserPreferences(user.id, {
      onboardingComplete: true,
      daysPerWeek: 0,
      splitId: "none",
      splitName: "No workout plan",
      schedule: [],
    });
    toast.success(fromProfile ? "Switched to health tracking only" : "You're all set!");
    continueAfterOnboarding();
  };

  // ── Step navigation ──────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (step === 0 && noWorkout) {
      handleNoWorkoutFinish();
      return;
    }
    if (step === 0 && days) setStep(1);
    else if (step === 1 && selectedSplit) {
      if (selectedSplit.id === "custom") {
        // prefill custom schedule with first N workouts
        const initial: SplitDay[] = Array.from({ length: days! }, (_, i) => {
          const w = ASSIGNABLE_WORKOUTS[i % ASSIGNABLE_WORKOUTS.length];
          return { label: w.day, workoutId: w.id, color: w.color, icon: w.icon };
        });
        setCustomSchedule(initial);
        setStep(2);
      } else {
        setStep(3);
      }
    } else if (step === 2) {
      setStep(3);
    }
  }, [step, days, selectedSplit, noWorkout]);

  const goBack = useCallback(() => {
    if (step === 2) setStep(1);
    else if (step === 1) setStep(0);
    else if (step === 3) setStep(selectedSplit?.id === "custom" ? 2 : 1);
  }, [step, selectedSplit]);

  // ── Save & finish ────────────────────────────────────────────────────────
  const handleFinish = () => {
    if (!user || !selectedSplit || !days) return;
    const fullSchedule = selectedSplit.id === "custom" ? customSchedule : selectedSplit.schedule;
    // Strip non-serializable icon functions before saving
    const schedule = fullSchedule.map(({ label, workoutId }) => ({ label, workoutId }));
    saveUserPreferences(user.id, {
      onboardingComplete: true,
      daysPerWeek: days,
      splitId: selectedSplit.id,
      splitName: selectedSplit.name,
      schedule,
    });
    toast.success(fromProfile ? "Training split updated!" : "Programme saved! Let's get to work");
    continueAfterOnboarding();
  };

  const canGoNext =
    (step === 0 && (days !== null || noWorkout)) ||
    (step === 1 && selectedSplit !== null) ||
    (step === 2 && customSchedule.length > 0) ||
    step === 3;

  const totalSteps = noWorkout ? 1 : selectedSplit?.id === "custom" ? 4 : 3;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="px-4 pt-8 pb-4 flex items-center justify-between">
        <button
          onClick={goBack}
          className={`flex items-center gap-1.5 text-sm text-muted-foreground transition-opacity ${step === 0 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        {/* Step dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>
        <div className="w-10" /> {/* spacer for alignment */}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepDays
              key="days"
              days={days}
              setDays={handleSelectDays}
              noWorkout={noWorkout}
              onSelectNoWorkout={handleSelectNoWorkout}
            />
          )}
          {step === 1 && (
            <StepSplit
              key="split"
              splits={availableSplits}
              selectedSplit={selectedSplit}
              setSelectedSplit={setSelectedSplit}
            />
          )}
          {step === 2 && (
            <StepCustom
              key="custom"
              dayCount={days!}
              schedule={customSchedule}
              setSchedule={setCustomSchedule}
            />
          )}
          {step === 3 && (
            <StepSummary
              key="summary"
              split={selectedSplit!}
              schedule={selectedSplit?.id === "custom" ? customSchedule : selectedSplit?.schedule ?? []}
              daysPerWeek={days!}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="px-4 pb-10 pt-4">
        {step < 3 ? (
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className={`w-full rounded-2xl py-4 text-base font-bold transition-all flex items-center justify-center gap-2 ${
              canGoNext
                ? "gradient-primary text-primary-foreground glow-primary active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            Continue <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            className="w-full rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground glow-primary active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Let's go! <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 1: Choose days ──────────────────────────────────────────────────────
function StepDays({
  days,
  setDays,
  noWorkout,
  onSelectNoWorkout,
}: {
  days: number | null;
  setDays: (d: number) => void;
  noWorkout: boolean;
  onSelectNoWorkout: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="px-4 pt-4 pb-2 overflow-y-auto max-h-[calc(100vh-200px)]"
    >
      <h1 className="font-display text-3xl font-bold text-foreground">How many days a week do you want to train?</h1>
      <p className="text-muted-foreground mt-2 text-sm">We'll build your programme around this.</p>

      <div className="grid grid-cols-2 gap-3 mt-8">
        {DAYS_OPTIONS.map((d) => (
          <motion.button
            key={d}
            whileTap={{ scale: 0.96 }}
            onClick={() => setDays(d)}
            className={`relative rounded-2xl p-5 text-left transition-all border ${
              days === d
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "border-border/50 glass-card hover:border-primary/30"
            }`}
          >
            {days === d && (
              <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <p className="font-display text-4xl font-bold text-foreground">{d}</p>
            <p className="text-sm font-medium text-foreground mt-1">{dayLabels[d]}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{daySubLabels[d]}</p>
          </motion.button>
        ))}
      </div>

      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1 bg-border/50" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">or</span>
        <div className="h-px flex-1 bg-border/50" />
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onSelectNoWorkout}
        className={`relative w-full rounded-2xl p-4 text-left transition-all border flex items-center gap-3 ${
          noWorkout
            ? "border-primary bg-primary/10 ring-1 ring-primary"
            : "border-border/50 glass-card hover:border-primary/30"
        }`}
      >
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${noWorkout ? "bg-primary/20" : "bg-muted/40"}`}>
          <Heart className={`h-5 w-5 ${noWorkout ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Just track health</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Use Iron Warrior for nutrition, weight, and activity tracking only.
          </p>
        </div>
        {noWorkout && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary flex-shrink-0">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </motion.button>
    </motion.div>
  );
}

// ── Step 2: Choose split ─────────────────────────────────────────────────────
function StepSplit({
  splits,
  selectedSplit,
  setSelectedSplit,
}: {
  splits: TrainingSplit[];
  selectedSplit: TrainingSplit | null;
  setSelectedSplit: (s: TrainingSplit) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="px-4 pt-4 pb-2 overflow-y-auto max-h-[calc(100vh-200px)]"
    >
      <h1 className="font-display text-3xl font-bold text-foreground">Choose your split</h1>
      <p className="text-muted-foreground mt-2 text-sm">Based on your schedule, here are the best options.</p>

      <div className="space-y-3 mt-6">
        {splits.map((split) => {
          const isSelected = selectedSplit?.id === split.id;
          return (
            <motion.button
              key={split.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedSplit(split)}
              className={`w-full rounded-2xl p-4 text-left transition-all border ${
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border/50 glass-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground text-sm">{split.name}</p>
                    {split.tag && (
                      <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                        {split.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{split.description}</p>
                </div>
                {isSelected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>

              {/* Day pills */}
              {split.schedule.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {split.schedule.map((day, i) => {
                    const Icon = day.icon;
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          isSelected ? "bg-primary/20 text-primary" : "bg-muted/60 text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {day.label}
                      </div>
                    );
                  })}
                </div>
              )}
              {split.id === "custom" && (
                <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
                  <Shuffle className="h-3 w-3" />
                  You'll pick your own workouts for each day
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Step 3: Custom split builder ─────────────────────────────────────────────
function StepCustom({
  dayCount,
  schedule,
  setSchedule,
}: {
  dayCount: number;
  schedule: SplitDay[];
  setSchedule: (s: SplitDay[]) => void;
}) {
  const updateDay = (idx: number, workoutId: string) => {
    const w = ASSIGNABLE_WORKOUTS.find((wk) => wk.id === workoutId)!;
    const updated = [...schedule];
    updated[idx] = { label: w.day, workoutId: w.id, color: w.color, icon: w.icon };
    setSchedule(updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="px-4 pt-4 pb-2 overflow-y-auto max-h-[calc(100vh-200px)]"
    >
      <h1 className="font-display text-3xl font-bold text-foreground">Build your split</h1>
      <p className="text-muted-foreground mt-2 text-sm">Pick a workout for each training day. You can reorder these any time.</p>

      <div className="space-y-3 mt-6">
        {Array.from({ length: dayCount }).map((_, i) => {
          const current = schedule[i];
          const Icon = current?.icon;
          return (
            <div key={i} className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                {Icon && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                )}
                <p className="text-sm font-semibold text-foreground">Day {i + 1}</p>
              </div>
              <select
                value={current?.workoutId || ""}
                onChange={(e) => updateDay(i, e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
              >
                {ASSIGNABLE_WORKOUTS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} — {w.focus}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Step 4: Summary ──────────────────────────────────────────────────────────
function StepSummary({
  split,
  schedule,
  daysPerWeek,
}: {
  split: TrainingSplit;
  schedule: SplitDay[];
  daysPerWeek: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="px-4 pt-4 pb-2"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary glow-primary mb-4"
      >
        <Check className="h-8 w-8 text-primary-foreground" />
      </motion.div>

      <h1 className="font-display text-3xl font-bold text-foreground">You're all set!</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        <span className="font-semibold text-foreground">{split.name}</span> · {daysPerWeek} days/week
      </p>

      <div className="space-y-2 mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Your rotation</p>
        {schedule.map((day, i) => {
          const workout = WORKOUTS.find((w) => w.id === day.workoutId);
          const Icon = workout?.icon ?? Dumbbell;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className={`glass-card rounded-xl p-3 flex items-center gap-3 bg-gradient-to-br ${workout?.color ?? "from-primary/10 to-primary/5"}`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 flex-shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{day.label}</p>
                {workout && <p className="text-[11px] text-muted-foreground truncate">{workout.focus}</p>}
              </div>
              <span className="text-[10px] text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
                {workout ? `${workout.exercises.length} ex` : "—"}
              </span>
            </motion.div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-4 text-center">
        The app will queue up your next session automatically after each workout. You can always switch it out.
      </p>
    </motion.div>
  );
}
