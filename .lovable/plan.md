# Sleep score + check-in consolidation

## Problems found

**1. Sleep score bug (root cause confirmed)**
`computeSleepPerformance` returns `0` when no `sleep_logs` row exists. In `BiometricCheckIn.handleSave`, sleep stages are only persisted **if a row already exists** (the code does `existingSleepLogs.find(...)` then only upserts when `todaySleep` is found). So if you enter Samsung sleep stages in the check-in but never used the separate SleepCard first, nothing is written to `sleep_logs` → `sleepFull` is `null` in `computeAllScores` → sleep performance = 0.

**2. SleepCard is redundant**
It only captures hours + quality + notes — exactly the missing pieces the check-in needs to compute a proper sleep score. Better to merge into the morning check-in.

**3. Check-in not truly editable**
`HomeCombinedRecoveryCard` already prefills biometrics when re-opening, but does **not** prefill sleep data. `MorningCheckInPrompt` correctly suppresses itself once data exists, but the manual entry point should always re-hydrate everything the user previously entered.

## Changes

### A. `BiometricCheckIn.tsx`
- Add **Sleep** section (always visible, near the top): hours slider (4–10h, 0.5 step), quality 1–5 buttons, optional notes — taken from `SleepCard`.
- Always upsert a `sleep_logs` row in `handleSave` (with hours + quality + optional stages), regardless of whether one previously existed. This fixes the sleep score = 0 bug.
- Extend `prefill` prop to include `sleepHours`, `sleepQuality`, `sleepNotes`, `deepMin`, `remMin`, `lightMin`, `awakeMin`. Hydrate those into local state on open.
- Auto-expand "advanced → sleep stages" when prefilled stage values exist so the user sees what they entered.

### B. `HomeCombinedRecoveryCard.tsx`
- Pass sleep prefill from `useSleepLogs()` for `date` into `BiometricCheckIn`.
- Edit pencil already exists — keep it. Make the whole card tappable for "edit check-in" once `hasData`, same as before.

### C. `Index.tsx`
- Remove the `<SleepCard date={dateStr} />` instance.
- Keep `SleepCard.tsx` file untouched for now (in case used elsewhere — verify with rg; if not, delete).

### D. `MorningCheckInPrompt.tsx`
- No behavioural change needed (already suppresses when `hasTodayData` for biometrics). Optional copy tweak: mention sleep in the prompt body.

### E. No DB migration required
`sleep_logs` already has unique `(user_id, date)` and supports stages.

## Out of scope
- Health Connect auto-import (still PLAN.md backlog).
- Visual redesign of the check-in sheet (only adds a sleep section at top).

## Verification
- Open check-in fresh → enter hours + quality + stages + biometrics → save → sleep score > 0.
- Re-tap edit pencil → all previously entered values (sleep included) appear pre-filled.
- Change a value → save → score updates, no duplicate sleep_logs row.
