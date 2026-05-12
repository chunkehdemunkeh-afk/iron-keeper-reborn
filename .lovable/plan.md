## Goal

Promote Iron Keeper's UI to production-grade by introducing a small set of reusable primitives and applying them consistently across all 17 pages. Cover loading states, empty states, error boundaries, a11y, and responsive behaviour. No business-logic changes.

## Current state (audit findings)

- **Loading**: ~19 files use ad-hoc `Loading...` text or `animate-spin`. `src/components/ui/skeleton.tsx` exists but is rarely used.
- **Empty states**: each page rolls its own ("No data", "Nothing yet"). No shared component, inconsistent copy/iconography.
- **Errors**: no route-level boundary; React Query failures surface as blank cards or toasts. No retry affordance.
- **A11y**: ~253 interactive elements vs 25 `aria-label`s. Icon-only buttons (BottomNav, swipe handles, sheet close) mostly unlabeled. Focus rings inherited from shadcn but several custom buttons override them.
- **Responsive**: app is mobile-first only; tablet/desktop (`md:`/`lg:`) breakpoints largely absent. `SidebarProvider` not in use.

## Deliverable: 5 new primitives in `src/components/ui/`

1. **`empty-state.tsx`** — `<EmptyState icon title description action />`. Centered, muted, 200px min-height. Used in History, Leaderboard, Photos, FoodTracker, BodyMeasurements, CoachDashboard.
2. **`loading-state.tsx`** — two exports:
   - `<LoadingState label?>` — centered spinner + screen-reader label, for first paint.
   - `<SkeletonList rows variant="card"|"row"|"stat" />` — composes existing `Skeleton`. Used in History list, Leaderboard rows, Sessions cards, Stats tab.
3. **`error-state.tsx`** — `<ErrorState title? description? onRetry />`. Red-tinted card, retry button. Wired to React Query's `refetch` + sonner toast.
4. **`async-boundary.tsx`** — wrapper combining `<ErrorBoundary>` + `<Suspense>` + standard fallbacks. Drop-in around route content.
5. **`section-header.tsx`** — `<SectionHeader title subtitle? action? />`. Standardises the `font-display` heading + optional right-aligned action used in 12+ places.

All primitives:
- Strict TypeScript props, no `any`.
- `forwardRef` where it makes sense.
- Tailwind tokens from `src/index.css` only (no raw colors).
- Storybook-style usage block in JSDoc at top of each file.

## Application pass (per-page changelist)

| Page | Loading → | Empty → | Error → | A11y / responsive |
|---|---|---|---|---|
| Sessions | `SkeletonList variant="card" rows=4` | EmptyState "Plan your first session" | ErrorState retry | `md:grid-cols-2` for cards |
| Progress (Stats/Photos/Recovery) | Per-tab skeletons | EmptyState per tab | ErrorState | Tab a11y, `lg:grid-cols-3` |
| History | `SkeletonList rows=8` | EmptyState "No workouts yet" | ErrorState | aria-label on swipe-delete, `md:max-w-2xl` |
| Leaderboard | Skeleton rows | EmptyState "Be the first" | ErrorState | aria-label on filter chips |
| FoodTracker | Skeleton meal rows | EmptyState per meal | ErrorState on search fail | label on barcode/search buttons |
| BodyMeasurements | Skeleton chart | EmptyState "Log your first measurement" | ErrorState | — |
| Profile | Skeleton header | — | ErrorState | aria-label on avatar edit |
| WorkoutSession | Skeleton exercise card | — | ErrorState on prev-data fetch | aria-label on rest timer / set check |
| ExerciseLibrary | Skeleton grid | EmptyState "No matches" | — | `md:grid-cols-3` |
| CoachDashboard | Skeleton athlete rows | EmptyState "No athletes yet" | ErrorState | — |
| WorkoutBuilder | — | EmptyState "Add your first exercise" | — | aria-label on reorder grips |
| Onboarding / NutritionOnboarding | inline button spinners → standardise via `<Button loading>` | — | inline error toast | tap-target audit |
| Login / ResetPassword | `<Button loading>` | — | inline alert | autocomplete + aria-describedby |

Also:
- Add `loading?: boolean` prop to `src/components/ui/button.tsx` (spinner + disabled, preserves width).
- Add a top-level `<ErrorBoundary>` around `<Outlet />` in `App.tsx` using the new `error-state` fallback.
- `BottomNav.tsx`: add `aria-label`, `aria-current="page"`, ensure 44px tap targets.
- Audit all icon-only buttons (sheet close, swipe handle, timer controls) — add `aria-label`.

## Out of scope

- No new features, no DB changes, no copy rewrites beyond default empty/error strings.
- No design overhaul — keep current Barlow Condensed / DM Sans tokens and existing colors.
- No migration to TanStack Router loaders (project still uses `react-router-dom` via `App.tsx`).

## Technical notes

- Use existing `useQuery` `isPending` / `isError` / `refetch` — no new data layer.
- Skeleton sizes match real content height to prevent CLS.
- Empty-state icons from `lucide-react` already in dep tree.
- All primitives covered by a single Vitest smoke test (`renders without crashing` + a11y `getByRole`).

## Rollout

Single PR, ordered:
1. Add 5 primitives + Button `loading` prop + tests.
2. Add top-level ErrorBoundary.
3. Apply primitives page-by-page in the order in the table above.
4. A11y sweep: icon-button labels, BottomNav, sheet titles.
5. Quick responsive pass: add `md:` grid breakpoints listed above.

Estimated diff: ~5 new files, ~17 edited pages/components, no deletions.
