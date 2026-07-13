## Update Upper A in `src/lib/workout-data.ts`

Replace the current 8-exercise Upper A block (lines 398–407) with the 9-exercise list below. Every entry: `sets: 2`, `reps: "5-10"`, `targetRir: "0-1"`.

### Removals
- `lib-62` Plate Loaded Dip Machine
- `pu5` X-Over Cable Tricep Extensions

### Additions
- **Skull Crushers** at position 7. I'll reuse the existing `bn5` ID (already named "Skull Crushers" in the Bench Night workout) so PR/history stays consolidated with the other Skull Crusher entries — matches how `pu1`, `pl3`, etc. are shared across sessions.
- **Machine Preacher Curl** (`lib-db-Machine_Preacher_Curls`) — same entry currently in Lower A, now also in Upper A at position 6.
- **Bayesian Curl** (`lib-61`) — same entry currently in Lower A, now also in Upper A at position 8.

Note: Machine Preacher Curl and Bayesian Curl in Lower A are already at `targetRir: "0-1"` — no change needed there. The "fix RIR to 0-1" from the request is satisfied by giving the new Upper A entries explicit `targetRir: "0-1"` (otherwise they'd inherit the workout-level `"1-2"` fallback).

### Final Upper A order
1. `lib-1` Barbell Bench Press — 2 × 5-10, RIR 0-1
2. `lib-64` Mag Grip Seated Cable Row — 2 × 5-10, RIR 0-1
3. `pu1` 45° Incline Dumbbell Bench Press — 2 × 5-10, RIR 0-1
4. `pl3` Lat Pulldown - Pronated Grip — 2 × 5-10, RIR 0-1
5. `lib-db-Smith_Machine_Overhead_Shoulder_Press` Smith Machine Seated Military Press — 2 × 5-10, RIR 0-1
6. `lib-db-Machine_Preacher_Curls` Machine Preacher Curl — 2 × 5-10, RIR 0-1
7. `bn5` Skull Crushers — 2 × 5-10, RIR 0-1
8. `lib-61` Bayesian Curl — 2 × 5-10, RIR 0-1
9. `lib-db-One-Arm_Incline_Lateral_Raise` One-Arm Incline Lateral Raise — 2 × 5-10, RIR 0-1 (rep range changed from 12-15)

Existing `notes` strings are preserved for kept exercises; new entries get brief cue notes.

No other files affected.