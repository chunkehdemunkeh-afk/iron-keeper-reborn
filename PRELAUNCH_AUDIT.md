# Pre-Launch Audit — Iron Warrior

Pre-Capacitor / Play Store readiness audit. No code changed yet — findings only.

---

## 🔴 CRITICAL (will break the app or get rejected by Play Store)

1. **Service worker will fight Capacitor's WebView.** `public/sw.js` aggressively caches HTML (`NetworkFirst`) and JS/CSS (`CacheFirst`), and `src/main.tsx` registers it on every non-preview host. Inside a Capacitor WebView the assets are served via `https://localhost` / `capacitor://` — the SW will either fail to register, intercept asset requests it shouldn't, or pin users to the bundled build forever. **Action:** detect Capacitor at runtime (`window.Capacitor?.isNativePlatform()`) and skip SW registration entirely on native; ship a kill-switch SW so existing PWA installs migrate cleanly when they switch to the native app.

2. **Update-detection logic will reload the app in a loop on native.** `main.tsx` polls `/?_v=…` and `/version.json` every 60 s and calls `window.location.reload()` on any hash change. In a Capacitor WebView served from `capacitor://localhost`, those fetches either fail, return the bundled HTML (always a different timestamp), or trigger constant reloads. **Must be gated behind "web only".**

3. **Client and server calorie formulas disagree.** `src/lib/calorie-burn.ts` uses `weight × reps × 0.001` for working sets; the SQL function `estimate_strength_burn` uses `0.0035` (3.5×). Same workout shows wildly different kcal in app vs. backfilled value — and the strain score depends on it.

4. **`window.confirm()` for "finish workout anyway?"** (`WorkoutSession.tsx:863`). On Android WebView this is the ugly system dialog (and on some devices/Capacitor configs it returns instantly without showing) — users could finish empty workouts unintentionally. Replace with a shadcn `AlertDialog`.

5. **`workout_history` has no `UPDATE` RLS policy.** Once a row is inserted you can never correct `avg_hr`, `max_hr`, or `effort_rating` — the new HR fields are write-once. Add an UPDATE policy.

6. **Auth redirect uses raw `window.location.href = "/login"`** (`useAuth.tsx:100`, `Login.tsx:24`, `DemoBanner.tsx:16`). On Capacitor with file:// / capacitor:// origin this can break routing. Use `react-router` `navigate`.

7. **OAuth redirect points to `window.location.origin`** (`Login.tsx:16`). On Android this becomes `https://localhost` and Google will reject the callback. Needs a Capacitor deep-link scheme (`com.ironwarrior://oauth`) and Supabase redirect-URL allow-list.

8. **No Android back-button handling.** Without `App.addListener('backButton', …)` from `@capacitor/app`, hardware back exits the app from any page (Play Store reviewers explicitly look for this).

9. **`fetchWorkoutHistory` silently drops `avg_hr` / `max_hr`** when reading back history — they're saved but never re-hydrated into `CompletedWorkout`. History views will never show HR, even after manual entry.

---

## 🟠 IMPORTANT (likely bugs / poor UX)

### Calculations & logic
10. **Wall-clock elapsed timer never stops growing if user forgets the session.** `WorkoutSession` derives `elapsed` from `Date.now() - startedAt`. The 4-hour `savedAt` cutoff resets on resume but a session left running for days will save an absurd `duration` (used for kcal + strain). Cap at e.g. 6 h or auto-finalize.

11. **HR-driven strain has no sanity bounds.** `recovery-scores.computeStrainScore` will accept `avgHr=300, maxHr=40, restingHr=200` from the manual inputs and compute garbage. Validate `40 ≤ restingHr < avgHr ≤ maxHr ≤ 220` before computing TRIMP.

12. **`avgHrInput / maxHrInput` use `Number(...) || null`** — entering `0` is silently dropped (fine), but `Number("70.5")` gives `70` after `Math.round`, and `Number("abc")` gives `NaN` → `Math.round(NaN) || null` → `null` (works, but no user feedback).

13. **`computeRecoveryScore` divides by `totalSleepMin`** (`recovery-scores.ts:127,129`) without checking it's > 0. A sleep log with `hours = 0` and zero stages → NaN.

14. **`fetchVolumeData` limit 30** is row-count, not days — a user with 30 sessions in one week sees no historical data.

15. **`bestOneRmForLift` Epley fallback** uses the heaviest set's reps to estimate 1RM but Epley is only reliable for ≤ 10 reps. Sets like `60 kg × 30` produce inflated estimates that pollute leaderboard rank and tier-up celebrations.

16. **`fetchPersonalRecords` orders by `weight DESC` and assigns the first row as the PR**, so a single 1 kg × 1 warm-up logged as `working` becomes a "PR" if the user has nothing else. Filter `weight > 0` and require `reps ≥ 1`.

17. **`saveWorkoutToCloud` recomputes burn using `Date.now() - startedAt`** but if the session was resumed an hour after the last set, that inflates kcal.

18. **`computeWeekStats` / streaks**: no consistent TZ guard. `mondayOfWeek` uses local time but `workout_history.date` is `timestamp with time zone` in some places and `date` in others — users crossing midnight UTC will see streaks break.

