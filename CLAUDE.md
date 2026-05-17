# CLAUDE.md

> **MANDATORY:** Read `PLAN.md` at the start of every session before making any changes.

## Commands

```bash
npm run dev          # Vite dev server on port 8080
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest watch
npx supabase db push                    # Apply DB migrations
npx supabase functions deploy <name>   # Deploy edge function (fatsecret-search, food-search, biometric-insight)
```

## Architecture

React 18 + TypeScript PWA, deployed via Lovable (auto-deploys on `git push main`).

**Stack:** Vite/SWC, TailwindCSS, shadcn/ui (Radix), Framer Motion, Recharts, Supabase (Postgres + Auth + RLS), TanStack React Query, React Hook Form + Zod.

**Fonts:** Barlow Condensed (headings/numbers, `font-display` class) + DM Sans (body).

**Key modules:**
- `src/hooks/useAuth.tsx` — Supabase auth context. Demo mode (`isDemoMode()`) short-circuits Supabase, injects fake `User` (`id: "demo-user"`). `updateAvatar(file)` / `removeAvatar()` → `avatars` Storage bucket.
- `src/hooks/useUserRole.tsx` — Reads `user_roles`; `isCoach` drives routing in `Index.tsx`.
- `src/lib/query-client.ts` — Singleton `QueryClient` export. Import from here, not from `@tanstack/react-query` directly.
- `src/lib/cloud-data.ts` — Thin barrel re-export of `src/lib/data/`. Domain modules:
  - `workout-queries.ts` — `saveWorkoutToCloud`, `fetchWorkoutHistory`, `deleteWorkoutFromCloud`, `fetchPersonalRecords`, `deletePersonalRecord`, `bestOneRmForLift`, `fetchVolumeData`, `fetchLastSessionData`, `fetchExerciseLastData`, `fetchExerciseLastDataLike`, `fetchStrengthProfile`, `fetchRecentSets`, `fetchExercisePRHistory`, `exportWorkoutHistoryCSV`, `exportSetsCSV`
  - `sleep-queries.ts` — `fetchSleepLogs`, `upsertSleepLog`, `deleteSleepLog`
  - `activity-queries.ts` — `ACTIVITY_PRESETS`, `saveActivityLog`, `fetchActivityLogs`, `deleteActivityLog`
  - `body-queries.ts` — `saveBodyMeasurement`, `fetchBodyMeasurements`, `saveDailyLog`, `hasDayBeenCompleted`, `fetchDailyLogs`
  - `nutrition-queries.ts` — `lookupUserBodyweight` (falls back to `nutrition_goals.tdee_weight_kg` then 75 kg), `fetchDailyBurn`, `fetchWeeklyBurn`
  - `photo-queries.ts` — `fetchProgressPhotos`, `uploadProgressPhoto`, `deleteProgressPhoto`, `updateProgressPhotoNotes`
  - `review-queries.ts` — `fetchWeeklyReview`, `fetchAllWeeklyReviews`, `upsertWeeklyReview`, `deleteWeeklyReview`, `computeWeekStats` → `WeekSummary`
  - `leaderboard-queries.ts` — `fetchTopExercises`, `fetchLeaderboard1RM` (includes `isTested`), `fetchLeaderboardMaxWeight`, `fetchLeaderboardMaxReps`, `fetchLeaderboardSessionVolume`. `TimeFilter = 'all'|'monthly'|'weekly'|'prev_weekly'|'prev_monthly'` (prev_* internal). `updateLeaderboardVisibility`, `fetchLeaderboardVisibility`
  - `biometric-queries.ts` — `upsertDailyBiometrics`, `fetchDailyBiometrics`, `upsertDailyScore`, `updateDailyScoreAIInsight`, `fetchDailyScores`, `fetchTodayScore`
  - `clan-queries.ts` — `fetchAllClans`, `fetchMyClan`, `fetchClanMembers`, `createClan`, `joinClan`, `leaveClan`
  - `community-queries.ts` — `fetchActiveCommunityChallenges`, `fetchChallengeStats`, `addCommunityContribution`
  - `cosmetics-queries.ts` — `fetchCosmetics`, `fetchOwnedCosmetics`, `fetchEquippedCosmetics`, `purchaseCosmetic`, `equipCosmetic`, `unequipCosmetic`
  - `duel-queries.ts` — `fetchMyDuels`, `createDuel`, `respondToDuel`, `fetchDuelProgress`
  - `quest-queries.ts` — `fetchActiveQuests` → `{ daily: QuestWithProgress[], weekly: QuestWithProgress[] }`
  - `season-queries.ts` — `fetchCurrentSeason`, `fetchPendingSeasonFinale`, `fetchSeasonResult`
  - `progression-queries.ts` — Double-progression model. `fetchAllProgressions`, `fetchPendingProgressions`, `acceptProgression`, `dismissProgression`, `resetAllProgressions`, `evaluateAndStoreProgression(sets)`. Stores one row per `(user_id, exercise_id)` in `exercise_progression`; `exercise_id` is the *effective* id (includes attachment/variant suffix). `suggestIncrement` heuristic: lower compound +5kg, upper compound +2.5kg, isolation +1.25kg.
  - `utils.ts` — `mondayOfWeek(date)`, `recentMondays(weeks)`
