## Problems

1. **Apply tick does nothing visible.** `applyProgressionToSetLogs` writes to `set.targetWeight` / `set.targetReps`, but the visible weight/reps inputs render `set.weight` and `set.reps` (lines 1876, 1883, 2231, 2233). The placeholder still reads from last session's weight, so the user sees no change.
2. **Suggestion is wrong / stale (e.g. always "50 → 52.5kg").** `evaluateAndStoreProgression` requires *every* working set to hit the top of the rep range AND ≥ current target; it then always adds a fixed heuristic increment (`+2.5kg` for any upper compound, `+5kg` for any lower compound, `+1.25kg` for isolation), regardless of how far the user blew past the range or what they actually lifted. Once stored, the `pending_suggestion` persists across sessions until accepted/dismissed, so a stale row keeps showing the old `prevWeight → suggestedWeight` even after newer, heavier sessions.
3. **No context in the banner.** It only shows `prev → suggested`. No "you hit X kg × Y reps, Z over the cap".

## Fix

### 1. Trigger rules (`src/lib/data/progression-queries.ts`)

Replace the "all sets hit top" check with:

- Compute `topReps` = prescribed `repsHigh`.
- For each working set, compute `overflow = reps - topReps` (only counts when `weight >= currentTarget`).
- **Fire a suggestion when EITHER**:
  - `every set has overflow >= 0` (hit top on all sets), OR
  - `at least one set has overflow >= 1` (went above top on any set).
- Track the "trigger set": the set with the highest `overflow` (tiebreak: heaviest weight). Store its `reps`, `weight`, and `overflow` on the suggestion so the banner can render them.

### 2. Contextual weight increment

Replace the fixed `suggestIncrement(name, id)` constant with `suggestIncrement(ctx)` that scales:

- **Base step** stays exercise-class-aware (lower compound 5 kg, upper compound 2.5 kg, isolation 1.25 kg) but acts as the *minimum* jump.
- **Scale by overflow** on the trigger set:
  - `overflow == 0` → 1× base step.
  - `overflow == 1` → 1× base step.
  - `overflow == 2` → 2× base step.
  - `overflow >= 3` → 3× base step (cap).
- **Cap by % of current target** so isolation lifts don't jump 15%: never recommend more than `max(baseStep, round(currentTarget * 0.08, plate))` for isolation, `0.06` for upper compound, `0.05` for lower compound. Floor at one base step.
- Snap final weight via `roundToPlate` (lib/workout-session-utils.ts: nearest 2.5 kg) — and to 1.25 kg for isolation if we keep micro-loading; otherwise 2.5 kg.

### 3. Suggestion schema additions

Extend `ProgressionSuggestion`:

```ts
type ProgressionSuggestion = {
  type: "increase" | "deload";
  suggestedWeight: number;
  suggestedRepsLow: number;
  suggestedRepsHigh: number;
  prevWeight: number;
  // NEW
  triggerWeight: number;   // weight on the trigger set
  triggerReps: number;     // reps achieved
  repsOver: number;        // reps above repsHigh (0 if just-at-cap)
  reason: string;
};
```

Reason copy examples:
- `repsOver === 0` → "Hit top of range on every set — bump weight."
- `repsOver >= 1` → "You hit ${triggerReps} reps at ${triggerWeight}kg (${repsOver} over the ${repsHigh} cap) — time to add weight."

### 4. Banner UI (`src/components/workout/ProgressionSuggestionBanner.tsx`)

Add a second line under the headline showing the trigger set:

```
You hit 12 reps @ 50kg (2 over the 10 cap)
Suggest: 55kg × 6-8
```

Buttons: rename `Apply` → ✓ (no copy change needed) but make Apply actually update visible inputs (see §5).

### 5. Apply must populate the inputs (`src/pages/WorkoutSession.tsx`)

Rewrite `applyProgressionToSetLogs` to update both the *target* and the *actual entry* fields for working sets that are not yet completed:

```ts
cur.map(s =>
  s.setType && s.setType !== "working"
    ? s
    : s.completed
      ? s
      : { ...s, weight, reps: 0, targetWeight: weight, targetReps: repsLow }
)
```

(We set `weight = newSuggestedWeight` so the visible input pre-fills; leave `reps` empty so the user logs their actual performance.)

### 6. Staleness guard

In `evaluateAndStoreProgression`, when a new session does **not** meet the trigger rule **and** the heaviest weight this session is `>= existing.target_weight` AND `>= existing.pending_suggestion.suggestedWeight`, clear the stale `pending_suggestion` (user already progressed past it). Prevents the "always 50 → 52.5kg" residue.

## Out of scope

- No DB schema migration (the `pending_suggestion` column is `jsonb`, new fields slot in).
- No changes to deload logic, accept/dismiss mutations, or banner styling beyond the new line.
- No changes to where/when the banner is rendered.

## Verification

1. Log a session where one set goes 2 reps over the cap → on next session start, banner shows trigger set + bigger jump than base step.
2. Log a session that just hits the top on every set → banner shows 1× base step.
3. Hit Apply → the weight inputs for incomplete working sets pre-fill with the new suggested weight; reps stay empty.
4. Log a heavier session after dismissing → no stale suggestion lingers.
