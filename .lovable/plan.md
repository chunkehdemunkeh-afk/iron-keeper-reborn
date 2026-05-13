# Rework the stat cards (Home + Profile)

The three top cards on Home (`StatsBar.tsx`) and the three on Profile are showing numbers without context. Plan: give every card a clear time window, a tooltip/sub-label explaining the rule, and make them tappable so they drill into the relevant page.

## Problems today

**Home (`StatsBar.tsx`)**
- **Streak** — silently requires exercise + food + water all logged on the same day. Nothing tells the user that, so it looks random.
- **This Week `3/4`** — `/4` is a hardcoded fallback when `daysPerWeek` pref isn't set. No label says "sessions vs weekly goal".
- **Total Lifted `188.2K kg`** — all-time cumulative volume across every set ever. No timeframe shown.

**Profile**
- **`1w` Streak** — different metric (`computeWeeklyStreak`, weeks hitting goal), uses same flame icon as the daily streak on Home → confusing.
- **`30` Workouts** — all-time count, no label clarifying that.
- **`600` Week Burn** — kcal this week, fine, but no day breakdown / target.

## Proposed redesign

### Home `StatsBar` — three cards, each with: icon · big value · unit · label · sub-label

| Card | Value | Sub-label | Tap action |
|---|---|---|---|
| **Streak** | `5 🔥` | "days logged" — counts any day with ≥1 of: workout, food log, water | History page |
| **This Week** | `3 / 4` sessions | name the goal: "Mon–Sun · goal {N}" (read from prefs, fallback "set goal") | Sessions page |
| **Volume** | `12.4K kg` | toggle: "this week" (default) → tap to cycle week / month / all-time, persisted in localStorage | Progress → Stats |

Streak rule simplified to "any logged activity" (workout OR food OR water) so it's achievable and obvious. Today doesn't break the streak until it ends. Add an info tooltip (`title=`) on each card explaining the rule, mirroring the pattern we just added to the recovery rings.

When a card is empty, keep the existing muted state but make the CTA copy actionable ("Log a workout →", "Set a weekly goal →", "Drink water to start").

### Profile stats — re-scope to "lifetime / identity" numbers (not duplicates of Home)

| Card | Value | Sub-label |
|---|---|---|
| **Member since** | `8 mo` | "Joined Sep 2025" |
| **Lifetime workouts** | `30` | "all-time sessions" |
| **Lifetime volume** | `188.2K kg` | "≈ {n} elephants" or just "all-time" |

Drop "Week Burn" from Profile (it already lives on Home/Recovery context) and drop the weekly streak there — the Home streak is the single source of truth.

### Implementation notes (technical)

- `StatsBar.tsx`: replace items array with the new three-card spec; add `subLabel` field to the render loop; wrap each card in a `<button>` that navigates via `useNavigate`. Add `title=` tooltip for the rule.
- New helper `computeSimpleStreak(exerciseDates, foodDates, waterDates)` in `StatsBar.tsx` (or extract to `src/lib/streak.ts`) using OR logic instead of AND.
- Volume window: new `useState<'week'|'month'|'all'>` persisted in `localStorage` under `STORAGE_KEYS.statsBarVolumeWindow`. Sum from existing `workout_sets` query, filtered by date.
- `Profile.tsx`: replace the streak/workouts/burn block with the new three-card spec. `member_since` from `user.created_at`.
- No DB / migration changes. No business-logic changes to recovery, scoring, or food tracking.

## Out of scope
- Adding new gamification (badges, levels) — separate request.
- Changing the daily check-in or recovery cards.
- Health Connect / wearable integration.

## Open questions
1. Streak rule: keep as **any activity** (easier, more motivating), or **workout-only** (stricter, more meaningful)?
2. Volume default window on Home: **this week** or **this month**?
3. On Profile, do you want me to keep "Week Burn" somewhere or move it onto the Recovery card area?
