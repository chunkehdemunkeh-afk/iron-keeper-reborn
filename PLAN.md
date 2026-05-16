# Iron Keeper — Active Plan

> **Read this file at the start of every session** before making changes. It records ongoing work, decisions, and constraints that are not derivable from the code alone.

## Current Status

All migrations applied. No pending manual actions.

**Per-set tracking + enriched CSV export complete** (2026-05-16):
- Migration `20260516000000_workout_sets_per_set_fields.sql` applied — adds `rir`, `target_rir`, `target_reps`, `target_weight`, `is_pr` to `workout_sets`
- `src/lib/training-splits.ts` — `targetRir` added to all built-in splits (PPL/PPLU/PPLUL/Arnold/Bro: 0-1; GK/Upper-Lower/Full Body: 1-2; 5/3/1: 2-3)
- `WorkoutSession.tsx` — RIR picker appears after completing a non-warmup set; highlights prescribed range; targets pre-populated from exercise definition + last session; `isPr` flagged automatically on PR sets
- `exportSetsCSV` now outputs 10 columns: Date, Exercise, Set Type, Reps, Weight (kg), Target Reps, Target Weight (kg), RIR, Target RIR, PR
- Superset delete button added to superset header card

**Quest seed migration applied** (2026-05-16):
- `20260514120000_seed_quests.sql` run — 7 daily + 5 weekly quests now active

**Gamification system complete** (2026-05-12–14):
- Migrations: `user_progress`, `xp_events`, `badges`, `user_badges`, `quests`, `user_quests`, `seasons`, `season_results`, `duels`, `duel_progress`, `push_subscriptions`, `cosmetics`, `user_cosmetics`, `equipped_cosmetics`, `community_challenges`, `community_contributions`, `clans`, `clan_members`, `workout_hr_samples`
- `src/lib/gamification/config.ts` — XP rewards, level curve (quadratic, soft cap at 50), streak multipliers/tiers, `SEASON_TIERS`
- `src/lib/gamification/awardXp.ts` — single chokepoint: dedupes (once-per-day/week/lifetime), streak update with freeze-token bridging, inserts `xp_events`, updates `user_progress` level
- `src/lib/gamification/badges.ts` — `evaluateBadges` checks session count, sleep logs, food days, PR count, lifetime volume, streak against `badges` catalog
- `src/lib/gamification/tiers.ts` — Bronze→Champion RP thresholds; `tierFromRp`, `tierProgress`
- `src/lib/gamification/notify.ts` — `awardXpAndNotify` client wrapper: toast, query invalidation, pub-sub to `LevelUpSheet` / `BadgeUnlockSheet`
- Components: `XpBar`, `AvatarFrame`, `BadgeShelf`, `BadgeUnlockSheet`, `LevelUpSheet`, `QuestsPanel`, `SeasonCard`, `SeasonFinaleSheet`, `TierBadge`
- New hooks: `useUserProgress`, `useBadges`, `useQuests`, `useCurrentSeason`, `useSeasonFinale`, `useClans`, `useCommunityChallenges`, `useCosmetics`, `useDuels`
- New data modules: `clan-queries.ts`, `community-queries.ts`, `cosmetics-queries.ts`, `duel-queries.ts`, `quest-queries.ts`, `season-queries.ts`
- New pages: `/quests`, `/duels`, `/shop` (cosmetics), `/community` (challenges + clans tabs)

**Recovery page + pull-to-refresh complete** (2026-05-13):
- `src/pages/Recovery.tsx` (`/recovery`) — standalone recovery page using `RecoveryPanel` + `RecoveryTips`
- `src/components/recovery/RecoveryPanel.tsx` + `RecoveryHero.tsx` — replaces old `SleepCard.tsx` (deleted)
- `src/hooks/usePullToRefresh.tsx` + `src/components/PullToRefreshIndicator.tsx` — PTR on Recovery, Home, etc.
- `src/pages/CheckInHistory.tsx` (`/check-ins`) — biometric check-in history log