### Storage & data loss
19. **In-progress workout state lives only in `localStorage`.** Android can clear app data, and Capacitor's WebView storage isn't always backed up. Use `@capacitor/preferences` or sync a draft row to Supabase periodically.

20. **`WorkoutBuilder` custom workouts are localStorage-only** — losing them on uninstall/clear-cache is a real complaint vector. Move to a `custom_workouts` table.

21. **`user-preferences` (split, schedule), `recovery-settings`, demo flag, `ik-prefs-{userId}`** all in localStorage. At minimum, mirror split/schedule to a `user_preferences` table so a fresh install picks up the user's setup.

22. **Auth stores session in `localStorage`** (`supabase/client.ts`) — fine for web, but on Capacitor you should use a `@capacitor/preferences` storage adapter so sessions survive WebView storage purges and OS upgrades.

### Error handling
23. **`saveWorkoutToCloud(...).then(...)` is fire-and-forget** (`WorkoutSession.tsx:868`) — no `.catch`, no toast on failure, user thinks workout saved when network was down. Sets are then lost from localStorage by `clearAutoSave()` immediately after.

24. Most data-layer functions log to `console.error` and return `[]` / `false`. The user sees an empty screen, not an error toast. Audit every `*-queries.ts` to surface failures via `toast.error`.

25. **31 `.then()` calls without `.catch()`** across the codebase — expect unhandled-rejection spam in production.

### PWA → Native
26. `RestTimer` uses `new AudioContext()` on mount of beep — Android WebView often blocks until a user-gesture audio resume. Wrap in a "primed on first tap" pattern or use `@capacitor-community/native-audio`.

27. `usePullToRefresh` adds `touchstart/touchmove` window listeners — competes with Android pull-to-refresh on WebView; can cause jittery scroll. Test on device or disable on native.

28. `BarcodeScanner` uses `Html5Qrcode.getCameras()` which needs `getUserMedia` — works in Chrome WebView only after `<uses-permission android:name="android.permission.CAMERA"/>` and runtime prompt; without it the scanner silently shows "no cameras". Switch to `@capacitor-mlkit/barcode-scanning` for native.

29. **No Android `safe-area`/notch handling.** No `viewport-fit=cover` / `env(safe-area-inset-*)` usage that I can see — bottom nav will sit under the gesture bar on modern phones.

30. `viewport` meta uses `maximum-scale=1, user-scalable=no` — Play Store accessibility scanners now flag this. Allow zoom for visually impaired users.

---

## 🟡 POLISH

31. **No global ErrorBoundary.** A render error blanks the whole screen. Wrap routes in a boundary with a "Reload" button.
32. **`WorkoutSession.tsx` is 2 047 lines.** Split into hooks (`useWorkoutTimer`, `useSetLogs`, `useExerciseSwap`) before the next big feature.
33. **Hardcoded localhost / process.env** — only present in server files (`auth-middleware.ts`, `client.server.ts`) which are fine; the client uses `import.meta.env`. Clean.
34. **Manifest `display: "standalone"` and PWA-style `start_url: "/"`** — Capacitor ignores these but leaving them is fine; just remove the `serviceWorker` registration on native.
35. Some forms have no min/max on number inputs (`avgHrInput`, `maxHrInput`, body weight) — set `min/max/step` so the Android numeric keyboard appears and the OS validates.
36. **Touch targets**: `RestTimer` controls are `h-8 w-8` (32 px) — Material/Apple HIG says 48 px / 44 pt minimum.
37. **Loading states**: many query consumers render nothing on `isLoading`; e.g. `useWorkoutHistory` callers in `History.tsx`. Add skeletons.
38. **`console.warn`/`console.log`** scattered through prod build — strip via `vite.config.ts` `esbuild.drop`.
39. **React Router v6 future-flag warnings** in console — silence with `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` or migrate to v7.
40. **No `<meta name="theme-color">` for dark mode media query** — Android system bar color may flicker.
41. `WeeklyEnergyCard` divides `strengthKcal/total` only when total > 0 ✓ — but `SleepStagesBar` does not (`/total * 100` with no guard).
42. **i18n / locale** — hardcoded `en-GB` date formatting in CSV exports, but no locale negotiation. Fine for v1.
43. **`exerciseId` `originalExerciseId` schema** — `workout_sets.original_exercise_id` is set client-side but nothing reads it yet. Either consume it in last-session lookups or drop the field.
44. Demo-mode flag in sessionStorage — clears on app cold-start in Capacitor (each launch is a new session). Acceptable but worth noting.
45. **No analytics / crash reporting** — ship with Sentry or PostHog before Play Store launch so you can diagnose review-blocking crashes.

---

## Recommended order before Capacitor wrap
1. Fix #1, #2, #6, #7, #8 (native compatibility) — without these the wrap won't work.
2. Fix #3, #5, #9, #23 (data integrity).
3. Move #19, #20, #22 off localStorage to Supabase/Capacitor Preferences.
4. Address #11, #15, #16 (calc correctness), then everything else.
