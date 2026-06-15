# Smart Deload Week

Whole-body deload prompt driven by the user's actual logged data — not a fixed 6–8 week timer. When the evidence stacks up, the app proposes a deload; **the deload week is only generated once the user explicitly accepts**. Dismissing leaves training untouched.

## Research basis (what science actually says)

Modern programming literature (Renaissance Periodization / Israetel; Helms / 3DMJ; Mike Tuchscherer's RTS; sports-science ACWR work — Gabbett 2016) converges on these objective deload triggers, in priority order:

1. **Performance regression on working sets** — same lift, same weight, reps drop ≥ ~15% vs the best of the prior 2–3 sessions, on 2+ consecutive sessions. Strongest single signal.
2. **Progression stall** — a lift has had no accepted weight increase for ≥ 3 consecutive sessions despite repeated attempts (or repeated failed top-set attempts on `exercise_progression`).
3. **Acute:Chronic workload ratio (ACWR)** — this week's whole-body tonnage ÷ trailing 4-week average. >1.5 = overreaching, <0.8 = already detraining. (Gabbett "sweet spot" 0.8–1.3.)
4. **Recovery / HRV / sleep trend** — rolling 7-day `recovery_score` or `sleep_performance` ≥ 10 points below the trailing 28-day baseline, OR HRV ≥ 1 SD below baseline on 4+ of last 7 days.
5. **Minimum-time guard** — never recommend a deload within 3 weeks of the last accepted/completed deload, to avoid thrashing.

A deload is **recommended** when any 2 of signals 1–4 fire AND the time guard passes. A single-signal firing surfaces as a softer "monitor closely" hint only — no deload plan.

## Deload protocol (only built on acceptance)

Industry-standard volume-dominant deload (RP-style):
- **Volume:** working sets reduced to ~50% of normal (round down, min 1).
- **Intensity:** target weight = 60% of current `target_weight` per lift, snapped to plate.
- **Reps:** target reps = `repsLow` (bottom of range), stop ≥ 3 RIR.
- **Duration:** 1 calendar week (Mon–Sun) from the date the user accepts.
- Applies to every scheduled session inside the window; cardio/accessory routines unchanged.

## Plan

### 1. New module `src/lib/deload.ts` (pure)
- `computeDeloadSignals(sessions, sets, scores, sleep, progressions, now)` → `DeloadSignals` with per-signal booleans, numeric evidence (ACWR value, regressed lifts list, stalled lifts list, recovery delta), `firedCount`, and human-readable reasons.
- `shouldRecommendDeload(signals, lastDeloadAt)` → boolean.
- `buildDeloadPlan(progressions)` → `Map<exerciseId, { weight, reps, sets }>` using the protocol. **Only called at acceptance time, never at recommendation time.**
- Unit-testable; no Supabase imports.

### 2. New table `deload_recommendations`
Columns: `user_id`, `created_at`, `status` (`pending` | `accepted` | `dismissed` | `completed` | `expired`), `accepted_at`, `week_start`, `week_end`, `signals` (jsonb evidence snapshot), `plan` (jsonb, **null until accepted**). RLS per-user + standard GRANTs. A pending row stores only the evidence; `week_start`/`week_end`/`plan` are written when the user accepts.

### 3. Evaluation hook
After `evaluateAndStoreProgression` runs (in `saveWorkoutToCloud`), call new `evaluateDeload()`:
- Pulls last 8 weeks of `workout_sets` + `workout_history`, last 28 days of `daily_scores` + `sleep_logs`, current `exercise_progression`.
- Runs `computeDeloadSignals`. If `shouldRecommendDeload` is true and no pending/accepted row exists inside the time-guard window, insert a `pending` row with signals only (no plan).
- Auto-expires stale `pending` rows older than 14 days.

### 4. UI surfaces
- **Home banner** (`src/pages/Index.tsx`): new `<DeloadRecommendationBanner />` above `MondayBanner` when a `pending` row exists. Lists the 2–3 firing signals in plain English with the actual numbers ("3 lifts regressed last session", "Tonnage 62% above 4-week average", "Recovery score down 14 pts vs baseline"). Two actions:
  - **Start deload week** → builds the plan via `buildDeloadPlan`, sets `status='accepted'`, writes `week_start=today`, `week_end=today+6`, persists `plan`. **This is the only path that creates the deload week.**
  - **Dismiss** → `status='dismissed'`; training continues as normal.
- **WorkoutSession**: when an `accepted` row covers the session date, render a slim "Deload week" pill at the top and auto-apply the plan's weight/reps/set count to working sets on mount (same mechanism as `applyProgressionToSetLogs`). Per-set edits still allowed.
- **Completion**: once the session date crosses `week_end`, mark `status='completed'` on next save.

### 5. Settings
Add an "Auto-recommend deloads" toggle in Recovery settings (default on). When off, `evaluateDeload` short-circuits so no recommendations are ever inserted.

### 6. Tests
`src/test/deload.test.ts`: ACWR maths, regression detection across synthetic sessions, time-guard, plate snapping, signal-count gating, and a test confirming `plan` stays null until acceptance.

## Technical notes
- Signal 1 uses `workout_sets` filtered to `set_type='working'`, grouped by effective `exercise_id`, comparing the best set of the latest session vs the best of the prior 2.
- Signal 2 reads `exercise_progression.last_evaluated_at` + change history of `target_weight`.
- ACWR uses ISO-week tonnage from `workout_sets` (`SUM(weight*reps)` where `set_type IN ('working','1rm_test')`).
- Recovery/HRV signals are optional — if the user has < 7 days of `daily_scores`/`sleep_logs`, that signal cannot fire (doesn't penalise users without a wearable).
- Banner copy is contextual, citing the actual numbers, never the phrase "every 6–8 weeks".
- No edge function needed; logic runs client-side off React Query caches plus one extra fetch on save.
