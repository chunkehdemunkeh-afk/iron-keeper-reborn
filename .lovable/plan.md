## Final volume edits — Upper/Lower A/B

All in `src/lib/workout-data.ts`.

### Upper A (`upper_a`)
- Remove `lib-db-Machine_Preacher_Curls` (Machine Preacher Curl)
- Remove `lib-61` (Bayesian Curl)
- **Add finisher at end:** `pu5` X-Over Cable Tricep Extensions — 3 × 10–12, targetMuscle "Triceps", notes "Tricep finisher — lock elbows in place, full extension, squeeze the lockout"

Final order: Barbell Bench → T-Bar Row → 45° Incline DB Press → Lat Pulldown Pronated → DB Shoulder Press → Cable Lat Raises → JM Press → X-Over Cable Tricep Extensions.

### Upper B (`upper_b`)
- **Keep** `dl5` Dumbbell Row (back volume)
- Remove `pl3` Lat Pulldown - Pronated Grip
- Remove `pu5` Tricep Pushdown (Rope)
- Move `lib-61` Bayesian Curl to position 1 (3 × 10–12)
- Move `lib-db-Machine_Preacher_Curls` Machine Preacher Curl to position 2 (3 × 10–12)

Final order: Bayesian Curl → Machine Preacher Curl → 15° Incline DB Bench → Seated Row Machine → Dumbbell Row → Flat DB Flies → Face Pulls → Incline DB Curl → Rope Hammer Curl → DB Lateral Raise.

### Lower A (`lower_a`)
Append:
- `lib-db-Machine_Preacher_Curls` Machine Preacher Curl — 3 × 10–12, "Biceps"
- `lib-61` Bayesian Curl — 3 × 10–12, "Biceps"

### Lower B
No changes.

### Note on `pu5` id reuse
`pu5` is already defined as "X-Over Cable Tricep Extensions" elsewhere in `workout-data.ts` (line 133) and has its own substitution entry — reusing it on Upper A preserves PR history and the swap sheet. The current Upper B usage of `pu5` ("Tricep Pushdown Rope") is being removed in the same edit, so no conflict remains.
