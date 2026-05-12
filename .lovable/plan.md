## Goal

Make Iron Keeper's Whoop-style biometric stack genuinely competitive: tighten the calculations against Whoop's published methodology, then redesign the recovery / strain / sleep surface so it reads like Whoop — clean, dial-driven, factor-breakdown-on-tap. Keep AI feedback you've already wired in.

## Research summary — how Whoop does it

**Recovery score (0–100, green/yellow/red at 67 / 34)** — composite of:
- **Sleep performance ~40–50%** (largest single driver; not just hours — efficiency, deep + REM proportions, consistency)
- **HRV ~25–30%** (Whoop's most heavily weighted *single* metric when present; deviation from 14-day baseline)
- **Resting HR ~15–20%** (deviation from baseline; rises 24–48h before illness)
- **Respiratory rate ~5–10%** (illness signal — deviations matter more than absolute)
- **Body / skin temperature ~10%** (deviation from baseline)

Bands: Green ≥67 (primed), Yellow 34–66 (maintain), Red ≤33 (rest).

**Strain (0–21, logarithmic)** — Whoop derives this from time in HR zones, not calories. Logarithmic so the top of the scale is genuinely hard to reach.

**Stress Monitor (0–3)** — real-time, motion-aware: distinguishes workout HR from stress HR.

**UI conventions**
- Home "Overview" dominated by three big rings: Recovery (top, % + colour), Sleep (bottom-left, %), Strain (bottom-right, 0–21 with day-target).
- Tapping any metric opens a detail screen with a single hero number, a coloured arc, and a factor breakdown ("HRV +5% vs baseline", "Sleep −12 min", "RHR +4 bpm" etc.).
- Trend views: 7-day / 30-day sparkline per metric, baseline band shaded behind.
- Strain Target dial: animated bar from 0 → today's target derived from this morning's recovery.

## Audit of your current calculations

`src/lib/recovery-scores.ts` is solid for a phone-only stack with no continuous HR. Specific deltas vs Whoop:

| Component | Today | Whoop guideline | Verdict |
|---|---|---|---|
| Recovery weights | stress 40% / sleep 35% / RHR 20% / resp 5% | Sleep 40–50, HRV 25–30, RHR 15–20, resp 5–10 | **Sleep should lead, not stress.** |
| HRV usage | only used inside baseline; not in the score | "Most heavily weighted single factor" when present | **Promote HRV to primary signal when `hrvMs !== null`.** |
| RHR weight | 20% | 15–20% | OK |
| Respiratory band | linear (0–8 br/min) | deviation-from-baseline | Switch to z-score vs personal baseline once 14 days exist. |
| Strain | log(cal/60 + cal/80) × effort | log of HR-zone time | Calorie proxy is reasonable without continuous HR. Add an avg-HR fallback (we already store `effortRating` + duration). |
| Stress level | z-score blend of stress + RHR | real-time HR-derived | Acceptable as a daily snapshot. |
| Bands | 67 / 34 | 67 / 34 | Matches. |
| Sleep need | `7 + (strain/21) × 1.5` (7–8.5h) | scales with previous-day strain | Matches. |
| Sleep performance | sufficiency 40 / quality 15 / efficiency 25 / restorative 20 | similar four-factor split | Matches well. |

## Plan

### 1. Tighten the calculations (`src/lib/recovery-scores.ts`)

- **Reweight `computeRecoveryScore` when HRV is present**:
  - HRV available: HRV 30 / Sleep 40 / RHR 15 / Stress 10 / Resp 5
  - HRV missing (current Galaxy Watch path): Sleep 40 / Stress 30 / RHR 20 / Resp 10
- **Personalise respFactor** once `baseline.sampleSize ≥ 14`: switch from fixed `respBaseline = 15` to a rolling personal mean.
- **Add `factorBreakdown` return** alongside the score: `{ sleep, hrv, rhr, stress, resp }` each `{ contribution, deltaVsBaseline, label }`. The detail sheet uses it directly.
- Cover with Vitest unit tests for the new weighting + breakdown.

### 2. New "Whoop-style" home overview (`src/components/recovery/`)

Replace the bottom half of `HomeCombinedRecoveryCard` (kept top half for AI insight + check-in CTA per project rules) with a three-dial cluster:

- **Primary dial**: Recovery — large semicircle, hero %, label (Green/Yellow/Red), 7-day sparkline below
- **Secondary tile**: Sleep performance — circular ring + hours/need
- **Secondary tile**: Strain — bar from 0 to 21 with today's target marker (derived from recovery)

All using existing `recoveryColor` / `strainColor` tokens — no new colors.

### 3. Detail sheet upgrade (`RecoveryDetailSheet.tsx`)

Replace the current flat list with the Whoop-style breakdown:
- Hero: big number + arc + label
- "What moved your score" — ranked list of factors with their delta vs 14-day baseline (sourced from new `factorBreakdown`)
- 7-day mini sparkline with baseline band
- Keep your AI insight section pinned at the bottom

### 4. Trend tab (Progress → Recovery)

Add 7d / 30d toggles + sparkline per metric (Recovery, Strain, Sleep, Stress) using existing `daily_scores` rows. Recharts already in the bundle.

### 5. Side fix — runtime error

`fetchExerciseLastDataLike` in `src/lib/data/workout-queries.ts` throws `.eq(...).or is not a function` at runtime. The chain is syntactically valid for supabase-js v2, but the error is reproducible — likely a builder-type quirk after `.eq()` then `.or()`. Fix by splitting the OR into two queries (`exercise_id eq baseId` + `exercise_id like 'baseId-%'`), unioning client-side, then taking the first by `created_at`. Restores previous-set fallback for substituted exercises.

## Out of scope

- No new sensors (no Health Connect / HealthKit — that's queued for the Capacitor phase per PLAN.md).
- No body temperature / skin temp — Galaxy Watch doesn't expose it via PWA.
- No real-time stress (no continuous HR via web).
- No copy rewrites of the AI insight system itself — already wired.

## Technical notes

- All score functions stay pure — no React, no Supabase. Keeps Vitest coverage trivial.
- Breakdown shape: `interface FactorBreakdown { key: 'sleep'|'hrv'|'rhr'|'resp'|'stress'; contributionPct: number; deltaPretty: string; direction: 'positive'|'negative'|'neutral' }`.
- Rings/dials: pure SVG, no new dependency. Animated via framer-motion (`<motion.circle strokeDashoffset />`).
- Sparkline: Recharts `<AreaChart>` with hidden axes, baseline band as a `<ReferenceArea>`.

## Rollout

1. Calc rewrite + tests.
2. Quick fix for `fetchExerciseLastDataLike`.
3. New `RecoveryDials` + `MetricRing` primitives in `src/components/recovery/`.
4. Wire into `HomeCombinedRecoveryCard` (replace bottom half only).
5. Upgrade `RecoveryDetailSheet` with factor breakdown.
6. Trend tab on `Progress → Recovery`.

~6 files added, ~4 edited.
