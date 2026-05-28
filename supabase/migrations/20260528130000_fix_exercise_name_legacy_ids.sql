-- Fix legacy rows where exercise_name was stored as the raw exercise_id
-- (known issue: cable-attachment variants like up4-handles stored name = id).
-- Only updates rows where exercise_name has no spaces (i.e. looks like an ID code,
-- not a human-readable name).

-- Cable Flies To Thighs (up4 and variants: up4-handles, up4-rope, etc.)
UPDATE workout_sets
  SET exercise_name = 'Cable Flies To Thighs'
  WHERE exercise_id LIKE 'up4%'
    AND (exercise_name IS NULL OR exercise_name NOT LIKE '% %');

-- Dumbbell Row (dl5 and variants: dl5-sa)
UPDATE workout_sets
  SET exercise_name = 'Dumbbell Row'
  WHERE exercise_id LIKE 'dl5%'
    AND (exercise_name IS NULL OR exercise_name NOT LIKE '% %');

-- Rope Hammer Curl (ub6 and variants: ub6-rope, ub6-sa, ub6-sa-rope)
UPDATE workout_sets
  SET exercise_name = 'Rope Hammer Curl (Cable)'
  WHERE exercise_id LIKE 'ub6%'
    AND (exercise_name IS NULL OR exercise_name NOT LIKE '% %');

-- Dumbbell Lateral Raise (sh4 and variants)
UPDATE workout_sets
  SET exercise_name = 'Dumbbell Lateral Raise'
  WHERE exercise_id LIKE 'sh4%'
    AND (exercise_name IS NULL OR exercise_name NOT LIKE '% %');

-- Tricep Pushdown (up8 and variants: up8-heavy, up8-v-bar, up8-heavy-v-bar)
UPDATE workout_sets
  SET exercise_name = 'Tricep Pushdown'
  WHERE exercise_id LIKE 'up8%'
    AND (exercise_name IS NULL OR exercise_name NOT LIKE '% %');

-- Cable Lateral Raises (ua6)
UPDATE workout_sets
  SET exercise_name = 'Cable Lateral Raises'
  WHERE exercise_id LIKE 'ua6%'
    AND (exercise_name IS NULL OR exercise_name NOT LIKE '% %');

-- Face Pulls — lib-13 variants (lib-13-rope etc.) and any residual old pl4 name
UPDATE workout_sets
  SET exercise_name = 'Face Pulls'
  WHERE exercise_id LIKE 'lib-13%'
    AND (exercise_name IS NULL OR exercise_name NOT LIKE '% %');

-- Incline Dumbbell Curl — lib-18 variants and residual old am3 name
UPDATE workout_sets
  SET exercise_name = 'Incline Dumbbell Curl'
  WHERE exercise_id LIKE 'lib-18%'
    AND (exercise_name IS NULL OR exercise_name NOT LIKE '% %');

-- Tricep Pushdown — lib-19 variants
UPDATE workout_sets
  SET exercise_name = 'Tricep Pushdown'
  WHERE exercise_id LIKE 'lib-19%'
    AND (exercise_name IS NULL OR exercise_name NOT LIKE '% %');
