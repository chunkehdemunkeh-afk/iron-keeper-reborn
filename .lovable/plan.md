# Hyrox Training

Bring Hyrox-specific training into IronKeeper: a full 8-week program you can select as your split, plus a library of one-off Hyrox days you can drop into any week (e.g. Upper/Legs/Upper/Hyrox).

## Hyrox context (research)

Hyrox = 8× 1km run alternated with 8 workout stations, in this fixed order:
1. 1000m Ski Erg
2. 50m Sled Push (heavy)
3. 50m Sled Pull (heavy)
4. 80m Burpee Broad Jumps
5. 1000m Row
6. 200m Farmers Carry (2×24kg)
7. 100m Sandbag Lunges (20kg)
8. 100 Wall Balls (6kg to 3m target)

Elite training is built on four pillars — mirrored in our session types:

- **Compromised Running** — running under fatigue from a station (the signature Hyrox stimulus)
- **Strength & Station Technique** — sled, wall ball, lunge, burpee mechanics + posterior chain strength
- **Erg / Pure Conditioning** — Ski + Row threshold and VO2 intervals
- **Simulation / HalfRox** — 4- or 8-station race-pace practice

## What we're building

### 1. Session library — 8 one-off Hyrox workouts

New `hyrox-workouts.ts` module with a shared "Hyrox" theme (orange/black gradient, `Flame`/`Activity` icons). Each is a full `WorkoutDay` with distance/time/round-based exercises using the existing `repLabel` system ("Metres", "Sec", "Rounds").

**Compromised running (3):**
- `hyrox-cr-ski` — 4× (400m run + 250m Ski Erg) — beginner CR
- `hyrox-cr-full` — 6× (1km run + 1 station rotation: ski/row/sled/farmers/lunge/wall balls)
- `hyrox-cr-sprint` — 8× (200m run + 20 wall balls) — race-pace pyramid

**Station strength (2):**
- `hyrox-strength-posterior` — Sled push 4×20m, Sled pull 4×20m, RDL 4×6, Farmers 4×50m, Sandbag lunges 4×20m
- `hyrox-strength-power` — Burpee broad jumps 5×10, Wall balls 5×25, KB swings 5×20, Box jumps 5×8

**Erg conditioning (2):**
- `hyrox-erg-threshold` — 6× (500m Row / 500m Ski) with 90s rest
- `hyrox-erg-vo2` — 10× (250m Row @ hard / 250m Ski @ hard) with 45s rest

**Simulation (1):**
- `hyrox-halfrox` — Half Hyrox: 4× (1km run + station) using stations 1-4 at race pace, tracked as one continuous session

Substitutions map ski→row→air bike, sled→heavy prowler→hip-belt walk, sandbag→goblet, wall ball→thruster.

### 2. Hyrox training split

New `TRAINING_SPLIT` entry `id: "hyrox"`, `name: "Hyrox Race Prep"`, `recommendedDays: [4, 5]`, tag "Hyrox 🔥". Weekly rotation:
- Day 1: Compromised Running (full)
- Day 2: Strength — Posterior
- Day 3: Erg Threshold
- Day 4: Strength — Power / Wall Ball
- Day 5 (optional): HalfRox simulation

### 3. 8-week program (periodized)

Stored as a program overlay on top of the Hyrox split — same 4-5 sessions per week, but session prescription (volume, intensity, distances) scales week by week. Implemented as a `HYROX_PROGRAM` array of 8 week-blocks; each block overrides the sets/reps/distances of the base sessions.

Phases:
- **Weeks 1-2 Base** — Volume, technique, shorter CR intervals (400m runs)
- **Weeks 3-4 Build** — Full 1km CR intervals, heavier sled
- **Weeks 5-6 Intensify** — Race-pace HalfRox, VO2 ergs
- **Week 7 Peak** — Full simulation + top-end intensity
- **Week 8 Taper** — Reduced volume, sharp intensity, race day

Progress tracked via a new `hyrox_program_progress` row (localStorage — same pattern as `user-preferences`) storing `startDate`, `currentWeek`, `raceDate` so the home card shows "Hyrox Week 4 · 28 days to race".

### 4. Adding Hyrox as a one-off swap

Extend `NextSessionCard`:
- New pill button "🔥 Swap for Hyrox" opens a bottom sheet listing all 8 Hyrox sessions grouped by type (CR / Strength / Erg / Simulation)
- Tapping loads that Hyrox workout as `overrideWorkoutId` — user starts it in place of the scheduled day
- Persists nothing about the split; it's a one-off (matches existing swap pattern)

### 5. Onboarding integration

Add "Training for Hyrox?" step in `Onboarding.tsx` after split selection. If yes: prompt for race date → pre-fills the 8-week program starting the appropriate week (auto-backs off to base if <8 weeks remain).

## Technical details

**Files created:**
- `src/lib/hyrox-workouts.ts` — 8 `WorkoutDay` definitions + substitution map
- `src/lib/hyrox-program.ts` — `HYROX_PROGRAM: WeekBlock[8]` with overrides + progress helpers (`getCurrentWeek`, `getProgramSession`, `startProgram`, `daysUntilRace`)
- `src/components/HyroxSwapSheet.tsx` — bottom sheet for the "Swap for Hyrox" action
- `src/components/HyroxProgramCard.tsx` — home-screen card showing "Week X of 8 · N days to race" when active

**Files edited:**
- `src/lib/workout-data.ts` — merge `HYROX_WORKOUTS` into `WORKOUTS` export so all existing lookups (session start, PR tracking, history, name maps) work unchanged
- `src/lib/training-splits.ts` — add `hyrox` split entry
- `src/lib/exercise-substitutions.ts` — add sub lists for new Hyrox exercise IDs
- `src/components/NextSessionCard.tsx` — add "🔥 Swap for Hyrox" trigger opening `HyroxSwapSheet`
- `src/pages/Index.tsx` — mount `HyroxProgramCard` when Hyrox program is active
- `src/pages/Onboarding.tsx` — Hyrox goal question + race date picker
- `src/lib/user-preferences.ts` — add `hyroxProgram?: { startDate, raceDate }` field

**Reused (no changes needed):**
- Existing `repLabel: "Metres" | "Sec" | "Rounds"` for distance/time-based sets
- Existing `supersetGroup` for CR pairs (run+station)
- Existing swap mechanic in `NextSessionCard` (`overrideWorkoutId`)
- PR/history/leaderboard pipelines — Hyrox workouts are just `WorkoutDay`s, so they automatically get progress tracking, XP, quests

**Equipment substitutions:** Every Hyrox exercise ID gets a substitution list so commercial-gym users (no sled, no ski erg) can still run the sessions with rower/air bike/prowler alternatives.

**Out of scope for this task:** Custom Hyrox-specific PR types (e.g. "fastest 1km ski"), Hyrox-only leaderboards, watch-only race timer. Ergs already track distance/time via existing set structure.
