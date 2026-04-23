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
npx supabase functions deploy <name>   # Deploy a single edge function (fatsecret-search, food-search)
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
- `src/hooks/useAuth.tsx` — Supabase auth context, wraps the entire app. In **demo mode** (`isDemoMode()` = true) it short-circuits Supabase and injects a fake `User` object (`id: "demo-user"`). Exposes `updateAvatar(file)` and `removeAvatar()` for profile photo backed by Supabase Storage bucket `avatars` (public).
- `src/hooks/useUserRole.tsx` — Reads `user_roles` table; `isCoach` drives routing in `Index.tsx` (coach → CoachDashboard, member → home)
- `src/lib/cloud-data.ts` — All Supabase read/write operations. Key exports by area:
  - *Sleep:* `fetchSleepLogs(daysBack)`, `upsertSleepLog({date,hours,quality,notes?})`, `deleteSleepLog(date)`
  - *Sets/history:* `fetchRecentSets(daysBack)` → `RecentSetRecord[]`, `fetchExercisePRHistory()` → `ExercisePRTrend[]` (PR trend per exercise), `bestOneRmForLift(prs, matcher, epleyFn)`
  - *Strength profile:* `fetchStrengthProfile()` → `{bodyweight,sex,age}` (from `profiles` table)
  - *Progress photos:* `fetchProgressPhotos()` → `ProgressPhoto[]` (with signed URLs), `uploadProgressPhoto(file,date,notes?)`, `deleteProgressPhoto(id,storagePath)`, `updateProgressPhotoNotes(id,notes)`
  - *Weekly reviews:* `fetchWeeklyReview(weekStart)`, `fetchAllWeeklyReviews()`, `upsertWeeklyReview({weekStart,rating,wentWell,toImprove,focusNext,photoId?})`, `deleteWeeklyReview(id)`, `computeWeekStats(weekStart)` → `WeekSummary`
  - *Calorie burn:* `fetchDailyBurn(date)` → `DailyBurn`, `fetchWeeklyBurn(weekStart)` → `WeeklyBurn` (splits strength vs cardio kcal). `lookupUserBodyweight(userId)` → falls back to `nutrition_goals.tdee_weight_kg` then 75 kg. `mondayOfWeek(date)` → YYYY-MM-DD string. `recentMondays(weeks)` → array of Monday strings.
  - Activity logs now include `distanceKm`, `inclinePct`, `caloriesBurned`. `saveActivityLog` auto-computes burn client-side via `estimateCardioBurn`. `workout_history` rows now include `caloriesBurned` computed via `estimateStrengthBurn` at save time.
  - Uses `stripExerciseSuffixes` from `muscle-mapping.ts` to clean exercise IDs before saving.