**AI insight extracted + PWA polish** (2026-05-13):
- `src/lib/ai-insight.ts` — `generateAIInsight` extracted from `BiometricCheckIn.tsx`; fire-and-forget pattern, persists to `daily_scores`
- `src/lib/query-client.ts` — singleton `QueryClient` extracted from `App.tsx`
- `src/integrations/supabase/auth-attacher.ts` — auth header attacher utility
- New UI primitives: `async-boundary.tsx` (`ErrorBoundary`), `loading-state.tsx`, `error-state.tsx`, `empty-state.tsx`, `section-header.tsx`, `section-eyebrow.tsx`, `segmented-tabs.tsx`
- Updated PWA: custom `public/sw.js`, refreshed `manifest.json`, new 192×512 PNG icons, new logo assets in `src/assets/`
- `PRELAUNCH_AUDIT.md` added — pre-launch checklist

**Calorie burn tracking complete** (2026-04-23):
- Migration `20260423...`: `calories_burned` on `workout_history` + `activity_logs`; `distance_km`, `incline_pct` on `activity_logs`; `adjust_for_activity` on `nutrition_goals`
- DB helper functions: `lookup_user_bodyweight`, `estimate_cardio_burn`, `estimate_strength_burn` + backfill UPDATE statements
- `src/lib/calorie-burn.ts` — pure TS burn estimation (MET-based cardio, mechanical-work strength), mirrors SQL functions
- `src/components/WeeklyEnergyCard.tsx` — weekly kcal card with stacked bar + 4-week sparkline, shown in Stats tab
- `HomeDailySummary` now toggles Macros/Burn view; respects `adjust_for_activity` to inflate calorie goal
- `FoodTracker` shows burned tile + adjusts goal when `adjust_for_activity` enabled
- `NutritionSettings` has "Add burned calories to goal" toggle
- `WeekStrip` activity logging now collects distance/incline, displays kcal on cards
- `WorkoutSession` warm-up sets: auto-scheme (50%/75% → 40/60/80%), auto-fill on completion, 60s rest timer, excluded from PR/rep-range checks; `set_type: "warmup"` now saved to DB
- `Profile` page shows weekly kcal burn stat

**Progress Photos + Weekly Reviews + Strength Standards complete** (2026-04-22):
- `progress_photos` + `weekly_reviews` tables + `progress-photos` storage bucket — migration `20260422133535...`
- `workout_sets.set_type` column (`"working"` | `"1rm_test"`) — migration `20260422151128...`
- `src/components/progress/PhotosTab.tsx`, `ProgressPhotoGrid.tsx`, `PhotoCompareSheet.tsx` — full photo upload/grid/compare UI
- `src/lib/strength-standards.ts` — 6-tier Untrained→Elite rating for 8 lifts (Kilgore/ExRx norms). `epley1RM`, `getStrengthRating`, `inferLiftId`, `overallTier`
- `src/components/progress/StrengthLevelCard.tsx`, `StrengthLevelSheet.tsx`, `StrengthBar.tsx`, `Test1RMSheet.tsx`
- `src/components/PRTrendChart.tsx` — per-exercise PR history AreaChart, shown in Stats tab
- `src/lib/weekly-review.ts` — ISO week helpers + localStorage prompt-dismissal logic
- `src/components/weekly/WeeklyReviewSheet.tsx`, `WeeklyReviewCard.tsx`, `WeeklyReviewPrompt.tsx`, `MondayBanner.tsx`
- Progress page now has **3 tabs: Stats | Photos | Recovery** (`?tab=photos` / `?tab=recovery`)
- History page shows all `WeeklyReviewCard` entries
- Home page: `MondayBanner` (Mondays, if last-week review missing) + `WeeklyReviewPrompt` (Sundays)
- WorkoutSession: `setType: "1rm_test"` sets skip rep-range toasts; weight-range coaching toasts added for working sets
- `cloud-data.ts` additions: `fetchExercisePRHistory`, `fetchProgressPhotos`, `uploadProgressPhoto`, `deleteProgressPhoto`, `updateProgressPhotoNotes`, `fetchWeeklyReview`, `fetchAllWeeklyReviews`, `upsertWeeklyReview`, `deleteWeeklyReview`, `computeWeekStats`, `fetchStrengthProfile`, `bestOneRmForLift`
- Unit tests: `src/test/strength-standards.test.ts`

