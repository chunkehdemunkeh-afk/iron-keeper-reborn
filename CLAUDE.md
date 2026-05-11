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
  - Activity logs include `distanceKm`, `inclinePct`, `caloriesBurned`. `saveActivityLog` auto-computes burn client-side via `estimateCardioBurn`. `workout_history` rows include `caloriesBurned` computed via `estimateStrengthBurn` at save time.
  - Uses `stripExerciseSuffixes` from `muscle-mapping.ts` to clean exercise IDs before saving.
  - *Leaderboard:* `fetchTopExercises(timeFilter)` → `TopExercise[]`, `fetchLeaderboard1RM(exerciseId, timeFilter)` → `LeaderboardEntry[]` (includes `isTested` flag), `fetchLeaderboardMaxWeight`, `fetchLeaderboardMaxReps`, `fetchLeaderboardSessionVolume(sessionType, timeFilter)` → `VolumeLeaderboardEntry[]`. `TimeFilter = 'all' | 'monthly' | 'weekly' | 'prev_weekly' | 'prev_monthly'` (prev_* are internal-only for trend comparison queries). `VolumeLeaderboardEntry` has `sessionCount: number` (cumulative sessions, not a single best session). `updateLeaderboardVisibility(visible)`, `fetchLeaderboardVisibility()`.
