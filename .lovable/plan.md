# Seasons + Shop Overhaul

Three-part plan: (1) fix the broken **Claim Season Rewards** button, (2) make the **Season loop** feel like a real progression system (visible goals, tier rewards, milestone unlocks), and (3) make the **Shop** feel like a place worth spending coins.

Inspiration: Duolingo Leagues (tier badges + weekly finale), Apex/Fortnite Battle Pass (visible reward track), Strava challenges (badge milestones), Habitica shop (rarity + featured drops).

---

## 1. Fix "Claim Season Rewards"

Current bug: pressing the button in `SeasonFinaleSheet` calls `settle_season` RPC. If the RPC throws (e.g. `pending.status ≠ 'active'`, RLS, or already-settled), the error is caught but the sheet just goes back to "Settling..." → prompt state with no visible feedback beyond a sonner toast that may be hidden behind the sheet.

Fixes:
- Log the RPC error to console and surface `e.message` in the toast so real failures are diagnosable.
- After a successful `settle_season`, force a small delay + `refetch()` of `pending`, `result`, and `user-progress` and switch to the **Result** state locally (don't rely on `pending` still equalling `result.season_id`, since the RPC flips season status to `completed` and `pending` becomes `null` on refetch — right now that hides the result screen).
- Add a **Continue to Shop** CTA on the result screen (deep-links to `/shop`) so newly-awarded coins have somewhere to go.

Also: check `fetchPendingSeasonFinale` — if there's no `seasons` row at all, no finale ever fires. Add a tiny seed check + a one-off migration to make sure there is always an active season (auto-rollover on settle).

**Auto-rollover:** extend `settle_season` RPC so that after completing season N it inserts season N+1 (`starts_at = now()`, `ends_at = now() + 28 days`, `status = 'active'`). Guarantees the loop never stalls.

---

## 2. Season loop — make it feel worth chasing

### 2a. Season Objectives (new)

A small set of **season-long targets** shown on the `SeasonCard` and Quests page. Each objective grants a big RP + coin chunk on completion — separate from the daily/weekly quest churn.

Examples (4-week season):
- Log **12 workouts** — 150 RP + 300 coins
- Hit **8 PRs** — 200 RP + 500 coins
- Complete **all 4 weekly reviews** — 100 RP + 200 coins
- Reach a new **strength tier** on any lift — 300 RP + 750 coins + exclusive badge
- Win **3 duels** — 150 RP + 250 coins

Stored as rows in existing `quests` table with a new `scope = 'season'` value, tracked in `user_quests` with `season_id`. Reset each season.

### 2b. Season Reward Track (new UI)

Add a **Reward Track** panel to `SeasonCard` that visualises what you unlock at each tier as you climb RP. Think Battle-Pass style horizontal scroll:

```text
Bronze ── Silver ── Gold ── Platinum ── Diamond ── Champion
  ✓        ✓       [you]     locked      locked      locked
100c     250c    exclusive   750c +      1500c +    Champion
        + frame   title      banner     xp theme    crown +
                                                    title
```

Each node shows the reward icon + coin bounty + any exclusive cosmetic unlock. Tapping opens a preview sheet. Rewards paid out at season settle (extend `settle_season` to insert into `user_cosmetics` for tier-locked drops).

### 2c. Finale recap upgrade

When the finale settles, show:
- Rank + tier badge (existing)
- Coin reward (existing)
- **Cosmetics unlocked this season** (new — pulled from user_cosmetics inserted by settle_season)
- **Best moments** (new — top PR, biggest volume day, longest streak) — one Supabase query pulling season-window stats
- Confetti + tier-appropriate colour sweep

---

## 3. Shop revamp

Current shop is a flat 4-tab grid. Make it feel curated.

### 3a. Header

- Replace flat coin pill with **animated coin balance** + a "How to earn coins" tooltip.
- Add a **Featured** hero card at the top: rotates weekly, highlights one item with a big animated preview, discount tag, and countdown.

### 3b. Sections (before the tabs)

- **New this season** — items with `season_release = current_season.number` (add column).
- **Tier exclusives** — items with `required_tier` matching or below current tier, gated ones shown locked with a subtle glow.
- **On sale** — optional `discount_pct` column, price crossed out.
- Then the existing 4 category tabs below.

### 3c. Item card polish

- Rarity glow: `common` → none, `rare` → blue ring, `epic` → purple ring, `legendary` → animated amber shimmer.
- Bigger preview area with hover/tap **live preview** (frame animates, banner parallax, xp theme fills, title text glints).
- "Preview on my profile" CTA opens a mini sheet mocking the profile header with the item applied.
- Owned items get a subtle "OWNED" watermark instead of just the Equip button.

### 3d. Bundles (new)

Add a **Bundles** tab: 2–4 curated packs per season (e.g. "Champion Kit" = frame + banner + title for 3000 coins, ~20% cheaper than buying separately). Stored as `cosmetic_bundles` with a join table to catalog items.

### 3e. Coin economy tweaks

Coin sinks currently: cosmetics only. Add:
- **Streak Freeze** (single-use, 200 coins) — spend to save your streak beyond the automatic freeze tokens.
- **RP Boost** (24h, 500 coins) — 1.5× season RP on all sources. Limit 1/week.

Kept optional/toggleable — the user can veto these if they want a purely cosmetic shop.

---

## 4. Database changes

New migration (single file):

- `ALTER TABLE seasons ADD COLUMN theme text` — for visual theming ("Winter Iron", "Spring Push").
- `ALTER TABLE cosmetics ADD COLUMN season_release int NULL, ADD COLUMN discount_pct int NOT NULL DEFAULT 0`.
- `CREATE TABLE cosmetic_bundles(...)` + `cosmetic_bundle_items(...)` with GRANTs + RLS (read-only for authenticated).
- `ALTER TABLE quests ADD COLUMN scope text NOT NULL DEFAULT 'daily' CHECK (scope IN ('daily','weekly','season'))`.
- `ALTER TABLE user_quests ADD COLUMN season_id uuid REFERENCES seasons(id)`.
- Extend `settle_season` RPC: (a) grant tier-exclusive cosmetics into `user_cosmetics`, (b) auto-insert next season.
- Optional: `consumables` table for streak freezes / RP boosts if we go with 3e.

Seed data migration (data-only, via insert tool): 6 tier-exclusive cosmetics, 3 season objectives, 2 example bundles.

---

## 5. Files touched

- `src/components/gamification/SeasonFinaleSheet.tsx` — bug fix, better error handling, cosmetics unlocked section, Continue to Shop CTA.
- `src/components/gamification/SeasonCard.tsx` — add reward track + season objectives strip.
- `src/components/gamification/SeasonRewardTrack.tsx` — **new**, horizontal tier reward preview.
- `src/components/gamification/SeasonObjectives.tsx` — **new**, list of season-scope quests.
- `src/pages/Shop.tsx` — restructure with featured / sections / bundles / rarity glow.
- `src/components/shop/FeaturedItem.tsx`, `Bundles.tsx`, `CosmeticPreviewSheet.tsx` — **new** helpers.
- `src/lib/data/season-queries.ts` — add `fetchSeasonObjectives`, `fetchSeasonRewards`, `fetchCosmeticsUnlockedInSeason`.
- `src/lib/data/cosmetics-queries.ts` — add bundles + featured queries.
- `src/hooks/queries/useSeasonFinale.ts`, `useCurrentSeason.ts` — expose new fields.
- New Supabase migration + seed inserts (see §4).

---

## 6. Open questions

1. **Scope for this pass:** all three sections (fix + seasons + shop), or would you rather I split it — e.g. ship the finale fix + tier reward track first, then Shop revamp in a follow-up?
2. **Coin sinks (3e):** cosmetics-only shop, or add Streak Freeze + RP Boost consumables?
3. **Season length:** current schema doesn't hard-code this. Stick with 4 weeks or go with 2-week "mini-seasons" like Duolingo?
4. **Reward-track exclusives:** are you OK with me designing 6 new cosmetics (one per tier), or do you want to hand-pick them?
