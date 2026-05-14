## Goal

Add a "Time in HR zones" block to the post-workout feedback screen so Galaxy Watch summaries can be entered, then feed those zones into the existing strain calculation (blended 70/30 toward the watch signal).

## Why zones beat just avg/max HR

Galaxy Watch's post-workout summary highlights minutes in each HR zone much more prominently than a single "average BPM" number. Zones also let us compute a more accurate TRIMP (Training Impulse) score because we know exactly how long the user spent at each intensity, not just the average.

## UI changes — `src/pages/WorkoutSession.tsx` feedback screen

Replace the current Avg BPM / Max BPM block with an inline, expanded-by-default "From your watch" section under Notes:

```text
From your watch (optional)
─────────────────────────────────
Duration   [ 47 ] min   (prefilled with app timer, editable)
Calories   [ 312 ] kcal (prefilled with estimate, editable)

Time in HR zones (minutes)
 Z1  Light       [ 8 ]
 Z2  Fat-burn    [ 12 ]
 Z3  Cardio      [ 18 ]
 Z4  Hard        [ 7 ]
 Z5  Max         [ 2 ]

Max HR reached  [ 178 ]   (optional)
```

- Each zone input is a small numeric field, inline grid, no scrolling required.
- Show a subtle "Total: 47 min" tally underneath that updates live, so users can sanity-check against their watch.
- A one-line helper: "Improves strain accuracy — leave blank if you didn't wear a watch."
- Avg HR field is removed from the UI; we derive it from the zones (so the user only enters what their watch actually shows).

## Data model

Add three columns to `workout_history`:

- `hr_zones jsonb` — `[z1, z2, z3, z4, z5]` minutes, nullable
- `duration_watch integer` — watch-reported minutes, nullable (kept separate from app `duration` so we never lose the original timer)
- `calories_watch integer` — watch-reported kcal, nullable

Keep the existing `avg_hr` and `max_hr` columns; we'll backfill `avg_hr` from zones at save time so existing strain logic still works without a rewrite.

## Strain calculation — `src/lib/recovery-scores.ts`

Extend `StrainHRContext` with optional `hrZones?: [number, number, number, number, number]`.

Inside `computeStrainScore`:

1. If `hrZones` are present and total > 0, compute a zone-based TRIMP using each zone's midpoint %HRR and standard Banister weights:
   - Z1 → 0.55 HRR, Z2 → 0.65, Z3 → 0.75, Z4 → 0.85, Z5 → 0.95
   - `trimpZone = Σ (minutes_i × hrr_i × 0.64 × e^(1.92 × hrr_i))`
2. Compute the existing calorie+effort+TRIMP-from-avgHR strain (`strainEstimate`) as today.
3. Compute a watch-driven strain (`strainWatch`) using `trimpZone` and watch calories.
4. Final: `strain = 0.3 × strainEstimate + 0.7 × strainWatch` when zones are present, otherwise the current behaviour unchanged.

## Save path — `src/lib/data/workout-queries.ts`

In `saveWorkoutToCloud`:

- Accept `hrZones`, `durationWatch`, `caloriesWatch` on the workout object.
- Derive `avg_hr` from zones × user's estimated max HR (220 − age, fallback 190) when zones are provided and the user didn't separately enter avg HR.
- Insert the three new columns alongside the existing fields.

## Recompute — `src/lib/data/biometric-queries.ts`

In `recomputeTodayStrain`:

- Pull `hr_zones`, `duration_watch`, `calories_watch` in addition to current fields.
- Sum zones across the day's workouts (element-wise) and pass to `computeStrainScore` via the new `hrZones` field.
- Prefer `calories_watch` over `calories_burned` when present (sum per workout: `watch ?? estimate`).

## Migration

Single migration adding the three nullable columns to `workout_history`. No RLS changes — existing per-user policies cover the new columns.

## Out of scope

- Recovery HR field (deferred — not used by strain).
- HealthKit/Health Connect auto-sync (deferred to the Capacitor phase noted in PLAN.md).
- Backfilling old workouts.

## Files touched

- `supabase/migrations/<new>.sql` — add columns
- `src/lib/recovery-scores.ts` — zone-based TRIMP, blend
- `src/lib/data/workout-queries.ts` — accept + store new fields, derive avg_hr
- `src/lib/data/biometric-queries.ts` — pass zones to strain
- `src/pages/WorkoutSession.tsx` — new inline zone inputs, remove standalone avg HR field
- `src/integrations/supabase/types.ts` — auto-regenerated after migration
