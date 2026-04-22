// Food search client – parallel multi-source search (FatSecret + Open Food Facts) with smart ranking

export interface FoodItem {
  barcode?: string;
  /** FatSecret food_id — used to fetch full nutrition details after a search result is selected */
  foodId?: string;
  name: string;
  brand?: string;
  servingSize?: string;
  /** Grams per one serving (used to default the serving-size picker). Always null when serving = 100g. Macros are always stored per-100g. */
  servingWeightG?: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // Extended nutrition — per 100g, null when not available from source
  sugar?: number | null;
  fibre?: number | null;
  saturatedFat?: number | null;
  salt?: number | null;
  imageUrl?: string;
  /** Which database this entry came from — surfaced as a small badge in the UI */
  source?: "fatsecret" | "off";
}

export class ServiceUnavailableError extends Error {
  constructor() { super("Food database is temporarily unavailable. Please try again shortly."); }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const edgeFunctionHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

// ---------- FatSecret helpers ----------

/** Extract the numeric gram value from strings like "30g", "1 serving (30g)", "100 g". Returns null if undetectable. */
function parseServingGrams(s: string): number | null {
  const m = s.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  return m ? parseFloat(m[1]) : null;
}

function r1(n: number) { return Math.round(n * 10) / 10; }

function parseFatSecretDescription(desc: string): { calories: number; fat: number; carbs: number; protein: number; servingSize: string; servingWeightG: number | null } {
  // Format: "Per 100g - Calories: 110kcal | Fat: 1.24g | Carbs: 0.00g | Protein: 23.09g"
  // Or:     "Per 1 serving (61g) - Calories: 170kcal | Fat: 3.00g | Carbs: 24.70g | Protein: 10.40g"
  const servingMatch = desc.match(/^Per\s+(.+?)\s*-/);
  const calMatch = desc.match(/Calories:\s*([\d.]+)/);
  const fatMatch = desc.match(/Fat:\s*([\d.]+)/);
  const carbMatch = desc.match(/Carbs:\s*([\d.]+)/);
  const protMatch = desc.match(/Prot(?:ein)?:\s*([\d.]+)/);

  const servingSize = servingMatch?.[1] || "1 serving";
  const servingWeightG = parseServingGrams(servingSize);
  const is100g = servingWeightG === 100;

  // Normalise to per-100g so the UI multiplier model is always consistent
  const factor = (!is100g && servingWeightG) ? (100 / servingWeightG) : 1;

  return {
    servingSize,
    servingWeightG: is100g ? null : servingWeightG,
    calories: Math.round(parseFloat(calMatch?.[1] || "0") * factor),
    fat: r1(parseFloat(fatMatch?.[1] || "0") * factor),
    carbs: r1(parseFloat(carbMatch?.[1] || "0") * factor),
    protein: r1(parseFloat(protMatch?.[1] || "0") * factor),
  };
}

interface FatSecretFood {
  food_id: string;
  food_name: string;
  brand_name?: string;
  food_description: string;
  food_type: string;
}

function parseFatSecretFood(f: FatSecretFood): FoodItem {
  const parsed = parseFatSecretDescription(f.food_description);
  return {
    foodId: String(f.food_id),
    name: f.food_name,
    brand: f.brand_name,
    servingSize: parsed.servingSize,
    servingWeightG: parsed.servingWeightG,
    calories: parsed.calories,
    protein: parsed.protein,
    carbs: parsed.carbs,
    fat: parsed.fat,
    // Extended fields not available in search description — fetched later via food_id
    sugar: null, fibre: null, saturatedFat: null, salt: null,
    source: "fatsecret",
  };
}

// ---------- Open Food Facts helpers ----------

interface OFFProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    sugars_100g?: number;
    fiber_100g?: number;
    "saturated-fat_100g"?: number;
    salt_100g?: number;
  };
  image_front_small_url?: string;
}

function nullIfZero(v: number | undefined): number | null {
  return (v != null && v > 0) ? v : null;
}

function parseOFFProduct(p: OFFProduct): FoodItem | null {
  if (!p.product_name) return null;
  const n = p.nutriments;
  const servingWeightG = parseServingGrams(p.serving_size || "");
  return {
    barcode: p.code,
    name: p.product_name,
    brand: p.brands,
    servingSize: p.serving_size || "100g",
    servingWeightG: (servingWeightG && servingWeightG !== 100) ? servingWeightG : null,
    calories: Math.round(n?.["energy-kcal_100g"] ?? 0),
    protein: r1(n?.proteins_100g ?? 0),
    carbs: r1(n?.carbohydrates_100g ?? 0),
    fat: r1(n?.fat_100g ?? 0),
    sugar: nullIfZero(n?.sugars_100g != null ? r1(n.sugars_100g) : undefined),
    fibre: nullIfZero(n?.fiber_100g != null ? r1(n.fiber_100g) : undefined),
    saturatedFat: nullIfZero(n?.["saturated-fat_100g"] != null ? r1(n["saturated-fat_100g"]!) : undefined),
    salt: nullIfZero(n?.salt_100g != null ? r1(n.salt_100g) : undefined),
    imageUrl: p.image_front_small_url,
    source: "off",
  };
}

