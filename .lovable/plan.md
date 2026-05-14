## Goals
1. Make the AI "Refresh insight" control obviously discoverable.
2. Make it visually clear which inputs are *live today* vs *this morning* vs *last night*, so a fresh leg session not tanking Recovery makes sense.

## Changes — `src/components/HomeCombinedRecoveryCard.tsx` only

### 1. Per-ring timestamp captions
Extend `DialRing` with an optional `timing?: string` prop. Render a tiny caption under the existing `sub` line in muted text.

Wire each ring:
- **Recovery** → `"as of {HH:MM}"` using `score.aiGeneratedAt` if present, else the morning check-in time (fall back to "this morning"). Source: `score.updatedAt` from `daily_scores` (already on the row).
- **Sleep** → `"last night"`.
- **Strain** → `"today · live"` when `strain > 0`, else `"today"`.

Replace the current single-line footer ("Recovery & Sleep use last night · Strain resets daily…") with a shorter prompt: `"Tap any ring for the breakdown"` since each ring now self-labels.

### 2. Bigger labelled refresh button
Replace the current small icon-link at the bottom of the dial section with a full-width pill placed **directly under the AI headline quote** (inside the same `border-t` block):

```
[ ↻  Refresh insight  ·  1 / day ]
```

- Style: `w-full rounded-xl bg-primary/10 border hairline py-2 text-xs font-semibold text-primary`, with `RefreshCw` icon, spinner state, and disabled state showing `"Refreshed today — resets tomorrow"`.
- Same `regenerateAIInsightFromSaved` call, same once-per-day localStorage gate (`STORAGE_KEYS.aiInsightRefreshed`), same toast behaviour.
- Remove the old small icon-only button further down to avoid duplication.
- If no AI headline yet (`!score?.aiInsight?.headline`), show the same button under the stress chip with label `"Generate insight"` so it's still reachable.

### 3. Minor copy on the strain ring tooltip
Update tooltip to: `"Today's training load. Tonight's session feeds tomorrow's recovery, not today's."` — matches the new mental model.

## Out of scope
- No changes to scoring math (`recovery-scores.ts`).
- No DB / migration changes.
- No new components or files.
- "Tomorrow's forecast" hint not included (user picked timestamps only).

## Technical notes
- `aiGeneratedAt` is already on `daily_scores` and surfaced via `fetchTodayScore`. If the field is null (older rows), fall back to `updatedAt`, then to literal "this morning".
- Time format: `new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })`.
- All new strings use existing semantic tokens (`text-muted-foreground`, `text-primary`, `bg-primary/10`).
