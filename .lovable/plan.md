## Goal

Final pass of the system-wide audit: make the app behave well above the mobile breakpoint without redesigning it. Iron Keeper is a phone-first PWA — at 1390px today every page sits in a 512px centred column with huge empty gutters. We'll widen tastefully and add multi-column where it actually helps, without breaking the phone layout.

## Scope (responsive sweep only)

### 1. Container widening
Bump the standard page wrapper from `max-w-lg` (512px) to `md:max-w-2xl` (672px) on routes where content is one column of cards/lists:
- `Index`, `Sessions`, `Profile`, `History`, `Progress`, `BodyMeasurements`, `FoodTracker`, `Leaderboard`, `WorkoutBuilder`, `WorkoutSession`

Mobile (`max-w-lg`) stays as-is below `md`.

### 2. Multi-column on grid-friendly screens
- **ExerciseLibrary** — exercise grid → `md:grid-cols-2 lg:grid-cols-3`, container `md:max-w-4xl`. Best win: 717-entry library is painful in a single column on desktop.
- **Sessions** — workout cards → `md:grid-cols-2`, container `md:max-w-3xl`.
- **CoachDashboard** — recent workouts list → `md:grid-cols-2`, container `md:max-w-4xl`.

### 3. Desktop-only background frame
Add a subtle `md:bg-muted/20` wrapper outside the page container so the empty gutters read as deliberate negative space instead of unfilled width. No visual change on mobile.

### 4. BottomNav at desktop
`BottomNav` is a fixed bar — fine to keep on desktop too (it's a PWA), but constrain its inner row to `md:max-w-2xl` so the icons don't stretch across the full screen.

## Out of scope

- No real "desktop sidebar" navigation — would change the IA. Can be a follow-up.
- No font-size or spacing rescaling — current tokens read fine at both breakpoints.
- No changes to `WorkoutSession` set grid (`grid-cols-[28px_1fr_…]`) — that template is intentional.
- No copy or behaviour changes.

## Technical notes

- All edits are Tailwind class additions (`md:` / `lg:` prefixes). No JS changes.
- `BottomNav.tsx` already wraps inner content in `mx-auto max-w-lg` — bump to `md:max-w-2xl`.
- ExerciseLibrary currently renders `<div className="space-y-2">` for the list — convert to `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 space-y-0`.
- Sessions/CoachDashboard cards similarly: replace `space-y-3` with `grid grid-cols-1 md:grid-cols-2 gap-3`.

## Rollout

Single small PR, ~10 files, pure className edits.
