## Warm-up fixes in `src/pages/WorkoutSession.tsx`

Two issues, both localized to the warm-up handling.

### 1. Stop overwriting weight/reps the user already entered

In `toggleSet` (around line 890) when a warm-up is completed, we currently do:

```ts
newSets[setIdx] = { ...newSets[setIdx], weight: ramp.weight, reps: ramp.reps };
```

This clobbers whatever the user typed. Change it to only fill blanks:

```ts
const cur = newSets[setIdx];
newSets[setIdx] = {
  ...cur,
  weight: cur.weight && cur.weight > 0 ? cur.weight : ramp.weight,
  reps:   cur.reps   && cur.reps   > 0 ? cur.reps   : ramp.reps,
};
```

Result: the ramp still auto-fills empty warm-up rows, but any weight/reps the user has entered are preserved.

### 2. Make the compensating working set visibly appear

`toggleWarmup` already appends a fresh working set when a row is flipped to warm-up (line 1129), so the array length is correct — but the row label uses `si + 1` (the raw array index). So converting set 1 to WU makes the remaining working rows read "2, 3, 4", which looks like no new set was added and the first working set is missing.

Fix by numbering working sets independently of warm-ups in the render block around line 2096–2122:

- Track a `workingIdxCounter` alongside the existing `warmupIdxCounter`.
- For working rows, display `workingIdxCounter++ + 1` instead of `si + 1`.
- Warm-up rows keep the `WU` glyph; 1RM rows keep the target icon.

After this, converting set 1 to warm-up shows: `WU, 1, 2, 3` — the appended working set is obvious.

### Out of scope

No changes to save logic, ramp math, rest timer, styling, or the setting toggle. Only the two surgical edits above.
