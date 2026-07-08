## Fix history: preserve exercise + set order

Two bugs cause the shuffled history:

1. **Exercise order is arbitrary.** `saveWorkoutToCloud` writes `set_index` as a *per-exercise* counter (0..n). On read, sets are ordered by `set_index ASC` globally, so all rows with `set_index = 0` (one per exercise) tie on `created_at` (bulk insert = identical timestamps) and fall back to `id ASC` — UUID id is random, so which exercise "wins" the first slot in `WorkoutCard`'s grouping loop is random.

2. **Sets within an exercise can swap.** `Object.entries(setLogs).flatMap(...)` in `WorkoutSession.handleSubmitFeedback` iterates by the object's insertion order (which can differ from `exerciseOrder`, especially when a user reorders exercises or accepts substitutions/accessories mid-session). Combined with the per-exercise `set_index` reset above, if an exercise was logged under two effective IDs during the session (attachment change, `-sa` toggle mid-set) the two ID groups each start at `set_index = 0`, and the reader interleaves them.

### Fix

**`src/pages/WorkoutSession.tsx`** — build `completed.sets` by iterating `exerciseOrder` (with each superset's follow-on members expanded in the same order the UI shows), not `Object.entries(setLogs)`. This makes `workout.sets` faithfully match on-screen order.

**`src/lib/data/workout-queries.ts` (`saveWorkoutToCloud`)** — replace the per-exercise counter with a **global monotonic counter** for `set_index` across the whole session (row 0, 1, 2, … in the order they appear in `workout.sets`). Reader path already `ORDER BY set_index ASC`, so:
- Exercise order = order of first appearance in `workout.sets` = `exerciseOrder`.
- Set order within an exercise = order the user logged them.
- Backward compatible: `fetchExerciseLastData` / `fetchLastSessionData` filter by `exercise_id` first, then `ORDER BY set_index ASC` — the counter is still monotonically increasing per exercise, so those queries stay correct.

No migration. Old rows keep their per-exercise indices; only new saves use the global counter (mixed-scheme sessions never occur because indices are per-session).

### Files touched

- `src/pages/WorkoutSession.tsx` — reorder set-flattening in `handleSubmitFeedback`.
- `src/lib/data/workout-queries.ts` — swap `setIndexByExercise` for a single running counter.

### Verification

- Log a fresh session with 3 exercises × 3 sets → History expands with exercises in the order performed and sets 1, 2, 3 in the order logged.
- Reorder exercises mid-session, save → history reflects the final on-screen order.
- Change a cable attachment mid-exercise, save → both sub-groups appear under the same exercise name in the order logged.
- `fetchExerciseLastData` prefill still shows the correct "Last" weight × reps per set slot (no regression).