// ---------- Ranking & dedupe ----------

/** Score a food item against a query — higher = more relevant. */
function scoreFoodItem(item: FoodItem, query: string): number {
  const q = query.toLowerCase().trim();
  const qWords = q.split(/\s+/).filter(Boolean);
  const name = (item.name || "").toLowerCase();
  const brand = (item.brand || "").toLowerCase();
  const nameAndBrand = `${name} ${brand}`;

  let score = 0;

  // Exact brand match (e.g. searching "fridge raiders" → brand IS "fridge raiders")
  if (brand && (brand === q || brand.includes(q))) score += 100;

  // Exact name match
  if (name === q) score += 80;
  else if (name.includes(q)) score += 40;

  // All query words present in name
  if (qWords.every((w) => name.includes(w))) score += 50;
  // All query words present somewhere (name or brand)
  else if (qWords.every((w) => nameAndBrand.includes(w))) score += 30;

  // Branded products beat generic
  if (brand) score += 10;

  // Has an image — real branded products usually do
  if (item.imageUrl) score += 5;

  // Penalise generic / category-only entries with no brand and no image
  if (!brand && !item.imageUrl) score -= 20;

  return score;
}

/** Deduplicate by (brand|name) lowercase, keeping the entry with the most data. */
function dedupeFoods(items: FoodItem[]): FoodItem[] {
  const richness = (f: FoodItem) =>
    (f.imageUrl ? 2 : 0) +
    (f.sugar != null || f.fibre != null || f.saturatedFat != null || f.salt != null ? 2 : 0) +
    (f.brand ? 1 : 0);

  const map = new Map<string, FoodItem>();
  for (const item of items) {
    const key = `${(item.brand || "").toLowerCase().trim()}|${(item.name || "").toLowerCase().trim()}`;
    const existing = map.get(key);
    if (!existing || richness(item) > richness(existing)) map.set(key, item);
  }
  return Array.from(map.values());
}

// ---------- Public API ----------

const MIN_SCORE = 20;

export async function searchFoods(query: string, page = 1): Promise<FoodItem[]> {
  if (!query.trim()) return [];

  const fatSecretFetch = fetch(
    `${SUPABASE_URL}/functions/v1/fatsecret-search?q=${encodeURIComponent(query)}&page=${Math.max(0, page - 1)}&region=GB&language=en`,
    { headers: edgeFunctionHeaders }
  )
    .then((res) => res.ok ? res.json() : null)
    .then((data): FoodItem[] => {
      if (!data) return [];
      // v3 response shape: { foods_search: { results: { food: [...] } } }
      // v2 response shape: { foods: { food: [...] } }
      const v3List = data?.foods_search?.results?.food;
      const v2List = data?.foods?.food;
      const list = Array.isArray(v3List) ? v3List : Array.isArray(v2List) ? v2List : [];
      return list.map(parseFatSecretFood).filter((f) => f.calories > 0);
    })
    .catch((e) => { console.warn("FatSecret search failed:", e); return []; });

  const offFetch = fetch(
    `${SUPABASE_URL}/functions/v1/food-search?q=${encodeURIComponent(query)}&page=${page}`,
    { headers: edgeFunctionHeaders }
  )
    .then((res) => res.ok ? res.json() : null)
    .then((data): FoodItem[] => {
      if (!data) return [];
      if (data.fallback) throw new ServiceUnavailableError();
      const products = (data.products as OFFProduct[]) || [];
      return products
        .map(parseOFFProduct)
        .filter((p): p is FoodItem => p !== null && p.calories > 0);
    })
    .catch((e) => {
      if (e instanceof ServiceUnavailableError) throw e;
      console.warn("Open Food Facts search failed:", e);
      return [] as FoodItem[];
    });

  const [fsResult, offResult] = await Promise.allSettled([fatSecretFetch, offFetch]);

  // Surface OFF service-unavailable errors only when both sources are empty
  if (offResult.status === "rejected" && offResult.reason instanceof ServiceUnavailableError) {
    if (fsResult.status === "fulfilled" && fsResult.value.length === 0) {
      throw offResult.reason;
    }
  }

  const fsItems = fsResult.status === "fulfilled" ? fsResult.value : [];
  const offItems = offResult.status === "fulfilled" ? offResult.value : [];

  const merged = dedupeFoods([...fsItems, ...offItems]);

  // Score, filter, sort
  const ranked = merged
    .map((item) => ({ item, score: scoreFoodItem(item, query) }))
    .filter(({ score }) => score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);

  return ranked;
}

