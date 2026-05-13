import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Loader2, X, Clock, RotateCcw, PenLine, ScanBarcode, Star } from "lucide-react";
import { searchFoods, fetchExtendedNutrition, fetchOFFProductDetails, FoodItem, ServiceUnavailableError } from "@/lib/open-food-facts";
import ManualFoodEntry from "./ManualFoodEntry";
import BarcodeScanner from "./BarcodeScanner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { awardXpAndNotify } from "@/lib/gamification/notify";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface SavedFood {
  food_name: string;
  brand: string | null;
  serving_size: string | null;
  serving_qty: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g?: number | null;
  fibre_g?: number | null;
  saturated_fat_g?: number | null;
  salt_g?: number | null;
  barcode: string | null;
}

export interface EditingLog {
  id: string;
  food_name: string;
  brand: string | null;
  serving_size: string | null;
  serving_qty: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g?: number | null;
  fibre_g?: number | null;
  saturated_fat_g?: number | null;
  salt_g?: number | null;
  barcode: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  mealType: MealType;
  date: string;
  onLogged: () => void;
  editingLog?: EditingLog | null;
}

export default function FoodSearch({ open, onClose, mealType, date, onLogged, editingLog }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [editCalories, setEditCalories] = useState("");
  const [editProtein, setEditProtein] = useState("");
  const [editCarbs, setEditCarbs] = useState("");
  const [editFat, setEditFat] = useState("");
  // Extended nutrition — per 100g, null when not available
  const [baseSugar, setBaseSugar] = useState<number | null>(null);
  const [baseFibre, setBaseFibre] = useState<number | null>(null);
  const [baseSatFat, setBaseSatFat] = useState<number | null>(null);
  const [baseSalt, setBaseSalt] = useState<number | null>(null);
  const [servings, setServings] = useState("1");
  const [servingGrams, setServingGrams] = useState(100);
  const [saving, setSaving] = useState(false);
  const [recents, setRecents] = useState<SavedFood[]>([]);
  const [favourites, setFavourites] = useState<SavedFood[]>([]);
  const [favouriteNames, setFavouriteNames] = useState<Set<string>>(new Set());
  const [quickAdding, setQuickAdding] = useState<string | null>(null);
  const [mode, setMode] = useState<"search" | "manual" | "scan">("search");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.recentFoodSearches);
      if (stored) setRecentSearches(JSON.parse(stored).slice(0, 5));
    } catch {}
  }, []);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim().toLowerCase();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(STORAGE_KEYS.recentFoodSearches, JSON.stringify(updated));
  };

  // Fetch recents + favourites on open
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [logsRes, favsRes] = await Promise.all([
        supabase
          .from("food_logs")
          .select("food_name, brand, serving_size, serving_qty, calories, protein_g, carbs_g, fat_g, barcode, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("favourite_foods")
          .select("food_name, brand, serving_size, serving_qty, calories, protein_g, carbs_g, fat_g, barcode")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      // Recents
      if (logsRes.data) {
        const seen = new Set<string>();
        const unique: SavedFood[] = [];
        for (const row of logsRes.data) {
          const key = row.food_name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(row as SavedFood);
          }
          if (unique.length >= 10) break;
        }
        setRecents(unique);
      }

      // Favourites
      if (favsRes.data) {
        setFavourites(favsRes.data as SavedFood[]);
        setFavouriteNames(new Set(favsRes.data.map((f) => f.food_name.toLowerCase())));
      }
    })();
  }, [open, user]);

  // Pre-populate when editing an existing log
  useEffect(() => {
    if (!open || !editingLog) return;
    const food: FoodItem = {
      name: editingLog.food_name,
      brand: editingLog.brand || undefined,
      barcode: editingLog.barcode || undefined,
      servingSize: editingLog.serving_size || "100g",
      calories: editingLog.calories,
      protein: editingLog.protein_g,
      carbs: editingLog.carbs_g,
      fat: editingLog.fat_g,
    };
    // Reverse-calculate per-100g values from stored totals
    const storedGrams = parseInt(editingLog.serving_size || "100") || 100;
    const storedQty = editingLog.serving_qty || 1;
    const storedMultiplier = (storedGrams / 100) * storedQty;
    const rev = (v: number | null | undefined) =>
      (v != null && storedMultiplier > 0) ? Math.round((v / storedMultiplier) * 10) / 10 : null;
    setSelected(food);
    setEditCalories(String(Math.round((editingLog.calories / storedMultiplier) * 10) / 10));
    setEditProtein(String(Math.round((editingLog.protein_g / storedMultiplier) * 10) / 10));
    setEditCarbs(String(Math.round((editingLog.carbs_g / storedMultiplier) * 10) / 10));
    setEditFat(String(Math.round((editingLog.fat_g / storedMultiplier) * 10) / 10));
    setBaseSugar(rev(editingLog.sugar_g));
    setBaseFibre(rev(editingLog.fibre_g));
    setBaseSatFat(rev(editingLog.saturated_fat_g));
    setBaseSalt(rev(editingLog.salt_g));
    setServingGrams(storedGrams);
    setServings(String(storedQty));
  }, [open, editingLog]);

  const doSearch = useCallback(async (searchQuery?: string) => {
    const q = searchQuery ?? query;
    if (!q.trim()) return;
    if (searchQuery) setQuery(searchQuery);
    setSearching(true);
    saveRecentSearch(q);
    try {
      const items = await searchFoods(q);
      setResults(items);
    } catch (e) {
      if (e instanceof ServiceUnavailableError) {
        toast.error(e.message);
      }
      setResults([]);
    }
    setSearching(false);
  }, [query]);

  const selectFood = (food: FoodItem) => {
    setSelected(food);
    setEditCalories(String(Math.round(food.calories)));
    setEditProtein(String(Math.round(food.protein * 10) / 10));
    setEditCarbs(String(Math.round(food.carbs * 10) / 10));
    setEditFat(String(Math.round(food.fat * 10) / 10));
    setBaseSugar(food.sugar ?? null);
    setBaseFibre(food.fibre ?? null);
    setBaseSatFat(food.saturatedFat ?? null);
    setBaseSalt(food.salt ?? null);
    setServings("1");
    // Default to per-serving when the food has a known serving size, otherwise 100g
    setServingGrams(food.servingWeightG ?? 100);

    // FatSecret: fetch missing extended nutrition via food_id
    if (food.foodId && food.sugar == null && food.fibre == null && food.saturatedFat == null && food.salt == null) {
      fetchExtendedNutrition(food.foodId).then((ext) => {
        if (!ext) return;
        if (ext.sugar != null) setBaseSugar(ext.sugar);
        if (ext.fibre != null) setBaseFibre(ext.fibre);
        if (ext.saturatedFat != null) setBaseSatFat(ext.saturatedFat);
        if (ext.salt != null) setBaseSalt(ext.salt);
      });
    }

    // Open Food Facts: search index strips serving_size — fetch from product API
    // so the picker can default to "1 serving" (e.g. 22.5g for Fridge Raiders).
    if (food.source === "off" && food.barcode && food.servingWeightG == null) {
      fetchOFFProductDetails(food.barcode).then((details) => {
        if (!details) return;
        // Update selected so the "Serving" pill shows up + label reflects pack size
        setSelected((prev) => prev ? {
          ...prev,
          servingWeightG: details.servingWeightG ?? prev.servingWeightG,
          servingSize: details.servingSize ?? prev.servingSize,
        } : prev);
        if (details.servingWeightG && details.servingWeightG !== 100) {
          // Auto-switch picker to per-serving if user hasn't changed it
          setServingGrams((g) => g === 100 ? details.servingWeightG! : g);
        }
        // Fill in any missing extended nutrition too
        if (food.sugar == null && details.sugar != null) setBaseSugar(details.sugar);
        if (food.fibre == null && details.fibre != null) setBaseFibre(details.fibre);
        if (food.saturatedFat == null && details.saturatedFat != null) setBaseSatFat(details.saturatedFat);
        if (food.salt == null && details.salt != null) setBaseSalt(details.salt);
      });
    }
  };

  // Per-100g base values (edited by user)
  const baseCal = parseFloat(editCalories) || 0;
  const basePro = parseFloat(editProtein) || 0;
  const baseCarb = parseFloat(editCarbs) || 0;
  const baseFat = parseFloat(editFat) || 0;

  const handleLog = async () => {
    if (!user || !selected) return;
    setSaving(true);

    // If extended fields are still null (background fetch may not have completed),
    // do a synchronous fetch now before saving so we don't lose the data.
    let resolvedSugar = baseSugar;
    let resolvedFibre = baseFibre;
    let resolvedSatFat = baseSatFat;
    let resolvedSalt = baseSalt;
    if (
      selected.foodId &&
      resolvedSugar == null && resolvedFibre == null &&
      resolvedSatFat == null && resolvedSalt == null
    ) {
      const ext = await fetchExtendedNutrition(selected.foodId);
      if (ext) {
        if (ext.sugar != null) resolvedSugar = ext.sugar;
        if (ext.fibre != null) resolvedFibre = ext.fibre;
        if (ext.saturatedFat != null) resolvedSatFat = ext.saturatedFat;
        if (ext.salt != null) resolvedSalt = ext.salt;
      }
    }

    const qty = Math.max(0.1, parseFloat(servings) || 1);
    const multiplier = (servingGrams / 100) * qty;
    const mul1 = (v: number | null) => v != null ? Math.round(v * multiplier * 10) / 10 : null;
    const foodData = {
      food_name: selected.name,
      brand: selected.brand || null,
      serving_size: `${servingGrams}g`,
      serving_qty: qty,
      calories: Math.round(baseCal * multiplier),
      protein_g: Math.round(basePro * multiplier * 10) / 10,
      carbs_g: Math.round(baseCarb * multiplier * 10) / 10,
      fat_g: Math.round(baseFat * multiplier * 10) / 10,
      sugar_g: mul1(resolvedSugar),
      fibre_g: mul1(resolvedFibre),
      saturated_fat_g: mul1(resolvedSatFat),
      salt_g: mul1(resolvedSalt),
      barcode: selected.barcode || null,
    };

    let error;
    if (editingLog) {
      // Update existing log
      ({ error } = await supabase.from("food_logs").update(foodData).eq("id", editingLog.id));
    } else {
      // Insert new log
      ({ error } = await supabase.from("food_logs").insert({
        user_id: user.id,
        date,
        meal_type: mealType,
        ...foodData,
      }));
    }
    setSaving(false);
    if (error) {
      toast.error(editingLog ? "Failed to update food" : "Failed to log food");
      return;
    }
    toast.success(editingLog ? `${selected.name} updated` : `${selected.name} logged to ${mealType}`);
    if (!editingLog) void awardXpAndNotify({ source: "food_log_any" });
    setSelected(null);
    onLogged();
    if (editingLog) {
      // Close after editing
      onClose();
    }
    // Stay on search for new additions (don't close)
  };

  const quickAdd = async (food: SavedFood) => {
    if (!user) return;
    setQuickAdding(food.food_name);
    const { error } = await supabase.from("food_logs").insert({
      user_id: user.id,
      date,
      meal_type: mealType,
      food_name: food.food_name,
      brand: food.brand,
      serving_size: food.serving_size,
      serving_qty: food.serving_qty,
      calories: food.calories,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      barcode: food.barcode,
    });
    setQuickAdding(null);
    if (error) {
      toast.error("Failed to log food");
      return;
    }
    toast.success(`${food.food_name} logged to ${mealType}`);
    onLogged();
    // Stay on search for more additions
  };

  const toggleFavourite = async (food: { name: string; brand?: string | null; servingSize?: string | null; calories: number; protein: number; carbs: number; fat: number; sugar?: number | null; fibre?: number | null; saturatedFat?: number | null; salt?: number | null; barcode?: string | null }) => {
    if (!user) return;
    const key = food.name.toLowerCase();
    if (favouriteNames.has(key)) {
      // Remove
      await supabase.from("favourite_foods").delete().eq("user_id", user.id).eq("food_name", food.name);
      setFavouriteNames((prev) => { const next = new Set(prev); next.delete(key); return next; });
      setFavourites((prev) => prev.filter((f) => f.food_name.toLowerCase() !== key));
      toast.success("Removed from favourites");
    } else {
      // Add
      const { error } = await supabase.from("favourite_foods").insert({
        user_id: user.id,
        food_name: food.name,
        brand: food.brand || null,
        serving_size: food.servingSize || "100g",
        serving_qty: 1,
        calories: Math.round(food.calories),
        protein_g: Math.round(food.protein * 10) / 10,
        carbs_g: Math.round(food.carbs * 10) / 10,
        fat_g: Math.round(food.fat * 10) / 10,
        sugar_g: food.sugar ?? null,
        fibre_g: food.fibre ?? null,
        saturated_fat_g: food.saturatedFat ?? null,
        salt_g: food.salt ?? null,
        barcode: food.barcode || null,
      });
      if (error) {
        toast.error("Failed to favourite");
        return;
      }
      setFavouriteNames((prev) => new Set(prev).add(key));
      setFavourites((prev) => [{ food_name: food.name, brand: food.brand || null, serving_size: food.servingSize || "100g", serving_qty: 1, calories: Math.round(food.calories), protein_g: Math.round(food.protein * 10) / 10, carbs_g: Math.round(food.carbs * 10) / 10, fat_g: Math.round(food.fat * 10) / 10, sugar_g: food.sugar ?? null, fibre_g: food.fibre ?? null, saturated_fat_g: food.saturatedFat ?? null, salt_g: food.salt ?? null, barcode: food.barcode || null }, ...prev]);
      toast.success("Added to favourites");
    }
  };

  const showQuickAccess = !selected && results.length === 0 && !query;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="capitalize text-left">
              {editingLog ? `Edit ${mealType} item` : `Add to ${mealType}`}
            </SheetTitle>
          </SheetHeader>

          {/* Mode tabs */}
          <div className="flex px-4 pb-3 gap-2">
            <button
              onClick={() => setMode("search")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                mode === "search"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search className="h-3.5 w-3.5" /> Search
            </button>
            <button
              onClick={() => setMode("scan")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                mode === "scan"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <ScanBarcode className="h-3.5 w-3.5" /> Scan
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                mode === "manual"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <PenLine className="h-3.5 w-3.5" /> Manual
            </button>
          </div>

          {mode === "scan" ? (
            <BarcodeScanner
              onFoodFound={(food) => {
                selectFood(food);
                setMode("search");
              }}
            />
          ) : mode === "manual" ? (
            <ManualFoodEntry mealType={mealType} date={date} onLogged={onLogged} onClose={onClose} />
          ) : (
            <>
              {/* Search bar */}
              <div className="px-4 pb-3">
                <form
                  onSubmit={(e) => { e.preventDefault(); doSearch(); }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search foods..."
                      className="pl-9 h-10"
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={searching} className="h-10 px-4">
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                </form>
              </div>

              {/* Recent searches */}
              {!selected && results.length === 0 && !query && recentSearches.length > 0 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => doSearch(term)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Clock className="h-3 w-3" />
                      <span className="capitalize">{term}</span>
                    </button>
                  ))}
                </div>
              )}

              {selected ? (
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{selected.name}</h3>
                      {selected.brand && (
                        <p className="text-xs text-muted-foreground">{selected.brand}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFavourite(selected)}
                        className="text-muted-foreground hover:text-amber-400 transition-colors"
                      >
                        <Star
                          className={`h-5 w-5 ${favouriteNames.has(selected.name.toLowerCase()) ? "fill-amber-400 text-amber-400" : ""}`}
                        />
                      </button>
                      <button onClick={() => setSelected(null)}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const multiplier = (servingGrams / 100) * (parseFloat(servings) || 1);
                    const totalGrams = servingGrams * (parseFloat(servings) || 1);
                    return (
                      <>
                        {/* Editable per-100g macros */}
                        <div className="space-y-2">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Per 100g (tap to edit)</p>
                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <label className="text-[10px] text-muted-foreground">kcal</label>
                              <Input
                                type="number"
                                min="0"
                                value={editCalories}
                                onChange={(e) => setEditCalories(e.target.value)}
                                className="h-9 text-sm text-center font-semibold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Protein</label>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={editProtein}
                                onChange={(e) => setEditProtein(e.target.value)}
                                className="h-9 text-sm text-center font-semibold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Carbs</label>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={editCarbs}
                                onChange={(e) => setEditCarbs(e.target.value)}
                                className="h-9 text-sm text-center font-semibold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Fat</label>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={editFat}
                                onChange={(e) => setEditFat(e.target.value)}
                                className="h-9 text-sm text-center font-semibold"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Computed totals preview */}
                        <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-secondary/50">
                          <div>
                            <div className="text-base font-bold text-primary">
                              {Math.round(baseCal * multiplier)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">kcal</div>
                          </div>
                          <div>
                            <div className="text-base font-bold text-blue-400">
                              {(basePro * multiplier).toFixed(1)}g
                            </div>
                            <div className="text-[10px] text-muted-foreground">Protein</div>
                          </div>
                          <div>
                            <div className="text-base font-bold text-amber-400">
                              {(baseCarb * multiplier).toFixed(1)}g
                            </div>
                            <div className="text-[10px] text-muted-foreground">Carbs</div>
                          </div>
                          <div>
                            <div className="text-base font-bold text-rose-400">
                              {(baseFat * multiplier).toFixed(1)}g
                            </div>
                            <div className="text-[10px] text-muted-foreground">Fat</div>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Serving size</Label>
                          <div className="flex gap-2 mt-1">
                            {selected.servingWeightG && (
                              <button
                                onClick={() => { setServingGrams(selected.servingWeightG!); setServings("1"); }}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                  servingGrams === selected.servingWeightG
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
                                }`}
                              >
                                Serving
                              </button>
                            )}
                            {[100, 50, 25, 1].map((g) => (
                              <button
                                key={g}
                                onClick={() => { setServingGrams(g); setServings("1"); }}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                  servingGrams === g
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
                                }`}
                              >
                                {g}g
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Servings of {servingGrams}g ({totalGrams}g total)
                          </Label>
                          <Input
                            type="number"
                            step="1"
                            min="1"
                            value={servings}
                            onChange={(e) => setServings(e.target.value)}
                            className="mt-1 h-12 text-lg"
                          />
                        </div>
                      </>
                    );
                  })()}

                  <Button onClick={handleLog} disabled={saving} className="w-full h-12 font-semibold">
                    <Plus className="h-4 w-4 mr-2" />
                    {saving ? (editingLog ? "Updating..." : "Logging...") : (editingLog ? "Update Food" : "Log Food")}
                  </Button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
                  {/* Favourites */}
                  {showQuickAccess && favourites.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium">Favourites</span>
                      </div>
                      {favourites.map((food, i) => (
                        <button
                          key={`fav-${i}`}
                          onClick={() => {
                            const gMatch = (food.serving_size || "").match(/(\d+(?:\.\d+)?)\s*g\b/i);
                            const parsedG = gMatch ? parseFloat(gMatch[1]) : null;
                            selectFood({
                              name: food.food_name,
                              brand: food.brand || undefined,
                              barcode: food.barcode || undefined,
                              servingSize: food.serving_size || "100g",
                              servingWeightG: (parsedG && parsedG !== 100) ? parsedG : null,
                              calories: food.calories,
                              protein: food.protein_g,
                              carbs: food.carbs_g,
                              fat: food.fat_g,
                            });
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left"
                        >
                          <div className="h-10 w-10 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{food.food_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {food.serving_qty}× {food.serving_size || "100g"} · {Math.round(food.protein_g)}p · {Math.round(food.carbs_g)}c · {Math.round(food.fat_g)}f
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-primary">{Math.round(food.calories)}</div>
                            <div className="text-[10px] text-muted-foreground">kcal</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Recents */}
                  {showQuickAccess && recents.length > 0 && (
                    <div className="space-y-2">
                      {favourites.length > 0 && <div className="border-t border-border my-2" />}
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Recent Foods</span>
                      </div>
                      {recents.map((food, i) => (
                        <button
                          key={`recent-${i}`}
                          onClick={() => quickAdd(food)}
                          disabled={quickAdding === food.food_name}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left disabled:opacity-50"
                        >
                          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <RotateCcw className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{food.food_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {food.serving_qty}× {food.serving_size || "100g"} · {Math.round(food.protein_g)}p · {Math.round(food.carbs_g)}c · {Math.round(food.fat_g)}f
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-primary">{Math.round(food.calories)}</div>
                            <div className="text-[10px] text-muted-foreground">kcal</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showQuickAccess && (favourites.length > 0 || recents.length > 0) && (
                    <>
                      <div className="border-t border-border my-3" />
                      <p className="text-center text-xs text-muted-foreground">
                        Or search for new foods above
                      </p>
                    </>
                  )}

                  {/* Search results */}
                  {results.length === 0 && !searching && query && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      No results found. Try a different search.
                    </p>
                  )}
                  {results.map((item, i) => (
                    <button
                      key={`${item.barcode}-${i}`}
                      onClick={() => selectFood(item)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left"
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground text-xs">🍽</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {item.brand && <p className="text-xs text-muted-foreground truncate">{item.brand}</p>}
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                        <div className="text-sm font-bold text-primary">{item.calories}</div>
                        <div className="text-[10px] text-muted-foreground">kcal/100g</div>
                        {item.source && (
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
                            {item.source === "fatsecret" ? "FS" : "OFF"}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Finished button - always visible when not editing */}
          {!editingLog && (
            <div className="p-4 pt-2 border-t border-border shrink-0">
              <Button variant="outline" onClick={onClose} className="w-full h-11 font-semibold">
                Finished
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
