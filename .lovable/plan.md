## Goal
Replace the confusing single "Recovery %" dial with a clearer split, and make every part recompute the moment anything is logged (workout, run/walk, rest day, food, water, sleep, biometrics).

## New model on the home + recovery cards

Three independent signals shown side-by-side, each with its own timing label:

- **Readiness** (was "Recovery") — morning systemic readiness from sleep, RHR, stress, SpO2, resp. Stable through the day; only changes when biometrics/sleep are edited. Label clarifies "as of HH:MM".
- **Muscle recovery** (new) — aggregate of the per-muscle states already powering the body diagram. Drops immediately when a session is logged because legs/biceps go red. This is the number that should match what the diagram shows.
- **Strain** — today's accumulated training load. Already live; keep behaviour.

Stress chip stays. AI headline stays. Detected-workouts panel stays.

## Real-time updates on every log

Anything that mutates today's signals will invalidate the right query keys so the cards repaint within a second:

- Workout save → recent sets, workout history, daily scores (already partly wired), plus muscle recovery (derived from recent sets — auto).
- Activity log (run/walk/rest) → activity logs + daily scores (strain recompute already exists; ensure invalidation fires).
- Food log + water intake → daily logs / food log dates / water intake dates → triggers a lightweight "fuel" indicator refresh and AI insight eligibility (does not change readiness or muscle recovery, but does refresh the "Detected today" + nutrition-aware AI context).
- Sleep / biometric check-in → daily biometrics, sleep logs, daily scores (already wired).

Where invalidation is missing today, add it at the save site. No polling — purely event-driven via React Query.

## Aggregate muscle recovery score

Pure helper added to `src/lib/recovery.ts`:
- Average of `score` across all muscle regions that have been worked in the last 7 days, with fatigued muscles weighted ~2× so a hard leg session visibly drags the number down.
- Unworked/rested muscles excluded from the average (they shouldn't mask localized fatigue).
- Returns 0–100 plus a status band (Fatigued / Workable / Recovered) reusing the existing colour scale.

## UI changes

- `HomeCombinedRecoveryCard.tsx`:
  - Three dials: Readiness · Muscle recovery · Strain.
  - Tooltips/copy reworked so it's obvious which is morning-only vs live.
  - Stress chip + detected workouts stay below.
- `RecoveryHero.tsx` and `RecoveryDetailSheet.tsx`: rename Recovery → Readiness in copy + add a Muscle recovery row in the breakdown so the two pages are consistent.
- DB unchanged (still stored as `recovery_score`); this is presentation + a derived score.

## Validation
- Pure unit tests for the new aggregate helper (rested → high; localized fatigue → low; mixed → mid).
- Manual check: log a leg session → muscle recovery + strain change instantly without a refresh; readiness stays put until a new check-in.

## Technical notes (non-user)
- New helper signature: `aggregateMuscleRecovery(states): { score: number; status: RecoveryStatus }`.
- Add `queryClient.invalidateQueries` calls in: activity save, food save, water intake save, rest-day save (where missing). Workout save already invalidates most; add `recentSets` if not already there.
- Real-time = React Query invalidation, not Supabase Realtime — keeps cost flat and matches existing patterns.