
ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS theme text,
  ADD COLUMN IF NOT EXISTS theme_gradient text;

ALTER TABLE public.cosmetics
  ADD COLUMN IF NOT EXISTS season_release int,
  ADD COLUMN IF NOT EXISTS discount_pct int NOT NULL DEFAULT 0;

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'daily';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quests_scope_check'
  ) THEN
    ALTER TABLE public.quests
      ADD CONSTRAINT quests_scope_check CHECK (scope IN ('daily','weekly','season'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quests_code_key'
  ) THEN
    ALTER TABLE public.quests ADD CONSTRAINT quests_code_key UNIQUE (code);
  END IF;
END $$;

ALTER TABLE public.user_quests
  ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.settle_season(p_season_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  r RECORD;
  rank_counter integer := 0;
  tier_floor integer;
  reward_coins integer;
  next_num integer;
  tier_cosmetic text;
BEGIN
  SELECT * INTO s FROM public.seasons WHERE id = p_season_id;
  IF s IS NULL THEN RAISE EXCEPTION 'Season not found'; END IF;
  IF s.status = 'completed' THEN
    -- Even if already completed, ensure a follow-on season exists.
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
$$;

REVOKE EXECUTE ON FUNCTION public.settle_season(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_season(uuid) TO authenticated;

DO $$
DECLARE next_num int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE status = 'active') THEN
    SELECT COALESCE(MAX(number), 0) + 1 INTO next_num FROM public.seasons;
    INSERT INTO public.seasons (number, starts_at, ends_at, status, theme, theme_gradient)
    VALUES (next_num, now(), now() + interval '4 weeks', 'active',
            'Iron Ascent', 'linear-gradient(135deg,#f59e0b,#ec4899,#8b5cf6)');
  END IF;
END $$;

INSERT INTO public.cosmetics (code, name, description, kind, rarity, price_coins, required_tier, payload, available) VALUES
  ('reward_bronze',   'Bronze Ascent',   'Season reward: finished in Bronze.',   'banner',  'common',    0, 'bronze',   '{"gradient":"linear-gradient(135deg,#7a4a2b,#cd7f32,#e8a769)"}'::jsonb, true),
  ('reward_silver',   'Silver Ascent',   'Season reward: finished in Silver.',   'banner',  'rare',      0, 'silver',   '{"gradient":"linear-gradient(135deg,#94a3b8,#e2e8f0,#cbd5e1)"}'::jsonb, true),
  ('reward_gold',     'Gold Ascent',     'Season reward: finished in Gold.',     'title',   'rare',      0, 'gold',     '{"label":"Golden Iron"}'::jsonb, true),
  ('reward_platinum', 'Platinum Ascent', 'Season reward: finished in Platinum.', 'xp_theme','epic',      0, 'platinum', '{"from":"#22d3ee","to":"#0ea5e9"}'::jsonb, true),
  ('reward_diamond',  'Diamond Ascent',  'Season reward: finished in Diamond.',  'frame',   'epic',      0, 'diamond',  '{"gradient":"linear-gradient(135deg,#a5f3fc,#0ea5e9,#4c1d95)"}'::jsonb, true),
  ('reward_champion', 'Champion Ascent', 'Season reward: finished in Champion.', 'title',   'legendary', 0, 'champion', '{"label":"Champion of the Iron"}'::jsonb, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.cosmetics (code, name, description, kind, rarity, price_coins, required_tier, payload, season_release, available) VALUES
  ('frame_champion', 'Champion Crown', 'Radiant crown frame — apex only.',       'frame',   'legendary', 6000, 'champion', '{"gradient":"linear-gradient(135deg,#fde047,#f97316,#e11d48,#a855f7)"}'::jsonb, 2, true),
  ('banner_aurora',  'Aurora',         'Northern lights ripple across your card.','banner', 'epic',      1200, 'platinum', '{"gradient":"linear-gradient(135deg,#0f172a,#22d3ee,#a855f7,#f472b6)"}'::jsonb, 2, true),
  ('xp_royal',       'Royal',          'Regal purple and gold XP flow.',         'xp_theme','epic',      900,  'gold',     '{"from":"#a855f7","to":"#f59e0b"}'::jsonb, 2, true),
  ('title_apex_lift','Apex Lifter',    'For those who lift beyond limits.',      'title',   'legendary', 2500, 'diamond',  '{"label":"Apex Lifter"}'::jsonb, 2, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.quests (code, title, description, type, scope, criteria, xp_reward, coin_reward, active_from, active_to) VALUES
  ('season_workouts_12', 'Season Grind',      'Log 12 workouts this season.',            'weekly', 'season', '{"metric":"workouts","target":12}'::jsonb,        400, 500, now(), now() + interval '4 weeks'),
  ('season_prs_5',       'Break the Bar',     'Hit 5 personal records this season.',     'weekly', 'season', '{"metric":"personal_record","target":5}'::jsonb,  500, 750, now(), now() + interval '4 weeks'),
  ('season_reviews_4',   'Weekly Reflection', 'Complete all 4 weekly reviews.',          'weekly', 'season', '{"metric":"weekly_review","target":4}'::jsonb,    300, 400, now(), now() + interval '4 weeks'),
  ('season_volume_50k',  'Iron Tonnage',      'Lift 50,000 kg of total working volume.', 'weekly', 'season', '{"metric":"volume_kg","target":50000}'::jsonb,    600, 800, now(), now() + interval '4 weeks'),
  ('season_streak_14',   'Fortnight of Fire', 'Reach a 14-day activity streak.',         'weekly', 'season', '{"metric":"current_streak","target":14}'::jsonb,  300, 400, now(), now() + interval '4 weeks')
ON CONFLICT (code) DO NOTHING;
