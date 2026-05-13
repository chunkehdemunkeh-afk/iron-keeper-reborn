-- ============ COSMETICS ============
CREATE TABLE public.cosmetics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  kind text NOT NULL, -- 'frame' | 'banner' | 'xp_theme' | 'title'
  rarity text NOT NULL DEFAULT 'common', -- common | rare | epic | legendary | seasonal
  price_coins integer NOT NULL DEFAULT 0,
  required_tier text, -- bronze..champion or null
  season_exclusive_id uuid, -- references seasons(id) when seasonal
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, -- gradients, colors, label, etc.
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read cosmetics" ON public.cosmetics
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.user_cosmetics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cosmetic_code text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'shop', -- shop | season_reward | gift
  UNIQUE (user_id, cosmetic_code)
);
ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own cosmetics" ON public.user_cosmetics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cosmetics" ON public.user_cosmetics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.equipped_cosmetics (
  user_id uuid NOT NULL,
  kind text NOT NULL, -- frame | banner | xp_theme | title
  cosmetic_code text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind)
);
ALTER TABLE public.equipped_cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read equipped" ON public.equipped_cosmetics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own equipped" ON public.equipped_cosmetics FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ COMMUNITY CHALLENGES ============
CREATE TABLE public.community_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  metric text NOT NULL, -- volume_kg | sessions | xp | water_ml
  target numeric NOT NULL,
  reward_coins integer NOT NULL DEFAULT 0,
  reward_cosmetic_code text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read challenges" ON public.community_challenges FOR SELECT TO authenticated USING (true);

CREATE TABLE public.community_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL,
  user_id uuid NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);
ALTER TABLE public.community_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read contributions" ON public.community_contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own contributions" ON public.community_contributions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own contributions" ON public.community_contributions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ CLANS ============
CREATE TABLE public.clans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  tag text NOT NULL,
  description text,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read clans" ON public.clans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create clans" ON public.clans FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner updates clan" ON public.clans FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner deletes clan" ON public.clans FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.clan_members (
  clan_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member', -- owner | officer | member
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clan_id, user_id)
);
ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read clan members" ON public.clan_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users join as themselves" ON public.clan_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave themselves" ON public.clan_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ SEASON FINALE ============
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
  tier_text text;
  tier_floor integer;
  reward_coins integer;
BEGIN
  SELECT * INTO s FROM public.seasons WHERE id = p_season_id;
  IF s IS NULL THEN RAISE EXCEPTION 'Season not found'; END IF;
  IF s.status = 'completed' THEN RETURN; END IF;

  FOR r IN
    SELECT user_id, COALESCE(season_rp, 0) AS rp, COALESCE(season_tier, 'bronze') AS tier
    FROM public.user_progress
    ORDER BY COALESCE(season_rp, 0) DESC
  LOOP
    rank_counter := rank_counter + 1;
    INSERT INTO public.season_results (season_id, user_id, final_rp, final_tier, final_rank)
    VALUES (p_season_id, r.user_id, r.rp, r.tier, rank_counter)
    ON CONFLICT DO NOTHING;

    -- coin rewards by tier
    reward_coins := CASE r.tier
      WHEN 'champion' THEN 5000
      WHEN 'diamond' THEN 2500
      WHEN 'platinum' THEN 1500
      WHEN 'gold' THEN 800
      WHEN 'silver' THEN 400
      ELSE 150
    END;

    -- soft reset: drop to floor of current tier
    tier_floor := CASE r.tier
      WHEN 'champion' THEN 1500
      WHEN 'diamond' THEN 1100
      WHEN 'platinum' THEN 750
      WHEN 'gold' THEN 450
      WHEN 'silver' THEN 200
      ELSE 0
    END;

    UPDATE public.user_progress
    SET season_rp = tier_floor,
        coins = coins + reward_coins
    WHERE user_id = r.user_id;
  END LOOP;

  UPDATE public.seasons SET status = 'completed' WHERE id = p_season_id;
