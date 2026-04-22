

## Add a "1RM Test" set type to sessions

You're right that it's worth adding — Epley gives a solid estimate from a 5-rep top set, but the strength tiers feel more "earned" when you can actually load a single and see it land. Right now there's no way to log a 1-rep max attempt that's clearly distinguished from a regular working set, and a failed top-end attempt at 1 rep gets misread as a poor set (it would trigger the "consider lowering weight" warning).

### What the user gets

**1. A "1RM Test" mode toggle on any exercise during a session**
- In the expanded exercise card, a small icon button next to "Add Set" labelled `1RM` (Target/Crosshair icon).
- Tapping it adds a single dedicated **1RM test set** at the bottom of that exercise's set list, visually distinct (amber/gold border, "1RM Test" label, single rep field locked to 1).
- The user enters the weight and taps complete. No reps input — it's understood to be 1.
- A 1RM test set:
  - Suppresses the "only X reps — lower weight" warning (it's a max attempt, not a working set).
  - Triggers PR detection and tier-crossing celebration directly off the lifted weight (no Epley estimation needed — the actual 1RM beats any estimate).
  - Auto-starts a longer rest timer (5 min default vs. the usual 2-3) since maxes need real recovery.
  - Counts as 1 set toward volume but is tagged `setType: "1rm_test"` in storage.

**2. A "Test 1RM" shortcut on the Strength Level card**
- On the Progress → Stats tab, each rated lift row gets a subtle `Test 1RM →` link.
- Tapping it opens a tiny sheet: "Start a 1RM test for Bench Press?" → "Add to current session" (if a session is open for a workout containing that lift) or "Start empty 1RM session" (creates an ad-hoc session containing just that lift, pre-loaded with a 1RM test set).
- This is the friction-killer — most people never test their max because it's awkward to set up; this turns it into one tap from the card that motivated them.

**3. PR celebration upgrade for true 1RM**
- When the completed set is a `1rm_test`, the celebration banner reads "True 1RM!" instead of "PR!" and uses the gold/amber accent. Tier-crossing message ("You just hit Intermediate on Bench Press!") works as before but is now backed by a real single, not an estimate.

### Why this is worth doing (vs. relying on Epley)

- **Accuracy at the top end.** Epley is well-calibrated for 3–8 reps but drifts at 1–2 reps and at very high reps. A real single removes the guesswork at exactly the moment that matters most for tier placement.
- **Psychology.** Users who see "Intermediate" want to know if they're really there. A "Test 1RM" button gives them a path to confirm it.
- **Doesn't break anything.** Working sets keep contributing to the rating via Epley exactly as today; the test set is just a higher-confidence input that wins when present.

### What gets stored

- `workout_sets` row gets an optional `set_type` column with values `"working" | "warmup" | "1rm_test"` (default `"working"`). Existing sets implicitly count as `"working"`.
- `setLogs` state in WorkoutSession adds `setType?: "1rm_test"` per set; auto-save persists it alongside the existing fields.
- The strength rating logic prefers a `1rm_test` set's actual weight over any Epley-derived estimate when computing the best 1RM for that lift.

### Technical changes

- **DB migration**: add `set_type TEXT DEFAULT 'working'` to `workout_sets` (nullable, no backfill needed). RLS unchanged.
- **`src/lib/cloud-data.ts`**:
  - Persist `setType` in `saveWorkoutToCloud`.
  - `fetchPersonalRecords` returns an extra `bestTrue1RM?: number` per exercise — the heaviest `1rm_test` set ever logged.
  - New `bestOneRmForLift(prs, liftId)` helper: returns true 1RM if present, otherwise Epley from the heaviest working set, used by both `StrengthLevelCard` and `WorkoutSession`'s tier-crossing detection.
- **`src/pages/WorkoutSession.tsx`**:
  - Extend `SetLog` with `setType?: "1rm_test"`.
  - Per-exercise "1RM" button next to "Add Set"; appends one set with `reps: 1`, `setType: "1rm_test"`, and renders it with a distinct amber pill.
  - In `toggleSet`: skip the rep-range warnings when `setType === "1rm_test"`; pass `currentWeight` (not Epley) into the tier check; use 5-minute rest default.
- **`src/components/PRCelebration.tsx`**: accept an `isTrue1RM?: boolean` prop; render the gold "True 1RM!" header variant when set.
- **`src/components/progress/StrengthLevelCard.tsx`**: add the `Test 1RM →` link per row, and use `bestOneRmForLift` so true-1RM data wins over Epley.
- **New tiny sheet `src/components/progress/Test1RMSheet.tsx`**: confirms and routes to either an existing session or an ad-hoc one.
- **Tests** (`src/test/strength-standards.test.ts` + a new `cloud-data` test): cover `bestOneRmForLift` precedence (true 1RM beats higher Epley estimate, and vice versa when no test exists).

### Out of scope (backlog)

- Warmup-set tagging UI (the schema would support it via `set_type: "warmup"`, but no UI in this pass).
- Deload/RPE entry per set.
- Estimated 1RM history chart (could come once people have a few tests logged).
- Auto-suggesting when to test (e.g. "you've added 10 % since your last test — time to retest?").

