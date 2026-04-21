

## Goal
Add subtle, non-alarming colour shifts to the calorie and water progress bars on the home `HomeDailySummary` card to gently signal when intake is over (calories) or under (water) target — without using a caution/warning icon.

## Approach
Use the existing colour language from `CompleteDaySummary` (amber for "watch this", green for "on track") so the signal feels consistent with the rest of the app. No new icons, no red, no extra components.

### Logic

**Calories bar** (in `src/components/HomeDailySummary.tsx`):
- `< 110%` of goal → keep current `bg-primary` (amber/orange brand) and `text-primary` for the number.
- `≥ 110%` of goal → switch bar + number to `bg-amber-400` / `text-amber-400` (slightly more yellow than primary, reads as "heads up").
- Bar width clamps at 100% as today (so going over doesn't visually overflow), but the colour change communicates the overage.

**Water bar**:
- `≥ 90%` of goal → keep `bg-blue-400` / `text-blue-400`.
- `< 90%` → desaturate to `bg-blue-400/50` (bar) and `text-blue-400/70` (number) so it reads as "incomplete" rather than "wrong".
- No threshold-based time-of-day logic — keeps it simple and predictable.

**Macros row** — unchanged. The day-summary already gives end-of-day feedback for protein/carbs/fat; adding mid-day signals for three more bars would feel noisy.

### Implementation
Single file edit: `src/components/HomeDailySummary.tsx`
- Compute `caloriesOver = totals.calories / goals.calories >= 1.1`
- Compute `waterLow = waterMl / waterGoal < 0.9`
- Apply conditional Tailwind classes to the calorie bar/number and water bar/number.

No new dependencies, no schema changes, no new components.

## Files Touched
- `src/components/HomeDailySummary.tsx` — conditional class names on the calories and water elements.

## Out of Scope
- No caution/warning icon.
- No changes to `CompleteDaySummary` (already handles this well at end of day).
- No red/destructive colours.
- No changes to macro bars.