- `src/lib/workout-data.ts` — Static workout definitions + localStorage for in-progress sessions
- `src/lib/user-preferences.ts` — User split/schedule/onboarding stored in **localStorage** under `ik-prefs-{userId}` (not Supabase). `isGKSplit(userId)` checks `splitId === "gk"`. `isNoWorkoutMode(userId)` checks `splitId === "none"` — for nutrition-only users who opted out of a workout programme.
- `src/lib/demo-mode.ts` — `isDemoMode()` reads sessionStorage flag `ik-demo`. `enterDemo()` sets the flag + seeds `ik-prefs-demo-user` so onboarding is skipped. `exitDemo()` clears all demo state. Demo user has `id: "demo-user"`, email `demo@ironkeeper.app`.
- `src/lib/muscle-mapping.ts` — `MUSCLE_REGIONS` (17 canonical regions), `MUSCLE_LABELS`, `RECOVERY_HOURS` per region, `getMusclesWorked(exerciseId, exerciseName, targetMuscle, muscleGroup)` → `{ primary, secondary }`. `stripExerciseSuffixes(id)` strips cable attachment suffixes for lookup.
- `src/lib/recovery.ts` — pure calculation: `computeMuscleRecovery(sets, sleepLogs, splitId, now, settings)` → `Record<MuscleRegion, MuscleState>`. `MuscleState = { score, status, lastWorkedAt, lastVolume, hoursUntilReady }`. No React or Supabase imports. `statusColor(status)` and `statusLabel(status)` helpers.
- `src/lib/recovery-settings.ts` — `RecoverySettings` type, `DEFAULT_RECOVERY_SETTINGS`, `recoveryWindowMultiplier(model)`
- `src/hooks/useRecoverySettings.tsx` — reads/writes recovery settings from localStorage under `ik-recovery-settings-{userId}`
- `src/integrations/supabase/client.ts` — Supabase JS client singleton
- `src/components/NextSessionCard.tsx` — derives next workout from split + history via `getNextSplitDay`. Rotation pills are tappable to locally override via `overrideWorkoutId` state. The dropdown only shows workouts outside the split.
- `src/components/recovery/BodyDiagram.tsx` — SVG silhouette (front + back toggle). Coordinate space 240×460; anatomically accurate `FRONT_SILHOUETTE`/`BACK_SILHOUETTE` paths plus per-muscle `FRONT_PATHS`/`BACK_PATHS`. Each muscle region is a `<motion.path>` coloured by recovery status. Props: `states`, `view`, `interactive`, `size`, `highlighted` (externally-controlled highlight). `viewForMuscle(region)` exported to auto-switch front/back. Bidirectional: tapping diagram highlights region; clicking a muscle row in the list also sets `highlighted` and calls `viewForMuscle`.
- `src/components/recovery/RecoveryCard.tsx` — home page preview (glass card, non-interactive diagram, summary line, links to `/progress?tab=recovery`).
- `src/components/recovery/SleepCard.tsx` — home sleep logging card. Tap to open Sheet: Slider for hours (0.5 steps), 1–5 quality buttons, optional note. Calls `upsertSleepLog`.
- `src/components/recovery/RecoverySettings.tsx` — gear icon button that opens a Sheet to tune recovery model + sleep weight. Saves via `useRecoverySettings`.
- `src/components/demo/HelpButton.tsx` — `?` icon button in page headers. Shows contextual tour or links to help content.
- `src/components/demo/DemoBanner.tsx` — banner shown when `isDemoMode()` is true.
- `src/components/demo/DemoTour.tsx` — step-by-step overlay tour component.
- `src/components/AnimatedNumber.tsx` — Framer Motion animated counting number, accepts `value` (number) + optional `suffix`.
- `src/lib/strength-standards.ts` — 6-tier rating system (Untrained → Elite) for 8 compound lifts (`bench`, `squat`, `deadlift`, `ohp`, `row`, `front_squat`, `hip_thrust`, `weighted_pullup`). Standards from Lon Kilgore/ExRx norms, interpolated by bodyweight. Exports: `RATED_LIFTS`, `TIER_COLORS`, `TIER_LABELS`, `epley1RM(weight,reps)`, `getStrengthRating(liftId,oneRm,{bodyweight,sex,age?})` → `StrengthRating`, `inferLiftId(exId,name)`, `overallTier(ratings)`.
- `src/lib/weekly-review.ts` — Week helper utilities (ISO Mon–Sun). `getMondayOf`, `getSundayOf`, `getCurrentWeekStart`, `getPreviousWeekStart`, `formatWeekRange`, `toDateStr`. Prompt-dismissal helpers keyed to localStorage: `isPromptDismissedForCurrentWeek`, `dismissPromptForCurrentWeek`, `shouldShowSundayPrompt`, `shouldShowMondayBanner`, `dismissPromptForPreviousWeek`.
- `src/components/progress/PhotosTab.tsx` — Progress Photos tab. Camera upload via hidden `<input>`, shows `ProgressPhotoGrid`, opens `PhotoCompareSheet`.
- `src/components/progress/ProgressPhotoGrid.tsx` — 2-column photo grid, swipe-to-delete, weight overlay from body measurements, full-screen tap.
- `src/components/progress/PhotoCompareSheet.tsx` — Side-by-side photo comparison Sheet with date selectors and weight delta.
- `src/components/progress/StrengthLevelCard.tsx` — Strength tier card shown in Stats tab. Reads PRs + strength profile, computes Epley 1RM per lift, displays `StrengthBar` + overall tier badge. Tap a lift → `StrengthLevelSheet`.
- `src/components/progress/StrengthLevelSheet.tsx` — Detail sheet for one lift: standards table, trend, "Test 1RM" button → `Test1RMSheet`.
- `src/components/progress/StrengthBar.tsx` — Visual tier progress bar.
- `src/components/progress/Test1RMSheet.tsx` — Guided 1RM test flow; saves set with `setType: "1rm_test"`.
- `src/lib/calorie-burn.ts` — Pure TS burn estimation (no React/Supabase). `estimateCardioBurn(CardioInput)` → kcal using Ainsworth MET tables (running, walking, cycling, swimming, yoga, football). `estimateStrengthBurn(StrengthInput)` → kcal using mechanical work term (weight × reps × 0.0035) + metabolic baseline (MET 5.5). Both round to nearest 5 kcal. SQL mirrors exist in the migration for backfills.
- `src/components/WeeklyEnergyCard.tsx` — Weekly kcal card shown in Stats tab. Total + stacked bar (strength in primary / cardio in amber). 4-week sparkline below. Uses `fetchWeeklyBurn`.
- `src/components/PRTrendChart.tsx` — Per-exercise PR trend (AreaChart + Recharts). Reads `fetchExercisePRHistory`. Searchable exercise picker. PR jump dots marked on chart.
- `src/components/weekly/WeeklyReviewSheet.tsx` — Bottom Sheet for creating, editing, and viewing weekly reviews. Fields: star rating (1–5), "went well", "to improve", "focus next", optional progress photo. Pulls `computeWeekStats` for auto-summary. `mode` prop: `"create" | "edit" | "view"`.
- `src/components/weekly/WeeklyReviewCard.tsx` — Compact review card (photo thumbnail + stars + snippet) used in History page.
- `src/components/weekly/WeeklyReviewPrompt.tsx` — Sunday-evening floating prompt (delayed 1.5s, dismissible, respects localStorage flag). Opens `WeeklyReviewSheet`.
- `src/components/weekly/MondayBanner.tsx` — Monday banner reminding user to log last week's review. Only shows if review is missing and prompt wasn't dismissed. Dismissible.
- `src/components/HomeDailySummary.tsx` — Home page macro/energy summary card. Toggle between "Macros" view (protein/carbs/fat bars) and "Burn" view (calories eaten vs effective goal). When `adjust_for_activity` is on in nutrition goals, `effectiveCalorieGoal = goals.calories + burn.totalKcal` — the calorie bar and goal label both reflect this. Uses `fetchDailyBurn`. View preference persisted in localStorage under `ik-home-summary-view`.
- `src/components/WeekStrip.tsx` — Weekly activity strip. Activity logs now store `distanceKm`, `inclinePct`, `caloriesBurned` and display them in the card. Logging flow: rest days log instantly; all other activities open a detail form (pendingType state) before saving. `SUPPORTS_DISTANCE` set (walk/running/cycling/swimming) shows distance field; `SUPPORTS_INCLINE` set (walk/running) shows incline field. Strength workout cards display `caloriesBurned` (amber Flame icon) if set.
- `src/components/food/NutritionSettings.tsx` — Nutrition goals sheet. New "Add burned calories to goal" toggle (`adjust_for_activity`) — when on, FoodTracker and HomeDailySummary add today's burned kcal to the calorie goal.