- `src/lib/workout-data.ts` — Static workout definitions + localStorage for in-progress sessions
- `src/lib/user-preferences.ts` — User split/schedule/onboarding stored in **localStorage** under `ik-prefs-{userId}` (not Supabase). `isGKSplit(userId)` checks `splitId === "gk"`. `isNoWorkoutMode(userId)` checks `splitId === "none"` — for nutrition-only users who opted out of a workout programme.
- `src/lib/demo-mode.ts` — `isDemoMode()` reads sessionStorage flag `ik-demo`. `enterDemo()` sets the flag + seeds `ik-prefs-demo-user` so onboarding is skipped. `exitDemo()` clears all demo state. Demo user has `id: "demo-user"`, email `demo@ironkeeper.app`.
- `src/lib/demo-data.ts` — In-memory seeded fixtures for Demo Mode. Provides mock workout history, sets, body measurements, food logs, water intake, and activity data. Exports `getDemoStore()`, `demoInsert()`, `demoUpdate()`, `demoDelete()`.
- `src/lib/demo-supabase.ts` — Intercepts Supabase `.from()` calls in Demo Mode and routes them to the in-memory demo store. Implements a PostgREST query builder subset (select, insert, update, upsert, delete; filters: eq, in, gte, lte; ordering, limit, single/maybeSingle). Also patches `supabase.auth.getUser()` to return the mock demo user.
- `src/lib/demo-tours.ts` — Defines guided tour steps for each major route. Exports `TOURS` record mapping route paths to `Tour` objects (`id`, array of `TourStep` with title + body). Consumed by `useDemoTour` + `DemoTour`.
- `src/lib/changelog.ts` — Version history and release notes. Exports `ChangelogEntry` interface (`version`, `date`, `title`, `changes[]`) and `changelog[]` array (newest first). Auto-updated by `.github/workflows/auto-changelog.yml` on every push to `main`. Displayed via `WhatsNewSheet`.
- `src/lib/tdee-calculator.ts` — Mifflin-St Jeor TDEE calculator. Exports `Gender`, `ActivityLevel`, `GoalType` types and label records. `calculateTDEE(params)` returns TDEE, target calories, and macro breakdown (protein/carbs/fat). Used by `TDEESetup` during nutrition onboarding.
- `src/lib/muscle-mapping.ts` — `MUSCLE_REGIONS` (17 canonical regions), `MUSCLE_LABELS`, `RECOVERY_HOURS` per region, `getMusclesWorked(exerciseId, exerciseName, targetMuscle, muscleGroup)` → `{ primary, secondary }`. `stripExerciseSuffixes(id)` strips cable attachment suffixes for lookup.
- `src/lib/recovery.ts` — pure calculation: `computeMuscleRecovery(sets, sleepLogs, splitId, now, settings)` → `Record<MuscleRegion, MuscleState>`. `MuscleState = { score, status, lastWorkedAt, lastVolume, hoursUntilReady }`. No React or Supabase imports. `statusColor(status)` and `statusLabel(status)` helpers.
- `src/lib/recovery-scores.ts` — Whoop-style daily scoring (pure, no React/Supabase). `computeUserBaseline(history)` → 28-day rolling `{avgStress,stdStress,avgRHR,stdRHR,...}`. `computeRecoveryScore(today,baseline,sleep,prevDayStrain)` → 0–100 (Samsung stress 40%, sleep 35%, RHR 20%, resp 5%). `computeStrainScore(workoutCalories,effortRating,activityCalories)` → 0–21 log scale. `computeStressLevel(today,baseline)` → 0–3. `computeSleepPerformance(sleep,prevDayStrain)` → 0–100 (sleepNeed scales with prevStrain). `computeAllScores(...)` wrapper. Color/label helpers: `recoveryColor`, `recoveryLabel`, `stressLevelColor`, `stressLevelLabel`, `strainColor`, `strainLabel`, `sleepPerformanceLabel`.
- `src/lib/recovery-settings.ts` — `RecoverySettings` type, `DEFAULT_RECOVERY_SETTINGS`, `recoveryWindowMultiplier(model)`
- `src/hooks/useRecoverySettings.tsx` — reads/writes recovery settings from localStorage under `ik-recovery-settings-{userId}`
- `src/hooks/useDemoTour.tsx` — manages demo tour state (current step, active tour ID, completed tours) via localStorage. Drives `DemoTour` component visibility.
- `src/hooks/use-mobile.tsx` — `useIsMobile()` returns `true` when viewport width < 768px (matchMedia listener, updates on resize). Used throughout for responsive layout decisions.
- `src/integrations/supabase/client.ts` — Supabase JS client singleton
- `src/components/NextSessionCard.tsx` — derives next workout from split + history via `getNextSplitDay`. Rotation pills are tappable to locally override via `overrideWorkoutId` state. The dropdown only shows workouts outside the split.
- `src/components/recovery/BodyDiagram.tsx` — SVG silhouette (front + back toggle). Coordinate space 240×460; anatomically accurate `FRONT_SILHOUETTE`/`BACK_SILHOUETTE` paths plus per-muscle `FRONT_PATHS`/`BACK_PATHS`. Each muscle region is a `<motion.path>` coloured by recovery status. Props: `states`, `view`, `interactive`, `size`, `highlighted` (externally-controlled highlight). `viewForMuscle(region)` exported to auto-switch front/back. Bidirectional: tapping diagram highlights region; clicking a muscle row in the list also sets `highlighted` and calls `viewForMuscle`.
- `src/components/recovery/RecoveryCard.tsx` — home page preview (glass card, non-interactive diagram, summary line, links to `/progress?tab=recovery`).
- `src/components/biometrics/RecoveryDashboard.tsx` — home page Whoop-style score card (recovery % ring, strain/stress/sleep metrics, AI headline). Tap → `RecoveryDetailSheet`. Shows CTA if no check-in today. Only shown on today's date.
- `src/components/biometrics/RecoveryDetailSheet.tsx` — full analysis sheet: 2×2 score grid with expandable explanations, Claude AI coaching sections, 14d recovery + RHR trend charts (Recharts), breathwork prompt when `stress_level ≥ 2.0` (uses `ExerciseTimer`).
- `src/components/biometrics/BiometricCheckIn.tsx` — morning data entry Sheet. Saves biometrics → computes scores client-side → calls `biometric-insight` edge function async for AI. Accepts `prefill` prop for yesterday's values.
- `src/components/biometrics/MorningCheckInPrompt.tsx` — delayed overlay (1.8s, shows 5am–1pm, dismisses to `ik-checkin-dismissed-{date}` localStorage). Mirrors `WeeklyReviewPrompt` pattern.
- `src/components/biometrics/HRVTrendCard.tsx` — 14-day biometric trend chart with pill selector (Recovery / Stress / Rest HR / Sleep). Added to Progress → Stats tab after `WeeklyEnergyCard`.
- `src/components/biometrics/SleepStagesBar.tsx` — horizontal stacked bar: deep=indigo, REM=violet, light=blue-400, awake=rose. Requires `deepMin`, `remMin`, `lightMin`, `awakeMin` props.
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
- `src/components/WeekStrip.tsx` — Weekly activity strip. Activity logs store `distanceKm`, `inclinePct`, `caloriesBurned` and display them in the card. Logging flow: rest days log instantly; all other activities open a detail form (pendingType state) before saving. `SUPPORTS_DISTANCE` set (walk/running/cycling/swimming) shows distance field; `SUPPORTS_INCLINE` set (walk/running) shows incline field. Strength workout cards display `caloriesBurned` (amber Flame icon) if set.
- `src/components/food/NutritionSettings.tsx` — Nutrition goals sheet. "Add burned calories to goal" toggle (`adjust_for_activity`) — when on, FoodTracker and HomeDailySummary add today's burned kcal to the calorie goal.
- `src/components/food/FoodSearch.tsx` — Main food search interface. Supports text search (FatSecret via edge function), barcode scan, and manual entry. Shows recent searches and favourites. Integrates `BarcodeScanner` and `ManualFoodEntry` sub-components. Fetches extended nutrition data at log time.
- `src/components/food/BarcodeScanner.tsx` — Camera-based barcode scanner using `Html5Qrcode`. iOS-aware hardware zoom slider. Integrates `open-food-facts` lib for product lookup. Manages scanner lifecycle (start/stop/decode).
- `src/components/food/ManualFoodEntry.tsx` — Simple form to log a food with name + macros (calories, protein, carbs, fat, serving size). Validates name (1–200 chars) and numeric inputs. Inserts into `food_logs` on submit.
- `src/components/food/TDEESetup.tsx` — 5-step nutrition wizard: gender → age/height/weight → activity level → goal → water intake. Calls `calculateTDEE()` and saves to `nutrition_goals`. Includes water goal setup (1500–4000 ml).
- `src/components/food/WaterIntake.tsx` — 250 ml glass-based water tracker. +/− buttons, visual progress, reads `water_goal_ml` from `nutrition_goals`. Accepts `date` prop.
- `src/components/food/WeeklyNutritionChart.tsx` — Recharts bar chart of daily kcal/macro breakdown for the past 7 days. Expandable card, separate bars per macro. Queries `food_logs` grouped by date.
- `src/components/food/CompleteDaySummary.tsx` — Nutrition summary popup with macro percentages vs goals. Generates contextual smart tips (protein low, water insufficient, etc.). Props: `open`, `onClose`, `totals`, `goals`, `waterMl`, `waterGoalMl`.
- `src/components/food/CopyMeal.tsx` — Sheet that lets the user duplicate a meal from the past 7 days. Shows meal preview cards with calorie totals; single tap copies all foods to target date/meal type.
- `src/components/history/WorkoutCard.tsx` — Completed-workout card with swipe-left-to-delete (90 px threshold → delete dialog). Shows duration, exercises, effort rating, notes with expand toggle. Resolves exercise names from legacy data, library, and custom workouts.
- `src/components/history/SummaryCards.tsx` — 4-card stat row: Total Workouts, Total Time, This Week, Avg Per Week. Props: `totalWorkouts`, `totalMinutes`, `thisWeek`, `avgPerWeek`. Shown at the top of the History page.
- `src/components/DailyReviewChart.tsx` — Multi-metric analytics dashboard in the Stats tab. Metrics: Body Weight, Calories, Water, Total Volume Lifted. Week/month/year toggle. Recharts AreaChart + BarChart with rolling averages.
- `src/components/ExerciseVideoSheet.tsx` — Bottom Sheet showing form images (start/end) and YouTube Shorts link for an exercise. Sources images from free-exercise-db. Props: `open`, `onOpenChange`, `exerciseName`, `exerciseId`.
- `src/components/ExerciseTimer.tsx` — Wall-clock countdown timer (survives backgrounding via `endTimeRef`). Props: `targetSeconds`, `onComplete`. Play/Pause/Reset controls, haptic on completion.
- `src/components/RestTimer.tsx` — Floating rest-timer popup between sets. Separate from `ExerciseTimer`. Web Audio API beeps at 0 s. Persists background timer via `endTimeRef`; adjustable duration popup. Props: `isActive`, `initialSeconds`, `onClose`, `onTimerEnd`.
- `src/components/DailyStretchCard.tsx` — Home card showing the day's stretch routine based on the next scheduled workout. Tracks completion via `stretch_logs` table (per-user, per-day flag). Expandable exercise list with hold times.
- `src/components/HomeWeightTracker.tsx` — Home body-weight mini card. 7d/30d/90d sparkline, quick-add/edit today's weight. Reads `body_measurements`, shows current/min/max/trend.
- `src/components/HomeCompleteDay.tsx` — "Complete day" button + warning dialog. Checks if weight, food, and water were logged; warns if incomplete. Opens `CompleteDaySummary` on confirm. Writes `daily_logs` via `saveDailyLog()`.
- `src/components/BottomNav.tsx` — Fixed bottom navigation bar with 5 tabs (Home, Sessions, Nutrition, Progress, Profile). Animated active underline; hidden on `/workout/*` and `/login` routes.
- `src/components/StatsBar.tsx` — Header bar with Workout Streak, Weekly Goal, Total Kg Lifted stats. Calculates streak from workout history + activities + food + water logs via React Query.
- `src/components/PRCelebration.tsx` — Particle-burst celebration modal on new PR. 14 confetti elements with spring animations, auto-dismisses after 4 s. Shows tier progression if lift crossed a strength tier. Props: `pr` (name, weight, reps, tier info, isTrue1RM), `onDismiss`.
- `src/components/SplashScreen.tsx` — 2.2 s animated loading screen (spring-animated Shield icon). Calls `onComplete` when done; used in `App.tsx` during initialisation.
- `src/components/UpdateBanner.tsx` — Fixed top banner shown during PWA updates. Props: `visible`. Slides in with spring animation, shows spinner + "Updating Iron Keeper…" text.
- `src/components/WhatsNewSheet.tsx` — Bottom Sheet popup for a `ChangelogEntry`. Shows version, date, title, bulleted changes list. Triggered after app updates.
- `src/components/RecoveryTips.tsx` — Static, split-aware training & recovery tips. Auto-fetches user preferences and renders programme-specific advice (PPL, GK, 5/3/1, etc.). No props.
- `src/components/PostOnboardingTip.tsx` — One-time tip sheet shown after initial onboarding. Dismissed flag stored in localStorage under `ik-onboarding-tip-{userId}`.

