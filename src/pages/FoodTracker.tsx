import { useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Settings, Trash2, CheckCircle2, Copy, Sunrise, Sun, Moon, Apple, Flame, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchDailyBurn } from "@/lib/cloud-data";
import FoodSearch from "@/components/food/FoodSearch";
import TDEESetup from "@/components/food/TDEESetup";
import NutritionSettings from "@/components/food/NutritionSettings";
import WaterIntake from "@/components/food/WaterIntake";
import CompleteDaySummary from "@/components/food/CompleteDaySummary";
import WeeklyNutritionChart from "@/components/food/WeeklyNutritionChart";
import CopyMeal from "@/components/food/CopyMeal";
import HelpButton from "@/components/demo/HelpButton";
import { toast } from "sonner";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface FoodLog {
  id: string;
  meal_type: string;
  food_name: string;
  brand: string | null;
  serving_qty: number;
  serving_size: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g?: number | null;
  fibre_g?: number | null;
  saturated_fat_g?: number | null;
  salt_g?: number | null;
  barcode?: string | null;
}

interface EditingLog {
  id: string;
  mealType: MealType;
  log: FoodLog;
}

interface Goals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  adjust_for_activity?: boolean;
}

const MEALS: { type: MealType; label: string; icon: LucideIcon }[] = [
  { type: "breakfast", label: "Breakfast", icon: Sunrise },
  { type: "lunch",     label: "Lunch",     icon: Sun },
  { type: "dinner",    label: "Dinner",    icon: Moon },
  { type: "snack",     label: "Snacks",    icon: Apple },
];

function SwipeableRow({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const x = useMotionValue(0);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -72) {
      onDelete();
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex items-center px-4 bg-destructive">
        <Trash2 className="h-4 w-4 text-white" />
      </div>
      <motion.div
        style={{ x, touchAction: "pan-y" }}
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        onDragEnd={handleDragEnd}
        className="relative bg-card"
      >
        {children}
      </motion.div>
    </div>
  );
}

