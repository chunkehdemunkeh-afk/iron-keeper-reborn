## Goal

Give every user the ability to take a preset split (or build from scratch) and fully customize sets, reps, and exercises per day — with substitutions and a live volume meter to keep each muscle group within MEV/MAV/MRV targets. Today only sets/reps hard-coded in `workout-data.ts` control this, so only the developer can adjust it. This plan makes it self-serve.

## Scope (all three levels supported, per your answer)

1. **Sets & reps only** — quick edit on an existing preset day.
2. **Volume-driven auto-fill** — pick weekly volume goal per muscle (or "balanced hypertrophy" preset), app suggests exercise picks per day to hit MAV.
3. **Full builder from scratch** — day-by-day picker with live per-muscle volume meter.

All three are surfaced from the same editor screen; the mode is a tab at the top.

## Where it lives (both, per your answer)

- **Onboarding**: after picking split + days, add optional "Customize your programme" step. Skipping = current behaviour (use preset as-is).
- **Sessions page**: new "Customize this programme" button on the programme card, plus per-session "Edit" affordance. Opens the same editor.
- **Profile → Programme**: entry point to re-open the editor any time.

## Persistence (clone-into-custom, per your answer)

When a user customizes a preset, we clone each day of that split into `custom_workouts` (existing table). The user's schedule is repointed to those cloned workout IDs. Original presets stay pristine and reusable. Existing history/PRs are unaffected — exercise IDs are preserved during clone, so PR/history continuity is maintained.

Fully-scratch programmes use the same `custom_workouts` table (already the destination for the current builder).

## Volume standards (verified & extended)

Existing `src/lib/volume-standards.ts` has RP-based MEV/MAV/MRV for 19 muscle regions. Part of this plan:

1. **Audit pass** — cross-check current values against Renaissance Periodization published tables (Israetel). Flag discrepancies in a code comment; adjust anything materially off (likely `front_delts` MEV, `lower_back` MRV, and `abductors/adductors` — will confirm during implementation, no silent changes without noting in commit).
2. Add a `WEEKLY_VOLUME_TARGET` helper that returns the recommended per-muscle set count for a given goal (`hypertrophy` → MAV midpoint; `strength` → uses `STRENGTH_STANDARDS` midpoint; `maintenance` → MEV).

## New/changed pieces

### New files
- `src/lib/programme-customizer.ts` — pure logic:
  - `cloneSplitToCustomWorkouts(split, userId)` → `WorkoutDay[]`
  - `computeWeeklyVolume(schedule)` → `Record<MuscleRegion, number>` (sums working sets per primary muscle across all days in the week)
  - `suggestExercisesForMuscle(muscle, remainingSets, excludeIds, equipmentFilter?)` → picks from `EXERCISE_LIBRARY` weighted by primary-muscle match
  - `autoFillDay(dayLabel, targetMusclesForDay, remainingWeeklyBudget)` → generated exercise list at target set count
  - `getSubstitutions(exerciseId)` → merges `EXERCISE_SUBSTITUTIONS` + primary-muscle matches from `EXERCISE_LIBRARY`
- `src/components/programme/ProgrammeEditor.tsx` — main editor screen (sheet + full page mode), tabbed:
  - **Quick edit**: current day list, inline sets/reps steppers per exercise, ✕ to remove, "+ Add exercise" with search
  - **Auto-fill**: goal picker (hypertrophy / strength / maintenance) + per-muscle slider overrides; "Generate" button rebuilds each day from targets
  - **Full builder**: opens existing `WorkoutBuilder` for a scratch day
- `src/components/programme/VolumeMeter.tsx` — horizontal bar per muscle (MEV → MAV → MRV bands) with current-week set count marker; reuses colours from `volume-standards.ts` (`VOLUME_STATUS_COLOR`)
- `src/components/programme/SubstitutionSheet.tsx` — bottom sheet listing alternatives for a selected exercise; grouped by "Same equipment" / "Different equipment"; tap to swap in place

### Edited files
- `src/pages/Onboarding.tsx` — insert optional "Customize" step between split-pick and summary; launches `ProgrammeEditor` in inline mode. Skip button preserves current flow.
- `src/pages/Sessions.tsx` — "Customize programme" button in the header; per-session "Edit" pencil that opens the editor scoped to that day.
- `src/pages/Profile.tsx` — add "Programme" row under settings that opens the editor.
- `src/lib/workout-data.ts` — no data changes; export a helper `getWorkoutById(id)` for the editor (if not already present).
- `src/lib/user-preferences.ts` — add optional `customizedFromSplitId?: string` to `UserPreferences` so we can show "based on Upper/Lower" in the UI.

### Not touched
- `WorkoutSession.tsx` — already reads the (possibly custom) workout, no change needed.
- Database schema — `custom_workouts` table already supports everything.

## User flow (Sessions → editor)

```text
Sessions page
  └─ [Customize programme]
        └─ ProgrammeEditor (full page)
              ├─ Day tabs: Mon Upper │ Tue Lower │ …
              ├─ For active day:
              │    ┌─ Exercise row ─────────────────────────────┐
              │    │ Barbell Bench Press    [Sets−][3][+] [Reps 8-10 ▾]  ⇄  ✕ │
              │    └───────────────────────────────────────────┘
              │    [+ Add exercise]
              ├─ Volume meter (sticky bottom): per-muscle bars for the week
              └─ [Save & lock in]  → writes custom_workouts, updates prefs
```

The `⇄` icon opens `SubstitutionSheet`. The volume meter updates live as sets/exercises change; muscles below MEV show amber, over MRV show red.

## Suggestion algorithm (auto-fill / balance)

Given target sets per muscle for the week and a day label (e.g. "Upper"):

1. Determine which muscles the day should hit (label → muscle group map; "Upper" = chest, back, shoulders, arms).
2. For each target muscle, compute `remainingWeeklySets − alreadyScheduledOtherDays`. Distribute the remainder across days that target that muscle.
3. Pick exercises from `EXERCISE_LIBRARY` whose primary muscle matches, preferring: (a) already-known compounds first, (b) equipment diversity, (c) not duplicated within the day.
4. Assign default `sets = 3`, `reps = "8-10"` (hypertrophy) or `sets = 3`, `reps = "3-5"` (strength).
5. Verify final weekly total lands in `[MEV, MRV]` for each muscle; if any bust, adjust set count first, then swap exercise.

Deterministic seed based on user id so results are stable across regenerations.

## Verification steps

1. `computeWeeklyVolume` unit test with a known schedule (add to `src/test/`).
2. Manually verify: pick Upper/Lower, customize, ensure all 4 days save and reload correctly; PR history for an unchanged exercise still surfaces.
3. Visual check: volume meter reflects edits within 100ms; substitution sheet returns ≥3 options for any library exercise.

## Out of scope

- Rearranging day order within the week (existing schedule editor already handles this).
- Per-exercise RIR override in the editor UI (already exists on workout-level; can be added later).
- Cross-user sharing of custom programmes.

## Technical notes

- `custom_workouts.exercises` is `jsonb` — cloned exercises retain their original `id` so PR/history joins keep working.
- Cloned workouts get IDs like `custom-{splitId}-{dayLabel}-{userIdShort}` to avoid collisions.
- `LucideIcon` values are stripped before persisting (per existing `custom_workouts` gotcha) and re-hydrated with `Dumbbell` on read.
- The volume meter reuses `getMusclesWorked` from `muscle-mapping.ts` — only `primary` muscles counted, matching existing `volume-queries.ts` behaviour.