/** Fetch extended nutrition details (sugar, fibre, sat fat, salt) for a FatSecret food by its ID.
 *  Returns only the extended fields — merge into an existing FoodItem. */
export async function fetchExtendedNutrition(foodId: string): Promise<Pick<FoodItem, "sugar" | "fibre" | "saturatedFat" | "salt"> | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/fatsecret-search?food_id=${encodeURIComponent(foodId)}&region=GB&language=en`,
      { headers: edgeFunctionHeaders }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const food = data?.food;
    if (!food) return null;
    const servings = food.servings?.serving;
    const servingList: Record<string, string>[] = Array.isArray(servings) ? servings : servings ? [servings] : [];
    if (servingList.length === 0) return null;

    // Prefer the 100g reference serving — most complete and avoids factor math errors.
    // Fall back to the first serving that has at least sugar or fiber data.
    const pick100g = servingList.find(
      (sv) => sv.metric_serving_unit === "g" && parseFloat(sv.metric_serving_amount || "0") === 100
    );
    const pickWithData = servingList.find((sv) => sv.sugar || sv.fiber || sv.saturated_fat || sv.sodium);
    const s = pick100g ?? pickWithData ?? servingList[0];

    const servingWeightG =
      s.metric_serving_unit === "g"
        ? parseFloat(s.metric_serving_amount || "0") || null
        : parseServingGrams(s.serving_description || "");
    const factor = (servingWeightG && servingWeightG !== 100) ? (100 / servingWeightG) : 1;
    const sodiumMg = parseFloat(s.sodium || "0");

    return {
      sugar: s.sugar ? r1(parseFloat(s.sugar) * factor) : null,
      fibre: s.fiber ? r1(parseFloat(s.fiber) * factor) : null,
      saturatedFat: s.saturated_fat ? r1(parseFloat(s.saturated_fat) * factor) : null,
      salt: sodiumMg ? r1((sodiumMg * 2.5 / 1000) * factor) : null,
    };
  } catch {
    return null;
  }
}

export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  if (!barcode.trim()) return null;

  // Try FatSecret barcode lookup first
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/fatsecret-search?barcode=${encodeURIComponent(barcode)}&region=GB&language=en`,
      { headers: edgeFunctionHeaders }
    );
    if (res.ok) {
      const data = await res.json();
      const food = data?.food;
      if (food) {
        const servings = food.servings?.serving;
        const s = Array.isArray(servings) ? servings[0] : servings;
        if (s) {
          const servingWeightG =
            s.metric_serving_unit === "g"
              ? parseFloat(s.metric_serving_amount || "0") || null
              : parseServingGrams(s.serving_description || "");

          // FatSecret barcode returns macros per serving — normalise to per-100g
          const factor = (servingWeightG && servingWeightG !== 100) ? (100 / servingWeightG) : 1;

          // sodium in mg → salt in g (×2.5/1000)
          const sodiumMg = parseFloat(s.sodium || "0");
          const saltPer100g = sodiumMg ? r1((sodiumMg * 2.5 / 1000) * factor) : null;

          return {
            barcode,
            name: food.food_name,
            brand: food.brand_name,
            servingSize: s.serving_description || s.metric_serving_unit || "1 serving",
            servingWeightG: (servingWeightG && servingWeightG !== 100) ? servingWeightG : null,
            calories: Math.round(parseFloat(s.calories || "0") * factor),
            protein: r1(parseFloat(s.protein || "0") * factor),
            carbs: r1(parseFloat(s.carbohydrate || "0") * factor),
            fat: r1(parseFloat(s.fat || "0") * factor),
            sugar: s.sugar ? r1(parseFloat(s.sugar) * factor) : null,
            fibre: s.fiber ? r1(parseFloat(s.fiber) * factor) : null,
            saturatedFat: s.saturated_fat ? r1(parseFloat(s.saturated_fat) * factor) : null,
            salt: saltPer100g,
            source: "fatsecret",
          };
        }
      }
    }
  } catch (e) {
    console.warn("FatSecret barcode lookup failed, falling back:", e);
  }

  // Fallback to Open Food Facts
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/food-search?barcode=${encodeURIComponent(barcode)}`,
      { headers: edgeFunctionHeaders }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    return parseOFFProduct(data.product as OFFProduct);
  } catch {
    return null;
  }
}