export default function FoodTracker() {
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchMeal, setSearchMeal] = useState<MealType | null>(null);
  const [editingLog, setEditingLog] = useState<EditingLog | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [showNutritionSheet, setShowNutritionSheet] = useState(false);
  const [copyMeal, setCopyMeal] = useState<MealType | null>(null);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [waterMl, setWaterMl] = useState(0);
  const [waterGoalMl, setWaterGoalMl] = useState(2500);
  const [burnedKcal, setBurnedKcal] = useState(0);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [logsRes, goalsRes, waterRes, burn] = await Promise.all([
      supabase
        .from("food_logs")
        .select("id, meal_type, food_name, brand, serving_qty, serving_size, calories, protein_g, carbs_g, fat_g, sugar_g, fibre_g, saturated_fat_g, salt_g, barcode")
        .eq("user_id", user.id)
        .eq("date", date)
        .order("created_at"),
      supabase
        .from("nutrition_goals")
        .select("calories, protein_g, carbs_g, fat_g, water_goal_ml, adjust_for_activity")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("water_intake")
        .select("amount_ml")
        .eq("user_id", user.id)
        .eq("date", date),
      fetchDailyBurn(date),
    ]);
    setLogs((logsRes.data as unknown as FoodLog[]) || []);
    if (goalsRes.data) {
      setGoals(goalsRes.data as Goals);
      if ((goalsRes.data as any).water_goal_ml) setWaterGoalMl((goalsRes.data as any).water_goal_ml);
    } else {
      setGoals(null);
      setShowSetup(true);
    }
    const water = waterRes.data || [];
    setWaterMl(water.reduce((s: number, e: any) => s + e.amount_ml, 0));
    setBurnedKcal(burn.totalKcal || 0);
    setLoading(false);
  }, [user, date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Listen for TDEE re-open from settings
  useEffect(() => {
    const handler = () => setShowSetup(true);
    window.addEventListener("open-tdee-setup", handler);
    return () => window.removeEventListener("open-tdee-setup", handler);
  }, []);

  // Auto-open TDEE setup when navigated with ?edit-goals=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("edit-goals") === "1") {
      setShowSetup(true);
      params.delete("edit-goals");
      const newSearch = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
    }
  }, []);

  const deleteLog = async (id: string) => {
    await supabase.from("food_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    toast.success("Removed");
  };

  // Totals
  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein: acc.protein + l.protein_g,
      carbs: acc.carbs + l.carbs_g,
      fat: acc.fat + l.fat_g,
      sugar: acc.sugar + (l.sugar_g ?? 0),
      fibre: acc.fibre + (l.fibre_g ?? 0),
      saturatedFat: acc.saturatedFat + (l.saturated_fat_g ?? 0),
      salt: acc.salt + (l.salt_g ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fibre: 0, saturatedFat: 0, salt: 0 }
  );
  const hasExtendedTotals = logs.some(l => l.sugar_g != null || l.fibre_g != null || l.saturated_fat_g != null || l.salt_g != null);

  if (showSetup) {
    return (
      <TDEESetup
        onComplete={() => {
          setShowSetup(false);
          fetchData();
        }}
      />
    );
  }

  const pct = (val: number, target: number) => Math.min(100, Math.round((val / target) * 100));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold font-display">Nutrition</h1>
        <div className="flex items-center gap-1">
          {goals && logs.length > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-primary" onClick={() => setShowComplete(true)}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Complete Day
            </Button>
          )}
          <HelpButton />
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Date nav — up to 7 days back, not beyond today */}
      {(() => {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const minDate = format(subDays(new Date(), 7), "yyyy-MM-dd");
        const isToday = date === todayStr;
        const canGoBack = date > minDate;
        return (
          <div className="flex items-center justify-center gap-4 px-4 py-2">
            <button
              onClick={() => canGoBack && setDate(format(subDays(new Date(date), 1), "yyyy-MM-dd"))}
              className={canGoBack ? "" : "opacity-30 pointer-events-none"}
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {isToday ? "Today" : format(new Date(date + "T12:00:00"), "EEE, MMM d")}
            </span>
            <button
              onClick={() => !isToday && setDate(format(addDays(new Date(date), 1), "yyyy-MM-dd"))}
              className={isToday ? "opacity-30 pointer-events-none" : ""}
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        );
      })()}

      {/* Summary */}
      {goals && (() => {
        const adjust = !!goals.adjust_for_activity;
        const effectiveGoal = adjust ? goals.calories + burnedKcal : goals.calories;
        const showBurnTile = burnedKcal > 0;
        return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 p-4 rounded-2xl bg-card border border-border mb-4 cursor-pointer active:opacity-80 transition-opacity"
          onClick={() => setShowNutritionSheet(true)}
        >
          {/* Calorie ring — Eaten · Ring · Burned/Goal */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-center w-16">
              <p className="text-xl font-display font-bold leading-none">{Math.round(totals.calories)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Eaten</p>
            </div>

            <div className="relative h-28 w-28">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="hsl(var(--secondary))"
                  strokeWidth="3.5"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3.5"
                  strokeDasharray={`${pct(totals.calories, effectiveGoal)}, 100`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {(() => {
                  const diff = effectiveGoal - Math.round(totals.calories);
                  const over = diff < 0;
                  return (
                    <>
                      <p className={`text-2xl font-display font-bold leading-none ${over ? "text-rose-400" : ""}`}>
                        {over ? `-${Math.abs(diff)}` : diff}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 h-[12px]">{over ? "" : "Remaining"}</p>
                    </>
                  );
                })()}
              </div>
            </div>

            {showBurnTile ? (
              <div className="text-center w-16">
                <p className="text-xl font-display font-bold leading-none text-amber-400 flex items-center justify-center gap-0.5">
                  <Flame className="h-3.5 w-3.5" />
                  {burnedKcal}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Burned</p>
                <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                  Goal {effectiveGoal}
                </p>
              </div>
            ) : (
              <div className="text-center w-16">
                <p className="text-xl font-display font-bold leading-none">{goals.calories}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Goal</p>
              </div>
            )}
          </div>

          {adjust && burnedKcal > 0 && (
            <p className="text-[10px] text-center text-amber-400/80 -mt-2 mb-3">
              +{burnedKcal} kcal added from today's activity
            </p>
          )}

          {/* Macros */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Carbs",   value: totals.carbs,   target: goals.carbs_g,   color: "bg-amber-400" },
              { label: "Protein", value: totals.protein, target: goals.protein_g, color: "bg-primary" },
              { label: "Fat",     value: totals.fat,     target: goals.fat_g,     color: "bg-rose-400" },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  <span className="text-[10px] font-medium">{Math.round(m.value)} / {m.target}g</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.color} transition-all duration-500`}
                    style={{ width: `${pct(m.value, m.target)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-1 mt-3 pt-2 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground">Full breakdown</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          </div>
        </motion.div>
        );
      })()}

      {/* Weekly nutrition chart */}
      <WeeklyNutritionChart goals={goals} />

      {/* Water intake */}
      <div className="mt-4">
        <WaterIntake date={date} />
      </div>

      {/* Meals */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {MEALS.map((meal) => {
            const mealLogs = logs.filter((l) => l.meal_type === meal.type);
            const mealCals  = mealLogs.reduce((s, l) => s + l.calories, 0);
            const mealPro   = mealLogs.reduce((s, l) => s + l.protein_g, 0);
            const mealCarbs = mealLogs.reduce((s, l) => s + l.carbs_g, 0);
            const mealFat   = mealLogs.reduce((s, l) => s + l.fat_g, 0);
            const isExpanded = expandedMeals.has(meal.type);
            const toggle = () => setExpandedMeals(prev => {
              const next = new Set(prev);
              next.has(meal.type) ? next.delete(meal.type) : next.add(meal.type);
              return next;
            });

            // Aggregate extended nutrition for the meal
            const mealSugar   = mealLogs.reduce((s, l) => s + (l.sugar_g ?? 0), 0);
            const mealSatFat  = mealLogs.reduce((s, l) => s + (l.saturated_fat_g ?? 0), 0);
            const mealFibre   = mealLogs.reduce((s, l) => s + (l.fibre_g ?? 0), 0);
            const mealSalt    = mealLogs.reduce((s, l) => s + (l.salt_g ?? 0), 0);
            const hasExtended = mealLogs.some(l => l.sugar_g != null || l.fibre_g != null || l.saturated_fat_g != null || l.salt_g != null);

            return (
              <div key={meal.type} className="rounded-xl bg-card border border-border overflow-hidden">
                {/* ── Header row ─────────────────────────────────────────────── */}
                <button
                  className="w-full flex items-center justify-between p-3 text-left active:bg-secondary/30 transition-colors"
                  onClick={toggle}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <meal.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">{meal.label}</span>
                    </div>
                    {mealCals > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 pl-7">
                        <span className="font-medium text-foreground">{Math.round(mealCals)} kcal</span>
                        <span className="mx-1 opacity-40">·</span>
                        {mealLogs.length} item{mealLogs.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); setCopyMeal(meal.type); }}
                      title="Copy from another meal"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-primary"
                      onClick={(e) => { e.stopPropagation(); setSearchMeal(meal.type); }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-1" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
                    }
                  </div>
                </button>

                {/* ── Collapsed food list (always visible when items exist) ──── */}
                {!isExpanded && mealLogs.length > 0 && (
                  <div className="border-t border-border">
                    {mealLogs.map((log) => (
                      <SwipeableRow key={log.id} onDelete={() => deleteLog(log.id)}>
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 last:border-0">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{log.food_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {log.serving_qty} × {log.serving_size || "100g"}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-primary shrink-0 ml-2">
                            {Math.round(log.calories)} kcal
                          </span>
                        </div>
                      </SwipeableRow>
                    ))}
                  </div>
                )}

                {/* ── Expanded content ───────────────────────────────────────── */}
                {isExpanded && (
                  <>
                    {mealLogs.length > 0 ? (
                      <>
                        {/* Goal progress bars */}
                        <div className="border-t border-border px-3 py-3 space-y-2 bg-secondary/20">
                          {[
                            { label: "Calories", value: Math.round(mealCals),  unit: "kcal", goal: goals?.calories ?? 0, color: "bg-primary" },
                            { label: "Protein",  value: Math.round(mealPro),   unit: "g",    goal: goals?.protein_g ?? 0, color: "bg-blue-400" },
                            { label: "Carbs",    value: Math.round(mealCarbs), unit: "g",    goal: goals?.carbs_g ?? 0,   color: "bg-amber-400" },
                            { label: "Fat",      value: Math.round(mealFat),   unit: "g",    goal: goals?.fat_g ?? 0,     color: "bg-rose-400" },
                          ].map((m) => (
                            <div key={m.label}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">{m.label}</span>
                                <span className="font-medium">
                                  {m.value}{m.unit === "kcal" ? "" : "g"}
                                  {m.goal > 0 && <span className="text-muted-foreground font-normal"> / {m.goal}{m.unit === "kcal" ? " kcal" : "g"}</span>}
                                </span>
                              </div>
                              {m.goal > 0 && (
                                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${m.color} transition-all duration-500`}
                                    style={{ width: `${Math.min(100, (m.value / m.goal) * 100)}%` }} />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Nutrition Facts label */}
                        <div className="border-t border-border px-3 py-3 space-y-0">
                          <p className="text-xs font-bold mb-2">Nutrition Facts</p>

                          {/* Calories */}
                          <div className="flex justify-between py-1.5 border-b border-border/40">
                            <span className="text-xs font-bold">Calories</span>
                            <span className="text-xs font-bold">{Math.round(mealCals)} kcal</span>
                          </div>

                          {/* Protein */}
                          <div className="flex justify-between py-1.5 border-b border-border/40">
                            <span className="text-xs font-bold">Protein</span>
                            <span className="text-xs font-bold">{mealPro.toFixed(1)} g</span>
                          </div>

                          {/* Carbs block */}
                          <div className="flex justify-between py-1.5 border-b border-border/40">
                            <span className="text-xs font-bold">Carbs</span>
                            <span className="text-xs font-bold">{mealCarbs.toFixed(1)} g</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/30 pl-4">
                            <span className="text-xs text-muted-foreground">Fibre</span>
                            <span className="text-xs text-muted-foreground">{hasExtended && mealFibre > 0 ? `${mealFibre.toFixed(1)} g` : "—"}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/40 pl-4">
                            <span className="text-xs text-muted-foreground">of which Sugars</span>
                            <span className="text-xs text-muted-foreground">{hasExtended && mealSugar > 0 ? `${mealSugar.toFixed(1)} g` : "—"}</span>
                          </div>

                          {/* Fat block */}
                          <div className="flex justify-between py-1.5 border-b border-border/40">
                            <span className="text-xs font-bold">Total Fat</span>
                            <span className="text-xs font-bold">{mealFat.toFixed(1)} g</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/40 pl-4">
                            <span className="text-xs text-muted-foreground">of which Saturates</span>
                            <span className="text-xs text-muted-foreground">{hasExtended && mealSatFat > 0 ? `${mealSatFat.toFixed(1)} g` : "—"}</span>
                          </div>

                          {/* Salt */}
                          <div className="flex justify-between py-1.5">
                            <span className="text-xs font-bold">Salt</span>
                            <span className="text-xs font-bold">{hasExtended && mealSalt > 0 ? `${mealSalt.toFixed(2)} g` : "—"}</span>
                          </div>
                        </div>

                        {/* Food items with edit/delete */}
                        <div className="border-t-4 border-border">
                          {mealLogs.map((log) => (
                            <SwipeableRow key={log.id} onDelete={() => deleteLog(log.id)}>
                              <div
                                className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 last:border-0 cursor-pointer active:bg-secondary/50 transition-colors"
                                onClick={() => {
                                  setEditingLog({ id: log.id, mealType: meal.type, log });
                                  setSearchMeal(meal.type);
                                }}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate">{log.food_name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {log.serving_qty} × {log.serving_size || "100g"}
                                  </p>
                                </div>
                                <span className="text-xs font-semibold text-primary shrink-0">{Math.round(log.calories)} kcal</span>
                              </div>
                            </SwipeableRow>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="border-t border-border px-3 py-4 text-center text-xs text-muted-foreground">
                        Nothing logged yet — tap <strong>Add</strong> to get started
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Food search sheet */}
      {searchMeal && (
        <FoodSearch
          open={!!searchMeal}
          onClose={() => { setSearchMeal(null); setEditingLog(null); }}
          mealType={searchMeal}
          date={date}
          onLogged={fetchData}
          editingLog={editingLog ? {
            id: editingLog.log.id,
            food_name: editingLog.log.food_name,
            brand: editingLog.log.brand,
            serving_size: editingLog.log.serving_size,
            serving_qty: editingLog.log.serving_qty,
            calories: editingLog.log.calories,
            protein_g: editingLog.log.protein_g,
            carbs_g: editingLog.log.carbs_g,
            fat_g: editingLog.log.fat_g,
            sugar_g: editingLog.log.sugar_g,
            fibre_g: editingLog.log.fibre_g,
            saturated_fat_g: editingLog.log.saturated_fat_g,
            salt_g: editingLog.log.salt_g,
            barcode: editingLog.log.barcode || null,
          } : null}
        />
      )}

      {/* Nutrition settings sheet */}
      <NutritionSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSaved={fetchData}
      />

      {/* Complete day summary */}
      {goals && (
        <CompleteDaySummary
          open={showComplete}
          onClose={() => setShowComplete(false)}
          totals={totals}
          goals={goals}
          waterMl={waterMl}
          waterGoalMl={waterGoalMl}
        />
      )}

      {/* Copy meal sheet */}
      {copyMeal && (
        <CopyMeal
          open={!!copyMeal}
          onClose={() => setCopyMeal(null)}
          targetDate={date}
          targetMeal={copyMeal}
          onCopied={fetchData}
        />
      )}

      {/* Full nutrition breakdown sheet */}
      {goals && (
        <Sheet open={showNutritionSheet} onOpenChange={setShowNutritionSheet}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle className="font-display text-lg">
                {format(new Date(date + "T12:00:00"), "EEE, MMM d")} — Nutrition
              </SheetTitle>
            </SheetHeader>

            {/* Calorie overview */}
            <div className="flex items-center justify-between px-1 mb-6">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-2xl font-display font-bold">{Math.round(totals.calories)}</span>
                <span className="text-[11px] text-muted-foreground">Eaten</span>
              </div>
              <div className="flex-1 mx-4 h-px bg-border" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-2xl font-display font-bold text-primary">{Math.max(0, goals.calories - Math.round(totals.calories))}</span>
                <span className="text-[11px] text-muted-foreground">Remaining</span>
              </div>
              <div className="flex-1 mx-4 h-px bg-border" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-2xl font-display font-bold">{goals.calories}</span>
                <span className="text-[11px] text-muted-foreground">Goal</span>
              </div>
            </div>

            {/* Macros */}
            <div className="mb-6">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Macronutrients</p>
              <div className="space-y-4">
                {[
                  { label: "Carbohydrates", value: totals.carbs,   target: goals.carbs_g,   color: "bg-amber-400",  unit: "g" },
                  { label: "Protein",       value: totals.protein, target: goals.protein_g, color: "bg-primary",    unit: "g" },
                  { label: "Fat",           value: totals.fat,     target: goals.fat_g,     color: "bg-rose-400",   unit: "g" },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{m.label}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-display font-bold">{Math.round(m.value)}</span>
                        <span className="text-[11px] text-muted-foreground">/ {m.target}{m.unit}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${m.color} transition-all duration-500`}
                        style={{ width: `${Math.min(100, pct(m.value, m.target))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extended nutrition */}
            {hasExtendedTotals && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Extended</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Sugar",         value: totals.sugar,        unit: "g", color: "bg-pink-400" },
                    { label: "Fibre",         value: totals.fibre,        unit: "g", color: "bg-emerald-400" },
                    { label: "Saturated Fat", value: totals.saturatedFat, unit: "g", color: "bg-orange-400" },
                    { label: "Salt",          value: totals.salt,         unit: "g", color: "bg-sky-400" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-secondary/50 p-3">
                      <div className={`w-2 h-2 rounded-full ${item.color} mb-2`} />
                      <p className="text-[11px] text-muted-foreground mb-0.5">{item.label}</p>
                      <p className="text-lg font-display font-bold leading-none">
                        {item.value < 0.1 && item.value > 0 ? "<0.1" : Math.round(item.value * 10) / 10}
                        <span className="text-xs font-normal text-muted-foreground ml-0.5">{item.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasExtendedTotals && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Log foods with extended data to see sugar, fibre, salt, and more.
              </p>
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