END;
$$;

-- ============ SEED COSMETICS ============
INSERT INTO public.cosmetics (code, name, description, kind, rarity, price_coins, required_tier, payload) VALUES
  ('frame_iron', 'Iron Frame', 'A simple iron frame.', 'frame', 'common', 200, NULL, '{"gradient":"linear-gradient(135deg,#6b6b6b,#a8a8a8)"}'),
  ('frame_bronze', 'Bronze Crest', 'Earned by stepping into the arena.', 'frame', 'common', 400, 'bronze', '{"gradient":"linear-gradient(135deg,#7a4a2b,#cd7f32)"}'),
  ('frame_silver', 'Silver Halo', 'Polished steel ring.', 'frame', 'rare', 800, 'silver', '{"gradient":"linear-gradient(135deg,#9aa0a6,#e8e8e8)"}'),
  ('frame_gold', 'Gold Laurel', 'Champion of the gold tier.', 'frame', 'rare', 1500, 'gold', '{"gradient":"linear-gradient(135deg,#b8860b,#ffd700)"}'),
  ('frame_platinum', 'Platinum Aurora', 'Shimmering platinum aura.', 'frame', 'epic', 2500, 'platinum', '{"gradient":"linear-gradient(135deg,#5e7ce0,#a3c9ff)"}'),
  ('frame_diamond', 'Diamond Edge', 'Crystalline brilliance.', 'frame', 'epic', 4000, 'diamond', '{"gradient":"linear-gradient(135deg,#00d4ff,#7c3aed)"}'),
  ('banner_volcano', 'Volcano', 'Lava-warm banner.', 'banner', 'rare', 600, NULL, '{"gradient":"linear-gradient(135deg,#7a1a0a,#ff5722,#ffb300)"}'),
  ('banner_glacier', 'Glacier', 'Cool blue expanse.', 'banner', 'rare', 600, NULL, '{"gradient":"linear-gradient(135deg,#0c2340,#4ea3d8,#cfeefb)"}'),
  ('banner_carbon', 'Carbon', 'Industrial carbon weave.', 'banner', 'common', 300, NULL, '{"gradient":"linear-gradient(135deg,#0a0a0a,#1f1f1f,#3a3a3a)"}'),
  ('xp_neon', 'Neon Pulse', 'Electric XP bar.', 'xp_theme', 'rare', 500, NULL, '{"from":"#22d3ee","to":"#a855f7"}'),
  ('xp_fire', 'Fire Stripe', 'Ignite your bar.', 'xp_theme', 'rare', 500, NULL, '{"from":"#f97316","to":"#dc2626"}'),
  ('xp_emerald', 'Emerald Stream', 'Verdant flow.', 'xp_theme', 'epic', 900, 'gold', '{"from":"#10b981","to":"#065f46"}'),
  ('title_grinder', 'The Grinder', 'For the relentless.', 'title', 'common', 250, NULL, '{"label":"The Grinder"}'),
  ('title_apex', 'Apex Predator', 'Top of the food chain.', 'title', 'epic', 1200, 'diamond', '{"label":"Apex Predator"}'),
  ('title_iron', 'Iron Will', 'Unbreakable.', 'title', 'rare', 600, NULL, '{"label":"Iron Will"}')
ON CONFLICT (code) DO NOTHING;

-- ============ SEED COMMUNITY CHALLENGE ============
INSERT INTO public.community_challenges (code, title, description, metric, target, reward_coins, reward_cosmetic_code, starts_at, ends_at)
VALUES (
  'cc_s1_megalift',
  'Megalift: 10,000,000 kg',
  'Lift 10 million kg combined as a community this season.',
  'volume_kg',
  10000000,
  300,
  'banner_volcano',
  now(),
  now() + interval '8 weeks'
) ON CONFLICT (code) DO NOTHING;