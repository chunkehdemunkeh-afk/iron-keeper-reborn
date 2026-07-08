## Warm-up set UX overhaul

Turn a set into a warm-up by ticking it — no separate "Add Warm-up" button, and the working-set count is preserved automatically. RIR stays hidden on warm-ups (already the case), and the orange styling stays as-is.

### Behaviour

1. **Warm-up tick** — Add a small flame/tick toggle at the far left of each set row (in place of / alongside the set number). Tapping it flips that set between `working` ↔ `warmup`.
   - Flip → `working` to `warmup`: the row instantly restyles (orange, no RIR picker, auto-fill from ramp on complete — existing behaviour), and a compensating **working set is auto-appended** at the end of the exercise so the planned working-set count is unchanged.
   - Flip back → `warmup` to `working`: remove the last empty/uncompleted trailing working set that was previously auto-added (only if it's still `completed: false` and untouched). If the trailing working set has been logged, leave it — the user chose to keep it.
2. **First warm-up seeding** — When flipping the first set to warm-up on an exercise that has zero warm-ups, do NOT seed a second warm-up automatically. The user ticks each set they want as a warm-up individually. This is the "similar to how they look now" the user asked for, minus the surprise seeding.
3. **RIR** — Warm-ups continue to skip the RIR picker and are excluded from PRs/progression/volume (already implemented via `setType === "warmup"` guards).
4. **Colour** — Keep the existing orange treatment (`bg-orange-400/5`, `text-orange-400/80`, flame icon). No new colours.
5. **Remove the "Warm-up" button** in the row of action buttons under each exercise (line 2119–2128). "Add Set" and "1RM" remain. The tickbox on each set replaces its purpose.
6. **1RM sets** — unaffected; can't be toggled to warm-up.

### Technical notes

- `toggleWarmup` already exists (lines 1114–1126); extend it to also (a) auto-append a working set when flipping to warm-up, and (b) trim a trailing untouched working set when flipping back.
- Row UI (around line 1999): the set-number span becomes the tap target — tap flips warm-up state. Show flame when `isWarmup`, number otherwise. Add a small hint (aria-label / title) so it's discoverable. No layout shift.
- `addWarmupSet` (lines 1094–1111) is no longer called from the UI once the button is removed. Keep the function for now (dead code cleanup can be a follow-up) or delete it — I'll delete it to keep things tidy per the surgical-changes rule since the button is the only caller.
- No DB schema changes. No changes to save/PR/volume/progression logic — they already branch on `setType`.

### Files touched

- `src/pages/WorkoutSession.tsx` — update `toggleWarmup`, remove `addWarmupSet` + its button, make the set-number cell tappable to toggle warm-up.

### Verification

- Tick a working set → row turns orange, flame icon, RIR picker suppressed on complete, one extra working set appears at the bottom.
- Untick that warm-up → row reverts, the auto-added trailing working set is removed (only if still untouched).
- Complete a warm-up → auto-fills from ramp (existing behaviour intact).
- Save session → warm-ups persist as `set_type = 'warmup'` and are excluded from PRs/volume/progression (existing tests still pass).