**Recovery feature is complete** (2026-04-21), BodyDiagram redesigned (2026-04-22):
- `sleep_logs` table (migration applied), `fetchRecentSets`, `fetchSleepLogs`, `upsertSleepLog`, `deleteSleepLog` in `cloud-data.ts`
- `src/lib/muscle-mapping.ts`, `src/lib/recovery.ts`, `src/lib/recovery-settings.ts` — pure calculation
- `src/components/recovery/BodyDiagram.tsx` — fully redesigned with anatomically accurate silhouette + muscle paths (coordinate space 240×460). Accepts `highlighted` prop for external control. `viewForMuscle(region)` exported.
- `RecoveryCard.tsx` (home preview), `SleepCard.tsx` (home sleep input), `RecoverySettings.tsx`
- Muscle rows in Recovery tab are clickable buttons — tapping a row sets `highlighted` on the diagram and auto-switches front/back via `viewForMuscle`
- `src/hooks/useRecoverySettings.tsx`, `src/hooks/useDemoTour.tsx`
- Unit tests: `src/test/recovery.test.ts`

**Demo mode is complete** (2026-04-21):
- `src/lib/demo-mode.ts` (sessionStorage flag), `src/lib/demo-data.ts`, `src/lib/demo-supabase.ts`, `src/lib/demo-tours.ts`
- Components: `src/components/demo/DemoBanner.tsx`, `DemoTour.tsx`, `HelpButton.tsx`
- Login page has "Try Demo" button → `enterDemo()` → hard reload with demo user shim in `useAuth`

**Avatar upload is complete** (2026-04-21):
- `useAuth` exposes `updateAvatar(file)`, `removeAvatar()` backed by Supabase Storage bucket `avatars` (public)
- Migration: `supabase/migrations/20260421122511_…sql`

**No-workout mode** added to user preferences (`splitId === "none"`); `isNoWorkoutMode()` in `user-preferences.ts`; `NutritionOnboarding.tsx` page added.

**Supabase migration is complete** (2026-04-20):
- New project: `kzwkdhwselqchhcqkyzs` (Iron Keeper V2), owned by the user
- Deployed at: `ironkeeper2.lovable.app` from repo `iron-keeper-reborn`
- Auth: standard Supabase Google OAuth — `@lovable.dev/cloud-auth-js` removed from `Login.tsx`
- Data import: `data-export/generate_import.py` generates per-user SQL. Other users pending import — provide old UID + new UID to generate their `import.sql`
- `origin` remote → `iron-keeper-reborn`; old repo accessible via `reborn` remote

Previous feature (PR system) is complete:
- `PRCelebration.tsx` — particle burst overlay rendered after any new-PR set tick
- `WorkoutSession.tsx` — PR detection via `historicalPRsRef` + `sessionBestRef`, renders `<PRCelebration>`
- `Progress.tsx` — swipe-to-delete on PR rows via `PRSwipeRow` component; uses `deletePersonalRecord(setId)`
- `cloud-data.ts` — `fetchPersonalRecords` returns `setId` per entry; `deletePersonalRecord(setId)` added

---

## Supabase Ownership Migration — Step-by-Step Plan

### Background
The current Supabase project (database, auth, storage) is owned by **Lovable's account**, not yours. You cannot access the credentials or data directly. The goal is to move to a Supabase project you own, while keeping Lovable as the builder/host.

**The code does not need to change.** `src/integrations/supabase/client.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from environment variables — these just need to be pointed at your new project instead.

**Your old Supabase user ID** (seen in the exported data): `4050fa0e-7486-44e4-b38c-b02ea631604e` — Claude needs this to rewrite the import SQL with your new user ID.

---

### Phase 1 — Export your data from Lovable's Supabase (do this FIRST)

Go to your Lovable project → Database tab → click each table below → hit **Export CSV** top right:

- [ ] `activity_logs`
- [ ] `workout_history`
- [ ] `workout_sets`
- [ ] `food_logs`
- [ ] `nutrition_goals`
- [ ] `water_intake`
- [ ] `body_measurements`
- [ ] `daily_logs`
- [ ] `profiles`
- [ ] `user_roles`

Save all CSVs somewhere safe. You only need rows where `user_id = 4050fa0e-7486-44e4-b38c-b02ea631604e` — other rows belong to other users and should be ignored.

---

### Phase 2 — Create your own Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up/log in with your own account
2. Click **New project**
3. Give it a name (e.g. `ironkeeper`), choose a region close to you (EU West for UK), set a strong database password — **save this password somewhere**
4. Wait ~2 minutes for the project to provision
5. Go to **Settings → API**
6. Copy and save:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`) → this is `VITE_SUPABASE_URL`
   - **anon / public key** (long JWT string) → this is `VITE_SUPABASE_PUBLISHABLE_KEY`

