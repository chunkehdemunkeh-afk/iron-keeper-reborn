## Goal

Let Bayesian Curl show the same `2 Arm / 1 Arm` pill as other eligible exercises, defaulting to **1 Arm** (its natural form) but allowing a 2-arm variant (both cables simultaneously) for users who want it.

## Changes

### 1. `src/lib/single-arm-variants.ts`
- Remove `"bayesian"` from `EXCLUDE_PATTERNS` so the eligibility check passes.
- Verify it now resolves true: name contains "cable" (equipment) + "curl" (pattern), no remaining excludes.

### 2. `src/pages/WorkoutSession.tsx`
- Treat Bayesian Curl as **default single-arm**: on session init / when its slot is first encountered, seed its ID into `singleArmExercises` so the pill starts on "1 Arm" and `-sa` suffix applies immediately.
- Implementation: a small `DEFAULT_SINGLE_ARM_IDS` set (just `lib-61` for now) merged into `singleArmExercises` initial state, and also applied when restoring from autosave if the key is absent (so existing in-progress sessions don't suddenly switch to 2-arm).
- Weight semantics, PR bucketing, and warmups already work correctly via the existing `-sa` suffix path — no further changes needed.

### 3. No routine changes
`workout-data.ts` keeps `lib-61` as Bayesian Curl. Display name still reads "Bayesian Curl"; toggling to 2 Arm drops the `-sa` suffix and the weight column header flips from "per arm" to "per dumbbell"/"per side" accordingly.

## Files touched

- `src/lib/single-arm-variants.ts` (one-line exclude removal)
- `src/pages/WorkoutSession.tsx` (default-on set + autosave restore guard)

## Out of scope

- No new library entry, no DB change, no history rewrite. Existing Bayesian PRs (saved under base `lib-61`) will be bucketed as the new 2-Arm variant; the 1-Arm variant starts a fresh `lib-61-sa` PR history. If you'd rather have existing Bayesian history count as 1-Arm instead, say so and I'll invert which ID is the suffixed one.