- `src/lib/query-keys.ts` — Centralized React Query key registry. Always use `queryKeys.*()` — never inline string literals.
- `src/lib/storage-keys.ts` — Named localStorage key constants. Always use `STORAGE_KEYS.*` — never raw strings (except `user-preferences.ts` and `demo-mode.ts` which own their own keys).
- `src/lib/workout-data.ts` — Static workout definitions + localStorage for in-progress sessions.
- `src/lib/user-preferences.ts` — Split/schedule in localStorage under `ik-prefs-{userId}`. `isGKSplit(userId)`, `isNoWorkoutMode(userId)` (`splitId === "none"`).
- `src/lib/demo-mode.ts` / `demo-data.ts` / `demo-supabase.ts` — Demo mode: sessionStorage flag `ik-demo`. `demo-supabase.ts` intercepts `.from()` calls → in-memory store. `demo-tours.ts` defines guided tour steps per route.
- `src/lib/muscle-mapping.ts` — 17 canonical `MUSCLE_REGIONS`, `getMusclesWorked(...)`, `stripExerciseSuffixes(id)`.
- `src/lib/single-arm-variants.ts` — `isSingleArmEligible(exerciseId, exerciseName)` → shows "2 Arm / 1 Arm" toggle pill. Appends `-sa` suffix to effective exercise ID so per-arm history tracks separately. `DEFAULT_SINGLE_ARM_IDS` (currently `lib-61` Bayesian Curl) defaults to single-arm mode.
- `src/lib/recovery.ts` — pure: `computeMuscleRecovery(sets, sleepLogs, splitId, now, settings)` → `Record<MuscleRegion, MuscleState>`.
- `src/lib/recovery-scores.ts` — Whoop-style scoring (pure). `computeRecoveryScore` (0–100), `computeStrainScore` (0–21), `computeStressLevel` (0–3), `computeSleepPerformance` (0–100), `computeAllScores(...)`.
- `src/lib/strength-standards.ts` — 6-tier system for 8 lifts. `epley1RM`, `getStrengthRating(liftId, oneRm, {bodyweight,sex,age?})`, `inferLiftId`, `overallTier`.
- `src/lib/calorie-burn.ts` — `estimateCardioBurn(CardioInput)` (MET tables), `estimateStrengthBurn(StrengthInput)`. Both round to nearest 5 kcal.
- `src/lib/tdee-calculator.ts` — Mifflin-St Jeor. `calculateTDEE(params)` → TDEE + target calories + macros.
- `src/lib/ai-insight.ts` — `generateAIInsight(inputs, queryClient)` fire-and-forget; calls `biometric-insight` edge function and persists result to `daily_scores`.
- `src/hooks/queries/useProgressions.ts` — `useProgressions()`, `usePendingProgressions()`, `progressionMap(rows)` (exerciseId → row lookup), `useProgressionActions()` (accept/dismiss mutations with toast + haptic).
- `src/components/workout/ProgressionSuggestionBanner.tsx` — Inline banner above exercise card when `pendingSuggestion` is non-null. Accept applies new weight/reps; dismiss clears suggestion.
- **Gamification** (`src/lib/gamification/`):
  - `config.ts` — `XP_REWARDS`, `xpForLevel`, `levelFromXp`, `progressToNextLevel`, `streakMultiplier`, `streakTier`, `SEASON_TIERS`
  - `awardXp.ts` — `awardXp(input)` → dedupes, applies streak multiplier, inserts `xp_events`, updates streak + `user_progress`, evaluates badges
  - `badges.ts` — `evaluateBadges(ctx)` → checks badge criteria against DB metrics, inserts `user_badges`
  - `tiers.ts` — `TIERS` (Bronze→Champion), `tierFromRp`, `nextTier`, `tierProgress`, `getTierMeta`
  - `notify.ts` — `awardXpAndNotify(input)` client wrapper: shows toast, invalidates queries, fires `LevelUpSheet` / `BadgeUnlockSheet` via pub-sub callbacks

