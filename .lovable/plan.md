

## Goal
Add a **Recovery** feature: a body diagram (front + back) that visualises which muscle groups are fatigued vs recovered, based on the user's logged sessions, the intensity (RIR) of their chosen training split, and how well they slept. A compact preview lives on the Home page; the full interactive view lives on a new tab in Progress.

## How recovery is calculated

Each completed set adds **fatigue points** to the muscle groups that exercise targets. Fatigue then decays over time toward zero (recovered).

**Fatigue per set** = `volume × intensityMultiplier(splitId) × sleepModifier`

- `volume` = `weight (kg) × reps`. Bodyweight/plyo/cardio sets contribute **0** (out of scope, as agreed).
- `intensityMultiplier` is derived from the split's prescribed RIR (lower RIR = more muscle damage):
  - PPL, Bro Split: **1.30** (RIR 0–1, train to failure)
  - PPLU, PPLUL: **1.20** (RIR 0–2)
  - Arnold: **1.15** (high volume)
  - Upper/Lower: **1.10** (RPE 7–9)
  - Full Body, 5/3/1: **1.00** (RPE 6–8 / submaximal)
  - GK Programme: **0.85** (lower-load, performance focused)
  - Custom / unknown: **1.00**
- `sleepModifier` is derived from the **previous night's** sleep entry:
  - 8h+ at quality 4–5 → **0.90** (recover faster, less fatigue accrual)
  - 7–8h at quality 3+ → **1.00** (baseline)
  - 6–7h or quality 2 → **1.10**
  - <6h or quality 1, or no entry for that night → **1.20**

**Recovery time per muscle group** (research-backed; small muscles recover faster):
- Calves, Forearms, Abs/Core: **24h**
- Biceps, Triceps, Side/Rear Delts: **48h**
- Chest, Back (lats, mid-back), Front Delts, Glutes: **72h**
- Quads, Hamstrings, Lower Back: **96h** (largest muscles, most damage)

A muscle's **recovery score (0–1)** is `clamp(elapsedHours / fullRecoveryHours, 0, 1)`, then scaled by fatigue load so a heavy session takes the full window and a light session clears faster.

**Status colour:**
- Score < 0.5 → **rose-500** (fatigued — heavy work yesterday)
- 0.5 ≤ score < 0.85 → **amber-400** (workable but not optimal)
- ≥ 0.85 → **emerald-400** (fully recovered)
- No recent work → muted neutral fill

## Exercise → muscle mapping

A new file `src/lib/muscle-mapping.ts` exports:
- `MUSCLE_REGIONS` — the 14 canonical regions used by the SVG: `chest, front_delts, side_delts, rear_delts, biceps, triceps, forearms, abs, obliques, quads, hamstrings, glutes, calves, lats, traps, mid_back, lower_back` (front diagram + back diagram between them cover all).
- `getMusclesWorked(exerciseId, exerciseName)` — returns `{ primary: string[], secondary: string[] }`. Secondary muscles get **0.4×** the fatigue of primary.
- A lookup table seeded from `WORKOUTS[].exercises[].targetMuscle` strings (e.g. `"Quads/Glutes"` → `["quads","glutes"]`) and from `EXERCISE_LIBRARY[].muscleGroup`. Compound lifts get sensible secondaries (Bench → primary chest+triceps, secondary front_delts; Squat → primary quads+glutes, secondary hamstrings+lower_back; Deadlift → primary hamstrings+glutes+lower_back, secondary lats+traps; etc.).
- A fallback heuristic: parse the exercise name for keywords ("press", "row", "squat", "curl"…) when no exact match exists.

## New components

**`src/components/recovery/BodyDiagram.tsx`** — custom SVG silhouette.
- Two SVG views: front and back, swappable via small toggle.
- Each muscle region is a `<path>` with an `id` matching `MUSCLE_REGIONS`. `fill` is animated with Framer Motion `motion.path` and `transition-colors duration-500`, matching the calorie/water bar pattern.
- Tap a region → small popover/sheet with: muscle name, recovery %, last worked date, last session volume, status label.
- SVG paths are hand-crafted simplified silhouettes (anterior + posterior), styled with the app's glass-card aesthetic. No external library.

