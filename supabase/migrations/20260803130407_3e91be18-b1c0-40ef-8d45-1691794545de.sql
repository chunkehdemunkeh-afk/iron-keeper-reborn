-- 1. community_contributions: remove client-writable value paths
DROP POLICY IF EXISTS "Users insert own contributions" ON public.community_contributions;
DROP POLICY IF EXISTS "Users update own contributions" ON public.community_contributions;
REVOKE INSERT, UPDATE, DELETE ON public.community_contributions FROM authenticated;

CREATE OR REPLACE FUNCTION public.record_challenge_contribution(p_challenge_id uuid, p_add numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ch RECORD;
  delta numeric;
  new_value numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_add IS NULL OR p_add <= 0 THEN RETURN 0; END IF;

  SELECT * INTO ch FROM public.community_challenges WHERE id = p_challenge_id;
  IF ch IS NULL THEN RAISE EXCEPTION 'Challenge not found'; END IF;
  IF now() < ch.starts_at OR now() > ch.ends_at THEN RAISE EXCEPTION 'Challenge not active'; END IF;

  -- Clamp a single contribution to a plausible amount and to the challenge target
  delta := LEAST(p_add, GREATEST(ch.target * 0.05, 1000));

  INSERT INTO public.community_contributions (challenge_id, user_id, value, updated_at)
  VALUES (p_challenge_id, auth.uid(), delta, now())
  ON CONFLICT (challenge_id, user_id)
  DO UPDATE SET value = public.community_contributions.value + delta, updated_at = now()
  RETURNING value INTO new_value;

  RETURN new_value;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_challenge_contribution(uuid, numeric) TO authenticated;

-- 2. settle_season: require coach role
CREATE OR REPLACE FUNCTION public.settle_season(p_season_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s RECORD;
  r RECORD;
  rank_counter integer := 0;
  tier_floor integer;
  reward_coins integer;
  next_num integer;
  tier_cosmetic text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    IF NOT public.has_role(auth.uid(), 'coach') THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  SELECT * INTO s FROM public.seasons WHERE id = p_season_id;
  IF s IS NULL THEN RAISE EXCEPTION 'Season not found'; END IF;
  IF s.status = 'completed' THEN
    IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE status = 'active') THEN
      SELECT COALESCE(MAX(number), 0) + 1 INTO next_num FROM public.seasons;
      INSERT INTO public.seasons (number, starts_at, ends_at, status, theme, theme_gradient)
      VALUES (next_num, now(), now() + interval '4 weeks', 'active',
              'Iron Ascent', 'linear-gradient(135deg,#f59e0b,#ec4899,#8b5cf6)');
    END IF;
    RETURN;
  END IF;

  FOR r IN
    SELECT user_id, COALESCE(season_rp, 0) AS rp, COALESCE(season_tier, 'bronze') AS tier
    FROM public.user_progress
    ORDER BY COALESCE(season_rp, 0) DESC
  LOOP
    rank_counter := rank_counter + 1;
    INSERT INTO public.season_results (season_id, user_id, final_rp, final_tier, final_rank)
    VALUES (p_season_id, r.user_id, r.rp, r.tier, rank_counter)
    ON CONFLICT DO NOTHING;

    reward_coins := CASE r.tier
      WHEN 'champion' THEN 5000
      WHEN 'diamond'  THEN 2500
      WHEN 'platinum' THEN 1500
      WHEN 'gold'     THEN 800
      WHEN 'silver'   THEN 400
      ELSE 150
    END;

    tier_floor := CASE r.tier
      WHEN 'champion' THEN 1500
      WHEN 'diamond'  THEN 1100
      WHEN 'platinum' THEN 750
      WHEN 'gold'     THEN 450
      WHEN 'silver'   THEN 200
      ELSE 0
    END;

    tier_cosmetic := 'reward_' || r.tier;
    IF EXISTS (SELECT 1 FROM public.cosmetics WHERE code = tier_cosmetic) THEN
      INSERT INTO public.user_cosmetics (user_id, cosmetic_code, source)
      VALUES (r.user_id, tier_cosmetic, 'season_reward')
      ON CONFLICT (user_id, cosmetic_code) DO NOTHING;
    END IF;

    UPDATE public.user_progress
    SET season_rp = tier_floor,
        coins = coins + reward_coins
    WHERE user_id = r.user_id;
  END LOOP;

  UPDATE public.seasons SET status = 'completed' WHERE id = p_season_id;

  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE status = 'active') THEN
    SELECT COALESCE(MAX(number), 0) + 1 INTO next_num FROM public.seasons;
    INSERT INTO public.seasons (number, starts_at, ends_at, status, theme, theme_gradient)
    VALUES (next_num, now(), now() + interval '4 weeks', 'active',
            'Iron Ascent', 'linear-gradient(135deg,#f59e0b,#ec4899,#8b5cf6)');
  END IF;
END;
$function$;

-- 3. clan_members: enforce capacity, single membership, and role integrity
CREATE OR REPLACE FUNCTION public.enforce_clan_membership_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  member_count integer;
  clan_owner uuid;