**Routing:** `src/App.tsx`, auth-guarded. `Index.tsx` does role-based redirect.

**Pages:** `Sessions`, `Progress` (Stats/Photos/Recovery tabs via `?tab=`), `WorkoutSession`, `WorkoutBuilder` (localStorage), `ExerciseLibrary`, `FoodTracker`, `History` (CSV export), `Onboarding`, `BodyMeasurements`, `CoachDashboard`, `Profile`, `ResetPassword`, `NutritionOnboarding`, `Leaderboard`, `Recovery` (`/recovery`), `CheckInHistory` (`/check-ins`), `Quests` (`/quests`), `Duels` (`/duels`), `Shop` (`/shop`), `Community` (`/community` — challenges + clans tabs).

**Native:** PWA only — HealthKit/Health Connect inaccessible from web. Capacitor planned. See PLAN.md → "Native App".

## Database Tables (all RLS, per-user unless noted)

| Table | Key columns |
|-------|-------------|
| `profiles` | display name, `bodyweight`, `sex`, `age` |
| `workout_history` | sessions; `calories_burned` INTEGER |
| `workout_sets` | `set_type`: `"working"` (default) \| `"warmup"` \| `"1rm_test"` |
| `food_logs` | extended nutrition: sugar, fiber, saturated fat, salt, barcode |
| `nutrition_goals` | `adjust_for_activity` BOOLEAN |
| `sleep_logs` | unique `(user_id, date)`; nullable: `deep_sleep_min`, `rem_sleep_min`, `light_sleep_min`, `awake_min`, `sleep_efficiency` |
| `activity_logs` | `distance_km`, `incline_pct`, `calories_burned` |
| `progress_photos` | private bucket `progress-photos` at `{user_id}/{date}-{timestamp}.jpg`; signed URLs |
| `weekly_reviews` | `week_start` (Monday), unique `(user_id, week_start)`, `photo_id` FK → `progress_photos` |
| `daily_biometrics` | `samsung_stress_score`, `resting_hr`, `spo2_pct`, `hrv_ms`, `respiratory_rate`, `source`; unique `(user_id, date)` |
| `daily_scores` | `recovery_score`, `strain_score`, `stress_level`, `sleep_performance`, `ai_insight` (jsonb), `ai_generated_at`; unique `(user_id, date)` |
| `user_progress` | `xp`, `coins`, `level`, `current_streak`, `longest_streak`, `last_active_date`, `freeze_tokens`, `season_rp`; unique per user |
| `xp_events` | ledger: `source`, `xp`, `coins`, `metadata` (jsonb) |
| `badges` | catalog: `code`, `criteria` (jsonb), `tier` (bronze/silver/gold), `xp_reward`, `coin_reward` |
| `user_badges` | `(user_id, badge_code)` unique |
| `quests` | `type` (daily/weekly), `criteria` (jsonb), `xp_reward`, `coin_reward` |
| `user_quests` | completion tracking |
| `seasons` | `number`, `starts_at`, `ends_at`, `status` |
| `season_results` | `final_rp`, `final_tier`, `final_rank`; settled at season end |
| `duels` | `challenger_id`, `opponent_id`, `type`, `rp_stake`, `status`, `starts_at`, `ends_at` |
| `duel_progress` | per-user metric snapshots |
| `push_subscriptions` | Web Push endpoint + keys |
| `cosmetics` | catalog: `kind` (frame/banner/xp_theme/title), `coin_price`, `tier_required` |
| `user_cosmetics` | owned cosmetics |
| `equipped_cosmetics` | one equipped cosmetic per `kind` per user |
| `exercise_progression` | double-progression tracking: `exercise_id` (effective id), `target_weight`, `target_reps_low/high`, `pending_suggestion` (jsonb), `last_evaluated_at`; unique `(user_id, exercise_id)` |
| `community_challenges` | server-wide goals; `metric`, `target`, `reward_coins` |
| `community_contributions` | per-user contribution to a challenge |
| `clans` | `name`, `tag`, `owner_id`; 3–10 members |
| `clan_members` | `role` (owner/officer/member) |
| `water_intake`, `body_measurements`, `daily_logs`, `user_roles`, `stretch_logs` | — |

Migrations in `supabase/migrations/`. Storage buckets: `avatars` (public), `progress-photos` (private).

## Static Data

- `exercise-library.ts` — 60 originals (`lib-1`–`lib-60`) + 717 from free-exercise-db (`lib-db-*`). **Do not re-import.** Next hand-written ID: `lib-61`.
- `exercise-substitutions.ts` — keys must match `workout-data.ts` IDs exactly or swap sheet silently shows nothing.
- `accessory-routines.ts` — 3 routines (Abs, Grip, Wrist) with superset flags.
- `training-splits.ts` — 10+ built-in splits (GK, PPL, Upper/Lower, Upper/Lower A/B DUP, 5/3/1, Arnold, etc.).