**`src/components/recovery/RecoveryCard.tsx`** — Home preview.
- Glass card sized like `HomeWeightTracker`. Shows the front silhouette only, smaller, non-interactive.
- One-line summary underneath: "3 muscle groups recovered • 2 fatigued" with a subtle "View details" chevron linking to `/progress?tab=body`.

**`src/components/recovery/SleepCard.tsx`** — Home sleep input.
- Compact card matching `HomeWeightTracker`: shows last night's hours + 1–5 quality dots, tap to open a Sheet to log/edit.
- Sheet inputs: hours (0.5 increments via `Slider`, 4–10h), quality (1–5 button row), optional note.
- Stores via new `sleep_logs` table.

**`src/lib/recovery.ts`** — pure calculation module.
- `computeMuscleRecovery(sets, sleepLogs, splitId, now): Record<MuscleRegion, MuscleState>` where `MuscleState = { score, status, lastWorkedAt, lastVolume }`.
- Fully unit-testable; no React or Supabase imports.

## Data model

New Supabase table **`sleep_logs`** (migration in `supabase/migrations/`):

```text
id            uuid pk default gen_random_uuid()
user_id       uuid not null
date          date not null               -- the night that ended on this date
hours         numeric(3,1) not null       -- 4.0 – 12.0
quality       smallint not null           -- 1–5
source        text not null default 'manual'  -- future: 'healthkit','googlefit'
notes         text
created_at    timestamptz not null default now()
unique (user_id, date)
```
RLS: standard per-user policies (select/insert/update/delete `auth.uid() = user_id`) plus coach SELECT, mirroring `body_measurements`.

`src/lib/cloud-data.ts` gains `fetchSleepLogs(daysBack=14)`, `upsertSleepLog({date, hours, quality, notes})`, `deleteSleepLog(date)`.

## Recovery tab on Progress page

Edit `src/pages/Progress.tsx` to introduce a tab bar at the top (using existing `@/components/ui/tabs`):
- **Stats** (current content moves here unchanged)
- **Recovery** (new)
  - Front/back toggle + large interactive `BodyDiagram`.
  - Below: scrollable list of all 14 regions sorted by lowest recovery, each row showing colour dot, name, last worked, recovery %, "ready in Xh" if <100%.
  - Last 7 nights of sleep as a thin sparkline + average hours/quality.

## Home page placement

In `src/pages/Index.tsx`, inside the date-aware `motion.div` (after `HomeWeightTracker`, before `HomeCompleteDay`), add:
1. `<SleepCard date={dateStr} />` — log last night's sleep
2. `<RecoveryCard />` — only shown for `dateStr === today` (recovery is a "now" snapshot, not historical)

## Files

**New**
- `src/lib/muscle-mapping.ts`
- `src/lib/recovery.ts`
- `src/components/recovery/BodyDiagram.tsx`
- `src/components/recovery/RecoveryCard.tsx`
- `src/components/recovery/SleepCard.tsx`
- `supabase/migrations/<ts>_sleep_logs.sql`
- `src/test/recovery.test.ts` (unit tests for recovery math)

**Edited**
- `src/lib/cloud-data.ts` — sleep CRUD + a `fetchRecentSets(daysBack)` helper joining `workout_sets` with `workout_history`.
- `src/pages/Progress.tsx` — wrap existing content in tabs, add Recovery tab.
- `src/pages/Index.tsx` — mount SleepCard + RecoveryCard.
- `src/integrations/supabase/types.ts` — auto-regenerated after migration.

## Out of scope (future)
- Apple Health / Google Fit sync (schema is ready: `source` column).
- Bodyweight/plyo fatigue contribution.
- Per-exercise volume-landmark warnings (MEV/MRV).
- Push notifications when a muscle group becomes ready.

