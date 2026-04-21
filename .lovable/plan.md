

## Goal
Chain the nutrition (TDEE) onboarding directly after workout onboarding for new users, alongside the planned "no workout plan" option and post-onboarding tip.

## Changes

### 1. Workout onboarding — add "Just track health" option (`src/pages/Onboarding.tsx`)
- Add a third option below the days grid on step 0: **"Just track health"** card with a `Heart` or `Sprout` Lucide icon and subcopy *"Use Iron Keeper for nutrition, weight, and activity tracking only."*
- When selected, skip split/custom/summary steps. Save preferences as `{ onboardingComplete: true, daysPerWeek: 0, splitId: "none", splitName: "No workout plan", schedule: [] }`.
- Remove the misleading "Skip" button (it silently picked PPL).
- On finish (any path), navigate to `/onboarding/nutrition` instead of `/` for new users (i.e. when `from=profile` is NOT set). Profile re-entry still returns to `/profile`.

### 2. Helper (`src/lib/user-preferences.ts`)
Add `isNoWorkoutMode(userId)` returning `true` when `splitId === "none"`.

### 3. New nutrition onboarding page (`src/pages/NutritionOnboarding.tsx`)
A wrapper around the existing `<TDEESetup />` component (currently used inside `FoodTracker`). Two-step flow:

**Step A — Intro card**
- Heading: *"Now let's set your nutrition goals"*
- Subcopy explaining that goals power the food tracker and macro rings.
- Two buttons:
  - *"Set up nutrition goals"* → goes to step B
  - *"Skip for now"* → marks nutrition onboarding complete with no goals saved and continues

**Step B — Reuse `<TDEESetup />`**
- Render the existing TDEESetup form. On save (it already writes to `nutrition_goals` via `cloud-data`), mark nutrition onboarding complete and continue.

In both cases, "continue" sets `localStorage["ik-nutrition-onboarding-{userId}"] = "complete"` and `localStorage["ik-onboarding-tip-{userId}"] = "pending"`, then `navigate("/", { replace: true })`.

Add the route in `src/App.tsx` (auth-guarded).

### 4. Refactor `TDEESetup` for reuse (`src/components/food/TDEESetup.tsx`)
- Add an optional `onComplete?: () => void` prop fired after a successful save (in addition to the existing close behavior).
- Add an optional `embedded?: boolean` prop to render without the modal/sheet wrapper when used inside `NutritionOnboarding`.
- Existing `FoodTracker` usage unchanged.

### 5. Hide workout-only UI in no-workout mode
- `src/pages/Index.tsx` — hide `<NextSessionCard />` and `<DailyStretchCard />` when `isNoWorkoutMode(user.id)`.
- `src/components/NextSessionCard.tsx` — defensive early return `null`.
- `src/pages/Profile.tsx` — Training Programme card shows *"You're tracking health only"* + *"Add a workout plan"* button (links to `/onboarding?from=profile`). Hide `<RecoveryTips />`.

### 6. Post-onboarding tip (`src/components/PostOnboardingTip.tsx`, new)
A bottom `Sheet` mounted in `src/pages/Index.tsx`. On mount, reads `localStorage["ik-onboarding-tip-{userId}"]`. If `"pending"`, opens automatically with:
- Title: *"You're all set"*
- Body: *"Want to change your training plan or nutrition goals later? Head to **Profile** any time."*
- CTA: *"Got it"* — clears the flag on dismiss.

### 7. Re-entry from Profile
Profile's existing "Edit programme" link uses `/onboarding?from=profile` — unchanged. Add a parallel link for nutrition: *"Edit nutrition goals"* uses the existing TDEESetup sheet inside `FoodTracker` (no change needed there). The chained flow only fires for new users (when `from=profile` is absent).

## Flow Summary

```text
New user signup
  → /onboarding (workout: days → split → summary OR "just track health")
  → /onboarding/nutrition (intro → TDEESetup OR skip)
  → / (home, with one-time PostOnboardingTip drawer)
```

## Files Touched
- `src/pages/Onboarding.tsx` — add "Just track health" option, redirect to `/onboarding/nutrition`
- `src/pages/NutritionOnboarding.tsx` — new
- `src/components/food/TDEESetup.tsx` — add `onComplete` + `embedded` props
- `src/lib/user-preferences.ts` — add `isNoWorkoutMode`
- `src/pages/Index.tsx` — conditional cards + mount tip
- `src/components/NextSessionCard.tsx` — defensive return
- `src/pages/Profile.tsx` — alt programme card
- `src/components/PostOnboardingTip.tsx` — new
- `src/App.tsx` — register `/onboarding/nutrition` route

## UX Notes
- No emojis — Lucide icons only (`Heart`/`Sprout` for health-only, `Apple`/`Salad` for nutrition step).
- Both onboarding screens share the same step-dot top bar styling for visual continuity.
- Skip is always available on the nutrition step so users aren't forced into TDEE math.