## UX Conventions

- **Overlays:** shadcn `Sheet` (bottom drawer), not `Dialog`.
- **Toasts:** `import { toast } from "sonner"`.
- **Haptics:** `hapticMedium()` / `hapticSuccess()` from `src/lib/haptics.ts`.
- **Swipe gestures:** Framer Motion `drag="x"` + `touchAction: "pan-y"`. In `Reorder.Group`: `dragListener={false}` on `Reorder.Item`, `useDragControls` on grip handle.
- **Swipe-to-delete:** Red bg opacity via `useTransform(x, [-100, -30], [1, 0])`. Sliding div must use `bg-card` (opaque).
- **Pull to refresh:** `usePullToRefresh({ onRefresh })` hook + `<PullToRefreshIndicator {...ptr} />`. Used on Recovery, Home, etc.
- **Loading/error/empty states:** Use `<LoadingState>`, `<ErrorState>`, `<EmptyState>` from `src/components/ui/`. Wrap pages with `<ErrorBoundary>` from `async-boundary.tsx`.
- **XP awards:** Always use `awardXpAndNotify(input)` from `src/lib/gamification/notify.ts` — never call `awardXp` directly from components. Gamification must never block a user action (errors are swallowed internally).

## Supabase

- Project ref: `kzwkdhwselqchhcqkyzs`
- CLI: `npx supabase link --project-ref kzwkdhwselqchhcqkyzs` then `npx supabase db push`. Requires `SUPABASE_ACCESS_TOKEN`.
- Auth: Google OAuth only. No hardcoded URLs in `src/integrations/supabase/client.ts`.
- User data import: `data-export/generate_import.py` — old UID + new UID → `import.sql`.

## Git Workflow

Lovable and auto-changelog push to `main` frequently. **Active repo: `iron-keeper-reborn`** (`origin`). The `reborn` remote is legacy — do not push there.

```bash
# Before edits / to push:
git stash && git pull --rebase origin main && git stash pop
git stash && git pull --rebase origin main && git stash pop && git push origin main
```

`package-lock.json` is perpetually dirty — never commit it. **Never commit** `.claude/` or `.playwright-mcp/`.

**Food data:** Text search → `fatsecret-search` edge function (FatSecret OAuth 1.0). Barcode → Open Food Facts API (`src/lib/open-food-facts.ts`). Extended nutrition fetched synchronously at log time.

## Gotchas

