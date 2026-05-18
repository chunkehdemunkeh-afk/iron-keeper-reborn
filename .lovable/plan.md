## Fix

Per-exercise rep-range mapping is too aggressive — for Upper A / Lower A the user wants every set at RIR **0-1** (heavy, near failure), and Upper B / Lower B at **1-2**.

### Change
Add an optional `targetRir?: string` field on the `Workout` type in `src/lib/workout-data.ts`. Set it on the four workouts:

- `upper_a` → `"0-1"`
- `lower_a` → `"0-1"`
- `upper_b` → `"1-2"`
- `lower_b` → `"1-2"`

In `src/pages/WorkoutSession.tsx`, change the two seeding sites (around lines 511 and 580) to prefer the workout-level value:

```
targetRir: workout.targetRir ?? targetRirForReps(ex.reps, sessionTargetRir),
```

The per-exercise `targetRirForReps` mapping remains the fallback for workouts without an explicit override (e.g. accessory days, custom workouts), and the split-level value remains the final fallback.

### Files touched
- `src/lib/workout-data.ts` — add `targetRir` field on `Workout` type and on the four workouts.
- `src/pages/WorkoutSession.tsx` — prefer `workout.targetRir` in the two seeding sites.
