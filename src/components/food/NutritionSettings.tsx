import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const WATER_OPTIONS = [1500, 2000, 2500, 3000, 3500, 4000];

export default function NutritionSettings({ open, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [calories, setCalories] = useState(2000);
  const [proteinPct, setProteinPct] = useState(30);
  const [carbsPct, setCarbsPct] = useState(45);
  const [fatPct, setFatPct] = useState(25);
  const [waterGoalMl, setWaterGoalMl] = useState(2500);
  const [adjustForActivity, setAdjustForActivity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    setLoading(true);
    supabase
      .from("nutrition_goals")
      .select("calories, protein_g, carbs_g, fat_g, water_goal_ml, adjust_for_activity")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCalories(data.calories);
          setWaterGoalMl(data.water_goal_ml);
          setAdjustForActivity(!!data.adjust_for_activity);
          // Calculate current percentages from grams
          const totalCalsFromMacros = data.protein_g * 4 + data.carbs_g * 4 + data.fat_g * 9;
          if (totalCalsFromMacros > 0) {
            setProteinPct(Math.round((data.protein_g * 4 / totalCalsFromMacros) * 100));
            setCarbsPct(Math.round((data.carbs_g * 4 / totalCalsFromMacros) * 100));
            setFatPct(Math.round((data.fat_g * 9 / totalCalsFromMacros) * 100));
          }
        }
        setLoading(false);
      });
  }, [user, open]);

  // Ensure percentages always sum to 100
  const adjustMacros = (
    changed: "protein" | "carbs" | "fat",
    newVal: number
  ) => {
    newVal = Math.max(5, Math.min(90, newVal));

    if (changed === "protein") {
      const remaining = 100 - newVal;
      const oldOtherTotal = carbsPct + fatPct;
      if (oldOtherTotal === 0) {
        setCarbsPct(Math.round(remaining * 0.6));
        setFatPct(remaining - Math.round(remaining * 0.6));
      } else {
        const newCarbs = Math.round((carbsPct / oldOtherTotal) * remaining);
        setCarbsPct(Math.max(5, newCarbs));
        setFatPct(Math.max(5, remaining - Math.max(5, newCarbs)));
      }
      setProteinPct(newVal);
    } else if (changed === "carbs") {
      const remaining = 100 - newVal;
      const oldOtherTotal = proteinPct + fatPct;
      if (oldOtherTotal === 0) {
        setProteinPct(Math.round(remaining * 0.5));
        setFatPct(remaining - Math.round(remaining * 0.5));
      } else {
        const newProtein = Math.round((proteinPct / oldOtherTotal) * remaining);
        setProteinPct(Math.max(5, newProtein));
        setFatPct(Math.max(5, remaining - Math.max(5, newProtein)));
      }
      setCarbsPct(newVal);
    } else {
      const remaining = 100 - newVal;
      const oldOtherTotal = proteinPct + carbsPct;
      if (oldOtherTotal === 0) {
        setProteinPct(Math.round(remaining * 0.4));
        setCarbsPct(remaining - Math.round(remaining * 0.4));
      } else {
        const newProtein = Math.round((proteinPct / oldOtherTotal) * remaining);
        setProteinPct(Math.max(5, newProtein));
        setCarbsPct(Math.max(5, remaining - Math.max(5, newProtein)));
      }
      setFatPct(newVal);
    }
  };

  // Normalize to exactly 100
  const normProtein = proteinPct;
  const normCarbs = carbsPct;
  const normFat = 100 - proteinPct - carbsPct;

  const proteinG = Math.round((calories * normProtein / 100) / 4);
  const carbsG = Math.round((calories * normCarbs / 100) / 4);
  const fatG = Math.round((calories * normFat / 100) / 9);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("nutrition_goals")
      .update({
        calories,
        protein_g: proteinG,
        carbs_g: carbsG,
        fat_g: fatG,
        water_goal_ml: waterGoalMl,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save");
      return;
    }
    toast.success("Goals updated");
    onSaved();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold">Nutrition Goals</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground text-sm">Loading...</div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Calories */}
            <div>
              <Label className="text-sm font-semibold">Daily Calories (kcal)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={800}
                max={10000}
                value={calories || ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setCalories(0);
                    return;
                  }
                  const parsed = parseInt(raw);
                  if (!isNaN(parsed)) setCalories(Math.min(10000, parsed));
                }}
                onBlur={() => {
                  if (calories < 800) setCalories(800);
                }}
                className="mt-2 h-12 text-lg font-bold text-center"
              />
            </div>

            {/* Macro split */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold">Macro Split</Label>

              <div className="p-3 rounded-xl bg-secondary/50 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-400">{normProtein}%</div>
                  <div className="text-[10px] text-muted-foreground">Protein</div>
                  <div className="text-xs font-medium">{proteinG}g</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-400">{normCarbs}%</div>
                  <div className="text-[10px] text-muted-foreground">Carbs</div>
                  <div className="text-xs font-medium">{carbsG}g</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-rose-400">{normFat}%</div>
                  <div className="text-[10px] text-muted-foreground">Fat</div>
                  <div className="text-xs font-medium">{fatG}g</div>
                </div>
              </div>

              {/* Protein slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Protein</span>
                  <span className="font-semibold text-blue-400">{normProtein}%</span>
                </div>
                <Slider
                  value={[normProtein]}
                  min={5}
                  max={60}
                  step={1}
                  onValueChange={([v]) => adjustMacros("protein", v)}
                  className="[&_[role=slider]]:bg-blue-400"
                />
              </div>

              {/* Carbs slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Carbs</span>
                  <span className="font-semibold text-amber-400">{normCarbs}%</span>
                </div>
                <Slider
                  value={[normCarbs]}
                  min={5}
                  max={70}
                  step={1}
                  onValueChange={([v]) => adjustMacros("carbs", v)}
                  className="[&_[role=slider]]:bg-amber-400"
                />
              </div>

              {/* Fat slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Fat</span>
                  <span className="font-semibold text-rose-400">{normFat}%</span>
                </div>
                <Slider
                  value={[normFat]}
                  min={5}
                  max={60}
                  step={1}
                  onValueChange={([v]) => adjustMacros("fat", v)}
                  className="[&_[role=slider]]:bg-rose-400"
                />
              </div>
            </div>

            {/* Water goal */}
            <div>
              <Label className="text-sm font-semibold">Daily Water Goal</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {WATER_OPTIONS.map((ml) => (
                  <button
                    key={ml}
                    onClick={() => setWaterGoalMl(ml)}
                    className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                      waterGoalMl === ml
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-foreground"
                    }`}
                  >
                    {ml / 1000}L
                  </button>
                ))}
              </div>
            </div>

            {/* Re-run TDEE */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onClose();
                // Small delay so sheet closes first
                setTimeout(() => {
                  // Dispatch custom event to trigger TDEE setup
                  window.dispatchEvent(new CustomEvent("open-tdee-setup"));
                }, 300);
              }}
            >
              Recalculate with TDEE Calculator
            </Button>

            <Button onClick={handleSave} disabled={saving} className="w-full h-12 font-semibold">
              {saving ? "Saving..." : "Save Goals"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
