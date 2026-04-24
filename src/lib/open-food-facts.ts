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

/** Map of unicode fraction characters to their decimal values. */
const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3,
  "¼": 0.25, "¾": 0.75,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
  "⅙": 1 / 6, "⅚": 5 / 6,
  "⅐": 1 / 7, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
  "⅑": 1 / 9, "⅒": 0.1,
};

/** Parse a numeric token that may be:
 *  - a decimal: "1.5", "0.25"
 *  - an ascii fraction: "1/2", "3/4"
 *  - a mixed number: "1 1/2"
 *  - a unicode fraction: "½", "¾"
 *  - a mixed unicode: "1½"
 *  Returns NaN when nothing parseable is found. */
function parseNumericToken(raw: string): number {
  const s = raw.trim();
  if (!s) return NaN;

  // Pure unicode fraction or whole + unicode fraction (e.g. "1½")
  const uniMatch = s.match(/^(\d+)?\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒])$/);
  if (uniMatch) {
    const whole = uniMatch[1] ? parseInt(uniMatch[1], 10) : 0;
    return whole + (UNICODE_FRACTIONS[uniMatch[2]] ?? 0);
  }

  // Mixed ascii fraction: "1 1/2"
  const mixedMatch = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const denom = parseInt(mixedMatch[3], 10);
    if (denom > 0) return parseInt(mixedMatch[1], 10) + parseInt(mixedMatch[2], 10) / denom;
  }

  // Plain ascii fraction: "1/2"
  const fracMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const denom = parseInt(fracMatch[2], 10);
    if (denom > 0) return parseInt(fracMatch[1], 10) / denom;
  }

  // Plain decimal/integer
  const num = parseFloat(s);
  return isNaN(num) ? NaN : num;
}

/** Extract the gram value from OFF/FatSecret serving strings. Handles formats like:
 *  - "30g", "100 g", "1 serving (30g)"
 *  - "½ bar (25g)", "1/2 pack (40g)"  → uses the parenthesised gram value
 *  - "2 pieces (40g)", "3 cookies (45g)" → uses the parenthesised gram value
 *  - "½ bar" (no parens, no g)        → null (cannot resolve without unit weight)
 *  - "1.5 portions (60g)"             → uses the parenthesised gram value
 *  Returns null if no gram value can be determined. */
function parseServingGrams(s: string): number | null {
  if (!s) return null;

  // 1. Prefer a value explicitly inside parentheses: "(40g)", "( 25 g )"
  //    This wins because the parenthesised value is the authoritative gram weight
  //    even when the leading quantity is fractional or a non-mass unit ("2 pieces").
  const paren = s.match(/\(\s*([\d.]+)\s*g\s*\)/i);
  if (paren) {
    const v = parseFloat(paren[1]);
    if (!isNaN(v) && v > 0) return v;
  }

  // 2. Otherwise try to read "<number> g" anywhere in the string, where the number
  //    may be a unicode fraction, ascii fraction, mixed number, or decimal.
  //    Examples that match: "½ g" (rare), "1 1/2 g", "30g", "1.5 g".
  const numMatch = s.match(/((?:\d+\s+)?\d+\s*\/\s*\d+|\d+(?:\.\d+)?|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒]|\d+[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒])\s*g\b/i);
  if (numMatch) {
    const v = parseNumericToken(numMatch[1]);
    if (!isNaN(v) && v > 0) return v;
  }

  return null;
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

/** Strip punctuation/apostrophes for fuzzy matching (e.g. "McDonald's" → "mcdonalds"). */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/** Score a food item against a query — higher = more relevant. */
function scoreFoodItem(item: FoodItem, query: string): number {
  const q = query.toLowerCase().trim();
  const qNorm = norm(query);
  const qWords = qNorm.split(/\s+/).filter(Boolean);
  const name = (item.name || "").toLowerCase();
  const brand = (item.brand || "").toLowerCase();
  const nameNorm = norm(item.name || "");
  const brandNorm = norm(item.brand || "");
  const nameAndBrand = `${nameNorm} ${brandNorm}`;

  let score = 0;

  // Exact brand match (e.g. searching "fridge raiders" → brand IS "fridge raiders")
  if (brand && (brandNorm === qNorm || brandNorm.includes(qNorm) || brand === q || brand.includes(q))) score += 100;

  // Exact name match
  if (nameNorm === qNorm) score += 80;
  else if (nameNorm.includes(qNorm)) score += 40;
  else if (name === q) score += 80;
  else if (name.includes(q)) score += 40;

  // All query words present in name
  if (qWords.every((w) => nameNorm.includes(w))) score += 50;
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

/** Fetch the per-product serving size + extended nutrition from Open Food Facts.
 *  Used after a search hit is selected, because search.openfoodfacts.org doesn't
 *  index serving_size — only the full product API has it. Returns the fields
 *  the client needs to default the serving picker to "1 serving".
 *
 *  Result includes:
 *  - servingWeightG: grams in one serving (null when unknown or = 100g)
 *  - servingSize: human label (e.g. "1 pack (22.5g)")
 *  - extended nutrition (sugar, fibre, sat fat, salt) per-100g if missing
 */
export async function fetchOFFProductDetails(barcode: string): Promise<{
  servingSize?: string;
  servingWeightG?: number | null;
  sugar?: number | null;
  fibre?: number | null;
  saturatedFat?: number | null;
  salt?: number | null;
} | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/food-search?barcode=${encodeURIComponent(barcode)}`,
      { headers: edgeFunctionHeaders }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product as OFFProduct & { serving_quantity?: number | string };
    const n = p.nutriments;

    // Prefer numeric serving_quantity (always grams); fall back to parsing serving_size text.
    const sqRaw = (p as { serving_quantity?: number | string }).serving_quantity;
    const sq = typeof sqRaw === "number" ? sqRaw : sqRaw ? parseFloat(String(sqRaw)) : NaN;
    const servingWeightG = !isNaN(sq) && sq > 0 ? sq : parseServingGrams(p.serving_size || "");

    return {
      servingSize: p.serving_size || undefined,
      servingWeightG: (servingWeightG && servingWeightG !== 100) ? servingWeightG : null,
      sugar: nullIfZero(n?.sugars_100g != null ? r1(n.sugars_100g) : undefined),
      fibre: nullIfZero(n?.fiber_100g != null ? r1(n.fiber_100g) : undefined),
      saturatedFat: nullIfZero(n?.["saturated-fat_100g"] != null ? r1(n["saturated-fat_100g"]!) : undefined),
      salt: nullIfZero(n?.salt_100g != null ? r1(n.salt_100g) : undefined),
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