**Native app note:** This is currently a PWA. HealthKit (iOS) and Health Connect (Android) are inaccessible from a web context — Apple blocks it entirely. Step tracking, auto sleep import, and reliable iOS push notifications all require a native wrapper. The plan is to use **Capacitor** when publishing to App Store / Play Store; existing React code needs no changes. See PLAN.md → "Native App" section for the full deferred feature list.

**Routing** is in `src/App.tsx`. All routes are protected by auth guards. `Index.tsx` does role-based redirect.

**Pages:**
- `Sessions` (`src/pages/Sessions.tsx`) — Browse and launch workouts from the current training split. Cards organised by split type (Push/Pull/Legs etc.), programme principles shown, link to change programme via Profile. Also surfaces custom workouts and WorkoutBuilder entry.
- `Progress` (`src/pages/Progress.tsx`) — **3 tabs: Stats | Photos | Recovery**. Tab state driven by `?tab=photos` or `?tab=recovery` search param (default: stats). Stats tab: frequency/volume charts, DailyReviewChart, PRTrendChart, StrengthLevelCard, **WeeklyEnergyCard**, Personal Records with swipe-to-delete. Photos tab: PhotosTab (upload, grid, compare). Recovery tab: interactive BodyDiagram with clickable muscle rows.
- `WorkoutSession` (`src/pages/WorkoutSession.tsx`) — Active workout tracker (sets, reps, rest timer, exercise swap). Supports `setType: "working" | "warmup" | "1rm_test"`. Warm-up sets: "Add Warm-up" button seeds 2 sets (50%×5, 75%×5), capped at 3 total (40/60/80%); weights auto-fill from working weight at completion; 60s rest timer; excluded from PR checks and rep-range toasts. Long-press toggles working ↔ warmup. Warm-up weights round to nearest 2.5 kg via `roundToPlate`. On set completion: toasts if reps hit top of range (suggest weight up) or fall below bottom (suggest weight down); skipped for 1RM test and warmup sets.
- `WorkoutBuilder` — create custom workouts; stored in **localStorage** under `ironkeeper_custom_workouts`
- `ExerciseLibrary` — browsable exercise index; data is static in `src/lib/exercise-library.ts`
- `FoodTracker` — nutrition logging with barcode scan (BarcodeScanner), meal groups, weekly chart (WeeklyNutritionChart), water tracker (WaterIntake), TDEE setup, copy-meal feature.
- `History` (`src/pages/History.tsx`) — Workout history with calendar navigation, filtering, and bulk CSV export (history + raw sets). Shows `SummaryCards` at top, `WorkoutCard` list, activity logs, and all `WeeklyReviewCard` entries. Activity logs include rest days, walks, runs, cycling, yoga, football etc.
- `Onboarding` (`src/pages/Onboarding.tsx`) — 4-step training split wizard: days per week → browse compatible splits → optional drag-reorder customisation → summary. Saves to `user-preferences` localStorage key.
- `BodyMeasurements` — weight + body fat log with trend chart; also accessible via Profile
- `CoachDashboard` (`src/pages/CoachDashboard.tsx`) — Coach-only dashboard (requires `isCoach` from `useUserRole`). Shows athlete profiles, last-seen timestamps, stretch completion, recent workouts, and PR notifications with read status.
- `Profile` — settings, preferences, onboarding re-entry, avatar upload/remove. Shows weekly kcal burn stat.
- `ResetPassword` (`src/pages/ResetPassword.tsx`) — Password-reset completion page (reached via email link). Listens for `PASSWORD_RECOVERY` auth event, validates password ≥ 6 chars, calls `supabase.auth.updateUser({ password })`, redirects home after 2 s.
- `NutritionOnboarding` — onboarding for users who chose "no workout programme" (`splitId === "none"`)

