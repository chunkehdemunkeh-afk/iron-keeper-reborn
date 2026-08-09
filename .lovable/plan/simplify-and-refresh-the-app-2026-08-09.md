# Simplify and refresh the app

The app has grown feature-by-feature, so the home screen and navigation now surface everything at once. This plan reorganises where things live and refreshes the visual language. No exercises, workouts, history, PRs or database data are touched — this is navigation, layout and styling only. Every existing page stays reachable.

## The problem

- 6 bottom tabs, 25+ routes, and a home screen that stacks 10+ cards (next session, Hyrox, half marathon, recovery, nutrition summary, weight, complete-day, stretch, banners).
- Gamification (ranks, quests, duels, shop, clans, community) competes for attention with daily training.
- Card styling is inconsistent between areas, so nothing reads as more important than anything else.

## New structure

Bottom bar goes from 6 tabs to 5, with a clear daily focus:

```text
Today      Train        Fuel        Progress      You
home       sessions,    nutrition,  stats,        profile, settings,
readiness  programme,   water,      volume,       ranks, quests,
& next     exercises,   weigh-in    photos,       duels, shop,
session    Hyrox, run              recovery       community, inbox
                                    history
```

- **Today** — a short, prioritised screen: greeting + streak, next session (or rest-day state), readiness/recovery summary, a compact daily rings row (calories, protein, water), and one contextual card at most (Hyrox / half-marathon / weekly review when relevant). Everything else that lives on home today moves into an expandable "More for today" section rather than being deleted.
- **Train** — one hub listing this week's schedule, programme editor, exercise library, custom builder, Hyrox benchmarks and the running programme. Replaces hunting for these across the app.
- **Fuel** — the existing nutrition tracker, plus weigh-in and water, unchanged in behaviour.
- **Progress** — existing Stats / Volume / Photos tabs, with recovery history and check-ins folded in as tabs instead of separate routes.
- **You** — profile, settings, coach inbox, and a single "Compete" section holding leaderboard, quests, duels, shop and community. XP and streaks keep working exactly as now; they just stop shouting on the home screen.

All existing routes stay valid so bookmarks, deep links and coach links keep working.

## Visual refresh

Keep the amber-on-dark identity, but make it deliberate:

- One card component with consistent radius, border, padding and elevation, used everywhere instead of the current per-page variations.
- Clear type scale: Barlow Condensed for numbers/headers at a couple of fixed sizes, DM Sans body at one size — no more near-identical text sizes competing.
- Amber reserved for the primary action and live/active states only; secondary information uses muted tokens. That alone makes each screen read faster.
- Section headers with generous spacing instead of stacked full-bleed cards, so scanning is easier.
- Calmer motion: subtle entrance fades, no per-card animations stacking.

## Technical notes

- New: `src/components/BottomNav.tsx` tab set, `src/pages/Train.tsx` hub, `src/components/ui/section.tsx` + a shared card wrapper.
- `src/pages/Index.tsx` is trimmed to the prioritised card list; the removed cards are re-mounted inside the Train hub, the Progress tabs, or a collapsible "More" block — no component is deleted.
- `/recovery` and `/check-ins` become tabs inside `/progress` while keeping their routes as redirects.
- Compete surfaces (`/leaderboard`, `/quests`, `/duels`, `/shop`, `/community`) are reached from a Compete section in `/profile`; routes unchanged.
- Tokens in `index.css` / `tailwind.config.ts` are tightened (spacing scale, one card shadow, one hairline border). No hardcoded colours in components.
- Zero changes to `workout-data.ts`, exercise IDs, queries, migrations, or any Supabase table.

## Rollout

1. Tokens + shared card/section primitives → verify existing pages still render.
2. New bottom nav + Train hub → verify every old route is still reachable.
3. Trim and restyle Today → verify nothing is lost (moved, not removed).
4. Restyle Train, Fuel, Progress, You in turn.

## Note on your other message

Cloud can't be enabled here — this project is already connected to an external Supabase project, which provides the same backend features.
