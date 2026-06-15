
UPDATE public.workout_sets
SET exercise_id = 'lib-64' || SUBSTRING(exercise_id FROM 4),
    exercise_name = 'Mag Grip Seated Cable Row'
WHERE exercise_id LIKE 'up1-%';

UPDATE public.workout_sets
SET original_exercise_id = 'lib-64' || SUBSTRING(original_exercise_id FROM 4)
WHERE original_exercise_id LIKE 'up1-%';

-- Drop legacy progression rows where a lib-64 row already exists; otherwise rename.
DELETE FROM public.exercise_progression ep
WHERE ep.exercise_id LIKE 'up1-%'
  AND EXISTS (
    SELECT 1 FROM public.exercise_progression ep2
    WHERE ep2.user_id = ep.user_id
      AND ep2.exercise_id = 'lib-64' || SUBSTRING(ep.exercise_id FROM 4)
  );

UPDATE public.exercise_progression
SET exercise_id = 'lib-64' || SUBSTRING(exercise_id FROM 4)
WHERE exercise_id LIKE 'up1-%';