**Database tables** (all with RLS, scoped per user):
- `profiles` — display name, `bodyweight`, `sex`, `age` (used by strength standards)
- `workout_history` — completed workout sessions. Has `calories_burned` INTEGER column.
- `workout_sets` — individual sets per session. `set_type` column: `"working"` (default) | `"warmup"` | `"1rm_test"`.
- `food_logs` — nutrition entries (includes extended nutrition: sugar, fiber, saturated fat, salt, barcode)
- `nutrition_goals` — per-user calorie, macro, and water targets. `adjust_for_activity` BOOLEAN column: when true, daily calorie goal increases by calories burned that day.
- `water_intake` — daily water entries
- `body_measurements` — weight and body fat readings
- `daily_logs` — daily completion/notes log
- `user_roles` — coach vs. member role (`role` column, checked by `useUserRole`)
- `progress_photos` — `user_id`, `date`, `storage_path`, `pose`, `notes`. Images in `progress-photos` private bucket at `{user_id}/{date}-{timestamp}.jpg`. Display via signed URLs. `photo_id` on `weekly_reviews` FK references this. Coach SELECT policy included. Migration `20260422133535...`
- `weekly_reviews` — `user_id`, `week_start` (YYYY-MM-DD Monday), `rating` (1–5), `went_well`, `to_improve`, `focus_next`, `photo_id` (FK → `progress_photos`). Unique on `(user_id, week_start)`. Coach SELECT policy. Migration `20260422133535...`
- `sleep_logs` — `user_id`, `date` (YYYY-MM-DD), `hours` (numeric 3,1), `quality` (1–5), `source` (default `manual`), `notes`. Unique on `(user_id, date)`. Has coach SELECT policy. Updated by `upsertSleepLog`, fetched by `fetchSleepLogs(daysBack)`, deleted by `deleteSleepLog(date)`. Also has nullable stage columns: `deep_sleep_min`, `rem_sleep_min`, `light_sleep_min`, `awake_min`, `sleep_efficiency` — populated when Samsung Health stage data is available. `upsertSleepLog` accepts all stage fields.
- `activity_logs` — has `distance_km`, `incline_pct`, `calories_burned` columns. `saveActivityLog` accepts these fields and auto-computes burn.
- `daily_biometrics` — morning check-in data: `samsung_stress_score` (0–100, HRV-derived from Samsung Health), `resting_hr`, `spo2_pct`, `hrv_ms`, `respiratory_rate`, `source` ('manual' | 'health_connect'). Unique on `(user_id, date)`. Migration `20260511120000...`. Cloud functions: `upsertDailyBiometrics`, `fetchDailyBiometrics(daysBack)`.
- `daily_scores` — cached computed scores: `recovery_score` (0–100), `strain_score` (0–21), `stress_level` (0–3), `sleep_performance` (0–100), `ai_insight` (jsonb from Claude Haiku — `{headline, recovery_summary, training_recommendation, sleep_analysis, week_ahead}`), `ai_generated_at`. Unique on `(user_id, date)`. Cloud functions: `upsertDailyScore`, `fetchDailyScores(daysBack)`, `fetchTodayScore`.

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
- `src/lib/exercise-library.ts` — exercise catalogue: 60 originals (`lib-1`–`lib-60`) + 717 imported from free-exercise-db (`lib-db-*`). **Do not re-import** — entries already exist. Next available hand-written ID is `lib-61`.
- `src/lib/exercise-substitutions.ts` — per-exercise swap options; keys map 1:1 to exercise IDs in `workout-data.ts` (e.g. `bk2` = Pull-Ups, `bk3` = Barbell Row). Keep in sync when IDs change.
- `src/lib/accessory-routines.ts` — 3 accessory routines (Abs, Grip Strength, Wrist Strength) with exercises and optional superset flags. Exports `ACCESSORY_ROUTINES[]` and `ACCESSORY_SUBSTITUTIONS`. Used in WorkoutSession and WorkoutBuilder.
- `src/lib/stretching-data.ts` — 20+ stretches organised by body area (lower/upper/core-spine). Exports `Stretch` type (hold time, sets, target area, notes, video URL), `getStretchesForWorkout(workoutId)`, and `getTotalStretchTime()`. Used by `DailyStretchCard`.
- `src/lib/training-splits.ts` — 10+ built-in training splits (GK, PPL, Upper/Lower, 5/3/1, Arnold, Bro Split, Full Body). Exports `TrainingSplit` and `SplitDay` types plus `TRAINING_SPLITS[]` array with schedule, description, tags, and recommended day counts.

