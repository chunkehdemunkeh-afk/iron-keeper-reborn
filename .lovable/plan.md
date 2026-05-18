## Problems

1. **Target RIR is split-wide, not per-exercise.** Every set in a session shows the same "Target RIR" (e.g. "1-2") because it comes from `getSplitById(...).targetRir` in `WorkoutSession.tsx:97-99`. A 4×6-8 compound and a 3×12-15 isolation on the same day get the same RIR target.
2. **RIR selector gives no feedback.** After tapping a number in the RIR row (`WorkoutSession.tsx:1704-1735`), the picker collapses (`showRirPicker: false`) and the chosen value is stored on `set.rir` but is never rendered. The user sees nothing change, so it feels broken.
3. **"Lower the weight" warning ignores the actual rep range.** `WorkoutSession.tsx:741-767` hardcodes `downThreshold = 8` (or 12 for 12-15 exercises). On a 6-8 lift, getting 7 reps fires the warning incorrectly — 7 is inside the range. Same problem on the high side for ranges like 8-10 or 5-7.

## Fix

### 1. Per-exercise target RIR (`WorkoutSession.tsx`)

Replace the single `sessionTargetRir` with a helper `getTargetRirForReps(repsRange: string): string` that maps the exercise's prescribed rep range to a sensible RIR target:

```
1-5    → "0-1"   (strength)
6-10   → "1-2"   (compound hypertrophy)
11-15  → "1-3"   (isolation / pump)
16+    → "2-3"   (endurance)
```

When seeding `setLogs` (lines ~491 and ~560 where `targetRir: sessionTargetRir` is passed), compute the target from the exercise's `reps` string instead. The split-level `targetRir` becomes a fallback only if the exercise has no parseable range. Reuse `parseRepRange` from `src/lib/data/progression-queries.ts`.

### 2. Visual feedback on RIR selection (`WorkoutSession.tsx` ~1704)

After a set is completed AND `set.rir` is set, render a compact chip on the set row (e.g. next to the check mark or under the row) showing `RIR {n}` in primary color. Keep the picker collapsed by default once chosen, but show the saved value. Tapping the chip re-opens the picker so it can be edited.

Also: when the user taps a number, briefly flash the chosen pill (scale + ring) before the picker collapses, so the tap registers visibly. Keep haptic `hapticMedium()` on selection.

### 3. Rep-range-aware suggestion thresholds (`WorkoutSession.tsx:741-767`)

Parse the exercise's actual `reps` string into `[low, high]` using `parseRepRange`. Replace the hardcoded 8/12 logic with:

```
if reps > high  → "hit X reps! Consider adding weight"
if reps < low   → "only X reps. Consider lowering weight"
if low ≤ reps ≤ high → no toast
```

Fall back to the current 8/12 heuristic only if the rep string has no digits. This fixes the 7-on-a-6-8-range false positive and also makes 5-on-a-5-7-range pass cleanly.

## Files touched
- `src/pages/WorkoutSession.tsx` — target-RIR seeding, suggestion thresholds, RIR picker UI feedback.

No DB schema or migration changes. `targetRir` is already stored per-set in `workout_sets.target_rir`, so the per-exercise value will start persisting automatically.
