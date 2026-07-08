-- Pre-launch audit #19/#20/#21: several pieces of user state live only in
-- localStorage, which Android can clear without warning. These tables give
-- them a cloud backup — localStorage remains the fast/primary read path,
-- these are best-effort write-through backups consulted on fresh install or
-- when local data is missing.

-- ─── custom_workouts (#20) ──────────────────────────────────────────────────
-- id is the client-generated "custom-{uuid8}" string already used as the
-- WorkoutDay id, kept as the primary key so no id-mapping layer is needed.
CREATE TABLE public.custom_workouts (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  focus text NOT NULL,
  color text NOT NULL,
  day text NOT NULL DEFAULT 'Custom',
  target_rir text,
  exercises jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_custom_workouts_user ON public.custom_workouts (user_id);

ALTER TABLE public.custom_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own custom workouts"
  ON public.custom_workouts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── user_preferences (#21) ─────────────────────────────────────────────────
-- Mirrors src/lib/user-preferences.ts's UserPreferences shape (split + schedule).
CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_complete boolean NOT NULL DEFAULT false,
  days_per_week integer,
  split_id text,
  split_name text,
  schedule jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON public.user_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── workout_drafts (#19) ───────────────────────────────────────────────────
-- One row per (user, workout) — mirrors the `workout-autosave-{workoutId}`
-- localStorage key. Periodically upserted during an active session as a
-- best-effort backup; deleted when the session finishes or is discarded.
CREATE TABLE public.workout_drafts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id text NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, workout_id)
);

ALTER TABLE public.workout_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workout drafts"
  ON public.workout_drafts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