## UX Conventions

- **Overlays:** use shadcn `Sheet` (bottom drawer), not `Dialog`, for overlays and detail views.
- **Toasts:** use `sonner` (`import { toast } from "sonner"`) for all user feedback.
- **Haptics:** call `hapticMedium()` / `hapticSuccess()` from `src/lib/haptics.ts` on significant interactions (set completion, save, delete). Uses the Vibration API — no-ops on desktop.
- **Swipe gestures:** Framer Motion `drag="x"` with `dragConstraints` — used in `WorkoutSession`, `FoodTracker`, `WorkoutBuilder`, `WeekStrip`, and `WorkoutCard` (history). Pair with `touchAction: "pan-y"` to preserve vertical scroll. When swipe-to-delete lives inside a `Reorder.Group`, set `dragListener={false}` on `Reorder.Item` and use `useDragControls` on the grip handle — otherwise the two drag axes conflict.
- **Swipe-to-delete pattern:** Red destructive background must use `useTransform(x, [-100, -30], [1, 0])` for opacity — **do not** use a fully-opaque absolute div behind a transparent sliding div; it bleeds through. The sliding div must use `bg-card` or equivalent opaque background.
- **Animations:** Framer Motion throughout — page transitions, list reordering (`Reorder`), collapse/expand. Keep motion consistent with existing patterns.

