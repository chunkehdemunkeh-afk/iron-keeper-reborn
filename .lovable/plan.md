## Goal
Show RIR from the previous session alongside weight/reps when logging a new session, so set-by-set effort context isn't lost.

## Changes

### 1. `src/lib/data/workout-queries.ts`
Add `rir` to the three previous-session fetchers:
- `fetchLastSessionData` — return `Record<string, { reps; weight; rir: number | null }[]>`
- `fetchExerciseLastData` — return `{ reps; weight; rir }[]`
- `fetchExerciseLastDataLike` — same shape inside `sets`

Select `rir` from `workout_sets` (already a column) and map it through. `null` when not logged.

### 2. `src/pages/WorkoutSession.tsx`
- Update `lastSessionData` state type and all `{reps,weight}` consumers (`getLastDataForExercise`, sibling preload, fallback gap-fill, `groupLastDataById`) to carry `rir`.
- "Last:" summary line (line ~1470): render each entry as `50kg×8 @1 RIR` when `rir != null`, else fall back to current `50kg×8`.
- Per-set input row: add a small muted chip next to the weight/reps inputs showing `RIR <n>` from `lastExerciseData?.[si]?.rir` when present (both the regular block at ~1934/1941 and the grouped/superset block at ~2289). Doesn't affect placeholders — purely a visual reference.

### 3. No DB, no other surfaces
RIR already persists. History page / CSV export already include it. This is purely a read-side display improvement during a live session.

## Verification
- Open a workout that was logged last week → "Last:" line shows `@X RIR` for sets where RIR was recorded.
- Each set row shows a `RIR n` chip referencing last session's value.
- Sets logged before RIR tracking gracefully omit the chip (no "RIR null").