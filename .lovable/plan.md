# Full Codebase Audit Plan

Goal: systematically find and fix latent bugs across the app, not just react to symptoms. I'll do this in passes so you can review findings before I touch large surfaces.

## Pass 1 — Static analysis (read-only, no code changes yet)

1. **Type & lint sweep** — run `tsgo` + `eslint` across `src/`, collect every error/warning.
2. **Dead code / orphaned IDs** — cross-check `workout-data.ts`, `exercise-library.ts`, `exercise-substitutions.ts`, and `accessory-routines.ts` for:
   - IDs referenced in workouts but missing from library/substitutions
   - Substitution keys that no longer match any workout ID
   - Duplicate exercise IDs across workouts (PR/history conflation)
3. **Data layer audit** (`src/lib/data/*.ts`)
   - Queries missing `.order('set_index')` after the recent fix
   - Queries hitting the 1000-row Supabase default limit silently
   - `workout_sets.user_id` access without joining via `workout_history` (NULLs on old rows)
   - Missing `set_type` / `rir` filters where they matter (volume, PR, progression)
4. **React Query keys** — find inline string keys that should use `queryKeys.*`, and stale-data risks from missing `invalidateQueries` after mutations.
5. **localStorage** — find raw string keys that should use `STORAGE_KEYS.*`, and any place autosave can be silently wiped (we already fixed one in `WorkoutSession`).
6. **Realtime / effects** — `supabase.channel(...)` outside `useEffect`, missing cleanup, intervals without clear, event listeners without removal (battery + leak risk).
7. **Auth / RLS edge cases** — cross-user reads that should be SECURITY DEFINER RPCs, places assuming `profiles` row exists.

## Pass 2 — Runtime spot-checks

8. Drive the live app with Playwright on key flows: start session → log sets → finish → review history → progression banner → CSV export. Capture console + network errors.
9. Verify the recent fixes still hold: `set_index` ordering, RIR display from history, autosave preservation on save failure, progression auto-fill, deload acceptance gating.

## Pass 3 — Triage & fix

10. Produce a categorized list (Critical / High / Medium / Low / Cosmetic) with file:line refs.
11. **Fix Critical + High automatically** in this same task. These are bugs that cause data loss, wrong numbers shown to you, crashes, or silent failures.
12. **List Medium / Low / Cosmetic** for your approval before touching — many "bugs" at that level are actually intentional behavior, and I don't want to churn code you didn't ask to change.

## What I will NOT do without asking

- Refactor working code for style/cleanliness
- Change workout content, RIR targets, set counts, or exercise selection
- Restructure folders or rename files
- Touch gamification balancing, deload thresholds, or progression increments

## Deliverable

A short report in chat: what was found, what I fixed, what's left for you to decide on, with file:line references so you can verify.

## Question before I start

Audit scope — which do you want?
- **A. Everything** (workout, food, recovery, gamification, community, coach, demo mode) — most thorough, longest
- **B. Workout-only** (session logging, history, progression, deload, volume, PRs) — where you've been hitting bugs
- **C. Workout + recovery/biometrics** — skips food, gamification, community

I'd recommend **B** based on the recent issues, then a second pass on the rest if needed.
