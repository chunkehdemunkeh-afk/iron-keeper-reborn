-- Per-session heart rate
ALTER TABLE public.workout_history
  ADD COLUMN IF NOT EXISTS avg_hr smallint,
  ADD COLUMN IF NOT EXISTS max_hr smallint;

-- Optional time-series HR samples per workout
CREATE TABLE IF NOT EXISTS public.workout_hr_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_history_id uuid NOT NULL REFERENCES public.workout_history(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL,
  bpm smallint NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_hr_samples_history_idx
  ON public.workout_hr_samples (workout_history_id, recorded_at);
CREATE INDEX IF NOT EXISTS workout_hr_samples_user_time_idx
  ON public.workout_hr_samples (user_id, recorded_at DESC);

ALTER TABLE public.workout_hr_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own hr samples"
  ON public.workout_hr_samples FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own hr samples"
  ON public.workout_hr_samples FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own hr samples"
  ON public.workout_hr_samples FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Coach views all hr samples"
  ON public.workout_hr_samples FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'coach'::app_role));