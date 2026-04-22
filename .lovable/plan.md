

## Weekly Review + Progress Photos

Two connected features that finally close the loop on weekly reflection and visual progress tracking — both fully stored and viewable in History.

### Feature 1 — Weekly Review (Sunday recap)

A friendly Sunday-evening prompt that summarises the week's logged data and asks for a short personal reflection. Designed to feel like a coach checking in, not a report card.

**When it appears**
- **Sunday after 6pm:** soft full-screen Sheet on app open, dismissible.
- **Monday morning catch-up:** if Sunday was missed, a small banner appears on the Home page ("Reflect on last week →"). Tap to open the same review.
- **Always accessible:** "Weekly Review" entry point added to the History page header (and Profile menu) so users can complete or revisit any past week.
- Each week is keyed by Monday's date — only one review per week, editable until next Sunday.

**What's in the review (auto-summary, top half)**
Pulled from the user's existing logs for Mon–Sun of the week being reviewed:
- **Workouts logged:** count + total minutes ("4 sessions · 187 min")
- **Activities logged:** rest days + non-gym activities (walks, swims, etc.)
- **Food logged:** days with at least one food entry ("6/7 days") + average daily calories
- **Water logged:** days hitting goal ("4/7 days at goal")
- **Weight logged:** entries this week + delta vs. previous week ("3 entries · –0.4 kg")
- **Sleep logged:** average hours + average quality ("7.2h · 4/5 quality")
- **PRs hit:** count of new personal bests this week, with names

Each row has a soft icon and a one-line celebration if the metric is good ("Strong week of training!"), neutral phrasing if average, and a gentle nudge if low ("Try logging weight more often next week — it sharpens the trends"). No red text, no failure language.

**What the user fills in (bottom half)**
- **Self-rating:** 1–5 star "How did this week feel?"
- **What went well:** free-text (optional)
- **What to improve:** free-text (optional)
- **Focus for next week:** free-text (optional)
- **Add this week's progress photo:** optional camera button (same uploader as Body tab — see Feature 2). If skipped, it's still available in the Body tab.
- Save → haptic success, toast "Week saved", Sheet closes.

### Feature 2 — Progress photos

Lightweight photo log with comparison view. Lives in a new **Photos** tab on the Progress page.

**Capture & storage**
- Tap "Add photo" → native file picker with camera capture preference.
- Stored in private Supabase Storage bucket `progress-photos` at `{user_id}/{date}-{timestamp}.jpg`.
- DB row in `progress_photos` table links the storage path to a date, optional notes, and optional pose tag (`front` / `side` / `back` / `other`).

**Browsing**
- 2-column grid sorted newest-first.
- Each tile shows the photo, the date below it, and the user's weight that day if logged (joined from `body_measurements`).
- Tap a tile → full-screen view with delete and edit-notes options. Swipe-to-delete also supported (existing pattern).

**Compare two photos**
- "Compare" button in the Photos tab header opens a Sheet.
- Two columns, each with a date dropdown of available photos.
- Side-by-side display, dates labelled, and a weight delta between them ("–2.1 kg over 6 weeks") when both dates have weight logs.
- Defaults: left = oldest photo, right = newest. User can swap.

### History integration (the "stored and viewable" part)

This is the key requirement. Every weekly review and every photo becomes part of the history record, not a one-off ephemeral thing.

**On the History page, a new "Weekly Reviews" section** (collapsible, sits below the calendar):
- Card for each completed week, newest first.
- Each card shows: week range ("14–20 Apr"), star rating, summary stats (sessions, food days, weight delta), thumbnail of that week's photo if one was taken, and a preview of the user's "what went well" text.
- Tap a card → opens the same review Sheet in read-only mode with an "Edit" button.

**On the calendar:** Sundays with a completed review get a small star badge in the corner (alongside existing workout dots).

**Photos appear in two places:**
- Photos tab on Progress page (browse + compare)
- Embedded as a thumbnail in the matching Weekly Review card on History

### What changes for the user
- Sunday evening: gentle pop-up summarising the week + asking for reflection. Skippable, never blocking.
- Monday morning: small reminder banner if Sunday was missed.
- New Photos tab on Progress page for adding & comparing pics.
- New Weekly Reviews list on History page that grows over time — every reflection, every star rating, every photo permanently retrievable.
- No bottom-nav changes, no changes to the home page beyond the Monday banner.

### Technical changes

