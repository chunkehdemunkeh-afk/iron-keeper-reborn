-- ========== Schema additions ==========
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC,
  ADD COLUMN IF NOT EXISTS calories_burned INTEGER,
  ADD COLUMN IF NOT EXISTS incline_pct INTEGER;

ALTER TABLE public.workout_history
  ADD COLUMN IF NOT EXISTS calories_burned INTEGER;

ALTER TABLE public.nutrition_goals
  ADD COLUMN IF NOT EXISTS adjust_for_activity BOOLEAN NOT NULL DEFAULT false;

-- ========== Helper: bodyweight lookup ==========
CREATE OR REPLACE FUNCTION public.lookup_user_bodyweight(_user_id UUID, _on_date DATE)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bw NUMERIC;
BEGIN
  SELECT body_weight INTO bw
  FROM public.body_measurements
  WHERE user_id = _user_id
    AND body_weight IS NOT NULL
    AND date::date <= _on_date
  ORDER BY date DESC
  LIMIT 1;

  IF bw IS NULL THEN
    SELECT tdee_weight_kg INTO bw
    FROM public.nutrition_goals
    WHERE user_id = _user_id
    LIMIT 1;
  END IF;

  RETURN COALESCE(bw, 75);
END;
$$;

-- ========== Helper: cardio burn estimate ==========
-- Uses Compendium MET tables. If distance_km available, computes pace-aware MET;
-- otherwise uses a mid-band fixed MET per activity type.
CREATE OR REPLACE FUNCTION public.estimate_cardio_burn(
  _activity_type TEXT,
  _duration_min INTEGER,
  _distance_km NUMERIC,
  _incline_pct INTEGER,
  _weight_kg NUMERIC
) RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  met NUMERIC;
  pace_kmh NUMERIC;
  hours NUMERIC;
  kcal NUMERIC;
  type_lower TEXT;
BEGIN
  IF _duration_min IS NULL OR _duration_min <= 0 OR _weight_kg IS NULL THEN
    RETURN NULL;
  END IF;

  hours := _duration_min::NUMERIC / 60.0;
  type_lower := lower(coalesce(_activity_type, ''));

  IF _distance_km IS NOT NULL AND _distance_km > 0 THEN
    pace_kmh := _distance_km / hours;
  ELSE
    pace_kmh := NULL;
  END IF;

  IF type_lower = 'rest' THEN
    RETURN 0;
  ELSIF type_lower = 'running' THEN
    IF pace_kmh IS NULL THEN met := 9.8;
    ELSIF pace_kmh < 8 THEN met := 8.3;
    ELSIF pace_kmh < 9.7 THEN met := 9.8;
    ELSIF pace_kmh < 11.3 THEN met := 11.0;
    ELSIF pace_kmh < 12.9 THEN met := 11.8;
    ELSE met := 12.8;
    END IF;
  ELSIF type_lower = 'walking' THEN
    IF pace_kmh IS NULL THEN met := 3.5;
    ELSIF pace_kmh < 4 THEN met := 2.8;
    ELSIF pace_kmh < 5.6 THEN met := 3.5;
    ELSIF pace_kmh < 6.5 THEN met := 5.0;
    ELSE met := 6.3;
    END IF;
    -- Incline adjustment for walking
    IF _incline_pct IS NOT NULL AND _incline_pct > 0 AND pace_kmh IS NOT NULL THEN
      met := met + (0.05 * _incline_pct * pace_kmh * 0.1);
    END IF;
  ELSIF type_lower = 'cycling' THEN
    IF pace_kmh IS NULL THEN met := 6.8;
    ELSIF pace_kmh < 16 THEN met := 4.0;
    ELSIF pace_kmh < 19.1 THEN met := 6.8;
    ELSIF pace_kmh < 22.5 THEN met := 8.0;
    ELSIF pace_kmh < 25.7 THEN met := 10.0;
    ELSE met := 12.0;
    END IF;
  ELSIF type_lower = 'swimming' THEN met := 7.0;
  ELSIF type_lower = 'yoga' THEN met := 3.0;
  ELSIF type_lower = 'football' THEN met := 7.0;
  ELSE met := 4.0;
  END IF;

  kcal := met * _weight_kg * hours;
  -- Round to nearest 5
  RETURN GREATEST(0, (round(kcal / 5.0) * 5)::INTEGER);
END;
$$;

-- ========== Helper: strength session burn estimate ==========
-- Sums work term across sets in workout_sets + baseline metabolic cost
CREATE OR REPLACE FUNCTION public.estimate_strength_burn(
  _workout_history_id UUID,
  _duration_min INTEGER,
  _weight_kg NUMERIC
) RETURNS INTEGER
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  work_kcal NUMERIC := 0;
  metabolic_kcal NUMERIC := 0;
  hours NUMERIC;
BEGIN
  IF _duration_min IS NULL OR _duration_min <= 0 OR _weight_kg IS NULL THEN
    RETURN NULL;
  END IF;

  hours := _duration_min::NUMERIC / 60.0;

  -- Work term: weight * reps * 0.001 across all working sets
  -- (historical: all sets treated as working since warm-up tagging is new)
  SELECT COALESCE(SUM(
    CASE
      WHEN weight > 0 THEN weight * reps * 0.001
      ELSE _weight_kg * reps * 0.0025  -- bodyweight exercise fallback
    END
  ), 0) INTO work_kcal
  FROM public.workout_sets
  WHERE workout_history_id = _workout_history_id
    AND set_type != 'warmup';

  -- Baseline metabolic cost: MET 5.5 default
  metabolic_kcal := 5.5 * _weight_kg * hours;

  RETURN GREATEST(0, (round((work_kcal + metabolic_kcal) / 5.0) * 5)::INTEGER);
END;
$$;

-- ========== Backfill: activity_logs ==========
UPDATE public.activity_logs al
SET calories_burned = public.estimate_cardio_burn(
  al.activity_type,
  al.duration,
  al.distance_km,
  al.incline_pct,
  public.lookup_user_bodyweight(al.user_id, al.date)
)
WHERE al.calories_burned IS NULL
  AND al.duration IS NOT NULL
  AND al.duration > 0;

-- ========== Backfill: workout_history ==========
UPDATE public.workout_history wh
SET calories_burned = public.estimate_strength_burn(
  wh.id,
  wh.duration,
  public.lookup_user_bodyweight(wh.user_id, wh.date::date)
)
WHERE wh.calories_burned IS NULL
  AND wh.duration > 0;