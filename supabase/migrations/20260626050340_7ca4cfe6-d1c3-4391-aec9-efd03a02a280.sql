
ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS set_index smallint;

-- Backfill: assign per-(history,exercise) ordering using created_at then id as the
-- best-available stable tiebreaker. Existing rows in a single bulk insert all share
-- created_at; this preserves whatever order Postgres returned previously (no worse
-- than the status quo) and locks it in so future reads stay deterministic.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY workout_history_id, exercise_id
           ORDER BY created_at, id
         ) - 1 AS idx
  FROM public.workout_sets
  WHERE set_index IS NULL
)
UPDATE public.workout_sets ws
SET set_index = ranked.idx
FROM ranked
WHERE ws.id = ranked.id;

CREATE INDEX IF NOT EXISTS workout_sets_history_exercise_idx
  ON public.workout_sets (workout_history_id, exercise_id, set_index);
