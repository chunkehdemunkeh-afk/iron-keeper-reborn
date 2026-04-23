

## Cardio + Strength burn (with warm-ups, weekly rollup, backfill)

Extending the previous plan with three additions: **warm-up set tagging**, **weekly burn rollup**, and a **one-shot historical backfill** so existing data shows real numbers immediately.

### 1. Warm-up set tagging (UI for the existing `set_type` column)

The `workout_sets.set_type` column already exists (`working` | `warmup` | `1rm_test`). Adding the missing UI:

- In `WorkoutSession.tsx`, each set row gets a small **W** toggle pill next to the rep/weight inputs. Tap to flip a set between `working` ↔ `warmup`. Warm-up sets render with a muted/dashed style and a "Warm-up" microlabel.
- Warm-up sets are **excluded from**:
  - Strength burn estimate (mechanical work term skipped)
  - PR detection / tier-crossing
  - Volume tag in the exercise card header
- They still **count toward** session duration and the metabolic-cost term (low MET 3.5), since you're still moving.
- Default rest timer for warm-ups is 60s instead of 2–3 min.
- Persisted via the same `setType` field added in the 1RM Test feature — no new schema work.

### 2. Weekly burn rollup

- **`Progress` page → Stats tab**: new "Weekly Energy" card above the volume chart, showing:
  - Total kcal burned this week (workouts + cardio combined)
  - Breakdown bar: Strength | Cardio segments
  - 4-week mini sparkline for week-over-week trend
- **Profile page**: weekly burn appears as a stat alongside existing weekly volume / session count.
- **`HomeDailySummary.tsx`**: the "Burned today" line gets a tappable "This week: X kcal →" link that jumps to the Progress card.
- Data source: `fetchWeeklyBurn(weekStart)` in `cloud-data.ts` — sums `workout_history.calories_burned` + `activity_logs.calories_burned` for the week, grouped by day for the sparkline.

### 3. Historical backfill (one-shot)

A migration runs once to populate `calories_burned` on every existing `workout_history` and `activity_logs` row using the same formulas the live app will use.

**Approach**: pure SQL `UPDATE` statements driven by the Compendium MET tables and the work formula, joined against `body_measurements` (latest weight before each session) → `nutrition_goals.tdee_weight_kg` → 75 kg fallback. Implemented as PL/pgSQL functions in the migration so the math stays readable and we don't have to push 717 hardcoded MET values into SQL.

**Why SQL not a one-off script**: keeps the operation atomic, runs against production data without needing `SUPABASE_ACCESS_TOKEN`, and re-runs idempotently (skips rows where `calories_burned IS NOT NULL`).

**Backfill rules:**
- Cardio rows missing `distance_km` (e.g. your existing 24m / 3.36 km run was logged before the field existed) get burn estimated from duration alone using a fixed mid-band MET per activity type — flagged with a small "estimated" badge in the UI when distance was inferred. Once you edit the entry to add distance, save recalculates precisely.
- Strength sessions: sum `weight × reps × 0.0035` across all sets in `workout_sets` for that session, plus a baseline MET 5.5 × bodyweight × duration_hr. Warm-up exclusion isn't applied to historical sets (they're all `working` by default), so historical burn will be slightly inflated vs. future sessions — acceptable trade-off, noted in the migration comment.
- Bodyweight lookup: `SELECT body_weight FROM body_measurements WHERE user_id = X AND date <= session.date ORDER BY date DESC LIMIT 1`, fallback to `nutrition_goals.tdee_weight_kg`, fallback to 75.

### 4. Updated DB migration

```sql
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC,
  ADD COLUMN IF NOT EXISTS calories_burned INTEGER,
  ADD COLUMN IF NOT EXISTS incline_pct INTEGER;

ALTER TABLE public.workout_history
  ADD COLUMN IF NOT EXISTS calories_burned INTEGER;

ALTER TABLE public.nutrition_goals
  ADD COLUMN IF NOT EXISTS adjust_for_activity BOOLEAN NOT NULL DEFAULT false;

-- Backfill helpers (PL/pgSQL functions for cardio MET + strength burn)
-- + UPDATE statements that populate calories_burned on existing rows
-- (see migration body — full SQL written at implementation time)
```

All additive, nullable, RLS unchanged.

### 5. Code changes (delta from previous plan)

- **`src/lib/calorie-burn.ts`** — `estimateStrengthBurn` skips sets where `setType === "warmup"` for the work term but includes them in metabolic cost at MET 3.5.
- **`src/lib/cloud-data.ts`** — add `fetchWeeklyBurn(userId, weekStart)` returning `{ totalKcal, strengthKcal, cardioKcal, dailyBreakdown[] }`.
- **`src/pages/WorkoutSession.tsx`** — warm-up toggle UI on each set row; visual styling; rest timer override; pass `setType` through to `estimateStrengthBurn`.
- **`src/pages/Progress.tsx`** — new "Weekly Energy" card on the Stats tab.
- **`src/pages/Profile.tsx`** — weekly burn stat in the existing stats grid.
- **`src/components/HomeDailySummary.tsx`** — "This week →" link.
- **Tests** — `src/test/calorie-burn.test.ts` adds warm-up exclusion case; new `src/test/weekly-burn.test.ts` for the rollup helper.

### 6. Out of scope (still backlog)

- Cycling/running incline.
- Wearable HR-based burn.
- Per-session burn editing (to override estimate manually).
- Monthly rollups beyond the 4-week sparkline.

