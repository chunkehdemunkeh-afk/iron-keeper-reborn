## Goal

Replace the "tap Swap to pick…" text on the **Core Finisher** (`la6`) with an inline dropdown shown directly on the exercise card. When a variant is picked (e.g. Cable Crunches), the existing downstream toggles (cable attachment selector, weight tracking, rep label) automatically appear because they key off the displayed exercise name.

## Where

`src/pages/WorkoutSession.tsx` — inside the toggle row that already renders Bodyweight / Light-Heavy / Cable Attachment / Single-arm pills (around line 1599, before the `isCableAttachmentExercise` block at 1716).

## What to add

A new conditional block, only when `ex.id === "la6"`, rendering a `<select>` styled like the existing cable-attachment dropdown. Options come from `EXERCISE_SUBSTITUTIONS.la6`:

- Cable Crunches (`sub-la6-cable`)
- Decline Bench Crunches (`sub-la6-decline`)
- Ab Crunch Machine (`sub-la6-machine`)
- Hanging Knee Raises (`sub-la6a`)
- Ab Wheel Rollouts (`sub-la6b`)

Selecting an option reuses the **exact same logic** the Swap sheet runs at lines 2310–2330: writes to `exerciseOverrides[ex.id]` with `{ name, notes, targetMuscle, trackWeight, repLabel, weightLabel, substituteId }`, clears stale per-set weights for the variant change, and tracks `lastSubstitutions`.

Selected value is derived from `exerciseOverrides["la6"]?.substituteId` so it persists and re-renders correctly after picking.

## Why this gives you the cascading toggles

- `displayName` is `override?.name || ex.name`, so after picking "Cable Crunches" the name becomes "Cable Crunches".
- `isCableAttachmentExercise("Cable Crunches")` returns true (matches the `cable` keyword) → the **Attachment** dropdown automatically appears next to the new variant dropdown.
- `trackWeight` / `repLabel` from the substitution override drive the weight column and rep label (e.g. Hanging Knee Raises auto-hides weight inputs).

## Cleanup

Update `src/lib/workout-data.ts` `la6` `notes` to a short cue like "Pick a variant from the dropdown — 60s rest" instead of the "tap Swap…" instruction.

## Out of scope

- No changes to substitution data, swap sheet, or other exercises.
- No new toggles — we rely on the existing attachment selector to appear automatically for cable variants.

## Verification

1. Open a Lower body session containing Core Finisher → expand card → variant dropdown is visible.
2. Pick "Cable Crunches" → card title updates, attachment dropdown appears, weight/reps inputs visible.
3. Pick "Hanging Knee Raises" → weight input disappears, rep label = "Reps", no attachment dropdown.
4. Reload session mid-workout → selection persists (via existing `exerciseOverrides` persistence).
