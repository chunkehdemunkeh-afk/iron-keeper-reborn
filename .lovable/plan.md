
# Iron Keeper Gamification — v1 Plan

A full system covering passive logging rewards, active competition, and long-term identity. Rolled out in 4 phases so each layer ships usable before the next.

---

## 1. Core currencies

- **XP** — lifetime, never lost. Drives **Level** (1–100, slows after 50).
- **Coins** — spendable in cosmetics shop. Earned ~1/10th rate of XP. Balanced moderate: a casual user can afford a basic frame in ~2 weeks; premium animated items take ~6–8 weeks. Drives shop engagement without feeling stingy.
- **Rank Points (RP)** — competitive only. Earned/lost in duels and weekly challenges. Resets per 8-week season. Drives tier: Bronze → Silver → Gold → Platinum → Diamond → Champion.

---

## 2. XP sources

Fully-engaged day ≈ 150 XP, passive day ≈ 20 XP, perfect week ≈ 1,200 XP.

| Action | XP | Coins | Notes |
|---|---|---|---|
| Daily app open | 5 | 1 | Once/day |
| Log workout session | 50 + 1/set | 5 | Capped 100 XP/session |
| Log sleep | 15 | 2 | +5 with stages |
| Log all meals (±10% of cal goal) | 25 | 3 | Partial 10 XP for any food log |
| Hit protein goal | 15 | 2 | |
| Hit water goal | 10 | 1 | |
| Log bodyweight | 10 | 2 | Max 1/day |
| Morning biometric check-in | 20 | 3 | |
| Progress photo | 30 | 5 | Max 1/week for XP |
| Weekly review completed | 75 | 10 | |
| Hit a PR | 100 | 15 | Auto-detected |
| Programmed workout (vs freestyle) | +25 | +3 | Bonus |
| First-time use of any feature | 50 | 10 | One-shot |

**Multipliers** (stack):
- Streak ≥7 days ×1.1 · ≥30 ×1.25 · ≥100 ×1.5
- Active challenge participation ×1.1

---

## 3. Streak rule (recommended)

**Any one of: workout, sleep log, ≥1 meal, or morning check-in.**

Why this rule:
- Matches your app's identity (training + recovery + nutrition, not just one). Single-category streaks punish 4×/week trainers.
- Achievable on rest days, sick days, travel days — streak represents *engagement*, not perfection.
- Stricter "≥2 categories" sounds good but kills streaks the moment someone forgets dinner.

**Streak Freezes** (forgiveness layer):
- Earn 1 every 7-day milestone, max 3 stockpiled.
- Auto-consumed at midnight on a missed day; "Streak saved" toast next morning.
- Buyable in shop (200 coins) up to the 3 cap.

**Tiers:** 🔥 7 Spark · 🔥🔥 30 Blaze · 💎 100 Diamond · 👑 365 Legend (animated).

---

## 4. Badges (50+ at launch, Bronze/Silver/Gold tiers)

- **Consistency** — 7/30/100/365 streak, 30 sleep nights, 30 food days
- **Strength** — first PR, 10/50 PRs, 1×BW bench, 1.5×BW squat, 2×BW deadlift, 100K kg / 1M kg lifted (Iron Tonne club)
- **Volume** — 10/50/100/500 sessions
- **Recovery** — 7 nights ≥8h, log HRV 30 days, perfect recovery week
- **Nutrition** — protein 7/30/100 days, every meal for a week
- **Exploration** — 25/100 different exercises, every built-in split once
- **Social** — first duel, win 10 duels, top 10% season finish, contribute to 5 community challenges
- **Hidden** — 5am workout, log on Christmas Day, comeback after 14-day break

Each unlock: XP + coins + profile-displayable icon.

---

## 5. Ranks & seasons

8-week seasons. **Bronze → Silver → Gold → Platinum → Diamond → Champion** (top 100 globally).

**RP earned by:**
- Win 1v1 duel (+25 to +50, scaled by opponent tier)
- Top-3 weekly challenge (+100/+60/+40)
- Top 10% community challenge (+30)
- Daily login during season (+2, max 14/week)

**Season end:** top tier earns exclusive cosmetic (e.g. animated "Season 1 Champion" frame — never re-issued). Everyone gets a recap (best lifts, total volume, rank progression, badges).

---

## 6. Duels — 1v1 head-to-head

**Friend graph:** piggyback on leaderboard visibility. Anyone with `leaderboard_visible = true` is challengeable. (Real follow/friends graph deferred to a later release.)

**Duel types:**
- Race to X kg total volume (3/7/14 days)
- Most workouts logged (1 week)
- Best 1RM gain on a chosen lift (4 weeks, Epley)
- Longest streak (head-to-head from start)
- Most XP earned (1 week — generic catch-all)

Live progress bar in Duels tab. Zero-sum RP transfer; draws split.

---

## 7. Community challenges

Always one active. Examples:
- **Iron Tonne** — community lifts 1,000,000 kg in 7 days. Contribute ≥1,000 kg → badge.
- **Sleep Week** — community average 7+ h. Personal: 7/7 nights for bonus.
- **Protein Push** — protein goal 5/7 days.
- **Squat-tober** — themed monthly.

Live progress bar on Home. Top 100 contributors leaderboard.

---

## 8. Cosmetics shop

