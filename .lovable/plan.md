# Plan

Edit only `src/lib/workout-data.ts`, scoped to the four DUP workouts: `upper_a`, `lower_a`, `upper_b`, `lower_b`.

## 1. Upper B — add One-Arm Incline Lateral Raise

Insert after `dl5` Dumbbell Row (mirroring its position in Upper A), using the same library exercise:

```
{ id: "lib-db-One-Arm_Incline_Lateral_Raise", name: "One-Arm Incline Lateral Raise",
  sets: 2, reps: "12-15", targetMuscle: "Side Delts", targetRir: "0-1",
  notes: "Lie sideways on an incline bench, dumbbell in top hand. Raise to shoulder height, full stretch at bottom. Each side." }
```

## 2. Apply "2 sets · RIR 0-1" rule to Upper A, Lower A, Upper B, Lower B

For every exercise in these four workouts, set `sets: 2` and `targetRir: "0-1"`, **except** the explosive block — leave these untouched:

- Lower A: `lib-65` Hex Bar Squat Jumps, `lib-66` Box Jumps w/ Drop Jump, `lib-67` Broad Jumps
- Lower B: `lib-54` Lateral Bound, `lib-29` Nordic Hamstring Curl

Reps, notes, muscle targets, ids, order — all unchanged.

### Exercises being changed (sets → 2, targetRir → "0-1")

**Upper A:** lib-1, lib-64, pu1, pl3, lib-db-Smith_Machine_Overhead_Shoulder_Press, lib-db-One-Arm_Incline_Lateral_Raise, lib-62, pu5

**Lower A:** lg4, lg3, lg5, lg6, la6, lib-db-Machine_Preacher_Curls, lib-61

**Upper B:** pu3, pl1, up4, lib-18, lib-13, dl5, lib-db-One-Arm_Incline_Lateral_Raise (new), ub6, sub-up5a, lib-19

**Lower B:** lg1, fb2, lib-db-Hack_Squat, lib-db-Hyperextensions_Back_Extensions, lg6, la6

## Out of scope

- Other workouts (PPL, GK, Full Body, Arnold, 5/3/1, accessory routines) are untouched.
- No notes rewrites — only `sets` and `targetRir` fields change. Notes mentioning "3 sets" or older rest/load context stay as-is unless you want a follow-up pass.
- No database/backfill changes. New rule affects future sessions only.

## Notes / heads-up

- Big compounds (Bench, RDL, Hack Squat) dropping from 3 → 2 sets at RIR 0-1 will substantially reduce weekly volume on chest, back, quads, and hamstrings. If that's intentional (e.g. peaking / time-crunched block), proceed. If not, say so and I'll adjust.
- Pendulum Squat (`lg4`) currently 3 sets — drops to 2 — Lower A quad volume will be quite low afterwards.
