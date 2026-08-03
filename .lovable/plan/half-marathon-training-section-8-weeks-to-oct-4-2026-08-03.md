# Half Marathon Training Section — 8 Weeks to Oct 4

A dedicated running section built the same way the Hyrox program works: a session library, an 8-week periodised plan, a home-screen card with a race countdown, and a progress page for pace benchmarks. Your lifting split stays exactly as it is — the runs layer on top.

## Timing

Oct 4 is 9 weeks out from today. The plan is 8 weeks (Aug 10 – Oct 4), so this week acts as a free ramp-in week: you can start immediately and Week 1 simply begins now, or set a start date of Aug 10.

## The programme (4 runs/week, goal: sub-2:00)

Sub-2:00 means 5:41/km race pace. Since you're building base, the plan is volume-first with pace work introduced gradually — the standard proven structure (easy-run majority, one quality session, one tempo, one long run), with cutback weeks so it stacks with your lifting.

Weekly template:
- **Easy run** — conversational pace, 30–45 min
- **Speed / intervals** — VO2 and leg-turnover work (400m–1km reps)
- **Tempo / race-pace** — sustained efforts at or just under 5:41/km
- **Long run** — the key session, building 10 km → 18 km

Week blocks:

```text
Wk 1-2  Base        ~22-26 km   Easy volume, strides, long run 10→12 km
Wk 3    Build       ~28 km      First 1km intervals, long run 13 km
Wk 4    Cutback     ~22 km      Volume drops ~25%, long run 10 km (recovery)
Wk 5    Build       ~32 km      Tempo 5 km at race pace, long run 15 km
Wk 6    Peak        ~36 km      Longest week, long run 18 km
Wk 7    Sharpen     ~28 km      Race-pace segments inside the long run (14 km)
Wk 8    Taper       ~16 km      Volume -50%, short sharp intervals, race Oct 4
```

Each week carries a coach note (pacing targets, fuelling, and how to place the runs around your lifting days).

## What you'll see in the app

- **Home card** — "Half Marathon · Week 3 of 8", days-to-race countdown, this week's focus and the next run to do. Tap to open the programme.
- **Programme page (`/half-marathon`)** — all 8 weeks expandable, current week highlighted, sessions tappable straight into a workout session.
- **Run sessions** — logged through the existing workout session screen, using the same time-based logging as Hyrox (distance in metres, elapsed time in min:sec), so pace charts work automatically.
- **Pace benchmarks page** — personal bests and trend charts for 1 km, 5 km, 10 km, tempo pace and long-run pace, plus a projected half marathon finish time against your sub-2:00 target.
- **Race-day setup sheet** — set your race date (defaults to Oct 4) and goal time; goal pace flows into every session's target.

## Technical notes

New files, mirroring the Hyrox pattern:
- `src/lib/run-workouts.ts` — session library (`RUN_WORKOUTS`), each run modelled as a `WorkoutDay` with time-in-`weight` / metres-in-`reps` convention and `weightLabel: "Sec"`; plus `RUN_BENCHMARKS` catalog and `isRunWorkout()`.
- `src/lib/half-marathon-program.ts` — `HM_PROGRAM` (8 `HMWeekBlock`s: phase, focus, session ids, note), localStorage progress under `ik-hm-program-{userId}` with `getCurrentWeek`, `getCurrentBlock`, `daysUntilRace`, plus goal-time → target-pace helpers.
- `src/components/HalfMarathonProgramCard.tsx` — home card + setup sheet (race date, goal time), modelled on `HyroxProgramCard.tsx`.
- `src/pages/HalfMarathonProgram.tsx` — week-by-week programme view.
- `src/pages/RunBenchmarks.tsx` + `src/lib/data/run-benchmark-queries.ts` — pace PBs and trend charts, aggregating `workout_sets` by run exercise id prefix (same approach as `hyrox-benchmark-queries.ts`).

Wiring:
- Register `RUN_WORKOUTS` alongside `HYROX_WORKOUTS` in the session/swap lookup pools (`WorkoutSession.tsx`, `WorkoutBuilder.tsx`, and name-resolution in `exercise-names.ts`).
- Add routes in `App.tsx`; render the card in `src/pages/Index.tsx` below the existing banners.
- Reuse `resolveExerciseName` and the existing time-format logic so PRs show `m:ss`, not kg.
- No database changes — runs persist through the existing `workout_history` / `workout_sets` tables.