Spend coins on: profile frames (static + animated), accent colors, theme variants, badge shelf layouts, custom flame icons, animated stat counters, leaderboard avatar borders, rotating seasonal items.

**No pay-to-win.** Cosmetics only. Status items (rank frames, season-exclusives) are **earned only**.

---

## 9. Notifications — PWA push (interim, until Capacitor build)

Use the Web Push API + service worker for: duel accepted/won/lost, challenge ending in 24h, streak about to break (8pm reminder), level up, badge unlock, weekly review prompt.

- iOS Safari supports web push only when installed to Home Screen — degrade gracefully (in-app notification center) for users who haven't installed.
- Permission prompt asked once, after first level-up (warm moment, not on first load).
- Subscription stored in new `push_subscriptions` table.
- Sender uses `web-push` from a server function; VAPID keys stored as secrets.
- Migrate seamlessly to Capacitor `@capacitor/push-notifications` later — same trigger logic, different transport.

**CAUTION:** existing PWA setup must not interfere with the dev iframe. Service worker registration guarded against `id-preview--` and `lovableproject.com` hosts (per project's existing PWA hygiene).

---

## 10. AI tie-in

**Purely biometric.** No AI calls for XP/streak commentary — keeps Anthropic spend predictable. Gamification messaging is template-based ("You're 2 sessions off Gold tier this week" generated client-side from RP delta math).

---

## 11. UI surfaces

- **Home** — XP bar under header, streak chip, active challenge card, active duel card.
- **New `/quests` route** — daily quests (3 rotating), weekly quests (5), active duels, active challenges, badge progress.
- **Profile** — level, tier, badge shelf (3/6/9 slots), season history.
- **Leaderboard** — tier filter, current rank, RP delta this week.
- **Toasts** — "+50 XP · Workout logged" with mini progress bar.
- **Level-up sheet** — bottom sheet, animated, lists unlocks.

---

## 12. Data model

New tables (all RLS, per-user except aggregates):

```text
user_progress            user_id PK, xp, coins, level, current_streak,
                         longest_streak, last_active_date, freeze_tokens,
                         season_rp, season_tier
xp_events                id, user_id, source, xp, coins, metadata jsonb,
                         created_at  (append-only ledger; counters derived)
badges                   id, code, name, description, tier, icon, xp_reward,
                         coin_reward, criteria jsonb, hidden bool
user_badges              user_id, badge_code, unlocked_at, progress jsonb
quests                   id, code, title, type (daily|weekly), criteria jsonb,
                         xp_reward, coin_reward, active_from, active_to
user_quests              user_id, quest_id, progress, completed_at
duels                    id, challenger_id, opponent_id, type, target,
                         starts_at, ends_at, status, winner_id, rp_stake
duel_progress            duel_id, user_id, value, updated_at
challenges               id, code, title, type, target, starts_at, ends_at, scope
challenge_contributions  challenge_id, user_id, value, updated_at
seasons                  id, number, starts_at, ends_at, status
season_results           season_id, user_id, final_rp, final_tier, rank
shop_items               id, code, name, type, cost_coins, requires_tier,
                         season_exclusive
user_inventory           user_id, item_code, acquired_at, equipped bool
push_subscriptions       user_id, endpoint, p256dh, auth, created_at
```

`xp_events` ledger is source of truth; `user_progress` is a denormalized counter cache rebuildable from the ledger.

---

## 13. Server logic

**Single chokepoint:** `awardXp({ source, metadata })` server function. After every successful log it:
1. Inserts `xp_events`.
2. Updates `user_progress` (xp, coins, level).
3. Updates streak if source is streak-eligible and `date > last_active_date`.
4. Evaluates only the badges whose criteria reference `source`.
5. Updates active quests / duels / challenges in parallel.
6. Returns payload for client toasts / level-up sheet.

Existing paths (`saveWorkoutToCloud`, `upsertSleepLog`, food log insert, `upsertDailyBiometrics`, etc.) call `awardXp` after their own write succeeds.

**Cron** (`/api/public/cron/daily-rollover`, signed):
- Streak break check → consume freeze token.
- Daily quest rotation.
- Duel/challenge expiration & RP settlement.
- Season-end processing.
- Push notifications for "streak about to break" at 8pm user-local.

---

## 14. Phased rollout

**Phase 1 — Foundation (week 1)**
- `xp_events` ledger, `user_progress`, `awardXp` server fn
- Wire all existing log paths
- XP bar + level on Home, level-up sheet
- New streak rule + freeze tokens
- 15 launch badges (consistency + strength + volume)
- `/quests` route shell with daily quests only

**Phase 2 — Status (week 2)**
- Tier system + RP, Season 1 starts
- Profile redesign with badge shelf, level, tier
- Leaderboard tier filter
- Remaining 35 badges

**Phase 3 — Competitive (week 3)**
- Duels (all 5 types) using leaderboard-visibility friend graph
- Weekly quests
- Coins fully active
- PWA push notifications (duel events, streak warnings)

**Phase 4 — Community (week 4)**
- Community challenges + global progress bar
- Cosmetics shop v1 (frames, accents, flame variants)
- Season 1 finale UX + recap

---

Ready to start Phase 1 on approval — DB migration first, then the `awardXp` choke point, then UI.