---

### Phase 3 — Apply the schema (recreate all tables)

The entire database schema lives in `supabase/migrations/` in the repo — 20 migration files that build all tables, RLS policies, and indexes. You need to run these against your new project.

**Option A (easiest) — Supabase CLI:**
```bash
# In the repo root, link to your new project:
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
# (project ref is the part before .supabase.co in your URL, e.g. "abcdefgh")
npx supabase db push
```

**Option B — SQL Editor (if CLI is awkward):**
Go to your Supabase project → **SQL editor** → open each migration file from the repo in order (oldest date first) and run them one by one. There are 20 files — takes ~10 minutes.

After either option, go to **Table Editor** and confirm these tables exist: `profiles`, `workout_history`, `workout_sets`, `food_logs`, `nutrition_goals`, `water_intake`, `body_measurements`, `daily_logs`, `user_roles`, `activity_logs`.

---

### Phase 4 — Create your account in the new project

1. In your new Supabase project → **Authentication → Users** → note it's empty
2. Open the app URL (still the Lovable-hosted one for now — you're just creating an account in the new DB via the app temporarily, OR just do this after Phase 6 when the new Lovable project is live)

> **Actually:** Skip creating an account manually. Do Phase 5 and 6 first (import data), then when you log in via the new Lovable project it creates your auth user automatically. The import SQL will handle the data after you have your new user ID.

---

### Phase 5 — Tell Claude your new project details

Start a new session with Claude and say:
> "I'm ready to do the Supabase import. My new project URL is X, and here are my CSV exports."

Then share the CSVs. Claude will:
1. Generate a SQL script that inserts all your data with the old user ID (`4050fa0e...`) replaced by your new one
2. Filter out other users' rows
3. Handle FK ordering (profiles → workout_history → workout_sets, etc.)

You paste the SQL into your new Supabase SQL editor and run it.

---

### Phase 6 — Create a new Lovable project pointed at your Supabase

1. In Lovable, create a **New project**
2. When asked about Supabase, choose **Connect existing project** (or equivalent) and enter your Supabase URL + anon key
3. Link it to the **same GitHub repo** (or push the repo to a new GitHub repo first if needed)
4. In Lovable project settings → Environment variables, confirm:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your anon key

> **If Lovable doesn't offer "connect existing":** Set the env vars manually in Lovable's project settings after creation, then redeploy.

---

### Phase 7 — Update Supabase Auth settings

In your new Supabase project → **Authentication → URL Configuration**:
- Set **Site URL** to your new Lovable app URL (e.g. `https://yourapp.lovable.app`)
- Add it to **Redirect URLs** as well

This makes login/signup redirects work correctly.

---

### Phase 8 — Verify

1. Open the new Lovable app URL
2. Sign up / log in
3. Check that your workout history, food logs, and body measurements are all present
4. Do a test workout or food log entry and confirm it saves
5. Old Lovable project can now be left idle — data flows to your Supabase from here on

---

### What stays the same after migration
- All code is identical — no code changes needed
- Lovable still builds and hosts the app on push to `main`
- You still use Claude to build features
- Git workflow is unchanged
- `npx supabase db push` now pushes to **your** project (once linked via `npx supabase link`)

---


## Core Architecture Constraints

- **No custom server.** Everything is Supabase (Postgres + RLS + Auth). No edge functions needed — Lovable deploys on push.
- **localStorage for in-progress data:** Active workout session, custom workouts, and user preferences all live in localStorage. Supabase is write-on-complete only for workouts.
- **Static exercise data:** `exercise-library.ts`, `exercise-substitutions.ts`, `accessory-routines.ts`, `stretching-data.ts`, `training-splits.ts` are all in-code. Changes require a deploy, not a DB migration.
- **LucideIcon serialization bug:** Icons stored in localStorage become `{}`. `getAllCustomWorkouts()` patches `icon: Dumbbell` on every load. Any new icon-storing feature must do the same.
- **Swipe-to-delete pattern:** Use `useTransform(x, [-100, -30], [1, 0])` for bg opacity. Never use a fully-opaque absolute bg div behind a transparent sliding div — it bleeds through.
- **Exercise ID stability:** IDs like `lib-db-Dumbbell_Flyes` are permanent even if the display name changed (`Flyes`→`Flies`). Never rename IDs.
- **Substitution key sync:** `exercise-substitutions.ts` keys must match `workout-data.ts` exercise IDs exactly.

## Key Files to Check When Starting Work

| What | Where |
|------|-------|
| Workout definitions (static) | `src/lib/workout-data.ts` |
| Exercise catalogue | `src/lib/exercise-library.ts` |
| Swap options | `src/lib/exercise-substitutions.ts` |
| All Supabase ops | `src/lib/cloud-data.ts` |
| Gamification core | `src/lib/gamification/` (`config`, `awardXp`, `badges`, `tiers`, `notify`) |
| XP award (components) | `src/lib/gamification/notify.ts` → `awardXpAndNotify` |
| Active session page | `src/pages/WorkoutSession.tsx` |
| History cards | `src/components/history/WorkoutCard.tsx` |
| Home week strip | `src/components/WeekStrip.tsx` |
| Progress (Stats + Photos + Recovery tabs) | `src/pages/Progress.tsx` |
| Recovery calc | `src/lib/recovery.ts` |
| Calorie burn estimation | `src/lib/calorie-burn.ts` |
| Muscle mapping | `src/lib/muscle-mapping.ts` |
| Body diagram | `src/components/recovery/BodyDiagram.tsx` |
| Recovery page | `src/pages/Recovery.tsx` |
| Recovery panel (sleep + biometrics) | `src/components/recovery/RecoveryPanel.tsx` |
| Strength standards | `src/lib/strength-standards.ts` |
| Weekly review helpers | `src/lib/weekly-review.ts` |
| Weekly review sheet | `src/components/weekly/WeeklyReviewSheet.tsx` |
| Food tracker | `src/pages/FoodTracker.tsx` |
| Auth context | `src/hooks/useAuth.tsx` |
| Role routing | `src/hooks/useUserRole.tsx` |

## Established Patterns

- **Swipe-to-delete:** Used in WorkoutSession (exercise cards), WorkoutCard (history), WeekStrip, WorkoutBuilder, Progress (PR rows). Always: `useMotionValue(0)` + `useTransform(x, [-100,-30],[1,0])` for bg opacity.
- **Search pools:** `ALL_SWAP_EXERCISES` in WorkoutSession and `ALL_EXERCISES` in WorkoutBuilder are built at module load from WORKOUTS + ACCESSORY_ROUTINES + EXERCISE_LIBRARY (deduplicated by lowercase name).
- **Toasts:** `sonner` only — `import { toast } from "sonner"`.
- **Overlays/drawers:** `Sheet` (shadcn bottom drawer), not `Dialog`.
- **Haptics:** `hapticMedium()` on set complete, `hapticSuccess()` on PR / save.

## Backlog / Ideas (not committed)

- Coach dashboard features (bulk session assignment, athlete progress view)
- Progress photo: client-side image compression before upload
- Progress photo: pose tagging (front/side/back angles)
- Nutrition: weekly macro trend charts
- Workout templates / programme scheduling UI
- Push notifications for rest timer
- Barbell plate calculator overlay

## Native App (App Store / Play Store) — Deferred Feature Set

When the app is published natively via **Capacitor**, the following become possible:

- **Step tracking** — HealthKit (iOS) + Health Connect (Android) via `@capacitor-community/health-kit` / `@capacitor/health`. Not possible from a PWA; Apple blocks all web API access to Health data.
- **Auto sleep logging** — same Health plugins can pull sleep data, replacing the manual SleepCard entry flow.
- **Push notifications** — native push for rest timer, workout reminders, weekly review prompts. PWA push works on Android but not iOS.
- **Active calories from Health** — could supplement or replace the manual MET-based burn estimation.

**Implementation note:** Capacitor wraps the existing React/Vite app with no code changes required to the core app. Plugins are added as needed and gate-checked at runtime (`Capacitor.isNativePlatform()`). The Lovable build pipeline would need a separate Capacitor build step for app store submissions.

## Git Reminder

```bash
git stash && git pull --rebase origin main && git stash pop  # before editing
git stash && git pull --rebase origin main && git stash pop && git push origin main  # to push
```
