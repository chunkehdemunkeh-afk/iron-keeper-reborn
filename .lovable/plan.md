## Goal

Replace hard-coded "Single Arm X" library entries with a runtime toggle. Any eligible exercise gets a `1 Arm / 2 Arm` pill in the workout session (next to the existing 2-Handed and Light/Heavy pills). Toggling appends a `-sa` suffix to the effective exercise ID so per-arm history, PRs, and last-session data track separately from the bilateral version. Weight input switches to per-arm semantics with a clear "per arm" label.

## 1. Eligibility list (`src/lib/single-arm-variants.ts` — new)

Curated set of exercise IDs and keyword matchers that have a real single-arm variation. Categories researched:

- **Dumbbell presses**: flat / incline / decline bench, shoulder press, OHP, Arnold press, floor press
- **Dumbbell rows**: bent-over row, chest-supported row, Meadows row
- **Dumbbell arms**: bicep curl, hammer curl, preacher curl, concentration curl, incline curl, tricep kickback, overhead extension, skullcrusher
- **Dumbbell delts**: lateral raise, front raise, rear delt fly, Y-raise, Cuban press
- **Cable**: pushdown (rope/straight/D-handle), lat pulldown, seated row, cable row, cable curl, cable lateral raise, cable rear delt fly, cable crossover, cable upright row, cable face pull, cable kickback, overhead cable extension, straight-arm pulldown
- **Machine**: chest press, shoulder press, row, lat pulldown, preacher curl, leg press, leg extension, leg curl, calf raise
- **Landmine**: landmine press, landmine row, landmine row to press
- **Plate-loaded**: Hammer Strength chest/row/shoulder press
- **Kettlebell**: KB press, KB row, KB swing (single-arm), KB clean

Exposed as `isSingleArmEligible(exerciseId, exerciseName)`. Excludes: barbell lifts, bilateral-only machines (pec deck, hip abductor/adductor), bodyweight compound lifts, exercises already inherently unilateral (Bayesian curl, Bulgarian split squat, pistol squat — these stay as-is, no toggle).

## 2. Session state (`src/pages/WorkoutSession.tsx`)

- Add `const [singleArmExercises, setSingleArmExercises] = useState<Set<string>>(new Set())`
- Persist in the autosave object alongside `heavyStackExercises`, `twoHandedExercises`, `cableAttachments`
- Restore on session resume
- Extend `getEffectiveExId(originalId)` to append `-sa` when the ID is in `singleArmExercises` (suffix order: base → `-heavy` → `-sa` → `-{attachment}` for deterministic keys)
- Apply the same suffix logic in the three other places that build `slotId` / `effId` manually (lines ~943, ~2091, ~2151)

## 3. Pill UI

Add a third pill in the same row as the existing 2-Handed and Light/Heavy pills, rendered only when `isSingleArmEligible(ex.id, displayName)` is true and no library override has changed it to an ineligible exercise. Visual style mirrors the Light/Heavy segmented pill:

```text
[ 2 Arm | 1 Arm ]
```

Same component placement in both the main exercise card and the superset block (the existing Light/Heavy pill is duplicated in two places at lines ~1506 and ~1838 — match both). Trigger `hapticMedium()` on toggle.

## 4. Weight semantics

- Update `isBilateralDumbbell(exerciseId, exerciseName)` in `src/lib/strength-standards.ts` to return `false` when the ID ends with `-sa` (single-arm mode disables the ×2 dumbbell multiplier for total load).
- In the column header (line 1591), when single-arm is enabled show `per arm` instead of `per dumbbell`. When the exercise is cable/machine single-arm, also show `per arm` to make it explicit.
- Warmup ramp (`warmupRamp`) already keys off the `isDb` flag derived from `getEffectiveExId` — once `isBilateralDumbbell` returns false for `-sa`, warmups auto-recompute correctly.
- 1RM / PR calculations use the per-arm weight directly (consistent with how other unilateral lifts already work).

## 5. Routine cleanup (`src/lib/workout-data.ts`)

Swap inherent single-arm entries to their two-handed base so the pill is the source of truth. Users can re-enable single-arm at session time.

| Current | Swap to | Notes |
|---|---|---|
| `pu6` Single Arm Overhead Cable Tricep Extensions | Overhead Cable Tricep Extension (rope, two-handed) | If not currently used anywhere, leave as a library option but remove from the active routines |
| `dl5` Single Arm Dumbbell Row | Dumbbell Row (two-handed bent-over) | Rep target: `10-12` (was `10-12 each`) |
| `bk5` Single Arm Dumbbell Row | Dumbbell Row (two-handed) | Same |
| `sh5` Single Arm Cross Body Reverse Fly | Dumbbell Reverse Fly (bent-over, two-handed) | Already removed in a prior swap — verify it's gone |
| `lib-61` Bayesian Curl | Keep as-is | Inherently single-arm; no two-handed analog; no pill shown |

Audit pass: grep `src/lib/workout-data.ts` for "Single Arm" / "Single-Arm" and convert any remaining instance per the same rule.

## 6. Name resolution + history

No DB schema change. The `-sa` suffix is handled the same way `-heavy` already is:

- `stripExerciseSuffixes(id)` in `src/lib/muscle-mapping.ts` — extend to strip a trailing `-sa` so muscle mapping still resolves
- Display name: append " (1 Arm)" suffix in the session UI header and in the persisted `exercise_name` column when saved, so History/Leaderboard cards read naturally
- PR history queries (`fetchExerciseLastDataLike`, `fetchExercisePRHistory`) already use `LIKE` matching on the base ID — single-arm PRs become their own bucket, parallel to `-heavy`

## 7. Out of scope

- No new library entries; no DB migration; no changes to onboarding or the workout builder pill (builder still accepts text search — users add base exercise, toggle at session)
- No automatic conversion of historical sessions (existing `Single Arm Dumbbell Row` rows in `workout_sets` continue to display under their saved name)

## Files touched

- `src/lib/single-arm-variants.ts` (new)
- `src/lib/strength-standards.ts` (one-line guard in `isBilateralDumbbell`)
- `src/lib/muscle-mapping.ts` (`stripExerciseSuffixes` strips `-sa`)
- `src/lib/workout-data.ts` (swap 2–3 entries)
- `src/pages/WorkoutSession.tsx` (state, pill UI ×2, autosave, label, slotId builders)

## Open question

The two `dl5` / `bk5` "Single Arm Dumbbell Row" entries are part of the 4-day plan we've been refining. Confirming: swap both to two-handed bent-over Dumbbell Row at the same set/rep prescription, and the user can re-toggle single-arm via the new pill if they want the same unilateral stimulus. OK to proceed on that basis?
