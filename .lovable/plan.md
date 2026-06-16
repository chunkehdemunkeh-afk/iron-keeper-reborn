# Battery-life improvements

Goal: cut passive power draw when the app is open but idle, and reduce CPU work during workouts. No feature changes, no UX regressions.

## 1. Stop polling when the app isn't visible — `src/main.tsx`

Today: every 60 s the app fetches `/?_v=...` and calls `reg.update()`, regardless of whether the tab is in the foreground. On every `visibilitychange → visible` it also fires an extra `pollVersion()`, `reg.update()`, and `fetch('/version.json')`.

Change:
- Wrap both `setInterval` callbacks so they early-return when `document.visibilityState !== 'visible'`.
- Increase the interval from 60 s to 5 min. Update detection still works — the visibility handler catches you the moment you re-open the app.
- Remove the extra `fetch('/version.json')` burst inside `visibilitychange`; keep only the single `pollVersion()` + `reg.update()` call there.

Verify: with DevTools → Network throttled and the tab hidden, no `/?_v=` or `sw.js` requests fire. When the tab becomes visible again, exactly one of each fires.

## 2. Slow down in-workout timer ticks — `src/components/RestTimer.tsx`, `src/components/ExerciseTimer.tsx`

Today: both use `setInterval(tick, 250)` — 4 re-renders/sec for the full duration of every rest period.

Change:
- Switch to `setInterval(tick, 1000)`. Both timers display whole seconds, so 250 ms granularity isn't visible.
- Leave `WorkoutSession`'s 1 s session clock and 30 s autosave as-is.

Verify: timers still count down smoothly to 0; rest-complete haptic still fires on time.

## 3. Pause infinite Framer Motion loops when offscreen

Today:
- `src/components/leaderboard/LeaderboardPodium.tsx` runs two `repeat: Infinity` tweens (2.5 s and 3.5 s).
- `src/components/gamification/SeasonFinaleSheet.tsx` runs an infinite pulse.

Change: gate each `motion.*` with `whileInView` + `viewport={{ once: false }}` so the animation only runs while the element is on screen, and stop it when the parent sheet/page unmounts (already handled by React, but the leaderboard scroll case isn't).

Verify: scrolling past the podium in the Leaderboard page stops the animation (check DevTools → Performance, no ongoing compositor work).

## 4. Remove unused always-on CSS animation — `src/App.css`

`logo-spin 20s infinite linear` is the default Vite logo spin; the `.logo` class isn't used anywhere. Delete the keyframes + `.logo` rules. Leaves `index.css` `shimmer-sweep` alone (it's used by skeletons that only mount while loading).

## 5. Debounce non-essential haptics — `src/lib/haptics.ts`

Today: every tap on a set row, segmented tab, swipe, etc. calls `navigator.vibrate`. The vibration motor is a meaningful drain over a long session.

Change: add a 50 ms cooldown inside `hapticLight`/`hapticMedium` (ignore calls that arrive within 50 ms of the previous one). Leave `hapticSuccess` and the custom workout-complete pattern untouched — those are intentional one-shots.

Verify: rapid taps no longer queue overlapping vibrations; single taps still feel responsive.

## Out of scope
- Service worker rewrite (`public/sw.js` NetworkFirst behaviour). The polling fix above already removes most of its work.
- Replacing `setInterval` with `requestAnimationFrame` in timers — overkill for 1 Hz updates.
- Touching Supabase queries, React Query stale times, or any feature logic.

## Technical notes
- Files touched: `src/main.tsx`, `src/components/RestTimer.tsx`, `src/components/ExerciseTimer.tsx`, `src/components/leaderboard/LeaderboardPodium.tsx`, `src/components/gamification/SeasonFinaleSheet.tsx`, `src/App.css`, `src/lib/haptics.ts`.
- No DB migrations, no dependency changes.
- Existing update-detection flow (`IK_UPDATE_AVAILABLE` message, `applyUpdate()` reload) is preserved end-to-end.
