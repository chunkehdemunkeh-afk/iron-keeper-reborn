-- Remap custom exercise IDs to canonical exercise library IDs.
-- am3 (Incline Dumbbell Curl) → lib-18
-- pl4 (Face Pulls)            → lib-13
-- Handles base IDs and any suffixed variants (e.g. am3-sa → lib-18-sa).

-- workout_sets: exercise_id
UPDATE workout_sets
  SET exercise_id = 'lib-18' || substring(exercise_id from 4)
  WHERE exercise_id = 'am3' OR exercise_id LIKE 'am3-%';

UPDATE workout_sets
  SET exercise_id = 'lib-13' || substring(exercise_id from 4)
  WHERE exercise_id = 'pl4' OR exercise_id LIKE 'pl4-%';

-- workout_sets: original_exercise_id (substitution slot tracking)
UPDATE workout_sets
  SET original_exercise_id = 'lib-18' || substring(original_exercise_id from 4)
  WHERE original_exercise_id = 'am3' OR original_exercise_id LIKE 'am3-%';

UPDATE workout_sets
  SET original_exercise_id = 'lib-13' || substring(original_exercise_id from 4)
  WHERE original_exercise_id = 'pl4' OR original_exercise_id LIKE 'pl4-%';

-- workout_sets: fix exercise_name for any rows where it was stored as the raw ID
UPDATE workout_sets
  SET exercise_name = 'Incline Dumbbell Curl'
  WHERE (exercise_id = 'lib-18' OR exercise_id LIKE 'lib-18-%')
    AND (exercise_name IS NULL OR exercise_name = 'am3');

UPDATE workout_sets
  SET exercise_name = 'Face Pulls'
  WHERE (exercise_id = 'lib-13' OR exercise_id LIKE 'lib-13-%')
    AND (exercise_name IS NULL OR exercise_name = 'pl4');

-- exercise_progression: exercise_id
UPDATE exercise_progression
  SET exercise_id = 'lib-18' || substring(exercise_id from 4)
  WHERE exercise_id = 'am3' OR exercise_id LIKE 'am3-%';

UPDATE exercise_progression
  SET exercise_id = 'lib-13' || substring(exercise_id from 4)
  WHERE exercise_id = 'pl4' OR exercise_id LIKE 'pl4-%';
