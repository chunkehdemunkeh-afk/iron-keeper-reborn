# Iron Keeper — Active Plan

> **Read this file at the start of every session** before making changes. It records ongoing work, decisions, and constraints that are not derivable from the code alone.

## Current Status

**NEXT: Progress Photos + Body Tab** — planned, not yet started. See implementation plan below.

**Supabase migration is complete** (2026-04-20):
- New project: `kzwkdhwselqchhcqkyzs` (Iron Keeper V2), owned by the user
- Deployed at: `ironkeeper2.lovable.app` from repo `iron-keeper-reborn`
- Auth: standard Supabase Google OAuth — `@lovable.dev/cloud-auth-js` removed from `Login.tsx`
- Data import: `data-export/generate_import.py` generates per-user SQL. Other users pending import — provide old UID + new UID to generate their `import.sql`
- `origin` remote → `iron-keeper-reborn`; old repo accessible via `reborn` remote

Previous feature (PR system) is complete:
- `PRCelebration.tsx` — particle burst overlay rendered after any new-PR set tick
- `WorkoutSession.tsx` — PR detection via `historicalPRsRef` + `sessionBestRef`, renders `<PRCelebration>`
- `Progress.tsx` — swipe-to-delete on PR rows via `PRSwipeRow` component; uses `deletePersonalRecord(setId)`
- `cloud-data.ts` — `fetchPersonalRecords` returns `setId` per entry; `deletePersonalRecord(setId)` added

---

## Supabase Ownership Migration — Step-by-Step Plan

### Background
The current Supabase project (database, auth, storage) is owned by **Lovable's account**, not yours. You cannot access the credentials or data directly. The goal is to move to a Supabase project you own, while keeping Lovable as the builder/host.

**The code does not need to change.** `src/integrations/supabase/client.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from environment variables — these just need to be pointed at your new project instead.

**Your old Supabase user ID** (seen in the exported data): `4050fa0e-7486-44e4-b38c-b02ea631604e` — Claude needs this to rewrite the import SQL with your new user ID.

---

### Phase 1 — Export your data from Lovable's Supabase (do this FIRST)

Go to your Lovable project → Database tab → click each table below → hit **Export CSV** top right:

- [ ] `activity_logs`
- [ ] `workout_history`
- [ ] `workout_sets`
- [ ] `food_logs`
- [ ] `nutrition_goals`
- [ ] `water_intake`
- [ ] `body_measurements`
- [ ] `daily_logs`
- [ ] `profiles`
- [ ] `user_roles`

Save all CSVs somewhere safe. You only need rows where `user_id = 4050fa0e-7486-44e4-b38c-b02ea631604e` — other rows belong to other users and should be ignored.

---

### Phase 2 — Create your own Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up/log in with your own account
2. Click **New project**
3. Give it a name (e.g. `ironkeeper`), choose a region close to you (EU West for UK), set a strong database password — **save this password somewhere**
4. Wait ~2 minutes for the project to provision
5. Go to **Settings → API**
6. Copy and save:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`) → this is `VITE_SUPABASE_URL`
   - **anon / public key** (long JWT string) → this is `VITE_SUPABASE_PUBLISHABLE_KEY`

---

### Phase 3 — Apply the schema (recreate all tables)

The entire database schema lives in `supabase/migrations/` in the repo — 20 migration files that build all tables, RLS policies, and indexes. You need to run these against your new project.

**Option A (easiest) — Supabase CLI:**
```bash
# In the repo root, link to your new project:
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
# (project ref is the part before .supabase.co in your URL, e.g. "abcdefgh")
npx supabase db push
```

**Option B — SQL Editor (if CLI is awkward):**
Go to your Supabase project → **SQL editor** → open each migration file from the repo in order (oldest date first) and run them one by one. There are 20 files — takes ~10 minutes.

After either option, go to **Table Editor** and confirm these tables exist: `profiles`, `workout_history`, `workout_sets`, `food_logs`, `nutrition_goals`, `water_intake`, `body_measurements`, `daily_logs`, `user_roles`, `activity_logs`.

---

### Phase 4 — Create your account in the new project

