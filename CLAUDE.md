# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **MANDATORY:** Read `PLAN.md` at the start of every session before making any changes. It contains active work status, architecture constraints, and decisions not visible in the code.

## Commands

```bash
npm run dev          # Start Vite dev server on port 8080
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run Vitest (single run)
npm run test:watch   # Vitest in watch mode
npx supabase db push # Apply DB migrations to Supabase
```

## Architecture

**Iron Keeper** is a React + TypeScript PWA for fitness and nutrition tracking, deployed via the Lovable platform (auto-deploys on git push to `main`).

**Stack:**
- Frontend: React 18, Vite/SWC, TailwindCSS, shadcn/ui (Radix UI), Framer Motion, Recharts
- Fonts: Barlow Condensed (display/headings) + DM Sans (body) via Google Fonts — defined in `src/index.css` and `tailwind.config.ts`. Use `font-display` Tailwind class for headings/numbers, default for body.
- Backend: Supabase (Postgres + Auth + RLS), no custom server
- State: TanStack React Query for server state; React Context for auth
- Forms: React Hook Form + Zod

**Key data flow:**
- `src/hooks/useAuth.tsx` — Supabase auth context, wraps the entire app
- `src/hooks/useUserRole.tsx` — Reads `user_roles` table; `isCoach` drives routing in `Index.tsx` (coach → CoachDashboard, member → home)
- `src/lib/cloud-data.ts` — All Supabase read/write operations (workout history, food logs, profiles, body measurements)
- `src/lib/workout-data.ts` — Static workout definitions + localStorage for in-progress sessions
- `src/lib/user-preferences.ts` — User split/schedule/onboarding stored in **localStorage** under `ik-prefs-{userId}` (not Supabase)
- `src/integrations/supabase/client.ts` — Supabase JS client singleton

**Routing** is in `src/App.tsx`. All routes are protected by auth guards. `Index.tsx` does role-based redirect.

**Pages:**
- `Sessions` — browse and start workout sessions
- `Progress` — 3-tab strip: **Stats** (frequency/volume charts), **Body** (weight trend + progress photos), **PRs** (personal records with swipe-to-delete)
- `WorkoutSession` — active workout tracker (sets, reps, rest timer, exercise swap)
- `WorkoutBuilder` — create custom workouts; stored in **localStorage** under `ironkeeper_custom_workouts`
- `ExerciseLibrary` — browsable exercise index; data is static in `src/lib/exercise-library.ts`
- `FoodTracker` — nutrition logging with barcode scan, meal groups, weekly chart
- `History` — past workout log
- `Progress` — charts and streaks
- `BodyMeasurements` — weight + body fat log with trend chart
- `Profile` — settings, preferences, onboarding re-entry

**Database tables** (all with RLS, scoped per user):
- `profiles` — display name and user info
- `workout_history` — completed workout sessions
- `workout_sets` — individual sets per session
- `food_logs` — nutrition entries (includes extended nutrition: sugar, fiber, saturated fat, salt, barcode)
- `nutrition_goals` — per-user calorie, macro, and water targets
- `water_intake` — daily water entries
- `body_measurements` — weight and body fat readings
- `daily_logs` — daily completion/notes log
- `user_roles` — coach vs. member role (`role` column, checked by `useUserRole`)
- `progress_photos` — progress photo metadata: `user_id`, `date`, `storage_path`, `notes`. Actual images in Supabase Storage bucket `progress-photos` (private). Files stored at `{user_id}/{date}-{timestamp}.jpg`. Display via signed URLs generated at fetch time.

Migrations live in `supabase/migrations/` and must be pushed with `npx supabase db push`.

**Static data (in-code, not DB):**
- `src/lib/exercise-library.ts` — exercise catalogue: 58 originals (`lib-1`–`lib-58`) + 717 imported from free-exercise-db (`lib-db-*`). **Do not re-import** — entries already exist.
- `src/lib/exercise-substitutions.ts` — per-exercise swap options; keys map 1:1 to exercise IDs in `workout-data.ts` (e.g. `bk2` = Pull-Ups, `bk3` = Barbell Row). Keep in sync when IDs change.
- `src/lib/accessory-routines.ts` — accessory workout definitions and substitutions
- `src/lib/stretching-data.ts` — stretching/recovery routines
- `src/lib/training-splits.ts` — built-in programme splits

## UX Conventions

