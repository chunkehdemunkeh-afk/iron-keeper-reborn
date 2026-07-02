-- Coach/athlete roster system.
--
-- Previously "coach" was a single hardcoded account (jacart1988@gmail.com)
-- with blanket read access to every user's data via `has_role(auth.uid(), 'coach')`
-- policies. This introduces a real roster: coaches only see athletes who have
-- explicitly joined via an invite code, and any user can self-serve become a
-- coach. Existing "coach can view all X" policies are rescoped below to require
-- roster membership instead of the role alone.

-- ─── coach_athletes ──────────────────────────────────────────────────────────
CREATE TABLE public.coach_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_user_id, athlete_user_id)
);

CREATE INDEX idx_coach_athletes_coach ON public.coach_athletes (coach_user_id);
CREATE INDEX idx_coach_athletes_athlete ON public.coach_athletes (athlete_user_id);

ALTER TABLE public.coach_athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can view own roster"
  ON public.coach_athletes FOR SELECT
  TO authenticated
  USING (auth.uid() = coach_user_id);

CREATE POLICY "Athlete can view own coach link"
  ON public.coach_athletes FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_user_id);

CREATE POLICY "Coach can remove athlete from own roster"
  ON public.coach_athletes FOR DELETE
  TO authenticated
  USING (auth.uid() = coach_user_id);

CREATE POLICY "Athlete can leave own coach"
  ON public.coach_athletes FOR DELETE
  TO authenticated
  USING (auth.uid() = athlete_user_id);

-- No direct INSERT policy — joining only happens via join_coach_by_code() below,
-- which is SECURITY DEFINER and validates the invite code server-side.

-- ─── coach_profiles (invite codes) ──────────────────────────────────────────
CREATE TABLE public.coach_profiles (
  coach_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can view own invite code"
  ON public.coach_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = coach_user_id);

-- No direct INSERT/UPDATE policy — managed via get_or_create_coach_invite_code()
-- below (SECURITY DEFINER) so we can enforce has_role('coach') and generate a
-- unique code server-side rather than trusting the client to pick one.

-- ─── become_coach() ──────────────────────────────────────────────────────────
-- Self-serve coach signup: any authenticated user can call this once to unlock
-- the coach role (and therefore /coach) for themselves.
CREATE OR REPLACE FUNCTION public.become_coach()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'coach')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.become_coach() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.become_coach() TO authenticated;

-- ─── get_or_create_coach_invite_code() ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_or_create_coach_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_code text;
  new_code text;
  attempt int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'coach') THEN
    RAISE EXCEPTION 'Only coaches can generate an invite code';
  END IF;

  SELECT invite_code INTO existing_code
  FROM public.coach_profiles WHERE coach_user_id = auth.uid();

  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;

  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    BEGIN
      INSERT INTO public.coach_profiles (coach_user_id, invite_code)
      VALUES (auth.uid(), new_code);
      RETURN new_code;
    EXCEPTION WHEN unique_violation THEN
      attempt := attempt + 1;
      IF attempt > 10 THEN
        RAISE EXCEPTION 'Could not generate a unique invite code, try again';
      END IF;
    END;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_or_create_coach_invite_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_coach_invite_code() TO authenticated;

-- ─── join_coach_by_code() ────────────────────────────────────────────────────
-- Athlete-facing: resolves an invite code to a coach and joins their roster.
-- Returns the coach's display name for a confirmation toast.
CREATE OR REPLACE FUNCTION public.join_coach_by_code(_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_coach uuid;
  coach_name text;
BEGIN
  SELECT coach_user_id INTO target_coach
  FROM public.coach_profiles WHERE invite_code = upper(trim(_code));

  IF target_coach IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF target_coach = auth.uid() THEN
    RAISE EXCEPTION 'You cannot join your own roster';
  END IF;

  INSERT INTO public.coach_athletes (coach_user_id, athlete_user_id)
  VALUES (target_coach, auth.uid())
  ON CONFLICT (coach_user_id, athlete_user_id) DO NOTHING;

  SELECT display_name INTO coach_name FROM public.profiles WHERE user_id = target_coach;
  RETURN COALESCE(coach_name, 'your coach');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_coach_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_coach_by_code(text) TO authenticated;

-- ─── Rescope existing "coach sees everyone" policies to roster membership ───
ALTER POLICY "Coach can view all workouts" ON public.workout_history
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = workout_history.user_id)
  );

ALTER POLICY "Coach can view all sets" ON public.workout_sets
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = workout_sets.user_id)
  );

ALTER POLICY "Coach can view all profiles" ON public.profiles
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = profiles.user_id)
  );

ALTER POLICY "Coach can view all stretch completions" ON public.stretch_completions
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = stretch_completions.user_id)
  );

ALTER POLICY "Coach can view all goals" ON public.nutrition_goals
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = nutrition_goals.user_id)
  );

ALTER POLICY "Coach can view all food logs" ON public.food_logs
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = food_logs.user_id)
  );

ALTER POLICY "Coach can view all favourites" ON public.favourite_foods
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = favourite_foods.user_id)
  );

ALTER POLICY "Coach can view all water intake" ON public.water_intake
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = water_intake.user_id)
  );

ALTER POLICY "Coach can view all daily logs" ON public.daily_logs
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = daily_logs.user_id)
  );

ALTER POLICY "Coach can view all activity logs" ON public.activity_logs
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = activity_logs.user_id)
  );

ALTER POLICY "Coaches can view all progress photos" ON public.progress_photos
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = progress_photos.user_id)
  );

ALTER POLICY "Coaches can view all weekly reviews" ON public.weekly_reviews
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = weekly_reviews.user_id)
  );

ALTER POLICY "Coaches can view all progress photo files" ON storage.objects
  USING (
    bucket_id = 'progress-photos'
    AND has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id::text = (storage.foldername(name))[1]
    )
  );

ALTER POLICY "Coach can view all sleep logs" ON public.sleep_logs
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = sleep_logs.user_id)
  );

ALTER POLICY "Coach views all hr samples" ON public.workout_hr_samples
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = workout_hr_samples.user_id)
  );

ALTER POLICY "Coach can view all notifications" ON public.coach_notifications
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = coach_notifications.user_id)
  );

ALTER POLICY "Coach can update notifications" ON public.coach_notifications
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = coach_notifications.user_id)
  );

ALTER POLICY "Coach can view all season results" ON public.season_results
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = season_results.user_id)
  );

ALTER POLICY "Coach views all progression" ON public.exercise_progression
  USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (SELECT 1 FROM public.coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = exercise_progression.user_id)
  );

-- ─── Backfill: preserve existing coach visibility ───────────────────────────
-- Any current coach previously saw every user under the blanket-role model.
-- Link them to all existing profiles now so this migration doesn't silently
-- hide everyone until each athlete re-joins via invite code. New users going
-- forward must join a coach's roster explicitly.
INSERT INTO public.coach_athletes (coach_user_id, athlete_user_id)
SELECT ur.user_id, p.user_id
FROM public.user_roles ur
CROSS JOIN public.profiles p
WHERE ur.role = 'coach' AND p.user_id != ur.user_id
ON CONFLICT (coach_user_id, athlete_user_id) DO NOTHING;
