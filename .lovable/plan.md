

## Normalize fatigue by user strength (PR-relative volume)

### The problem
Today, recovery uses raw `weight × reps` as fatigue. A beginner benching 40 kg × 8 produces 320 "fatigue", an advanced lifter benching 100 kg × 8 produces 800 — so the strong lifter looks 2.5× more wrecked even though, relative to their capacity, both did similar work. DOMS in reality scales with **relative intensity** (% of your own max), not absolute load.

### The fix: relative-intensity fatigue
Replace the raw volume term with a **PR-normalized** equivalent. For each set:

```text
relativeIntensity = weight / userPR(exerciseId)     (clamped 0.3–1.1)
fatigueUnits      = reps × relativeIntensity^1.5    (per-set)
```

Then the existing pipeline (intensity multiplier × sleep modifier × decay) runs unchanged on `fatigueUnits` instead of `weight × reps`. Two lifters doing 5×8 at the same RPE on the same lift will now generate near-identical fatigue regardless of absolute load.

Why `^1.5`? Sets at 80% of PR feel meaningfully harder than at 60% — a slight exponent makes higher relative loads weigh more, matching how DOMS actually scales.

### Handling missing PRs (new users, new exercises)
- If no PR exists for that exercise yet → fall back to **the user's best `weight × reps` for any exercise hitting the same primary muscle** in the last ~90 days, treating it as a soft proxy.
- If still nothing → use the current set's own `weight × reps` as a self-reference (relativeIntensity = 1.0 baseline). This means brand-new lifters always get a sensible "moderate fatigue" reading rather than 0 or extreme values.
- Bodyweight / time-based exercises (weight = 0): use `reps × 0.6` as fatigueUnits — preserves contribution without divide-by-zero.

### Normalisation constant
The current code normalises with `remainingFatigue / 1500` to map to 0–1. Under the new scale, a hard set ≈ 8 × 0.85^1.5 ≈ 6 fatigue units. We'll re-tune the divisor to **~75 units per muscle** so a typical hard session (5 working sets on a primary muscle) lands in the "fatigued" band, matching today's behaviour for an average user.

### Technical changes

**`src/lib/recovery.ts`**
- Extend `SetRecord` with optional `userPR?: number` (the user's best weight on this exercise's base ID).
- Replace `volume = weight * reps` with the relative-intensity formula above.
- Re-tune the fatigue normalisation divisor (1500 → ~75).
- Keep `lastVolume` as raw `weight × reps` for display purposes (the muscle detail sheet still shows real kg × reps, which is what users expect).

**`src/lib/cloud-data.ts` — `fetchRecentSets`**
- Reuse existing PR query logic: build a `prMap[baseExerciseId] → maxWeight` from `workout_sets` (no new query — just aggregate the same rows we already pull, or do one extra grouped query).
- Attach `userPR` to each returned `RecentSetRecord`.

**`src/components/recovery/RecoveryCard.tsx` & `src/pages/Progress.tsx`**
- No API changes — they just pass `sets` through. PR data flows in automatically via `fetchRecentSets`.

**`src/test/recovery.test.ts`**
- Add cases: identical relative intensity (50% PR vs 50% PR at different absolute weights) produces equal fatigue; missing PR falls back gracefully; bodyweight exercises still register fatigue.

### What the user will notice
- Beginners and advanced lifters who train with similar effort now show **similar muscle fatigue**.
- Lifters going light (deload, technique work) at <50% of PR show **less** fatigue than before — which is correct.
- Lifters pushing near-max sets show **more** fatigue per set than the old volume model — also correct.
- No UI changes; the diagram, list, and percentages all behave the same, just calibrated to the individual.

