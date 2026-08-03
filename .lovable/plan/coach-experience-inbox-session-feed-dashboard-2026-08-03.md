# Coach experience: inbox + session feed dashboard

Two goals: a real messaging inbox for both coaches and athletes, and a coach dashboard that surfaces every session their athletes log with enough detail to actually coach from.

## What exists today

- `coach_athletes` links coach to athlete; invite codes work; roster read/remove works.
- `coach_messages` table + RLS already exist, and `MessageThread` renders a single thread — but it is only reachable inside an athlete detail page and a small card on Profile. There is no inbox, no unread badge, no notification.
- Coach read access via RLS already exists for roster athletes' `workout_history`, `workout_sets`, `profiles`, `sleep_logs`, `daily_scores`, `food_logs`, `activity_logs`, `coach_notifications`.
- `CoachDashboard` fetches a flat list of the last 200 workouts and all readable profiles, with a simple expand row. `CoachAthleteDetail` shows last 20 sessions, top PRs, one recovery score, and the message thread.

So the data access is largely in place; the work is mostly product/UI plus a few DB additions for unread state and message notifications.

## Part 1 — Inbox (both sides)

New route `/inbox` (list) and `/inbox/:threadUserId` (conversation), available to everyone.

- **Coach view**: one row per roster athlete — avatar, name, last message preview, timestamp, unread count dot. Sorted by most recent activity. Athletes with no messages yet still appear, so a coach can start a conversation.
- **Athlete view**: a single conversation with their coach (currently at most one coach). If they have no coach, the inbox shows an empty state with the invite-code join field.
- **Conversation screen**: full-height thread, sticky composer, auto-scroll to newest, keeps focus after sending, "seen" state, day separators, optimistic send. Reuses/upgrades the existing `MessageThread`.
- **Unread badges**: a count in the bottom nav / dashboard header and per-thread. Marked read when the conversation is opened.
- **Quick context in coach threads**: header shows the athlete's last session and recovery score with a "View profile" link, so a coach can reply without losing context.
- **Attach a session to a message**: from any session card the coach can tap "Comment" — this opens the thread pre-filled with a reference to that session, and the message renders as a small session chip in the thread.
- **Realtime**: subscribe to `coach_messages` for live delivery and badge updates.

## Part 2 — Coach dashboard rebuild

`/coach` becomes a three-tab shell: **Feed**, **Athletes**, **Inbox**.

### Feed (default)
A chronological activity stream of everything the roster logs — the "automatically sent to the dashboard" behaviour. Grouped by day (Today / Yesterday / date).

Each card carries:
- Athlete avatar + name, session name, time of day, duration, effort/RIR rating, completion (e.g. 8/9 exercises).
- Headline metrics: total volume (kg), set count, new PR count, calories.
- Expand to see the full set-by-set breakdown — exercise name, each set's reps × weight, warm-up sets marked, PR sets flagged, target vs actual where progression targets exist, and the athlete's session notes.
- Actions on each card: **Comment** (opens inbox thread with session attached) and **Acknowledge** (marks the session reviewed so it dims and drops out of the "needs review" filter).

Feed filters: athlete, date range (7/30/all), and "unreviewed only". Non-workout events also appear in the stream as lighter rows: new PRs (already tracked in `coach_notifications`), missed planned session, cardio/activity logs, weekly review submissions.

### Athletes
Roster grid/list, each row a compact status card designed for a 5-second scan:
- Avatar, name, last active.
- Sessions this week vs their planned frequency (e.g. 3/4) with a small ring.
- Weekly volume trend arrow vs previous week.
- Latest recovery score and 7-day average sleep.
- Compliance chip: On track / Slipping / Inactive (derived from days since last session vs plan).
- Unread message dot.

Tapping opens the upgraded athlete detail page.

### Athlete detail upgrade
Tabs inside the athlete page: **Overview**, **Sessions**, **Progress**, **Messages**.
- Overview: compliance summary, weekly volume chart, recovery/sleep strip, current programme/split, top lifts.
- Sessions: same expandable session cards as the feed, scoped to that athlete, infinite scroll.
- Progress: per-muscle weekly volume (reuse `fetchWeeklyMuscleData` shape), PR history, strength standards tier.
- Messages: the conversation inline.

### Header
Roster size, unreviewed session count, unread message count, invite-code button, sign out.

## Technical notes

Database changes (one migration):
- `coach_messages`: add `session_id uuid null` (reference to `workout_history`) so a message can attach a session, and index `(coach_user_id, athlete_user_id, created_at)`.
- New `coach_session_reviews` table: `(coach_user_id, workout_history_id, athlete_user_id, acknowledged_at, note)` unique on `(coach_user_id, workout_history_id)`, RLS restricted to the coach who owns the roster link, with GRANTs to `authenticated` and `service_role`.
- Enable realtime on `coach_messages`.
- Note: coach read policy on `workout_sets` matches `workout_sets.user_id`, and older rows can have a NULL `user_id`. Feed queries will fetch sets by `workout_history_id` from sessions already authorised, and I'll add a coach policy that also authorises via the parent `workout_history` row so legacy sets aren't invisible to coaches.

Frontend:
- New `src/lib/data/coach-inbox-queries.ts` (thread list, unread counts, send with optional session ref, mark read) and extend `coach-queries.ts` for roster stats.
- New `src/lib/data/coach-feed-queries.ts`: roster session feed with sets, PR flags, volume aggregation, review state.
- React Query hooks under `src/hooks/queries/` with keys added to `query-keys.ts`; realtime subscription in a `useCoachInbox` hook with proper channel cleanup.
- Components: `CoachFeedCard`, `AthleteStatusCard`, `InboxList`, `ConversationView`, `SessionChip`.
- Routes `/inbox` and `/inbox/:threadUserId` in `App.tsx`; inbox entry point added to the athlete-side Profile card and a nav badge.
- Existing UX conventions kept: Sheets for overlays, sonner toasts, haptics, `LoadingState`/`EmptyState`/`ErrorBoundary`, `resolveExerciseName` for all exercise labels.

## Build order

1. Migration (session ref, review table, realtime, sets policy fix).
2. Inbox data layer + `/inbox` routes + conversation screen + unread badges.
3. Coach feed data layer + Feed tab with expandable session detail, comment/acknowledge.
4. Athletes tab status cards + athlete detail tabs.
5. Polish: filters, empty states, realtime badge verification.