**Routing** is in `src/App.tsx`. All routes are protected by auth guards. `Index.tsx` does role-based redirect.

**Pages:**
- `Sessions` — browse and start workout sessions
- `Progress` — **3 tabs: Stats | Photos | Recovery**. Tab state driven by `?tab=photos` or `?tab=recovery` search param (default: stats). Stats tab: frequency/volume charts, DailyReviewChart, PRTrendChart, StrengthLevelCard, **WeeklyEnergyCard**, Personal Records with swipe-to-delete. Photos tab: PhotosTab (upload, grid, compare). Recovery tab: interactive BodyDiagram with clickable muscle rows.
- `WorkoutSession` — active workout tracker (sets, reps, rest timer, exercise swap). Supports `setType: "working" | "warmup" | "1rm_test"`. Warm-up sets: "Add Warm-up" button seeds 2 sets (50%×5, 75%×5), capped at 3 total (40/60/80%); weights auto-fill from working weight at completion; 60s rest timer; excluded from PR checks and rep-range toasts. Long-press toggles working ↔ warmup. Warm-up weights round to nearest 2.5 kg via `roundToPlate`. On set completion: toasts if reps hit top of range (suggest weight up) or fall below bottom (suggest weight down); skipped for 1RM test and warmup sets.
- `WorkoutBuilder` — create custom workouts; stored in **localStorage** under `ironkeeper_custom_workouts`
- `ExerciseLibrary` — browsable exercise index; data is static in `src/lib/exercise-library.ts`
- `FoodTracker` — nutrition logging with barcode scan, meal groups, weekly chart
- `History` — past workout log; also shows all weekly reviews (`WeeklyReviewCard`) with ability to open/edit via `WeeklyReviewSheet`.
- `BodyMeasurements` — weight + body fat log with trend chart; also accessible via Profile
- `Profile` — settings, preferences, onboarding re-entry, avatar upload/remove
- `NutritionOnboarding` — onboarding for users who chose "no workout programme" (`splitId === "none"`)

