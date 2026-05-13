
-- ── user_progress: per-user counter cache ──────────────────────────────────
CREATE TABLE public.user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  freeze_tokens INTEGER NOT NULL DEFAULT 0,
  season_rp INTEGER NOT NULL DEFAULT 0,
  season_tier TEXT NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own progress" ON public.user_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON public.user_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.user_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── xp_events: append-only ledger ─────────────────────────────────────────
CREATE TABLE public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_events_user_created ON public.xp_events(user_id, created_at DESC);
CREATE INDEX idx_xp_events_user_source ON public.xp_events(user_id, source);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own xp events" ON public.xp_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own xp events" ON public.xp_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── badges: public catalog ────────────────────────────────────────────────
CREATE TABLE public.badges (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'bronze',
  icon TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  coin_reward INTEGER NOT NULL DEFAULT 0,
  criteria JSONB NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read badges" ON public.badges
  FOR SELECT TO authenticated USING (true);

-- ── user_badges: per-user unlocks ─────────────────────────────────────────
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL REFERENCES public.badges(code) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  progress JSONB,
  UNIQUE (user_id, badge_code)
);

CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own badges" ON public.user_badges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own badges" ON public.user_badges
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own badges" ON public.user_badges
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own badges" ON public.user_badges
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── quests: public catalog ────────────────────────────────────────────────
CREATE TABLE public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  criteria JSONB NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  coin_reward INTEGER NOT NULL DEFAULT 0,
  active_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quests_active ON public.quests(active_from, active_to);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read quests" ON public.quests
  FOR SELECT TO authenticated USING (true);

-- ── user_quests: per-user progress ────────────────────────────────────────
CREATE TABLE public.user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  progress NUMERIC NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id)
);

CREATE INDEX idx_user_quests_user ON public.user_quests(user_id);

ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own quests" ON public.user_quests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own quests" ON public.user_quests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own quests" ON public.user_quests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_quests_updated_at
  BEFORE UPDATE ON public.user_quests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Seed 15 launch badges ─────────────────────────────────────────────────
INSERT INTO public.badges (code, name, description, category, tier, icon, xp_reward, coin_reward, criteria) VALUES
  -- Consistency
  ('streak_7',    'Spark',         'Maintain a 7-day streak',           'consistency', 'bronze', 'Flame',     100, 10, '{"type":"streak","value":7}'),
  ('streak_30',   'Blaze',         'Maintain a 30-day streak',          'consistency', 'silver', 'Flame',     300, 30, '{"type":"streak","value":30}'),
  ('streak_100',  'Diamond',       'Maintain a 100-day streak',         'consistency', 'gold',   'Gem',       1000, 100, '{"type":"streak","value":100}'),
  ('sleep_30',    'Well Rested',   'Log sleep on 30 different nights',  'consistency', 'silver', 'Moon',      200, 20, '{"type":"sleep_logs","value":30}'),
  ('food_30',     'Macro Master',  'Log food on 30 different days',     'consistency', 'silver', 'UtensilsCrossed', 200, 20, '{"type":"food_logs","value":30}'),
  -- Strength
  ('first_pr',    'First PR',      'Hit your first personal record',    'strength',    'bronze', 'Trophy',    150, 15, '{"type":"pr_count","value":1}'),
  ('pr_10',       'Record Breaker','Hit 10 personal records',           'strength',    'silver', 'Trophy',    400, 40, '{"type":"pr_count","value":10}'),
  ('pr_50',       'PR Machine',    'Hit 50 personal records',           'strength',    'gold',   'Trophy',    1500, 150, '{"type":"pr_count","value":50}'),
  ('volume_100k', 'Iron Worker',   'Lift 100,000 kg lifetime',          'strength',    'silver', 'Dumbbell',  500, 50, '{"type":"lifetime_volume_kg","value":100000}'),
  ('volume_1m',   'Iron Tonne',    'Lift 1,000,000 kg lifetime',        'strength',    'gold',   'Dumbbell',  2500, 250, '{"type":"lifetime_volume_kg","value":1000000}'),
  -- Volume
  ('sessions_10', 'Getting Started','Log 10 workout sessions',          'volume',      'bronze', 'Calendar',  100, 10, '{"type":"session_count","value":10}'),
  ('sessions_50', 'Committed',     'Log 50 workout sessions',           'volume',      'silver', 'Calendar',  400, 40, '{"type":"session_count","value":50}'),
  ('sessions_100','Centurion',     'Log 100 workout sessions',          'volume',      'gold',   'Calendar',  1000, 100, '{"type":"session_count","value":100}'),
  ('sessions_500','Iron Devotee',  'Log 500 workout sessions',          'volume',      'gold',   'Calendar',  3000, 300, '{"type":"session_count","value":500}'),
  -- Onboarding
  ('first_workout','First Step',   'Log your very first workout',       'consistency', 'bronze', 'PlayCircle', 50, 5, '{"type":"session_count","value":1}');