BEGIN
  SELECT owner_id INTO clan_owner FROM public.clans WHERE id = NEW.clan_id;
  IF clan_owner IS NULL THEN RAISE EXCEPTION 'Clan not found'; END IF;

  IF NEW.role NOT IN ('owner', 'officer', 'member') THEN
    RAISE EXCEPTION 'Invalid clan role';
  END IF;

  IF NEW.role <> 'member' AND NEW.user_id <> clan_owner THEN
    RAISE EXCEPTION 'Only the clan owner may hold a privileged role';
  END IF;

  IF EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Already a member of a clan';
  END IF;

  SELECT COUNT(*) INTO member_count FROM public.clan_members WHERE clan_id = NEW.clan_id;
  IF member_count >= 10 THEN
    RAISE EXCEPTION 'Clan is full';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clan_members_rules ON public.clan_members;
CREATE TRIGGER clan_members_rules
BEFORE INSERT ON public.clan_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_clan_membership_rules();

-- 4. Scope 'public' role policies to 'authenticated'
DROP POLICY IF EXISTS "users own daily_biometrics" ON public.daily_biometrics;
CREATE POLICY "users own daily_biometrics" ON public.daily_biometrics
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Coach can view roster daily_biometrics" ON public.daily_biometrics;
CREATE POLICY "Coach can view roster daily_biometrics" ON public.daily_biometrics
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'coach') AND EXISTS (
    SELECT 1 FROM coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = daily_biometrics.user_id));

DROP POLICY IF EXISTS "users own daily_scores" ON public.daily_scores;
CREATE POLICY "users own daily_scores" ON public.daily_scores
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Coach can view roster daily_scores" ON public.daily_scores;
CREATE POLICY "Coach can view roster daily_scores" ON public.daily_scores
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'coach') AND EXISTS (
    SELECT 1 FROM coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = daily_scores.user_id));

DROP POLICY IF EXISTS "Users manage own daily logs" ON public.daily_logs;
CREATE POLICY "Users manage own daily logs" ON public.daily_logs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own deload recs" ON public.deload_recommendations;
CREATE POLICY "Users manage own deload recs" ON public.deload_recommendations
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own food logs" ON public.food_logs;
CREATE POLICY "Users can delete their own food logs" ON public.food_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own food logs" ON public.food_logs;
CREATE POLICY "Users can insert their own food logs" ON public.food_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view their own food logs" ON public.food_logs;
CREATE POLICY "Users can view their own food logs" ON public.food_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own food logs" ON public.food_logs;
CREATE POLICY "Users can update their own food logs" ON public.food_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Coach can view all food logs" ON public.food_logs;
CREATE POLICY "Coach can view all food logs" ON public.food_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'coach') AND EXISTS (
    SELECT 1 FROM coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = food_logs.user_id));

DROP POLICY IF EXISTS "Users can delete their own goals" ON public.nutrition_goals;
CREATE POLICY "Users can delete their own goals" ON public.nutrition_goals
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.nutrition_goals;
CREATE POLICY "Users can insert their own goals" ON public.nutrition_goals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view their own goals" ON public.nutrition_goals;
CREATE POLICY "Users can view their own goals" ON public.nutrition_goals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own goals" ON public.nutrition_goals;
CREATE POLICY "Users can update their own goals" ON public.nutrition_goals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Coach can view all goals" ON public.nutrition_goals;
CREATE POLICY "Coach can view all goals" ON public.nutrition_goals
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'coach') AND EXISTS (
    SELECT 1 FROM coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = nutrition_goals.user_id));

DROP POLICY IF EXISTS "Users can delete their own progress photos" ON public.progress_photos;
CREATE POLICY "Users can delete their own progress photos" ON public.progress_photos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own progress photos" ON public.progress_photos;
CREATE POLICY "Users can insert their own progress photos" ON public.progress_photos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view their own progress photos" ON public.progress_photos;
CREATE POLICY "Users can view their own progress photos" ON public.progress_photos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own progress photos" ON public.progress_photos;
CREATE POLICY "Users can update their own progress photos" ON public.progress_photos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Coaches can view all progress photos" ON public.progress_photos;
CREATE POLICY "Coaches can view all progress photos" ON public.progress_photos
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'coach') AND EXISTS (
    SELECT 1 FROM coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = progress_photos.user_id));

DROP POLICY IF EXISTS "Users can delete their own weekly reviews" ON public.weekly_reviews;
CREATE POLICY "Users can delete their own weekly reviews" ON public.weekly_reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own weekly reviews" ON public.weekly_reviews;
CREATE POLICY "Users can insert their own weekly reviews" ON public.weekly_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view their own weekly reviews" ON public.weekly_reviews;
CREATE POLICY "Users can view their own weekly reviews" ON public.weekly_reviews
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own weekly reviews" ON public.weekly_reviews;
CREATE POLICY "Users can update their own weekly reviews" ON public.weekly_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Coaches can view all weekly reviews" ON public.weekly_reviews;
CREATE POLICY "Coaches can view all weekly reviews" ON public.weekly_reviews
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'coach') AND EXISTS (
    SELECT 1 FROM coach_athletes ca WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = weekly_reviews.user_id));

-- 5. workout_history UPDATE policy scoped to authenticated
DROP POLICY IF EXISTS "Users can update their own workouts" ON public.workout_history;
CREATE POLICY "Users can update their own workouts" ON public.workout_history
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);