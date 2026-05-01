## Problem

Warm-up sets are bleeding into the working-set data:

1. **History view** — `WorkoutCard` groups by exercise name and renders every set in one list. Warm-ups appear as "Set 1" and "Set 2" alongside working sets, so the first two rows of every exercise look like real working sets at a much lower weight.
2. **Active session "Last:" line and placeholders** — `fetchExerciseLastData` / `fetchLastSessionData` return all sets in chronological order without filtering by `set_type`. So:
   - The `Last: 40kg×5, 60kg×5, 100kg×8…` line includes warm-ups.
   - The reps/weight input placeholders are indexed positionally (`lastSessionData[id][si]`), meaning working set #1 shows the warm-up's `40` as its placeholder.
3. **Personal record `bestReps`** — counted across all sets including warm-ups (minor, but inconsistent).
4. **% prescription is impractical** — exact percentages of an unknown working weight, rounded to 2.5 kg, don't translate well in the gym (e.g. "40% of 92.5 = 37.5"). A simpler, weight-anchored ramp is more useful.

## Fix

### 1. Filter warm-ups out of "last session" data (DB layer)

In `src/lib/cloud-data.ts`:
- `fetchLastSessionData` and `fetchExerciseLastData` — add `.eq("set_type", "working")` (or `.in("set_type", ["working", "1rm_test"])`) so the placeholders, the "Last:" preview line, and the swap-history fetch only ever see real working sets.
- `fetchPersonalRecords` — skip rows with `set_type === "warmup"` entirely when building `bestReps` / `weight` (true 1RM logic stays as-is).

### 2. Display warm-ups as a separate section in History

In `src/components/history/WorkoutCard.tsx`:
- When grouping sets per exercise, split each group into `warmupSets` and `workingSets` based on `setType` (already returned by `fetchWorkoutHistory`).
- Render warm-ups in a small, muted "Warm-up" sub-section above the working sets table — orange flame icon, smaller text, no "Set 1/2" numbering (use a flame glyph instead). Working sets keep their own numbering starting at 1, unaffected.
- If no warm-ups for that exercise, the section is omitted entirely (no visual change for older sessions).
- Volume calc already filters by `trackWeight` — also exclude warm-ups from the per-card volume tonnage.

### 3. Replace the % scheme with a fixed plate-ramp

In `src/pages/WorkoutSession.tsx`:
- Remove `warmupScheme(idx, total)` (the 40/60/80% logic).
- Replace with a **descending-rep, ascending-weight ramp** anchored to the working weight `W` (taken from the first working set, or last session's first working weight). The ramp is in absolute kg, snapped to 2.5 kg plates:

  | Warm-up # | Weight | Reps |
  |-----------|--------|------|
  | 1         | Empty bar (or 40% of W, whichever is heavier) | 8 |
  | 2         | Halfway between bar and W                     | 5 |
  | 3 (opt.)  | ~10 kg below W                                | 3 |

  Concretely, given `W`:
  - `wu1 = max(20, roundToPlate(W * 0.4))`, reps 8
  - `wu2 = roundToPlate((W + wu1) / 2)`, reps 5
  - `wu3 = roundToPlate(max(W - 10, W * 0.9))`, reps 3
  - For dumbbell exercises (per-dumbbell logging), use `max(2.5, …)` instead of bar weight; detected via existing `isBilateralDumbbell`/dumbbell heuristics.

- The "Add Warm-up" button still seeds 2 warm-ups on first press, adds a 3rd on second press, capped at 3.
- Set rows show **`{weight}kg × {reps}`** instead of `{pct}%` — much clearer at a glance. If no working weight is known yet (first ever session), show `— × {reps}` and let the user fill it in manually.
- Auto-fill on completion uses the same ramp values.
- Keep the orange flame styling and 60s rest timer.

### 4. Keep all existing exclusions

No change needed — these already work and remain correct after the above:
- Warm-ups already excluded from PR detection, tier-crossing, rep-range toasts, calorie burn work term.
- `set_type` already persisted to `workout_sets` so historical data loads with the right type.

## Files touched

- `src/lib/cloud-data.ts` — filter warm-ups in `fetchLastSessionData`, `fetchExerciseLastData`, `fetchPersonalRecords`.
- `src/components/history/WorkoutCard.tsx` — split warm-ups into a separate sub-section per exercise; exclude from volume.
- `src/pages/WorkoutSession.tsx` — replace `warmupScheme` with `warmupRamp(W, idx, total, isDumbbell)` returning `{weight, reps}`; update the row UI (lines ~1428–1438) to display weight+reps instead of percentage; update auto-fill (lines ~621–637) to use the new ramp.

## Out of scope

- No DB migration — `set_type` column already exists and is populated.
- No change to the 1RM-test flow.
- No change to the "Last:" preview line format itself, only its data source.
