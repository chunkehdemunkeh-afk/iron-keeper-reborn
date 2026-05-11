ALTER TABLE public.workout_sets
  ADD COLUMN IF NOT EXISTS original_exercise_id TEXT;

CREATE INDEX IF NOT EXISTS workout_sets_original_exercise_id_idx
  ON public.workout_sets (user_id, original_exercise_id);