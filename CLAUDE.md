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
npx supabase db push                    # Apply DB migrations to Supabase
npx supabase functions deploy <name>   # Deploy a single edge function (fatsecret-search, food-search, biometric-insight)
```

## Architecture

**Iron Keeper** is a React + TypeScript PWA for fitness and nutrition tracking, deployed via the Lovable platform (auto-deploys on git push to `main`).

**Stack:**
- Frontend: React 18, Vite/SWC, TailwindCSS, shadcn/ui (Radix UI), Framer Motion, Recharts
- Fonts: Barlow Condensed (display/headings) + DM Sans (body). Use `font-display` Tailwind class for headings/numbers.
- Backend: Supabase (Postgres + Auth + RLS), no custom server
- State: TanStack React Query for server state; React Context for auth
- Forms: React Hook Form + Zod

**Key data flow:**
- `src/hooks/useAuth.tsx` — Supabase auth context. In **demo mode** (`isDemoMode()`) short-circuits Supabase, injects fake `User` (`id: "demo-user"`). Exposes `updateAvatar(file)` / `removeAvatar()` backed by `avatars` Storage bucket.
- `src/hooks/useUserRole.tsx` — Reads `user_roles`; `isCoach` drives routing in `Index.tsx`.
- `src/lib/cloud-data.ts` — All Supabase read/write. Key exports:
  - *Sleep:* `fetchSleepLogs(daysBack)`, `upsertSleepLog({date,hours,quality,notes?})`, `deleteSleepLog(date)`
  - *Sets/history:* `fetchRecentSets(daysBack)`, `fetchExercisePRHistory()` → `ExercisePRTrend[]`, `bestOneRmForLift(prs, matcher, epleyFn)`
  - *Strength profile:* `fetchStrengthProfile()` → `{bodyweight,sex,age}`
  - *Progress photos:* `fetchProgressPhotos()`, `uploadProgressPhoto(file,date,notes?)`, `deleteProgressPhoto(id,path)`, `updateProgressPhotoNotes(id,notes)`
  - *Weekly reviews:* `fetchWeeklyReview(weekStart)`, `fetchAllWeeklyReviews()`, `upsertWeeklyReview(...)`, `deleteWeeklyReview(id)`, `computeWeekStats(weekStart)` → `WeekSummary`
  - *Calorie burn:* `fetchDailyBurn(date)`, `fetchWeeklyBurn(weekStart)` (strength vs cardio split). `lookupUserBodyweight` falls back to `nutrition_goals.tdee_weight_kg` then 75 kg. `mondayOfWeek(date)`, `recentMondays(weeks)`.
  - *Leaderboard:* `fetchTopExercises(timeFilter)`, `fetchLeaderboard1RM(exerciseId, timeFilter)` (includes `isTested`), `fetchLeaderboardMaxWeight`, `fetchLeaderboardMaxReps`, `fetchLeaderboardSessionVolume(sessionType, timeFilter)` → `VolumeLeaderboardEntry[]` (`sessionCount` = cumulative, not single best). `TimeFilter = 'all' | 'monthly' | 'weekly' | 'prev_weekly' | 'prev_monthly'` (prev_* internal only). `updateLeaderboardVisibility(visible)`, `fetchLeaderboardVisibility()`.
  - *Biometrics:* `upsertDailyBiometrics`, `fetchDailyBiometrics(daysBack)`, `upsertDailyScore`, `fetchDailyScores(daysBack)`, `fetchTodayScore`.
- `src/lib/workout-data.ts` — Static workout definitions + localStorage for in-progress sessions
- `src/lib/user-preferences.ts` — Split/schedule in **localStorage** under `ik-prefs-{userId}`. `isGKSplit(userId)`, `isNoWorkoutMode(userId)` (`splitId === "none"`).
- `src/lib/demo-mode.ts` / `demo-data.ts` / `demo-supabase.ts` — Demo mode: sessionStorage flag `ik-demo`. `demo-supabase.ts` intercepts `.from()` calls and routes to in-memory store. `demo-tours.ts` defines guided tour steps per route.
- `src/lib/muscle-mapping.ts` — 17 canonical `MUSCLE_REGIONS`, `getMusclesWorked(...)`, `stripExerciseSuffixes(id)`.
- `src/lib/recovery.ts` — pure: `computeMuscleRecovery(sets, sleepLogs, splitId, now, settings)` → `Record<MuscleRegion, MuscleState>`.
- `src/lib/recovery-scores.ts` — Whoop-style scoring (pure). `computeRecoveryScore` (0–100), `computeStrainScore` (0–21), `computeStressLevel` (0–3), `computeSleepPerformance` (0–100), `computeAllScores(...)`. Color/label helpers included.
- `src/lib/strength-standards.ts` — 6-tier system for 8 lifts. `epley1RM(weight,reps)`, `getStrengthRating(liftId,oneRm,{bodyweight,sex,age?})`, `inferLiftId(exId,name)`, `overallTier(ratings)`.
- `src/lib/calorie-burn.ts` — `estimateCardioBurn(CardioInput)` (MET tables), `estimateStrengthBurn(StrengthInput)` (mechanical work + metabolic baseline). Both round to nearest 5 kcal.
- `src/lib/tdee-calculator.ts` — Mifflin-St Jeor. `calculateTDEE(params)` → TDEE + target calories + macros.
- `src/integrations/supabase/client.ts` — Supabase JS client singleton

**Routing** in `src/App.tsx`. Auth-guarded. `Index.tsx` does role-based redirect.

**Pages:** `Sessions`, `Progress` (Stats/Photos/Recovery tabs; tab via `?tab=` param), `WorkoutSession`, `WorkoutBuilder` (localStorage), `ExerciseLibrary`, `FoodTracker`, `History` (CSV export), `Onboarding`, `BodyMeasurements`, `CoachDashboard`, `Profile`, `ResetPassword`, `NutritionOnboarding`.

**Native app note:** PWA only — HealthKit/Health Connect inaccessible from web. Capacitor planned for App Store/Play Store. See PLAN.md → "Native App".

## Database Tables (all RLS, per-user)

- `profiles` — display name, `bodyweight`, `sex`, `age`
- `workout_history` — sessions; `calories_burned` INTEGER
- `workout_sets` — `set_type`: `"working"` (default) | `"warmup"` | `"1rm_test"`
- `food_logs` — includes extended nutrition (sugar, fiber, saturated fat, salt, barcode)
- `nutrition_goals` — `adjust_for_activity` BOOLEAN: adds burn to daily calorie goal
- `water_intake`, `body_measurements`, `daily_logs`, `user_roles`, `stretch_logs`
- `progress_photos` — private bucket `progress-photos` at `{user_id}/{date}-{timestamp}.jpg`; signed URLs
- `weekly_reviews` — `week_start` (Monday YYYY-MM-DD), unique on `(user_id, week_start)`, `photo_id` FK → `progress_photos`
- `sleep_logs` — unique on `(user_id, date)`; nullable stage columns: `deep_sleep_min`, `rem_sleep_min`, `light_sleep_min`, `awake_min`, `sleep_efficiency`
- `activity_logs` — `distance_km`, `incline_pct`, `calories_burned`
- `daily_biometrics` — `samsung_stress_score`, `resting_hr`, `spo2_pct`, `hrv_ms`, `respiratory_rate`, `source` ('manual'|'health_connect'); unique on `(user_id, date)`
- `daily_scores` — `recovery_score`, `strain_score`, `stress_level`, `sleep_performance`, `ai_insight` (jsonb), `ai_generated_at`; unique on `(user_id, date)`

Migrations in `supabase/migrations/`. **Supabase Storage:** `avatars` (public), `progress-photos` (private).

## Static Data (in-code)

- `exercise-library.ts` — 60 originals (`lib-1`–`lib-60`) + 717 from free-exercise-db (`lib-db-*`). **Do not re-import.** Next hand-written ID: `lib-61`.
- `exercise-substitutions.ts` — keys must match IDs in `workout-data.ts` exactly.
- `accessory-routines.ts` — 3 routines (Abs, Grip, Wrist) with superset flags.
- `training-splits.ts` — 10+ built-in splits (GK, PPL, Upper/Lower, 5/3/1, Arnold, etc.).

## UX Conventions

- **Overlays:** shadcn `Sheet` (bottom drawer), not `Dialog`.
- **Toasts:** `import { toast } from "sonner"`.
- **Haptics:** `hapticMedium()` / `hapticSuccess()` from `src/lib/haptics.ts` on significant interactions.
- **Swipe gestures:** Framer Motion `drag="x"` + `touchAction: "pan-y"`. In `Reorder.Group`, set `dragListener={false}` on `Reorder.Item` and use `useDragControls` on grip handle.
- **Swipe-to-delete:** Red background opacity via `useTransform(x, [-100, -30], [1, 0])`. Sliding div must use `bg-card` (opaque).
- **Animations:** Framer Motion throughout — page transitions, `Reorder`, collapse/expand.

## Supabase

- Project ref: `kzwkdhwselqchhcqkyzs`
- CLI: `npx supabase link --project-ref kzwkdhwselqchhcqkyzs` then `npx supabase db push`. Requires `SUPABASE_ACCESS_TOKEN`.
- Auth: Google OAuth only. No hardcoded URLs in `src/integrations/supabase/client.ts`.
- User data import: `data-export/generate_import.py` — old UID + new UID → `import.sql`.

## Git Workflow

Lovable and auto-changelog push to `main` frequently. **Active repo: `iron-keeper-reborn`** (`origin`). The `reborn` remote is legacy — do not push there.

```bash
# Before edits:
git stash && git pull --rebase origin main && git stash pop
# To push:
git stash && git pull --rebase origin main && git stash pop && git push origin main
```

`package-lock.json` is perpetually dirty — never commit it. **Never commit** `.claude/` or `.playwright-mcp/`.

**Food data:** Text search → `fatsecret-search` edge function (FatSecret OAuth 1.0). Barcode → Open Food Facts API (`src/lib/open-food-facts.ts`). Extended nutrition fetched synchronously at log time.

## Gotchas

- **LucideIcon serialization:** `JSON.stringify` drops functions/Symbols — `icon` becomes `{}` in localStorage. `getAllCustomWorkouts()` patches with `icon: Dumbbell`. Account for this when storing/rendering custom workout icons.
- **Custom workout search pool:** `WorkoutBuilder.tsx` builds `ALL_EXERCISES` from WORKOUTS + ACCESSORY_ROUTINES + EXERCISE_LIBRARY. `WorkoutSession.tsx` has parallel `ALL_SWAP_EXERCISES`. Add new sources to both.
- **`exercise-substitutions.ts` key sync:** Keys must match `workout-data.ts` IDs exactly or swap sheet silently shows nothing.
- **Exercise naming:** "Flies"/"Fly" not "Flyes"/"Flye". IDs still use old spelling — do not rename IDs.
- **WeekStrip deletes:** Workout sessions → `deleteWorkoutFromCloud`; activity logs → `deleteActivityLog`. Both trigger `setRefreshKey` increment.
- **Cable attachment exercises:** Set cannot complete without selecting attachment. `getEffectiveExId()` appends `-{attachmentKey}` so each attachment has independent PR history.
- **Demo mode:** `isDemoMode()` checked at top of `useAuth` useEffect — if true, Supabase never called. Flag lives in sessionStorage (auto-clears on tab close).
- **Supabase edge function calls:** Always include `{ headers: { apikey: VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: \`Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}\` } }`. Pattern defined as `edgeFunctionHeaders` in `src/lib/open-food-facts.ts`.
- **`isBilateralDumbbell` is keyword-only:** Detects by string-matching `DB_INDICATORS` against name + ID. Exercises without "dumbbell" in name (e.g. "Bulgarian Split Squat") must be explicitly added to `DB_INDICATORS`.
- **Superset accessory `exerciseOrder` rule:** Only the **first** exercise in a superset is added to `exerciseOrder`. Superset group must use `<Reorder.Item dragListener={false}>` — a plain `<div>` causes `onReorder` to silently drop IDs.
- **Previous-sets fallback after substitutions:** `fetchLastSessionData` only returns sets from the most-recent session. `WorkoutSession` calls `fetchExerciseLastData(exerciseId)` in parallel for missing exercises.
- **Machine row variant pill (`pl1`):** "Seated Row Machine" uses `heavyStackExercises` — default = "Machine Row" (`pl1`), in set = "Low Row" (`pl1-heavy`). Pill hidden when exercise is swapped.
- **`workout_sets.user_id` may be NULL on older rows:** Always join via `workout_history.user_id`, never `workout_sets.user_id`.
- **Cross-user queries need SECURITY DEFINER RPC:** RLS blocks direct `.from()` on other users' rows. Use `supabase.rpc()`. See `get_1rm_leaderboard` in `20260509160000_leaderboard_fix_join_via_history.sql`.
- **`profiles` rows may be missing:** `handle_new_user()` trigger doesn't always fire. Always `LEFT JOIN profiles` and handle NULL.
- **Supabase CLI migration repair:** When `db push` reports "remote migration versions not found in local", run `npx supabase migration repair --status applied <versions...>` then push again.
- **`npx supabase db push` fails locally** — no DB credentials in local env. Paste SQL into Supabase dashboard SQL editor instead. Migration file still goes in `supabase/migrations/`.
- **`CREATE OR REPLACE FUNCTION` cannot change return type** — must `DROP FUNCTION IF EXISTS fn_name(arg_types)` first. Always add DROP to migration when changing a `RETURNS TABLE` function's shape.
- **Lucide icon `Weight` does not exist** — use `Scale`. Verify icon names against existing imports.
- **Galaxy Watch / Samsung Health:** PWA cannot access Health Connect (Android-native IPC). Manual check-in is current solution. Phase 2: Capacitor + `@capacitor-community/health-connect`.
- **`AnimatedNumber` has no `style` prop** — wrap in `<span style={...}>` for inline colour overrides.
- **`biometric-insight` edge function needs `ANTHROPIC_API_KEY`** — set via Supabase dashboard → Edge Functions → Secrets.
- **`WorkoutSession` warm-up sets:** Seeds 2 sets (50%×5, 75%×5), capped at 3 total (40/60/80%); excluded from PR checks and rep-range toasts; 60s rest timer; weights round to nearest 2.5 kg via `roundToPlate`.
- **`HomeCombinedRecoveryCard`:** Homepage uses a single unified recovery card (`src/components/HomeCombinedRecoveryCard.tsx`) — do not re-split into separate `RecoveryDashboard` + `RecoveryCard`. Top half (biometric scores + AI headline) only renders when the user has checked in that day; bottom half (muscle diagram) always shows.
- **`generateAIInsight` in `BiometricCheckIn.tsx`:** `next_workout` in the AI payload is always `null` — not yet wired to the user's training split. SpO2 is now passed correctly.
