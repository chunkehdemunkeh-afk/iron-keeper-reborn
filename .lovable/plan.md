
# Premium UI Polish + Iron Warrior Rebrand (Final)

Locked decisions from your last reply:
- **Bottom nav** stays at 6 items: `Home · Recovery · Nutrition · Progress · Ranks · Profile`. **Sessions moves into Profile** as a "Training Programme / Sessions" entry. Sessions also remains reachable from the Home `NextSessionCard` and the Week strip, so daily access is unchanged.
- **Logo**: I'll generate **3 concepts** for Iron Warrior first and let you pick before any swap happens.
- Everything else proceeds as written.

---

## Build order

### Step 1 — Logo concepts (do first, blocks rebrand)
Generate 3 PNG concepts into `src/assets/`, all on a clean dark background, transparent variants for in-app use:
1. **Forged W** — angular "W" sculpted from two crossed dumbbells, amber-on-charcoal, sharp bevels.
2. **Warrior Shield** — minimalist shield with an embedded barbell silhouette, single-stroke, premium-mark feel.
3. **Monogram IW** — tight ligature wordmark in a custom-cut Barlow Condensed Black, with a single accent slash in amber.

You pick one; I then build out the maskable + monochrome Android icon variants and the new splash gradient from it.

### Step 2 — Iron Warrior rebrand swap
- Name + meta across `index.html`, `public/manifest.json`, `SplashScreen.tsx`, `Login.tsx`, `Profile.tsx`, README, toasts, demo tour copy.
- Tagline candidates (pick on approval): *"Train. Track. Conquer."* / *"Strength built rep by rep."* / *"Forge your strongest self."*
- New login feature pills (weight-training first):
  - *Smart Programming* — PPL, Upper/Lower, 5/3/1 and more
  - *Recovery Intelligence* — strain, sleep & readiness scoring
  - *Track Every Lift* — PRs, volume, tier-based strength standards
- Goalkeeper split stays available inside the app (selectable from Profile → Training Programme), just out of the headline.

### Step 3 — Visual System Refresh (foundation for every screen)
- New surface tokens in `src/index.css`: `--surface-1/2/3` + `--surface-hero` (subtle radial-to-amber). Convert `glass-card` → `surface-2`; add `hero-card` utility for top-of-page anchors.
- Hairline borders (`border-white/[0.04]`) + soft inner highlight (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.04)`) for the "lit" Apple/Whoop card look.
- Tighter Barlow numbers (`tracking-tight`, `tabular-nums`); single shared `<SectionEyebrow>` component for "THIS WEEK", "RECOVERY", etc.
- Spacing scale 4/8/12/16/24; `p-5` standard cards, `p-6` hero cards.
- `framer-motion` `staggerChildren: 0.04` on route mount so screens land instead of pop in.

### Step 4 — New `/recovery` top-level destination
- Hero band: gradient tinted by today's recovery score, large primary recovery dial, AI insight in a `Sparkles` chip, "How are you feeling?" check-in CTA.
- Three-up dial row: Recovery · Sleep Performance · Strain (shared `MetricDial` component).
- Stress chip + HRV / RHR / SpO₂ inline metric strip.
- 14-day trend chart with metric switcher (Recovery / Stress / RHR / Sleep) — moved out of Progress.
- Full-width muscle-recovery diagram with tap-to-detail per region.
- Recovery tips + "What helps your recovery" learnings.
- Home `HomeCombinedRecoveryCard` becomes a compact summary that deep-links into `/recovery`.
- Progress page loses the Recovery tab → Stats / Photos only.

### Step 5 — Bottom nav rework
- 6 items reordered: `Home · Recovery · Nutrition · Progress · Ranks · Profile`.
- Bigger tap targets (56px h), 22px icons, 10px labels.
- Soft amber pill behind active icon (Whoop-style), keeping the `layoutId` transition.
- Sessions accessible from Profile + Home cards as before.

### Step 6 — Home hero polish
- Promote `HomeCombinedRecoveryCard` to a true hero with recovery-tinted gradient background, larger primary dial, "Open Recovery →" tap target.
- `StatsBar`: real empty states (flame ghost + "Start your streak"), micro-trend arrows.
- Date pager replaces text with a horizontally sliding pill.
- Demote loud orange `Complete Day` to a secondary outlined CTA.
- `SleepCard` empty: ghosted moon ring + duration placeholder.

### Step 7 — Nutrition / Progress / Ranks / Profile
- Nutrition: thicker calorie ring, "Eaten / Goal" centred, over/under chip, gradient macro bars + target tick, meal-time sub-labels.
- Progress + Ranks: shared `<SegmentedTabs>` (filled active pill); custom empty-state illustrations; `WeeklyEnergyCard` gradient fill + dotted target line.
- Profile: avatar hero card with inline metric chips; 2×2 quick links **+ a new "Training Programme & Sessions" tile** (relocated from bottom nav); Training summary uses a coloured chip instead of inline red text.

### Step 8 — Native-readiness pass
- New splash gradient + maskable / monochrome Android icons matching the chosen mark.
- `theme-color` matched to the top-of-screen surface so the Android status bar blends in.
- Pull-to-refresh on Home / Recovery / Nutrition.
- Shimmer skeletons.
- Audit `hapticMedium()` coverage on every primary CTA.

---

Approve and I'll start with Step 1 (the 3 logo concepts) so you have something concrete to pick from before any rebrand goes live.
