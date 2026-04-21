

# Demo / Guest Mode

A no-signup tour that lets visitors explore Iron Keeper with realistic seeded data and inline coach-mark tips on every screen.

## What the user gets

- A **"Try the demo"** button on the Login screen (below Google/email auth) — taps straight into the app as a guest.
- A persistent **"Demo Mode"** ribbon at the top with **Exit demo** → returns to Login.
- Fully populated app: 3 weeks of workouts, PRs, body weight trend, 7 days of food logs, water intake, daily completions — so every chart and stat looks alive.
- **Guided coach-marks**: a tasteful spotlight popover appears the first time a guest lands on each main screen (Home, Sessions, Workout in-progress, Nutrition, Progress, Profile). Each one has 2–4 tip steps with Next/Skip and aesthetic glow styling consistent with the app.
- A "?" help button in each page header re-opens that screen's tour any time.
- All write actions (save workout, log food, etc.) are intercepted: they update demo data **in-memory only** so the user can play freely; nothing hits Supabase.

## How it works (technical)

### 1. Demo session flag
- New file `src/lib/demo-mode.ts` exposes `isDemoMode()`, `enterDemo()`, `exitDemo()` backed by `sessionStorage` (`ik-demo=1`) so it auto-clears when the tab closes.
- `useAuth.tsx` checks the flag on mount: if set and no real Supabase user, it injects a synthetic `user` (`id: "demo-user"`, `email: "demo@ironkeeper.app"`) and a profile (`display_name: "Alex"`). The rest of the app still sees a logged-in user — no protected-route changes needed.
- `signOut()` also calls `exitDemo()`.

### 2. Seeded demo data
- New file `src/lib/demo-data.ts` builds in-memory fixtures:
  - 12 completed workouts across last 21 days (mix of Power, Agility, Push, Pull, Legs) with realistic sets/weights and a steady upward PR trend.
  - 7 days of food logs (breakfast/lunch/dinner/snack) hitting ~85% of macros.
  - 7 daily water entries, 14 body-weight readings showing a -1.5 kg trend, 4 activity logs.
  - Default `nutrition_goals`, default user preferences (`splitId: "ppl"`, onboarding complete, schedule pre-built).
- Data lives in a singleton object with mutators (`addDemoWorkout`, `addDemoFoodLog`, etc.).

### 3. Data layer interception
- In `src/lib/cloud-data.ts`, every exported `fetch*` and `save*` function gets a guard at the top:
  ```ts
  if (isDemoMode()) return demoFetch.workoutHistory();
  ```
- Same pattern added to the few inline `supabase.from(...)` calls in `StatsBar`, `DailyReviewChart`, `NextSessionCard`, `Index` (stretch reminder), `FoodTracker`, `BodyMeasurements` — each gets a tiny `if (isDemoMode())` short-circuit returning fixture data.
- `user-preferences.ts` already uses localStorage, so demo prefs are seeded under `ik-prefs-demo-user` on `enterDemo()`.

### 4. Coach-mark tour system
- New `src/components/demo/DemoTour.tsx`: a Framer-Motion overlay with a dimmed backdrop, a glowing rounded-card popover, step counter (1/4), Skip / Next / Got it buttons. Uses the existing `gradient-primary` and `glass-card` styles.
- New `src/lib/demo-tours.ts` defines tours per route:
  - **Home** — "Your week at a glance", "Tap any day to view past sessions", "Next session card auto-rotates your split", "Log your weight in seconds".
  - **Sessions** — "Browse your weekly programme", "Tap to start", "Build custom workouts via the + button".
  - **Workout in-progress** — "Tap a set to log reps & weight", "Long-press to swap an exercise", "Rest timer auto-starts after each set".
  - **Nutrition** — "Search foods or scan a barcode", "Macros and water update live", "Copy yesterday's meals in one tap".
  - **Progress** — "Visualise your volume & PRs", "Swipe a PR left to delete".
  - **Profile** — "Edit name and avatar here", "Switch your training split", "Exit demo when you're done exploring".
- New `src/hooks/useDemoTour.tsx` hook: shows the tour on first visit per route (tracked in `sessionStorage`), exposes `restart()` for the help button.

### 5. UI touches
- New `src/components/demo/DemoBanner.tsx`: thin top ribbon (only when `isDemoMode()`), shows "Demo Mode · exploring with sample data" + Exit button. Inserted in `App.tsx` above `<AnimatedRoutes />`.
- Help-button (`HelpCircle` icon) added to each page header, calls `restart()` for that route's tour.
- Login screen: new ghost-styled "Continue as guest" button under the email form, with a subtle sparkle icon.

### 6. Write-action interception
- In `cloud-data.ts` write functions (`saveWorkoutToCloud`, `saveBodyMeasurement`, `saveDailyLog`, etc.) and food log inserts in `FoodTracker`: if demo, push into the in-memory store and invalidate the matching React Query key so UI updates. Toast: "Saved to demo (won't persist)".

## Files

**New**
- `src/lib/demo-mode.ts`
- `src/lib/demo-data.ts`
- `src/lib/demo-tours.ts`
- `src/components/demo/DemoBanner.tsx`
- `src/components/demo/DemoTour.tsx`
- `src/components/demo/HelpButton.tsx`
- `src/hooks/useDemoTour.tsx`

**Edited**
- `src/hooks/useAuth.tsx` — synthetic user when demo flag set
- `src/lib/cloud-data.ts` — demo guards on every fetch/save
- `src/pages/Login.tsx` — "Continue as guest" CTA
- `src/App.tsx` — mount `DemoBanner`
- `src/pages/Index.tsx`, `Sessions.tsx`, `WorkoutSession.tsx`, `FoodTracker.tsx`, `Progress.tsx`, `Profile.tsx` — header help button + tour mount
- `src/components/StatsBar.tsx`, `NextSessionCard.tsx`, `DailyReviewChart.tsx`, `HomeWeightTracker.tsx` — demo guards on inline Supabase calls

## Out of scope

- No coach role demo (guest sees the member experience).
- Demo data does not persist across tab closes — by design, so each visitor gets a fresh tour.
- No gamified onboarding wizard; tours are the lightweight equivalent.