## Supabase

- Project ref: `kzwkdhwselqchhcqkyzs` (Iron Keeper V2, user-owned)
- CLI: `npx supabase link --project-ref kzwkdhwselqchhcqkyzs` then `npx supabase db push`. Requires `SUPABASE_ACCESS_TOKEN` env var — interactive login won't work in non-TTY environments.
- Auth: standard `supabase.auth.signInWithOAuth` (Google OAuth only; Apple removed). Client reads credentials from env vars only — no hardcoded URLs in `src/integrations/supabase/client.ts`.
- User data import: `data-export/generate_import.py` — provide old UID + new UID to generate `import.sql` for migrating a user from the old project.

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
- **`isBilateralDumbbell` is keyword-only:** `strength-standards.ts` detects bilateral dumbbell exercises by string-matching `DB_INDICATORS` against the exercise name + ID. Exercises whose names don't contain "dumbbell" (e.g. "Bulgarian Split Squat") must be explicitly added to `DB_INDICATORS`. Getting this wrong means weight shows as total load instead of per-dumbbell, and Epley 1RM isn't doubled correctly. Also used in `Leaderboard.tsx` to show a "per DB" badge on 1RM entries.
- **Superset accessory `exerciseOrder` rule:** Only the **first** exercise in a superset routine is added to `exerciseOrder` — the rest are tracked via `setLogs` and rendered inside the group card. The superset group must wrap in `<Reorder.Item value={ex.id} dragListener={false}>`, **not** a plain `<div>`. A plain div means Framer Motion can't track the item; any drag event causes `onReorder` to silently drop both IDs, making the superset invisible with no way to re-add it (add button also disappears because `addedAccessories` still holds the ID).
- **Previous-sets fallback after substitutions:** `fetchLastSessionData(workoutId)` only returns sets from the most-recent session of that workout. If an exercise was substituted last session, it won't be in the result. After the fetch resolves, `WorkoutSession` calls `fetchExerciseLastData(exerciseId)` in parallel for any exercises missing from the result, so "Last:" placeholders still populate correctly.
- **Machine row variant pill (`pl1`):** The "Seated Row Machine" exercise uses `heavyStackExercises` to distinguish two machines — default (not in set) = "Machine Row" (`pl1`), in set = "Low Row" (`pl1-heavy`). The cable Light/Heavy pill is blocked for this exercise because "seated row" is in the `isBenchOrMachine` exclusion list. If the exercise is swapped (`exerciseOverrides[ex.id]` is set), the pill is hidden.
- **`workout_sets.user_id` may be NULL on older rows:** This column was added after the table existed. Never join profiles/users via `workout_sets.user_id` — always route through `workout_history.user_id` which is always populated. This applies to any cross-user aggregate query.
- **Cross-user Supabase queries need SECURITY DEFINER RPC functions:** RLS blocks direct `.from()` calls on other users' rows. Pattern: write a `SECURITY DEFINER` Postgres function, call it via `supabase.rpc()`. See `get_1rm_leaderboard` in `supabase/migrations/20260509160000_leaderboard_fix_join_via_history.sql` as the reference pattern.
- **`profiles` rows may be missing for some users:** The `handle_new_user()` signup trigger doesn't always fire. Always `LEFT JOIN profiles` and handle `NULL` — never assume every `auth.users` row has a corresponding `profiles` row.
- **Supabase CLI migration repair workflow:** When `npx supabase db push` reports "remote migration versions not found in local", run `npx supabase migration repair --status applied <versions...>` for migrations already on remote, then push again. Add `--include-all` flag if prompted about local migrations predating remote ones.
- **`npx supabase db query` targets local DB by default** — use the Supabase dashboard SQL editor for remote ad-hoc queries instead.
- **`npx supabase db push` fails locally without DB credentials** — `SUPABASE_DB_PASSWORD` / `SUPABASE_ACCESS_TOKEN` are not set in the local environment. The reliable workflow for applying migrations is to paste the SQL directly into the Supabase dashboard SQL editor. The migration file still lives in `supabase/migrations/` for version control.
- **`CREATE OR REPLACE FUNCTION` cannot change a function's return type** — Postgres rejects it with "cannot change return type of existing function". Must `DROP FUNCTION IF EXISTS fn_name(arg_types)` first, then create. Always add the DROP to the migration file when adding/removing columns from a RETURNS TABLE function. This applies to all leaderboard RPCs whenever their output shape changes.
- **Lucide icon `Weight` does not exist** — use `Scale` instead. Always verify icon names against existing imports in the codebase before using unfamiliar ones.
- **Galaxy Watch / Samsung Health PWA constraint:** PWA cannot access Health Connect (Android-native IPC only — no web/REST API for consumers). Manual morning check-in is the current solution. Phase 2: Capacitor + `@capacitor-community/health-connect`. When automatic, `daily_biometrics.source` changes from `'manual'` to `'health_connect'`.
- **`AnimatedNumber` has no `style` prop** — only `value`, `duration`, `decimals`, `className`, `suffix`. Wrap in `<span style={...}>` for inline colour overrides.
- **`biometric-insight` edge function needs `ANTHROPIC_API_KEY` Supabase secret** — set via Supabase dashboard → Edge Functions → Secrets before deploying.