**Database tables** (all with RLS, scoped per user):
- `profiles` — display name, `bodyweight`, `sex`, `age` (used by strength standards)
- `workout_history` — completed workout sessions. `calories_burned` INTEGER column added (migration `20260423...`).
- `workout_sets` — individual sets per session. `set_type` column: `"working"` (default) | `"warmup"` | `"1rm_test"`. Migration `20260422151128...`
- `food_logs` — nutrition entries (includes extended nutrition: sugar, fiber, saturated fat, salt, barcode)
- `nutrition_goals` — per-user calorie, macro, and water targets. `adjust_for_activity` BOOLEAN column: when true, daily calorie goal increases by calories burned that day.
- `water_intake` — daily water entries
- `body_measurements` — weight and body fat readings
- `daily_logs` — daily completion/notes log
- `user_roles` — coach vs. member role (`role` column, checked by `useUserRole`)
- `progress_photos` — `user_id`, `date`, `storage_path`, `pose`, `notes`. Images in `progress-photos` private bucket at `{user_id}/{date}-{timestamp}.jpg`. Display via signed URLs. `photo_id` on `weekly_reviews` FK references this. Coach SELECT policy included. Migration `20260422133535...`
- `weekly_reviews` — `user_id`, `week_start` (YYYY-MM-DD Monday), `rating` (1–5), `went_well`, `to_improve`, `focus_next`, `photo_id` (FK → `progress_photos`). Unique on `(user_id, week_start)`. Coach SELECT policy. Migration `20260422133535...`
- `sleep_logs` — `user_id`, `date` (YYYY-MM-DD), `hours` (numeric 3,1), `quality` (1–5), `source` (default `manual`), `notes`. Unique on `(user_id, date)`. Has coach SELECT policy. Updated by `upsertSleepLog`, fetched by `fetchSleepLogs(daysBack)`, deleted by `deleteSleepLog(date)`.
- `activity_logs` — `distance_km`, `incline_pct`, `calories_burned` columns added (migration `20260423...`). `saveActivityLog` accepts these extra fields and auto-computes burn.

**DB helper functions** (defined in migration `20260423...`):
- `lookup_user_bodyweight(_user_id, _on_date)` → most-recent body_measurements weight, fallback nutrition_goals.tdee_weight_kg, fallback 75
- `estimate_cardio_burn(_activity_type, _duration_min, _distance_km, _incline_pct, _weight_kg)` → INTEGER kcal (pace-aware MET)
- `estimate_strength_burn(_workout_history_id, _duration_min, _weight_kg)` → INTEGER kcal (work term + metabolic baseline)
- Used for server-side backfills; live path computes client-side via `src/lib/calorie-burn.ts`

Migrations live in `supabase/migrations/` and must be pushed with `npx supabase db push`.

**Supabase Storage buckets:**
- `avatars` — public bucket; files at `{user_id}/avatar-{timestamp}.ext`. Used by `updateAvatar`/`removeAvatar` in `useAuth`.
- `progress-photos` — private bucket; files at `{user_id}/{date}-{timestamp}.jpg`. Fully wired up — upload via `uploadProgressPhoto`, display via signed URLs from `fetchProgressPhotos`.

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