- **Overlays:** use shadcn `Sheet` (bottom drawer), not `Dialog`, for overlays and detail views.
- **Toasts:** use `sonner` (`import { toast } from "sonner"`) for all user feedback.
- **Haptics:** call `hapticMedium()` / `hapticSuccess()` from `src/lib/haptics.ts` on significant interactions (set completion, save, delete). Uses the Vibration API — no-ops on desktop.
- **Swipe gestures:** Framer Motion `drag="x"` with `dragConstraints` — used in `WorkoutSession`, `FoodTracker`, `WorkoutBuilder`, `WeekStrip`, and `WorkoutCard` (history). Pair with `touchAction: "pan-y"` to preserve vertical scroll. When swipe-to-delete lives inside a `Reorder.Group`, set `dragListener={false}` on `Reorder.Item` and use `useDragControls` on the grip handle — otherwise the two drag axes conflict.
- **Swipe-to-delete pattern:** Red destructive background must use `useTransform(x, [-100, -30], [1, 0])` for opacity — **do not** use a fully-opaque absolute div behind a transparent sliding div; it bleeds through. The sliding div must use `bg-card` or equivalent opaque background.
- **Animations:** Framer Motion throughout — page transitions, list reordering (`Reorder`), collapse/expand. Keep motion consistent with existing patterns.

## Supabase Ownership

**Migration complete.** The app now uses a user-owned Supabase project.
- Project ref: `kzwkdhwselqchhcqkyzs` (Iron Keeper V2)
- `npx supabase link --project-ref kzwkdhwselqchhcqkyzs` + `npx supabase db push` works normally
- Supabase CLI requires `SUPABASE_ACCESS_TOKEN` env var — interactive login won't work in non-TTY environments
- Auth uses standard Supabase OAuth (`supabase.auth.signInWithOAuth`) — **not** `@lovable.dev/cloud-auth-js`
- Google OAuth is configured; Apple sign-in removed (no Apple Developer account)
- **The Supabase client** reads credentials from env vars only — `src/integrations/supabase/client.ts` has no hardcoded URLs
- User data import script: `data-export/generate_import.py` — provide old UID + new UID to generate `import.sql` for any user migrating from the old project

## Git Workflow

Lovable and the auto-changelog GitHub Action push to `main` frequently. **Active repo: `iron-keeper-reborn`** — `origin` points there. The old `ironkeeper-cf7d5021` repo is the `reborn` remote (legacy, do not push to it). **Always pull before editing files** and before pushing:

```bash
# Before starting any edits:
git stash && git pull --rebase origin main && git stash pop

# To push changes:
git stash && git pull --rebase origin main && git stash pop && git push origin main
```

`package-lock.json` is perpetually dirty locally (no `node_modules` in the repo) — `git stash` handles it. Never commit `package-lock.json` changes.

**Never commit** `.claude/` or `.playwright-mcp/` — both are untracked local tooling directories.

**PWA updates:** `main.tsx` polls `index.html` every 60s and triggers a reload when the hash changes. The service worker at `public/sw.js` also polls for updates. The auto-changelog workflow (`.github/workflows/auto-changelog.yml`) updates `src/lib/changelog.ts` on every push to `main`.

**Food data** comes from the Open Food Facts API (`src/lib/open-food-facts.ts`) including barcode lookup. Extended nutrition fields are fetched synchronously at log time to guarantee they're saved.

## Gotchas

- **LucideIcon serialization:** LucideIcon components are `forwardRef` objects — `JSON.stringify` drops functions and Symbols, so `icon` becomes `{}` in localStorage. `getAllCustomWorkouts()` in `workout-data.ts` patches every loaded workout with `icon: Dumbbell` to fix this. Any code that stores or renders custom workout icons must account for it.
- **Custom workout search pool:** `WorkoutBuilder.tsx` builds `ALL_EXERCISES` at module load from WORKOUTS + ACCESSORY_ROUTINES + EXERCISE_LIBRARY (deduplicated by lowercase name). `WorkoutSession.tsx` builds a parallel `ALL_SWAP_EXERCISES` pool for the swap sheet and Add Exercise sheet. If new exercise sources are added, include them in both build loops.
- **`exercise-substitutions.ts` key sync:** Substitution keys must match exercise IDs in `workout-data.ts` exactly. When an exercise ID changes, update the corresponding key in substitutions or the swap sheet silently shows nothing.
- **Exercise naming:** Use "Flies"/"Fly" not "Flyes"/"Flye" — all library entries were updated. IDs still contain the old spelling (e.g. `lib-db-Dumbbell_Flyes`) — do not rename IDs.
- **WeekStrip deletes:** Workout sessions deleted from WeekStrip use `deleteWorkoutFromCloud` (same function as History page). Activity logs use `deleteActivityLog`. Both trigger a `setRefreshKey` increment to re-fetch.
- **Add Exercise to session:** `WorkoutSession` supports adding any exercise mid-session via a search Sheet with muscle group pill filters. Added exercises are stored in `addedExercises: Exercise[]` state and persisted in the auto-save localStorage key alongside `addedAccessories`. Swipe-to-delete removes from `addedExercises` + `exerciseOrder` + `setLogs`.
- **Accessory routines:** Icon for each routine is derived via `accessoryIcon(routine.id)` in `WorkoutSession` — maps `acc-abs`→Flame, `acc-grip`→Hand, others→Zap. The `emoji` field on `AccessoryRoutine` is no longer rendered in the session UI.
