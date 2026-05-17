## Remove Bayesian Curl & Machine Preacher Curl from Upper B

### What
Remove `lib-61` (Bayesian Curl) and `lib-db-Machine_Preacher_Curls` (Machine Preacher Curl) from the `upper_b` workout in `src/lib/workout-data.ts`.

### Why
User wants to reduce biceps volume on Upper B day after finding overall upper-day volume too high.

### Details
- Only the `upper_b` exercises array is affected.
- Lower A still keeps both exercises (already appended in a prior edit).
- No substitution keys or other data files reference these IDs specifically for Upper B.
- PR history is keyed by exercise ID, so removing them from the workout template does not affect historical data.

### Resulting Upper B order
1. `pu3` — 15° Incline Dumbbell Bench Press  
2. `pl1` — Seated Row Machine  
3. `dl5` — Dumbbell Row  
4. `pu4` — Flat Dumbbell Flies  
5. `pl4` — Face Pulls  
6. `am3` — Incline Dumbbell Curl  
7. `ub6` — Rope Hammer Curl (Cable)  
8. `sh4` — Dumbbell Lateral Raise