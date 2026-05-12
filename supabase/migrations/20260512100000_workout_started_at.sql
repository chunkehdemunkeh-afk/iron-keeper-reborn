-- Add started_at to workout_history to record actual gym start time.
-- Enables real gym duration (vs active set time) and future HR zone pairing via Health Connect.

ALTER TABLE workout_history ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
