# Iron Keeper — Active Plan

> **Read this file at the start of every session** before making changes. It records ongoing work, decisions, and constraints that are not derivable from the code alone.

## Current Status

**Session end 2026-07-03:** Worked through PRELAUNCH_AUDIT.md systematically — calc-correctness, storage/data-loss, and error-handling batches all complete this session (details below). All SQL migrations from this session are applied and confirmed. Nothing left mid-flight; safe to resume from a clean state.

**Next up when resuming:** Two items don't need Capacitor or a device and could be picked up immediately — audit #29 (safe-area/notch CSS: `viewport-fit=cover` + `env(safe-area-inset-*)`) and #30 (remove `user-scalable=no` from the viewport meta tag for zoom accessibility). Everything else remaining in the audit needs either a real Android device/Capacitor build (#1, #2, #7, #8, #26, #27, #28) or an answer to the open Phase 0 questions (Android Studio/JDK/SDK setup status, SW gating vs delete, push notification strategy, OAuth deep-link scheme). See `project_native_launch_todo` memory / `C:\Users\chunk\.claude\plans\melodic-dancing-stroustrup.md` for the full phased plan.

**PRELAUNCH_AUDIT.md error-handling batch complete** (2026-07-03, #23-25, no SQL to run):
- **#23** — already fixed in an earlier pass (`finalizeWorkout` in `WorkoutSession.tsx` has a proper `.catch` + retry toast).
- **#24** — found and fixed a real data-loss bug while auditing: `saveWorkoutToCloud` silently `return`ed (instead of throwing) on a failed `workout_history`/`workout_sets` insert, so the caller's `.then()` fired "Workout saved! 💪" and cleared the autosave even though the save had failed. Now throws in both places. Also fixed: `BiometricCheckIn.tsx` discarded the boolean returns of `upsertDailyBiometrics`/`upsertSleepLog`/`upsertDailyScore` and always showed "Morning check-in saved" regardless — now checks each and throws into the existing catch/toast. `uploadProgressPhoto` was missing a toast on the metadata-insert failure path. Progression accept/dismiss and deload accept/dismiss mutations always fired their success toast because the underlying functions swallowed errors instead of throwing — fixed both the query functions (now throw) and added `onError` toasts to the mutation hooks. `useDuelMutations` had no `onError` at all on 5 of 6 mutations — added a shared default.
- **#25** — swept ~15 bare `.then()` call sites with no `.catch`. Most are cosmetic (silences unhandled-rejection console spam), but two were real bugs: `useUserRole`'s role fetch and `useAuth`'s `getSession()` call could leave `roleLoading`/`loading` stuck `true` forever on a rejection, hanging the UI behind a loading state indefinitely.

**`20260703120000_storage_offload_tables.sql` applied** (2026-07-03) — `custom_workouts`, `user_preferences`, `workout_drafts` tables confirmed live in Supabase Table Editor.

**PRELAUNCH_AUDIT.md calc-correctness + storage/data-loss batches complete** (2026-07-03):
- Calc-correctness (#10,11,12,13,14,15,17,18): elapsed timer capped at 6h and frozen once the feedback screen is reached (`WorkoutSession.tsx`); `computeStrainScore` sanity-bounds manual HR entries before TRIMP; `maxHr` save rejects out-of-range input; `computeSleepFactor` guards `totalSleepMin = 0`; `fetchVolumeData` switched from `limit(30)` (which was actually keeping the *oldest* 30 sessions) to a 90-day date window; `epley1RM` caps reps fed into the formula at 12; `saveWorkoutToCloud` now uses the already-computed `workout.duration` instead of recomputing from `Date.now() - startedAt` at save time (was inflating kcal if save happened minutes after the workout ended); `awardXp.ts`'s `todayStr()`/`mondayStr()` and `computeWeekStats`'s week boundaries switched from `toISOString()` (UTC date) to local date, fixing streak/weekly-stats breakage near midnight for non-UTC users.
  - Scope note: the same UTC-vs-local-date pattern (`toISOString().split("T")[0]`) exists in ~18 other files (daily biometric check-ins, sleep logs, activity logs, etc.) — not touched, out of scope for the narrow streak/week-stats bug fixed here.
- Storage/data-loss (#19, #20, #21 — #22 auth-storage deferred to Capacitor/Phase 5): new tables `custom_workouts`, `user_preferences`, `workout_drafts`, all localStorage-primary/Supabase-backup (never overwrites local data, only recovers when local is missing entirely):
  - `WorkoutBuilder.tsx` — custom workouts write through to Supabase on save/delete; on mount, cloud-only workouts get pulled into the local cache, local-only workouts get pushed up.
  - `Onboarding.tsx` writes preferences through to Supabase; `useAuth.tsx` hydrates from the cloud backup on sign-in only when localStorage has nothing.
  - `WorkoutSession.tsx` — the existing 30s/visibility/beforeunload autosave now also mirrors to `workout_drafts`; on session mount, falls back to the cloud draft (if <4h old) when there's no usable local one; `clearAutoSave` deletes the cloud row on finish/discard.
  - New data modules: `src/lib/data/custom-workout-queries.ts`, `user-preferences-queries.ts`, `workout-draft-queries.ts`.

**All 4 pending SQL migrations applied** (2026-07-03): `20260702162749_workout_history_update_policy.sql`, `20260702163500_coach_athlete_roster.sql`, `20260702163609_coach_read_biometrics_scores.sql`, `20260702164633_coach_athlete_messages.sql` — coach roster/RLS rescoping and messaging are now live in Supabase.

**Pre-launch audit + coach rebuild + workout builder parity complete** (2026-07-02):
- Found `PRELAUNCH_AUDIT.md` (45 findings, written ~May, never actioned) — fixed the highest-priority items:
  - Calorie formula: client `estimateStrengthBurn` synced to the SQL function's `0.0035` constant (was still `0.001`, drifted after a later migration updated the SQL side only).
  - `fetchWorkoutHistory` now rehydrates `avg_hr`/`max_hr` (were saved but never read back).
  - Added missing `workout_history` UPDATE RLS policy (`WITH CHECK` included after a security-review catch on the first version).
  - `fetchPersonalRecords` filters out `reps < 1` so an abandoned/empty set can't register as a PR.
  - Replaced `window.confirm` (WorkoutSession finish-anyway) with the existing `AlertDialog` pattern.
  - Replaced `window.location.href` navigation in `useAuth` signOut, `DemoBanner`, and `Login`'s demo entry with router `navigate()` — added `enterDemoSession()` to `AuthContext` so demo mode no longer needs a hard reload to re-trigger `AuthProvider`'s mount-time check.
  - Remaining audit items (storage/data-loss risks, calc-correctness batch, PWA-to-native device-testing checklist, polish triage) are documented but not yet started — see the plan file referenced below for the full sequencing.
- **Coach experience rebuilt** — was a single flat all-users activity feed with no real coach-athlete relationship (one hardcoded coach account saw literally everyone via blanket RLS). Added:
  - `coach_athletes` roster + `coach_profiles` invite-code system. Self-serve: any user can become a coach from Profile (`become_coach()` RPC), generates an invite code from the Coach Dashboard, athletes join via code (`join_coach_by_code()` RPC) in Profile.
  - Rescoped ~18 tables' + storage's "coach sees everyone" RLS policies to require roster membership (`EXISTS` against `coach_athletes`) instead of the role alone. One-time backfill preserves the existing coach's visibility into current users.
  - New per-athlete drill-down page `/coach/athlete/:userId` (`CoachAthleteDetail.tsx`): recovery snapshot, personal records, expandable workout history.
  - Activity feed filtering by athlete + exercise/workout search on `CoachDashboard.tsx`.
  - Roster removal (AlertDialog confirm, not `window.confirm`).
  - Coach↔athlete messaging: `coach_messages` table scoped to an existing roster link, shared `MessageThread` component (`src/components/coach/MessageThread.tsx`) used on both the coach's athlete-detail page and the athlete's Profile sheet.
- **WorkoutSession `addSingleExercise` bug fixed** — mid-session "Add Exercise" always inserted a hardcoded 3×10 with no `targetRir`. Now opens a small confirm step pre-filled from the last exercise added in the session, editable before confirming.
- **WorkoutBuilder parity** — the custom workout builder only captured name/sets/reps/muscle/notes/order despite `Exercise`/`WorkoutDay` already supporting more. Added: per-exercise target RIR + workout-level RIR override, bodyweight/no-load toggle, rep/weight unit labels, and a new `supersetGroup` field (letter-tag UI in the builder) that `WorkoutSession` uses to suppress the rest timer until the last exercise in a superset chain finishes its set. Cable-attachment and single-arm toggles needed no builder changes — both are keyword-matched against the exercise name generically at session time regardless of source.
- Full plan (phased fix list + Capacitor wrap sequencing) at `C:\Users\chunk\.claude\plans\melodic-dancing-stroustrup.md`.

**MEV programme update complete** (2026-06-13):
- Upper A: all compounds 4→3 sets; DB Shoulder Press (`sub-up5a`) replaced by Smith Machine Seated Military Press (`lib-db-Smith_Machine_Overhead_Shoulder_Press`, 3×6-8 RIR 0-1); Cable Lateral Raises + Tricep Extensions → 2 sets
- Upper B: DB Lateral Raise (`sh4`) replaced by DB Shoulder Press (`sub-up5a`, 2×10-12 RIR 1-2); compounds 4→3 sets; Cable Flies, Face Pulls, Rope Hammer Curl, Tricep Pushdown → 2 sets; coaching notes updated (neutral grip Seated Row, 45° bench Incline Curl)
- Lower A: Hex Bar Jumps 4→3 sets; all isolations/accessories (Leg Extension, Calves, Core Finisher, Preacher Curl, Bayesian Curl) → 2 sets
- Lower B: Nordic Hamstring Curls 3→2 sets, reps updated to "3-5" with progressive range notes; Calves + Core Finisher → 2 sets
- Philosophy: MEV focus for calorie deficit phase (88kg→80kg). 3 sets max per exercise, 2 sets for isolations.

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
