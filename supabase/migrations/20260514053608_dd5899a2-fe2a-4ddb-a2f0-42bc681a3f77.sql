ALTER TABLE public.workout_history
  ADD COLUMN IF NOT EXISTS hr_zones jsonb,
  ADD COLUMN IF NOT EXISTS duration_watch integer,
  ADD COLUMN IF NOT EXISTS calories_watch integer;