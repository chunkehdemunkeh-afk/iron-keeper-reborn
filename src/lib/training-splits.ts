import {
  ArrowUp, ArrowDown, Footprints, User, Dumbbell,
  Target, Trophy, Layers, Flame, Shield, Zap, Activity, Wind
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SplitDay = {
  label: string;       // e.g. "Push", "Pull"
  workoutId: string;   // maps to WORKOUTS[].id
  color: string;       // gradient string matching WorkoutDay.color
  icon: LucideIcon;
};

export type TrainingSplit = {
  id: string;
  name: string;
  recommendedDays: number[];  // which day counts this fits
  description: string;
  tag?: string;               // e.g. "Most Popular", "Beginner"
  schedule: SplitDay[];
  targetRir?: string;         // prescribed RIR for working sets, e.g. "0-1"
};

export const TRAINING_SPLITS: TrainingSplit[] = [
  // ── Goalkeeper Programme ─────────────────────────────────────────────────
  {
    id: "gk",
    name: "Goalkeeper Programme",
    recommendedDays: [3, 4],
    description: "The original goalkeeper programme. Explosive Power, Agility, GK Strength and Reflexes — built specifically for goalkeepers.",
    tag: "GK Specific 🧤",
    targetRir: "1-2",
    schedule: [
      { label: "Explosive Power", workoutId: "power",    color: "from-amber-500/20 to-orange-500/10",   icon: Zap },
      { label: "Agility",         workoutId: "agility",  color: "from-sky-500/20 to-cyan-500/10",       icon: Wind },
      { label: "GK Strength",     workoutId: "strength", color: "from-blue-500/20 to-indigo-500/10",    icon: Dumbbell },
      { label: "Reflexes",        workoutId: "reflexes", color: "from-fuchsia-500/20 to-violet-500/10", icon: Shield },
    ],
  },
  // ── Standard Splits ──────────────────────────────────────────────────────
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    recommendedDays: [3, 6],
    description: "Classic hypertrophy split. Run once for 3 days or twice a week for 6. Hits each muscle group directly 2x/week.",
    tag: "Most Popular",
    targetRir: "0-1",
    schedule: [
      { label: "Push", workoutId: "push", color: "from-red-500/20 to-rose-500/10",    icon: ArrowUp },
      { label: "Pull", workoutId: "pull", color: "from-blue-500/20 to-indigo-500/10", icon: ArrowDown },
      { label: "Legs", workoutId: "legs", color: "from-green-500/20 to-lime-500/10",  icon: Footprints },
    ],
  },
  {
    id: "upper_lower",
    name: "Upper / Lower",
    recommendedDays: [2, 4],
    description: "Hit your upper and lower body twice each week. Great for strength and hypertrophy balance.",
    tag: "Great for Strength",
    targetRir: "1-2",
    schedule: [
      { label: "Upper", workoutId: "upper", color: "from-yellow-500/20 to-amber-500/10", icon: User },
      { label: "Lower", workoutId: "legs",  color: "from-green-500/20 to-lime-500/10",   icon: Footprints },
    ],
  },
  {
    id: "pplu",
    name: "Push / Pull / Legs / Upper",
    recommendedDays: [4],
    description: "PPL with an extra upper body day. High frequency on chest, back and shoulders.",
    targetRir: "0-1",
    schedule: [
      { label: "Push",  workoutId: "push",  color: "from-red-500/20 to-rose-500/10",    icon: ArrowUp },
      { label: "Pull",  workoutId: "pull",  color: "from-blue-500/20 to-indigo-500/10", icon: ArrowDown },
      { label: "Legs",  workoutId: "legs",  color: "from-green-500/20 to-lime-500/10",  icon: Footprints },
      { label: "Upper", workoutId: "upper", color: "from-yellow-500/20 to-amber-500/10", icon: User },
    ],
  },
  {
    id: "pplul",
    name: "Push / Pull / Legs / Upper / Lower",
    recommendedDays: [5],
    description: "High frequency 5-day split. Hit everything twice a week for maximum muscle stimulus.",
    targetRir: "0-1",
    schedule: [
      { label: "Push",  workoutId: "push",  color: "from-red-500/20 to-rose-500/10",      icon: ArrowUp },
      { label: "Pull",  workoutId: "pull",  color: "from-blue-500/20 to-indigo-500/10",   icon: ArrowDown },
      { label: "Legs",  workoutId: "legs",  color: "from-green-500/20 to-lime-500/10",    icon: Footprints },
      { label: "Upper", workoutId: "upper", color: "from-yellow-500/20 to-amber-500/10",  icon: User },
      { label: "Lower", workoutId: "legs",  color: "from-emerald-500/20 to-teal-500/10",  icon: Footprints },
    ],
  },
  {
    id: "fullbody",
    name: "Full Body",
    recommendedDays: [2, 3],
    description: "Train every muscle group each session. Ideal for beginners or anyone with a busy schedule.",
    tag: "Great for Beginners",
    targetRir: "1-2",
    schedule: [
      { label: "Full Body", workoutId: "fullbody", color: "from-violet-500/20 to-purple-500/10", icon: Target },
    ],
  },
  {
    id: "arnold",
    name: "Arnold Split",
    recommendedDays: [3, 6],
    description: "Chest+Back / Shoulders+Arms / Legs. High volume, classic bodybuilder approach made famous by Arnold Schwarzenegger.",
    targetRir: "0-1",
    schedule: [
      { label: "Chest & Back",      workoutId: "chest_back",    color: "from-orange-500/20 to-amber-500/10",  icon: Layers },
      { label: "Shoulders & Arms",  workoutId: "shoulders_arms", color: "from-purple-500/20 to-fuchsia-500/10", icon: Shield },
      { label: "Legs",              workoutId: "legs",           color: "from-green-500/20 to-lime-500/10",    icon: Footprints },
    ],
  },
  {
    id: "bro",
    name: "Bro Split",
    recommendedDays: [5],
    description: "One muscle group per day. Maximum volume on each muscle. Classic old-school bodybuilding approach.",
    targetRir: "0-1",
    schedule: [
      { label: "Chest",     workoutId: "chest",     color: "from-red-500/20 to-rose-500/10",     icon: ArrowUp },
      { label: "Back",      workoutId: "back",      color: "from-blue-500/20 to-indigo-500/10",  icon: ArrowDown },
      { label: "Shoulders", workoutId: "shoulders", color: "from-cyan-500/20 to-sky-500/10",     icon: Zap },
      { label: "Arms",      workoutId: "arms",      color: "from-fuchsia-500/20 to-pink-500/10", icon: Flame },
      { label: "Legs",      workoutId: "legs",      color: "from-green-500/20 to-lime-500/10",   icon: Footprints },
    ],
  },
  {
    id: "531",
    name: "5/3/1 Strength",
    recommendedDays: [4],
    description: "Wendler's proven powerlifting program built around the 4 main lifts. Focuses on progressive overload and long-term strength.",
    tag: "Powerlifting",
    targetRir: "2-3",
    schedule: [
      { label: "Squat Day",    workoutId: "squat",    color: "from-amber-500/20 to-yellow-500/10", icon: Trophy },
      { label: "Bench Day",    workoutId: "bench",    color: "from-red-500/20 to-rose-500/10",     icon: ArrowUp },
      { label: "Deadlift Day", workoutId: "deadlift", color: "from-slate-500/20 to-zinc-500/10",   icon: Activity },
      { label: "Press Day",    workoutId: "press",    color: "from-cyan-500/20 to-blue-500/10",    icon: Dumbbell },
    ],
  },
  {
    id: "upper_lower_ab",
    name: "Upper/Lower A/B",
    recommendedDays: [4],
    description: "Daily Undulating Periodisation — upper and lower body each twice weekly. A days are strength-biased (6–8 reps), B days are hypertrophy-biased (10–15 reps).",
    tag: "DUP · 2× Frequency",
    targetRir: "1-2",
    schedule: [
      { label: "Upper A", workoutId: "upper_a", color: "from-blue-500/20 to-sky-500/10",       icon: User },
      { label: "Lower A", workoutId: "lower_a", color: "from-green-500/20 to-lime-500/10",     icon: Footprints },
      { label: "Upper B", workoutId: "upper_b", color: "from-purple-500/20 to-fuchsia-500/10", icon: Dumbbell },
      { label: "Lower B", workoutId: "lower_b", color: "from-amber-500/20 to-orange-500/10",   icon: Layers },
    ],
  },
  {
    id: "custom",
    name: "Custom Split",
    recommendedDays: [2, 3, 4, 5, 6],
    description: "Build your own split from scratch. Pick any combination of workouts across your chosen training days.",
    tag: "Your Way",
    schedule: [], // filled by user during onboarding
  },
];

export function getSplitsForDays(days: number): TrainingSplit[] {
  return TRAINING_SPLITS.filter((s) => s.recommendedDays.includes(days));
}

export function getSplitById(id: string): TrainingSplit | undefined {
  return TRAINING_SPLITS.find((s) => s.id === id);
}