**Food data:** Text search goes through the `fatsecret-search` Supabase edge function (FatSecret OAuth 1.0, credentials stored as Supabase secrets). Barcode lookup uses the Open Food Facts API directly (`src/lib/open-food-facts.ts`). Extended nutrition fields are fetched synchronously at log time to guarantee they're saved.

## Gotchas

- **LucideIcon serialization:** LucideIcon components are `forwardRef` objects — `JSON.stringify` drops functions and Symbols, so `icon` becomes `{}` in localStorage. `getAllCustomWorkouts()` in `workout-data.ts` patches every loaded workout with `icon: Dumbbell` to fix this. Any code that stores or renders custom workout icons must account for it.
- **Custom workout search pool:** `WorkoutBuilder.tsx` builds `ALL_EXERCISES` at module load from WORKOUTS + ACCESSORY_ROUTINES + EXERCISE_LIBRARY (deduplicated by lowercase name). `WorkoutSession.tsx` builds a parallel `ALL_SWAP_EXERCISES` pool for the swap sheet and Add Exercise sheet. If new exercise sources are added, include them in both build loops.
- **`exercise-substitutions.ts` key sync:** Substitution keys must match exercise IDs in `workout-data.ts` exactly. When an exercise ID changes, update the corresponding key in substitutions or the swap sheet silently shows nothing.
- **Exercise naming:** Use "Flies"/"Fly" not "Flyes"/"Flye" — all library entries were updated. IDs still contain the old spelling (e.g. `lib-db-Dumbbell_Flyes`) — do not rename IDs.
- **WeekStrip deletes:** Workout sessions deleted from WeekStrip use `deleteWorkoutFromCloud` (same function as History page). Activity logs use `deleteActivityLog`. Both trigger a `setRefreshKey` increment to re-fetch.
- **Add Exercise to session:** `WorkoutSession` supports adding any exercise mid-session via a search Sheet with muscle group pill filters. Added exercises are stored in `addedExercises: Exercise[]` state and persisted in the auto-save localStorage key alongside `addedAccessories`. Swipe-to-delete removes from `addedExercises` + `exerciseOrder` + `setLogs`.
- **Accessory routines:** Icon for each routine is derived via `accessoryIcon(routine.id)` in `WorkoutSession` — maps `acc-abs`→Flame, `acc-grip`→Hand, others→Zap. The `emoji` field on `AccessoryRoutine` is no longer rendered in the session UI.
- **Cable attachment exercises:** `WorkoutSession` has `CABLE_ATTACHMENTS` (Handles, V-Bar, MAG Grip, Straight Bar, Rope, Cuff & Lat Bar) and `isCableAttachmentExercise(name)`. A set cannot be completed without selecting an attachment first. `getEffectiveExId()` appends `-{attachmentKey}` to the exercise ID so each attachment tracks its own PR history independently. Last session's attachment is pre-selected on load.
- **Password reset flow:** `EmailAuthForm` sends reset emails redirecting to `/reset-password`. The `ResetPassword.tsx` page handles the Supabase `PASSWORD_RECOVERY` auth event and calls `supabase.auth.updateUser({ password })` to complete the flow.
- **Demo mode:** `isDemoMode()` is checked at the top of `useAuth`'s `useEffect` — if true, Supabase is never called; a synthetic `User` with `id: "demo-user"` is injected. All cloud-data calls that use `supabase.auth.getUser()` will get this fake user; writes go nowhere (or to `demo-supabase.ts` shim). The demo flag lives in sessionStorage so it auto-clears on tab close.
- **`HelpButton` in headers:** Every main page has `<HelpButton />` in its header (from `src/components/demo/HelpButton.tsx`). It's context-aware — shows tour steps in demo mode, otherwise opens help content.
- **Supabase edge function calls:** Plain `fetch()` to `/functions/v1/...` silently returns 401 without auth headers. Always include `{ headers: { apikey: VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: \`Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}\` } }`. The pattern is defined as `edgeFunctionHeaders` in `src/lib/open-food-facts.ts` — reuse or copy it.
