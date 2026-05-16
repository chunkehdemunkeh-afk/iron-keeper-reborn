ALTER TABLE public.workout_sets
  ADD COLUMN IF NOT EXISTS rir           SMALLINT  NULL
    CONSTRAINT rir_range CHECK (rir IS NULL OR (rir BETWEEN 0 AND 10)),
  ADD COLUMN IF NOT EXISTS target_rir    TEXT      NULL,
  ADD COLUMN IF NOT EXISTS target_reps   INTEGER   NULL,
  ADD COLUMN IF NOT EXISTS target_weight NUMERIC   NULL,
  ADD COLUMN IF NOT EXISTS is_pr         BOOLEAN   NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_workout_sets_is_pr
  ON public.workout_sets (user_id, is_pr)
  WHERE is_pr = TRUE;
