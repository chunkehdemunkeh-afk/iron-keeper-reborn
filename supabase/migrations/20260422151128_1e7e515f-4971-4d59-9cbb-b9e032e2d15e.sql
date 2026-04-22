ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS set_type TEXT NOT NULL DEFAULT 'working';

CREATE INDEX IF NOT EXISTS idx_workout_sets_set_type ON public.workout_sets(set_type) WHERE set_type <> 'working';