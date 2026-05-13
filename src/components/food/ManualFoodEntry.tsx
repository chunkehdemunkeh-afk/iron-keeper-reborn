import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { awardXpAndNotify } from "@/lib/gamification/notify";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface Props {
  mealType: MealType;
  date: string;
  onLogged: () => void;
  onClose: () => void;
}

export default function ManualFoodEntry({ mealType, date, onLogged, onClose }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [servingSize, setServingSize] = useState("1 serving");
  const [saving, setSaving] = useState(false);

  const isValid = name.trim().length > 0 && name.trim().length <= 200;

  const parseNum = (v: string) => Math.max(0, Math.min(99999, parseFloat(v) || 0));

  const handleSubmit = async () => {
    if (!user || !isValid) return;
    setSaving(true);
    const { error } = await supabase.from("food_logs").insert({
      user_id: user.id,
      date,
      meal_type: mealType,
      food_name: name.trim().slice(0, 200),
      brand: null,
      serving_size: servingSize.trim().slice(0, 50) || "1 serving",
      serving_qty: 1,
      calories: Math.round(parseNum(calories)),
      protein_g: Math.round(parseNum(protein) * 10) / 10,
      carbs_g: Math.round(parseNum(carbs) * 10) / 10,
      fat_g: Math.round(parseNum(fat) * 10) / 10,
      barcode: null,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to log food");
      return;
    }
    toast.success(`${name.trim()} logged to ${mealType}`);
    void awardXpAndNotify({ source: "food_log_any" });
    onLogged();
    onClose();
  };

  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
      <div>
        <Label className="text-xs text-muted-foreground">Food name *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Chicken breast"
          className="mt-1 h-11"
          maxLength={200}
          autoFocus
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Serving size</Label>
        <Input
          value={servingSize}
          onChange={(e) => setServingSize(e.target.value)}
          placeholder="e.g. 100g, 1 cup"
          className="mt-1 h-11"
          maxLength={50}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Calories (kcal)</Label>
          <Input
            type="number"
            min="0"
            max="99999"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="0"
            className="mt-1 h-11"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Protein (g)</Label>
          <Input
            type="number"
            min="0"
            max="99999"
            step="0.1"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="0"
            className="mt-1 h-11"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
          <Input
            type="number"
            min="0"
            max="99999"
            step="0.1"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            placeholder="0"
            className="mt-1 h-11"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Fat (g)</Label>
          <Input
            type="number"
            min="0"
            max="99999"
            step="0.1"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            placeholder="0"
            className="mt-1 h-11"
          />
        </div>
      </div>

      {/* Preview */}
      {(parseNum(calories) > 0 || parseNum(protein) > 0) && (
        <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-secondary/50">
          <div>
            <div className="text-base font-bold text-primary">{Math.round(parseNum(calories))}</div>
            <div className="text-[10px] text-muted-foreground">kcal</div>
          </div>
          <div>
            <div className="text-base font-bold text-blue-400">{parseNum(protein).toFixed(1)}g</div>
            <div className="text-[10px] text-muted-foreground">Protein</div>
          </div>
          <div>
            <div className="text-base font-bold text-amber-400">{parseNum(carbs).toFixed(1)}g</div>
            <div className="text-[10px] text-muted-foreground">Carbs</div>
          </div>
          <div>
            <div className="text-base font-bold text-rose-400">{parseNum(fat).toFixed(1)}g</div>
            <div className="text-[10px] text-muted-foreground">Fat</div>
          </div>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={saving || !isValid} className="w-full h-12 font-semibold">
        <Plus className="h-4 w-4 mr-2" />
        {saving ? "Logging..." : "Log Food"}
      </Button>
    </div>
  );
}