**Database migrations** (one new migration file)
- `progress_photos` table: `id`, `user_id`, `date`, `storage_path`, `pose` (text, nullable: front/side/back/other), `notes`, `created_at`. RLS: user owns their rows.
- `weekly_reviews` table: `id`, `user_id`, `week_start` (date, Monday), `rating` (1–5), `went_well`, `to_improve`, `focus_next`, `photo_id` (uuid nullable, references `progress_photos`), `created_at`, `updated_at`. UNIQUE(`user_id`, `week_start`). RLS: user owns their rows; coach SELECT via `has_role`.
- Storage bucket `progress-photos` (private) + storage policies scoped to `(storage.foldername(name))[1] = auth.uid()::text`.

**`src/lib/cloud-data.ts`**
- `fetchProgressPhotos(): Promise<ProgressPhoto[]>` — selects rows, generates 5-min signed URLs.
- `uploadProgressPhoto(file, date, pose?, notes?): Promise<{ id, storagePath } | null>`.
- `deleteProgressPhoto(id, storagePath)`.
- `updateProgressPhotoNotes(id, notes)`.
- `fetchWeeklyReview(weekStart): Promise<WeeklyReview | null>`.
- `fetchAllWeeklyReviews(): Promise<WeeklyReview[]>`.
- `upsertWeeklyReview(review): Promise<WeeklyReview | null>` (insert or update by user_id + week_start).
- `deleteWeeklyReview(id)`.
- `computeWeekStats(weekStart): Promise<WeekSummary>` — single aggregator that pulls workout_history, workout_sets (PRs), food_logs, water_intake, body_measurements, sleep_logs, activity_logs for the Mon–Sun range and returns the structured summary.

**`src/lib/weekly-review.ts`** (new)
- `getCurrentWeekStart()`, `getPreviousWeekStart()`, `getMondayOf(date)`.
- `shouldShowSundayPrompt(user, lastDismissed)` — returns true Sunday after 18:00 if no review for current week and not dismissed today.
- `shouldShowMondayBanner(user)` — returns true Mon/Tue if previous week has no review.
- localStorage keys: `ik-weekly-prompt-dismissed-{userId}-{weekStart}` (per-week dismissal).

**New components**
- `src/components/weekly/WeeklyReviewSheet.tsx` — the full-screen Sheet. Props: `weekStart`, `mode: "create" | "edit" | "view"`, `onClose`. Renders summary + form. Uses `computeWeekStats`. Includes inline photo uploader (reuses the upload action from Body tab).
- `src/components/weekly/WeeklyReviewPrompt.tsx` — Sunday-evening trigger logic, mounted on Index page. Opens WeeklyReviewSheet.
- `src/components/weekly/MondayBanner.tsx` — small dismissible banner on Home page if Monday/Tuesday and previous week unreviewed.
- `src/components/weekly/WeeklyReviewCard.tsx` — list item used in History.
- `src/components/progress/ProgressPhotoGrid.tsx` — 2-col grid + swipe-to-delete + tap-to-fullscreen.
- `src/components/progress/PhotoCompareSheet.tsx` — side-by-side compare with date dropdowns + weight delta.
- `src/components/progress/PhotosTab.tsx` — assembles the Photos tab (header with Add + Compare buttons, grid below).

**Modified pages**
- `src/pages/Progress.tsx` — add `Photos` tab to the existing tab strip (`Stats | PRs | Recovery → Stats | Photos | PRs | Recovery`). PhotosTab owns its own queries.
- `src/pages/History.tsx` — add "Weekly Reviews" collapsible section below the calendar; add star badge overlay for Sundays with reviews; add "Weekly Review" header button to open current/previous week's review.
- `src/pages/Index.tsx` — mount `<WeeklyReviewPrompt />` and `<MondayBanner />`.
- `src/pages/Profile.tsx` — add a "Weekly Reviews" link entry that jumps to History's Weekly Reviews section.

**PLAN.md** — replace the old Progress Photos plan section with this combined feature plan, mark completed.

### What stays the same
- Bottom navigation, Home layout, Body Measurements page, Stats/PRs/Recovery tabs all unchanged.
- No new dependencies. Reuses Sheet, motion patterns, sonner, haptics.
- Photo upload still goes to Supabase Storage via the existing client (no edge functions, no server routes).
- All RLS preserved; coach can SELECT weekly reviews like other tables.

### Out of scope (backlog)
- Client-side image compression (raw upload for now).
- Push notifications for the Sunday prompt.
- Comparing 3+ photos at once.
- Auto-suggested focus areas based on logged data.

