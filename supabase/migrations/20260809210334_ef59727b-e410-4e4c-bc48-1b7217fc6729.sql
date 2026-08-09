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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO s FROM public.seasons WHERE id = p_season_id;
  IF s IS NULL THEN RAISE EXCEPTION 'Season not found'; END IF;

  -- Any signed-in user may settle a season that has genuinely ended.
  IF s.ends_at > now() AND NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'coach') THEN
    RAISE EXCEPTION 'Season has not ended yet';
  END IF;

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