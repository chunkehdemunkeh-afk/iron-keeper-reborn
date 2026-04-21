import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, TrendingUp, TrendingDown, Minus, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  totals: { calories: number; protein: number; carbs: number; fat: number };
  goals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  waterMl: number;
  waterGoalMl: number;
}

interface Suggestion {
  icon: string;
  text: string;
  priority: number;
}

function generateSuggestions(
  totals: Props["totals"],
  goals: Props["goals"],
  waterMl: number,
  waterGoalMl: number
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const proteinPct = (totals.protein / goals.protein_g) * 100;
  const carbsPct = (totals.carbs / goals.carbs_g) * 100;
  const fatPct = (totals.fat / goals.fat_g) * 100;
  const calPct = (totals.calories / goals.calories) * 100;
  const waterPct = (waterMl / waterGoalMl) * 100;

  // Protein suggestions
  if (proteinPct < 70) {
    suggestions.push({
      icon: "🥩",
      text: `Protein was low today (${Math.round(totals.protein)}g / ${goals.protein_g}g). Try adding Greek yoghurt, chicken breast, eggs, or a protein shake tomorrow.`,
      priority: 1,
    });
  } else if (proteinPct < 90) {
    suggestions.push({
      icon: "🥚",
      text: `Almost hit your protein target! A small snack like cottage cheese, jerky, or a handful of nuts could bridge the ${Math.round(goals.protein_g - totals.protein)}g gap.`,
      priority: 3,
    });
  }

  // Calorie suggestions
  if (calPct < 70) {
    suggestions.push({
      icon: "⚡",
      text: `You're under-eating at ${Math.round(totals.calories)} / ${goals.calories} kcal. Make sure you're fuelling your workouts — try adding a calorie-dense meal or snack.`,
      priority: 2,
    });
  } else if (calPct > 120) {
    suggestions.push({
      icon: "📊",
      text: `Went over your calorie target by ${Math.round(totals.calories - goals.calories)} kcal. Consider lighter options or smaller portions tomorrow.`,
      priority: 2,
    });
  }

  // Carbs
  if (carbsPct < 60) {
    suggestions.push({
      icon: "🍞",
      text: `Carbs were quite low. Add oats, rice, sweet potato, or fruit to keep energy levels up for training.`,
      priority: 4,
    });
  } else if (carbsPct > 130) {
    suggestions.push({
      icon: "🍚",
      text: `Carb intake was higher than target. Swap some refined carbs for vegetables or reduce portion sizes.`,
      priority: 5,
    });
  }

  // Fat
  if (fatPct > 130) {
    suggestions.push({
      icon: "🧈",
      text: `Fat was over target by ${Math.round(totals.fat - goals.fat_g)}g. Watch cooking oils, sauces, and cheese portions.`,
      priority: 5,
    });
  }

  // Water
  if (waterPct < 60) {
    suggestions.push({
      icon: "💧",
      text: `Water intake was low at ${(waterMl / 1000).toFixed(1)}L / ${(waterGoalMl / 1000).toFixed(1)}L. Try keeping a bottle nearby and sipping throughout the day.`,
      priority: 2,
    });
  } else if (waterPct < 90) {
    suggestions.push({
      icon: "🚰",
      text: `Almost hit your water goal! Just ${((waterGoalMl - waterMl) / 1000).toFixed(1)}L short. A glass before bed would do it.`,
      priority: 6,
    });
  }

  // All good!
  if (suggestions.length === 0) {
    suggestions.push({
      icon: "🏆",
      text: "Great day! You hit all your targets. Keep up the consistency!",
      priority: 0,
    });
  }

  return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  const StatusIcon = pct >= 90 ? CheckCircle2 : pct >= 70 ? TrendingUp : TrendingDown;
  const statusColor = pct >= 90 ? "text-green-400" : pct >= 70 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{Math.round(value)} / {target}{label === "Calories" ? " kcal" : "g"}</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <StatusIcon className={`h-4 w-4 ${statusColor} shrink-0`} />
    </div>
  );
}

export default function CompleteDaySummary({ open, onClose, totals, goals, waterMl, waterGoalMl }: Props) {
  const suggestions = useMemo(
    () => generateSuggestions(totals, goals, waterMl, waterGoalMl),
    [totals, goals, waterMl, waterGoalMl]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-card border-t border-border rounded-t-2xl flex flex-col"
            style={{ maxHeight: "85dvh", marginBottom: "calc(56px + env(safe-area-inset-bottom))" }}
          >
            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-5">
              {/* Handle */}
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold font-display">Day Complete</h2>
                </div>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Macro summary */}
              <div className="space-y-3 mb-5">
                <MacroBar label="Calories" value={totals.calories} target={goals.calories} color="bg-primary" />
                <MacroBar label="Protein" value={totals.protein} target={goals.protein_g} color="bg-blue-400" />
                <MacroBar label="Carbs" value={totals.carbs} target={goals.carbs_g} color="bg-amber-400" />
                <MacroBar label="Fat" value={totals.fat} target={goals.fat_g} color="bg-rose-400" />
                <MacroBar label="Water" value={waterMl / 1000} target={waterGoalMl / 1000} color="bg-cyan-400" />
              </div>

              {/* Suggestions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tips for tomorrow</p>
                </div>
                {suggestions.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                    className="flex gap-3 p-3 rounded-xl bg-secondary/50 border border-border"
                  >
                    <span className="text-lg shrink-0">{s.icon}</span>
                    <p className="text-xs text-foreground/90 leading-relaxed">{s.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Sticky footer — always visible, clears the home indicator */}
            <div
              className="shrink-0 px-5 pt-3 border-t border-border/40 bg-card"
              style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
            >
              <Button onClick={onClose} className="w-full h-11">
                Done
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