1. In your new Supabase project → **Authentication → Users** → note it's empty
2. Open the app URL (still the Lovable-hosted one for now — you're just creating an account in the new DB via the app temporarily, OR just do this after Phase 6 when the new Lovable project is live)

> **Actually:** Skip creating an account manually. Do Phase 5 and 6 first (import data), then when you log in via the new Lovable project it creates your auth user automatically. The import SQL will handle the data after you have your new user ID.

---

### Phase 5 — Tell Claude your new project details

Start a new session with Claude and say:
> "I'm ready to do the Supabase import. My new project URL is X, and here are my CSV exports."

Then share the CSVs. Claude will:
1. Generate a SQL script that inserts all your data with the old user ID (`4050fa0e...`) replaced by your new one
2. Filter out other users' rows
3. Handle FK ordering (profiles → workout_history → workout_sets, etc.)

You paste the SQL into your new Supabase SQL editor and run it.

---

### Phase 6 — Create a new Lovable project pointed at your Supabase

1. In Lovable, create a **New project**
2. When asked about Supabase, choose **Connect existing project** (or equivalent) and enter your Supabase URL + anon key
3. Link it to the **same GitHub repo** (or push the repo to a new GitHub repo first if needed)
4. In Lovable project settings → Environment variables, confirm:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your anon key

> **If Lovable doesn't offer "connect existing":** Set the env vars manually in Lovable's project settings after creation, then redeploy.

---

### Phase 7 — Update Supabase Auth settings

In your new Supabase project → **Authentication → URL Configuration**:
- Set **Site URL** to your new Lovable app URL (e.g. `https://yourapp.lovable.app`)
- Add it to **Redirect URLs** as well

This makes login/signup redirects work correctly.

---

### Phase 8 — Verify

1. Open the new Lovable app URL
2. Sign up / log in
3. Check that your workout history, food logs, and body measurements are all present
4. Do a test workout or food log entry and confirm it saves
5. Old Lovable project can now be left idle — data flows to your Supabase from here on

---

### What stays the same after migration
- All code is identical — no code changes needed
- Lovable still builds and hosts the app on push to `main`
- You still use Claude to build features
- Git workflow is unchanged
- `npx supabase db push` now pushes to **your** project (once linked via `npx supabase link`)

---

## Progress Photos — Implementation Plan

### Goal
Weekly progress photos stored in Supabase Storage, displayed and compared in a new **Body** tab on the Progress page. Integrated with the existing `body_measurements` table (linked by date).

### Architecture decisions
- **No new nav slot.** Progress page gets a 3-tab strip: `Stats | Body | PRs`.
- **Private Supabase Storage bucket** (`progress-photos`). Files at `{user_id}/{date}-{timestamp}.jpg`. Display via signed URLs (5-min expiry, generated at fetch time).
- **`progress_photos` DB table** links storage path to date + notes. Joined with `body_measurements` by date in the UI to show weight alongside each photo.
- **`/body` route** (BodyMeasurements page) stays as-is — still reachable from Profile. The Body tab reuses the same React Query key `["body-measurements"]` so there's no double-fetch.
- Photo upload uses a hidden `<input type="file" accept="image/*" capture="environment">` — no third-party library needed. Images are uploaded as-is (no client-side resize for now).

### Step-by-step

#### Step 1 — DB migration
File: `supabase/migrations/20260419_progress_photos.sql`

```sql
create table progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null default current_date,
  storage_path text not null,
  notes text,
  created_at timestamptz default now()
);
alter table progress_photos enable row level security;
create policy "Users own photos"
  on progress_photos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Storage bucket `progress-photos` must be created in Supabase dashboard (Storage → New bucket → private). Then add two storage policies:
- SELECT: `(storage.foldername(name))[1] = auth.uid()::text`
- INSERT/DELETE: same condition

Push with: `npx supabase db push`

#### Step 2 — `cloud-data.ts` additions

Three new exported functions:
```typescript
fetchProgressPhotos(): Promise<ProgressPhoto[]>
// Fetches all rows, generates signed URLs for each storage_path.
// Returns sorted desc by date. ProgressPhoto = { id, date, signedUrl, notes, storagePath }

uploadProgressPhoto(file: File, date: string, notes?: string): Promise<boolean>
// 1. Upload file to progress-photos/{user_id}/{date}-{Date.now()}.jpg
// 2. Insert row into progress_photos
// Returns true on success.

deleteProgressPhoto(id: string, storagePath: string): Promise<boolean>
// 1. Delete from storage
// 2. Delete DB row
```

#### Step 3 — New components

**`src/components/progress/LogBodySheet.tsx`**
Bottom Sheet containing:
- Date picker (defaults today, `<input type="date">` styled)
- Weight (kg) + body fat (%) inputs — same as BodyMeasurements form
- Photo section: tap area with camera icon → triggers hidden file input; shows preview thumbnail once selected
- Save button: calls `saveBodyMeasurement` + `uploadProgressPhoto` in parallel if photo selected
- Haptic: `hapticSuccess()` on save

**`src/components/progress/ProgressPhotoGrid.tsx`**
- 2-column grid, sorted desc by date
- Each cell: photo thumbnail, date label below, weight overlay (matched from body_measurements by date)
- Tap → full-screen view (simple `<img>` inside another Sheet)
- Swipe-to-delete: matches established pattern (`useMotionValue`, `useTransform(x, [-100,-30],[1,0])`, red bg, `deleteProgressPhoto`)

**`src/components/progress/PhotoCompareSheet.tsx`**
- Bottom Sheet triggered by "Compare" button
- Two columns, each with a date-selector dropdown (populated from available photo dates)
- Displays the two selected photos side by side with date labels
- Weight delta label between them: e.g. `↓ 3.2 kg` in primary color

**`src/components/progress/BodyTab.tsx`**
Assembles the Body tab:
- Weight trend `LineChart` (same Recharts setup as BodyMeasurements)
- "Compare" button (top right) → opens PhotoCompareSheet
- "Log Entry" FAB → opens LogBodySheet
- ProgressPhotoGrid below the chart
- Empty state if no measurements yet

#### Step 4 — Progress.tsx refactor

Add tab state `("stats" | "body" | "prs")` defaulting to `"stats"`. Render a pill tab strip:

```
[ Stats ]  [ Body ]  [ PRs ]
```

- Stats tab: existing content (frequency chart, volume, DailyReviewChart)
- Body tab: `<BodyTab />`
- PRs tab: existing PR list with swipe-to-delete

Add `useQuery` for `fetchProgressPhotos` (key: `["progress-photos", user?.id]`) at the Progress level and pass data down, or let BodyTab own it — **BodyTab owns its own queries** to keep Progress.tsx from growing further.

### File list

| Action | File |
|--------|------|
| New migration | `supabase/migrations/20260419_progress_photos.sql` |
| Modified | `src/lib/cloud-data.ts` |
| New | `src/components/progress/LogBodySheet.tsx` |
| New | `src/components/progress/ProgressPhotoGrid.tsx` |
| New | `src/components/progress/PhotoCompareSheet.tsx` |
| New | `src/components/progress/BodyTab.tsx` |
| Modified | `src/pages/Progress.tsx` |

### Out of scope (backlog)
- Client-side image compression/resize before upload
- Coach view of athlete progress photos
- Photo tagging (front/side/back angles)

## Core Architecture Constraints

- **No custom server.** Everything is Supabase (Postgres + RLS + Auth). No edge functions needed — Lovable deploys on push.
- **localStorage for in-progress data:** Active workout session, custom workouts, and user preferences all live in localStorage. Supabase is write-on-complete only for workouts.
- **Static exercise data:** `exercise-library.ts`, `exercise-substitutions.ts`, `accessory-routines.ts`, `stretching-data.ts`, `training-splits.ts` are all in-code. Changes require a deploy, not a DB migration.
- **LucideIcon serialization bug:** Icons stored in localStorage become `{}`. `getAllCustomWorkouts()` patches `icon: Dumbbell` on every load. Any new icon-storing feature must do the same.
- **Swipe-to-delete pattern:** Use `useTransform(x, [-100, -30], [1, 0])` for bg opacity. Never use a fully-opaque absolute bg div behind a transparent sliding div — it bleeds through.
- **Exercise ID stability:** IDs like `lib-db-Dumbbell_Flyes` are permanent even if the display name changed (`Flyes`→`Flies`). Never rename IDs.
- **Substitution key sync:** `exercise-substitutions.ts` keys must match `workout-data.ts` exercise IDs exactly.

## Key Files to Check When Starting Work

| What | Where |
|------|-------|
| Workout definitions (static) | `src/lib/workout-data.ts` |
| Exercise catalogue | `src/lib/exercise-library.ts` |
| Swap options | `src/lib/exercise-substitutions.ts` |
| All Supabase ops | `src/lib/cloud-data.ts` |
| Active session page | `src/pages/WorkoutSession.tsx` |
| History cards | `src/components/history/WorkoutCard.tsx` |
| Home week strip | `src/components/WeekStrip.tsx` |
| Progress & PRs | `src/pages/Progress.tsx` |
| Food tracker | `src/pages/FoodTracker.tsx` |
| Auth context | `src/hooks/useAuth.tsx` |
| Role routing | `src/hooks/useUserRole.tsx` |

## Established Patterns

- **Swipe-to-delete:** Used in WorkoutSession (exercise cards), WorkoutCard (history), WeekStrip, WorkoutBuilder, Progress (PR rows). Always: `useMotionValue(0)` + `useTransform(x, [-100,-30],[1,0])` for bg opacity.
- **Search pools:** `ALL_SWAP_EXERCISES` in WorkoutSession and `ALL_EXERCISES` in WorkoutBuilder are built at module load from WORKOUTS + ACCESSORY_ROUTINES + EXERCISE_LIBRARY (deduplicated by lowercase name).
- **Toasts:** `sonner` only — `import { toast } from "sonner"`.
- **Overlays/drawers:** `Sheet` (shadcn bottom drawer), not `Dialog`.
- **Haptics:** `hapticMedium()` on set complete, `hapticSuccess()` on PR / save.

## Backlog / Ideas (not committed)

- Coach dashboard features (bulk session assignment, athlete progress view)
- Nutrition: weekly macro trend charts
- Workout templates / programme scheduling UI
- Push notifications for rest timer
- Barbell plate calculator overlay

## Git Reminder

```bash
git stash && git pull --rebase origin main && git stash pop  # before editing
git stash && git pull --rebase origin main && git stash pop && git push origin main  # to push
```