- **`workout_sets.user_id` may be NULL on older rows** — always join via `workout_history.user_id`.
- **Cross-user queries need SECURITY DEFINER RPC** — RLS blocks direct `.from()` on other users' rows. Use `supabase.rpc()`. See `get_1rm_leaderboard` in `20260509160000_leaderboard_fix_join_via_history.sql`.
- **`profiles` rows may be missing** — `handle_new_user()` trigger doesn't always fire. Always `LEFT JOIN profiles` and handle NULL.
- **Cable attachment exercises** — Set cannot complete without selecting attachment. `getEffectiveExId()` appends `-{attachmentKey}` so each attachment has independent PR history.
- **Custom workout search pool** — `WorkoutBuilder.tsx` builds `ALL_EXERCISES` from WORKOUTS + ACCESSORY_ROUTINES + EXERCISE_LIBRARY. `WorkoutSession.tsx` has parallel `ALL_SWAP_EXERCISES`. Add new sources to both.
- **LucideIcon serialization** — `JSON.stringify` drops functions/Symbols → `icon` becomes `{}` in localStorage. `getAllCustomWorkouts()` patches with `icon: Dumbbell`.
- **Superset accessory `exerciseOrder` rule** — Only the **first** exercise in a superset is added to `exerciseOrder`. Must use `<Reorder.Item dragListener={false}>` — a plain `<div>` causes `onReorder` to silently drop IDs.
- **`isBilateralDumbbell` is keyword-only** — matches `DB_INDICATORS` against name + ID. Exercises without "dumbbell" in name (e.g. "Bulgarian Split Squat") must be explicitly added.
- **Single-arm `-sa` suffix** — `isSingleArmEligible` from `single-arm-variants.ts` drives the "2 Arm / 1 Arm" pill. When toggled, the effective exercise ID gets a `-sa` suffix so per-arm PRs/history track independently. Mirrors the `-{attachmentKey}` cable pattern.
- **Auto-progression** — `evaluateAndStoreProgression(sets)` is called after a session saves. It uses the *effective* exercise ID (same as PR tracking), skips warmup/1rm_test sets and pure-bodyweight exercises. Suggestions persist in `exercise_progression.pending_suggestion` until accepted or dismissed.
- **Previous-sets fallback after substitutions** — `fetchLastSessionData` only returns the most-recent session. `WorkoutSession` calls `fetchExerciseLastData(exerciseId)` in parallel for missing exercises.
- **Machine row variant pill (`pl1`)** — "Seated Row Machine" uses `heavyStackExercises`: default = "Machine Row" (`pl1`), in-set = "Low Row" (`pl1-heavy`). Pill hidden when swapped.
- **Substitute IDs as primary exercise IDs** — A substitution ID (e.g. `sub-up5a` for Dumbbell Shoulder Press) can be used directly as the primary `id` in `workout-data.ts` to preserve history accumulated via that substitution. The app displays the friendly name correctly because `saveWorkoutToCloud`, `fetchRecentSets`, `fetchExercisePRHistory`, `WorkoutCard`, `review-queries`, and `leaderboard-queries` all include `EXERCISE_SUBSTITUTIONS` in their name resolution maps.
- **Exercise name resolution layers** — Display name priority: (1) `exercise_name` DB column if it differs from `exercise_id`, (2) client-side nameMap built from WORKOUTS + EXERCISE_SUBSTITUTIONS + ACCESSORY_SUBSTITUTIONS + EXERCISE_LIBRARY, (3) `exercise_id` stripped of suffixes. When adding new name-display surfaces always include all four sources in the nameMap.
- **`WorkoutSession` warm-up sets** — Seeds 2 sets (50%×5, 75%×5), capped at 3 total (40/60/80%); excluded from PR checks and rep-range toasts; 60s rest timer; weights via `roundToPlate` (nearest 2.5 kg).
- **`HomeCombinedRecoveryCard`** — Do not re-split into `RecoveryDashboard` + `RecoveryCard`. Top half (biometric scores + AI headline) only renders when user checked in that day; bottom half (muscle diagram) always shows.
- **`generateAIInsight`** — now lives in `src/lib/ai-insight.ts` (extracted from `BiometricCheckIn.tsx`). `next_workout` in AI payload is always `null` (not yet wired to training split).
- **`biometric-insight` edge function** — needs `ANTHROPIC_API_KEY` set via Supabase dashboard → Edge Functions → Secrets.
- **Supabase edge function calls** — always include `{ headers: { apikey: VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: \`Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}\` } }`. Pattern defined as `edgeFunctionHeaders` in `src/lib/open-food-facts.ts`.
- **`CREATE OR REPLACE FUNCTION` cannot change return type** — must `DROP FUNCTION IF EXISTS fn_name(arg_types)` first in migration.
- **`npx supabase db push` fails locally** — no DB credentials in local env. Paste SQL into Supabase dashboard SQL editor; migration file still goes in `supabase/migrations/`.
- **Supabase CLI migration repair** — when `db push` reports "remote migration versions not found in local": `npx supabase migration repair --status applied <versions...>` then push again.
- **`AnimatedNumber` has no `style` prop** — wrap in `<span style={...}>` for inline colour.
- **Lucide icon `Weight` does not exist** — use `Scale`. Verify icon names against existing imports.
- **Demo mode** — `isDemoMode()` checked at top of `useAuth` useEffect. Flag lives in sessionStorage (auto-clears on tab close). `demo-supabase.ts` routes `.from()` calls to in-memory store.
- **WeekStrip deletes** — workout sessions → `deleteWorkoutFromCloud`; activity logs → `deleteActivityLog`. Both trigger `setRefreshKey` increment.
- **Exercise naming** — "Flies"/"Fly" not "Flyes"/"Flye". IDs still use old spelling — do not rename IDs.
- **Galaxy Watch / Samsung Health** — PWA cannot access Health Connect. Manual check-in is current solution. Phase 2: Capacitor + `@capacitor-community/health-connect`.
- **Gamification new tables not in Supabase types** — `user_progress`, `xp_events`, `badges`, `user_badges`, `seasons`, `duels`, `clans`, etc. are cast via `supabase as unknown as { from: ... }` in their query files. Don't expect TypeScript safety on these tables yet.
- **`SleepCard.tsx` deleted** — replaced by `RecoveryPanel` + `RecoveryHero`. The `/recovery` page uses `RecoveryPanel` directly.
- **Streak freeze tokens** — awarded automatically at every 7-day milestone (capped at 3). Each missed day consumes 1 token before resetting the streak.
