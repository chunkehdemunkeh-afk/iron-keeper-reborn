## The bug

In `evaluateAndStoreProgression` (`src/lib/data/progression-queries.ts`):

```ts
const currentTarget = prev ? Number(prev.target_weight) || 0 : heaviest;
```

Once an `exercise_progression` row exists, `currentTarget` is **locked to the stored `target_weight`** forever — it's only ever updated when the user explicitly taps "Apply" on a suggestion. If the row was first seeded back when you were lifting 50 kg, it stays at 50 kg even after you've moved to 60 kg organically.

Consequences:
- The qualifying-set filter (`weight >= currentTarget`) lets a 60 kg × 10 set through.
- The suggestion is then computed as `snapToPlate(50 + 2.5)` → always "50 → 52.5 kg", regardless of what you actually just lifted.
- `prevWeight: currentTarget` (50) is what the banner shows on the left side of the arrow.
- The carried-over staleness guard doesn't help here because a *new* suggestion is being generated this session, so it overwrites instead of being cleared.

The upsert at the bottom (`target_weight: currentTarget || heaviest`) also never advances the stored target organically, so the bug is self-perpetuating until you tap Apply.

## Fix

1. **Treat `prev.target_weight` as a floor, not a ceiling.** Compute the effective current target as `max(prev.target_weight, heaviestQualifyingWeight)` where "qualifying" means a working set that also met the rep low. This way, if you're already lifting 60 kg × 8+ on every set, the system recognises 60 kg as your real working weight and suggests 60 → 62.5, not 50 → 52.5.

2. **Persist the advanced target.** Change the upsert's `target_weight` to that same effective value so the row catches up automatically and the bug can't reappear next session.

3. **Guard against partial-rep sessions:** only advance the target if every working set hit at least `repsLow` at the new heavier weight — otherwise we'd promote a single fluke heavy single into the new baseline. If the criterion isn't met, leave `target_weight` at `prev.target_weight` (current behaviour).

4. **Verify with a unit test.** Add a small test in `src/test/` that feeds `evaluateAndStoreProgression`-style inputs through a pure helper (extract the suggestion-math into a pure function if needed) covering:
   - Stale prev=50, user lifted 60×10 on a 6–8 range → suggests 60 → 62.5.
   - Prev=50, user lifted 50×8 (top of 6–8) → suggests 50 → 52.5 (existing behaviour preserved).
   - Prev=50, user lifted 60×5 (below repsLow) → no advance, no suggestion.

5. **No DB migration needed** — existing stale `target_weight` rows will self-heal on the next session where the user lifts above them with adequate reps.

## Files touched

- `src/lib/data/progression-queries.ts` — adjust `currentTarget` derivation + upsert payload; optionally extract pure helper for testability.
- `src/test/progression.test.ts` (new) — cases above.

No UI changes; the banner already renders whatever values the backend writes.