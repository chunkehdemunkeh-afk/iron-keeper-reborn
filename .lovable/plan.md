

## Make food search actually find what you searched for

### What's wrong today
FatSecret is queried first; Open Food Facts (OFF) is only used if FatSecret returns **zero** results. For branded UK items like "Fridge Raiders", FatSecret returns 20 unrelated generic items (cola, yogurt, chocolate) — so the OFF fallback never fires, even though OFF actually has the product. Yazio looks better because it leans heavily on OFF, which is the strongest open database for UK supermarket items.

The MyFitnessPal/Yazio import idea is a dead end: MFP shut its public API in 2020, and Yazio has no public API at all. The realistic path is to **fix our own search** so it surfaces the same branded items those apps do.

### The fix: parallel multi-source search with smart ranking

**1. Query FatSecret and Open Food Facts in parallel** (not sequentially)
Both edge functions run at the same time; results are merged. Adds ~0ms latency vs. today (the slower of the two wins instead of the sum).

**2. Rank merged results by relevance, not by source order**
A scoring function ranks every result against the query:
- **Exact brand match** (e.g. query "fridge raiders" → brand contains "fridge raiders"): +100
- **Exact name match**: +80
- **All query words appear in name**: +50
- **All query words appear in name OR brand**: +30
- **Has a brand name** (branded products beat generic): +10
- **Has an image** (real products usually have images): +5
- **Generic/category-only results** (no brand, no image): −20

Results sort by score descending; anything below a minimum score is dropped. This pushes "Fridge Raiders Southern Style Chicken Bites" to the top and buries "Classic Cola".

**3. Upgrade the Open Food Facts query**
The current OFF query uses the legacy `cgi/search.pl` endpoint. Switch to the v2 search API with sort by `popularity_key`, country filter `united-kingdom`, and request `brands_tags` for better brand matching. This alone makes branded UK items appear far higher.

**4. Upgrade the FatSecret query**
Switch from `foods.search` to `foods.search.v3` (FatSecret's improved brand-aware search) and pass `include_food_attributes=premier_brand` so branded products are favoured over FatSecret's "Generic" entries.

**5. Deduplicate across sources**
Same product may appear from both FatSecret and OFF. Dedupe by `(brand + name)` lowercase, preferring the result with more data (image + extended nutrition wins).

**6. Show the source as a subtle badge**
Tiny "OFF" or "FS" pill on each result so power users can tell where data came from — useful for trust and reporting bad entries later.

### What you'll notice
- "Fridge raiders" returns Mattessons / Fridge Raiders products at the top, not Coca-Cola.
- Branded UK supermarket items (Tesco, Sainsbury's, M&S, Yoplait, Walkers, etc.) appear consistently.
- Generic "Per 100g" entries still appear, but below the branded matches that match your query.
- Latency stays roughly the same (parallel fetches).

### Why not MyFitnessPal / Yazio import?
- **MyFitnessPal**: closed its public API in 2020. The unofficial scrapers violate ToS and break frequently. No legitimate path.
- **Yazio**: no public API, no export-to-third-party feature.
- **Cronometer**: has an API but only for paid users, and licensing forbids redistribution.
The only realistic improvement is to make our own search match their quality — which the plan above does using the same underlying database (OFF) Yazio relies on.

### Technical changes

**`supabase/functions/food-search/index.ts`** — Open Food Facts edge function
- Switch search from `cgi/search.pl` to `https://world.openfoodfacts.org/api/v2/search` with `categories_tags_en`, `countries_tags=united-kingdom`, `sort_by=popularity_key`, page_size=25.
- Add `brands` to the requested fields.
- Keep the barcode endpoint unchanged.

**`supabase/functions/fatsecret-search/index.ts`** — FatSecret edge function
- Change `method: "foods.search"` to `method: "foods.search.v3"`.
- Add `include_food_attributes: "true"` and `flag_default_serving: "true"`.
- Parse the new v3 response shape (`foods_search.results.food[]` instead of `foods.food[]`); fall back to old shape if v3 is unavailable.

**`src/lib/open-food-facts.ts`** — client
- Refactor `searchFoods()` to fire FatSecret + OFF in parallel via `Promise.allSettled`.
- Add `scoreFoodItem(item, query)` ranking function.
- Add `dedupeFoods(items)` that merges by `(brand|name)` and keeps the richest entry.
- Tag each `FoodItem` with `source: "fatsecret" | "off"` for the badge.
- Sort merged+deduped results by score, drop anything below minimum score.

**`src/lib/open-food-facts.ts`** — types
- Add `source?: "fatsecret" | "off"` to the `FoodItem` interface.

**`src/components/food/FoodSearch.tsx`** — UI
- Render a small "OFF"/"FS" pill next to the kcal value on each result row.
- No other UI changes — the same list, just better-ranked items.

### What stays the same
- Barcode scanner (already excellent — unchanged).
- Manual entry, recents, favourites, meal grouping, water tracking — all untouched.
- Logging flow, edit flow, extended nutrition fetch — unchanged.
- No new env vars, no new database tables.

