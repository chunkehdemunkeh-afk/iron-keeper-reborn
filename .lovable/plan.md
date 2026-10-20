# Strip the app back to the essentials

Goal: a calm, focused training + nutrition app. Removed features disappear from screens and menus only — no logged workouts, sets, PRs, weights, food logs or routines are deleted from your account.

## What stays
- Routines (Upper A/B, Lower, splits, programme editor, custom builder, exercise library)
- Workouts and live sessions, including PR celebrations
- Workout history and Progress stats/charts, progress photos
- Weight tracking and body measurements
- Nutrition tracking (food, water, goals)
- Hyrox and half-marathon programmes (under Train and on home, as now)
- Recovery & morning check-ins (not selected for removal)

## What goes
1. **XP, levels, seasons** — XP bar on home, level-up sheet, badge-unlock sheet, season card/finale/reward track, XP toast settings in Profile. XP is no longer awarded at all.
2. **Pop-up notifications** — XP/reward toasts and gamification push-permission prompts. PR celebrations and normal "saved"/error messages stay.
3. **Competing features** — Leaderboard, Quests, Duels, Shop, Community/Clans pages and the Compete section in Profile.
4. **Workload estimates** — muscle body diagrams, Volume tab in Progress, volume meters, weekly volume summary.
5. **Weekly banners & reviews** — Monday banner, volume summary banner, deload banner, weekly review prompt/sheet.
6. **Daily stretch card** on home.
7. **Coach side** — coach dashboard, athlete detail, inbox/messaging, invite links/codes, coach step in onboarding, coach/athlete choice at sign-up.

## Resulting screens
```text
Today     greeting + streak-free header, next session, Hyrox/HM card,
          recovery scores (no muscle diagram), nutrition summary,
          weight, week strip
Train     routines, programme editor, library, builder, Hyrox, run
Fuel      nutrition, water, weigh-in
Progress  Stats | Photos | Recovery  (+ history)
You       profile & settings only
```

## Technical details
- `App.tsx`: drop routes `/leaderboard /quests /duels /shop /community /coach /coach/athlete/:id /inbox /inbox/:id /join/:code`; old URLs redirect to `/`. Remove `LevelUpSheet`, `BadgeUnlockSheet`, `SeasonFinaleSheet` mounts. `RoleBasedHome` always renders athlete home.
- `BottomNav.tsx`: remove unread badge + compete/coach match paths.
- `Index.tsx`: remove `XpBar`, `DeloadRecommendationBanner`, `MondayBanner`, `VolumeSummaryBanner`, `WeeklyReviewPrompt`, `DailyStretchCard`.
- `HomeCombinedRecoveryCard`: remove the muscle-diagram half, keep biometric scores.
- `Progress.tsx`: remove Volume tab; `/progress?tab=volume` falls back to Stats. Recovery tab keeps scores but drops `BodyDiagram` panels.
- `Profile.tsx`: remove Compete section, season/badge shelf, XP toast preference, coach code/link UI.
- `awardXpAndNotify` call sites (workout save, food, sleep, weight, photos, check-in): remove the calls; delete `src/lib/gamification/` and `src/components/gamification/` once unreferenced. Keep `PRCelebration`.
- `Onboarding` / `Login`: remove `CoachLinkStep`, `AccountTypeSelector`, signup intent.
- Delete now-unused pages/components/hooks/query modules (quests, duels, cosmetics, clans, community, season, leaderboard, coach-*, inbox, volume-*, weekly review, deload banner, stretch card) and their query keys/demo-tour steps.
- No database migrations; tables stay untouched so nothing is lost and features could return later.
- Update `CLAUDE.md`/`AGENTS.md` module lists; save a memory that gamification, coach and workload features were intentionally removed.
- Verify: build clean, existing tests pass, demo-mode Playwright walk through Today, Train → start Upper A → log a set (PR toast still shows), Fuel, Progress, You.
