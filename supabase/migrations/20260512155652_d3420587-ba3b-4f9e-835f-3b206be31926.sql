
CREATE OR REPLACE FUNCTION public.lookup_user_bodyweight(_user_id uuid, _on_date date)
 RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE bw NUMERIC;
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT body_weight INTO bw FROM public.body_measurements
   WHERE user_id = _user_id AND body_weight IS NOT NULL AND date::date <= _on_date
   ORDER BY date DESC LIMIT 1;
  IF bw IS NULL THEN
    SELECT tdee_weight_kg INTO bw FROM public.nutrition_goals WHERE user_id = _user_id LIMIT 1;
  END IF;
  RETURN COALESCE(bw, 75);
END;
$function$;

CREATE OR REPLACE FUNCTION public.estimate_strength_burn(_workout_history_id uuid, _duration_min integer, _weight_kg numeric)
 RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE work_kcal NUMERIC := 0; metabolic_kcal NUMERIC := 0; hours NUMERIC; owner UUID;
BEGIN
  IF _duration_min IS NULL OR _duration_min <= 0 OR _weight_kg IS NULL THEN RETURN NULL; END IF;
  SELECT user_id INTO owner FROM public.workout_history WHERE id = _workout_history_id;
  IF owner IS NULL OR owner IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  hours := _duration_min::NUMERIC / 60.0;
  SELECT COALESCE(SUM(CASE WHEN weight > 0 THEN weight * reps * 0.0035 ELSE _weight_kg * reps * 0.0025 END), 0) INTO work_kcal
   FROM public.workout_sets WHERE workout_history_id = _workout_history_id AND set_type != 'warmup';
  metabolic_kcal := 5.5 * _weight_kg * hours;
  RETURN GREATEST(0, (round((work_kcal + metabolic_kcal) / 5.0) * 5)::INTEGER);
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role AND _user_id = auth.uid())
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_assign_coach ON auth.users;
DROP TRIGGER IF EXISTS assign_coach_role_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.assign_coach_role() CASCADE;

DROP POLICY IF EXISTS "Users can update their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can update their own activity logs"
ON public.activity_logs FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.estimate_cardio_burn(_activity_type text, _duration_min integer, _distance_km numeric, _incline_pct integer, _weight_kg numeric)
 RETURNS integer LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $function$
DECLARE met NUMERIC; pace_kmh NUMERIC; hours NUMERIC; kcal NUMERIC; type_lower TEXT;
BEGIN
  IF _duration_min IS NULL OR _duration_min <= 0 OR _weight_kg IS NULL THEN RETURN NULL; END IF;
  hours := _duration_min::NUMERIC / 60.0;
  type_lower := lower(coalesce(_activity_type, ''));
  IF _distance_km IS NOT NULL AND _distance_km > 0 THEN pace_kmh := _distance_km / hours; ELSE pace_kmh := NULL; END IF;
  IF type_lower = 'rest' THEN RETURN 0;
  ELSIF type_lower = 'running' THEN
    IF pace_kmh IS NULL THEN met := 9.8;
    ELSIF pace_kmh < 8 THEN met := 8.3;
    ELSIF pace_kmh < 9.7 THEN met := 9.8;
    ELSIF pace_kmh < 11.3 THEN met := 11.0;
    ELSIF pace_kmh < 12.9 THEN met := 11.8;
    ELSE met := 12.8; END IF;
  ELSIF type_lower = 'walking' THEN
    IF pace_kmh IS NULL THEN met := 3.5;
    ELSIF pace_kmh < 4 THEN met := 2.8;
    ELSIF pace_kmh < 5.6 THEN met := 3.5;
    ELSIF pace_kmh < 6.5 THEN met := 5.0;
    ELSE met := 6.3; END IF;
    IF _incline_pct IS NOT NULL AND _incline_pct > 0 AND pace_kmh IS NOT NULL THEN
      met := met + (0.05 * _incline_pct * pace_kmh * 0.1);
    END IF;
  ELSIF type_lower = 'cycling' THEN
    IF pace_kmh IS NULL THEN met := 6.8;
    ELSIF pace_kmh < 16 THEN met := 4.0;
    ELSIF pace_kmh < 19.1 THEN met := 6.8;
    ELSIF pace_kmh < 22.5 THEN met := 8.0;
    ELSIF pace_kmh < 25.7 THEN met := 10.0;
    ELSE met := 12.0; END IF;
  ELSIF type_lower = 'swimming' THEN met := 7.0;
  ELSIF type_lower = 'yoga' THEN met := 3.0;
  ELSIF type_lower = 'football' THEN met := 7.0;
  ELSE met := 4.0;
  END IF;
  kcal := met * _weight_kg * hours;
  RETURN GREATEST(0, (round(kcal / 5.0) * 5)::INTEGER);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.lookup_user_bodyweight(uuid, date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.lookup_user_bodyweight(uuid, date) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.estimate_strength_burn(uuid, integer, numeric) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.estimate_strength_burn(uuid, integer, numeric) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_top_exercises(text, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_top_exercises(text, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_max_weight_leaderboard(text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_max_weight_leaderboard(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_max_reps_leaderboard(text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_max_reps_leaderboard(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_1rm_leaderboard(text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_1rm_leaderboard(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_session_volume_leaderboard(text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_session_volume_leaderboard(text, text) TO authenticated;
