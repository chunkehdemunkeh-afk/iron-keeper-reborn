
-- Phase 3: Duels, Push notifications, Weekly quests

-- Duels: 1v1 head-to-head challenges
CREATE TABLE public.duels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID NOT NULL,
  opponent_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('volume', 'sessions', 'one_rm_gain', 'streak', 'xp')),
  exercise_id TEXT,
  target NUMERIC,
  duration_days INTEGER NOT NULL DEFAULT 7,
  rp_stake INTEGER NOT NULL DEFAULT 25,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','declined','cancelled')),
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  winner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_duels_challenger ON public.duels(challenger_id, status);
CREATE INDEX idx_duels_opponent ON public.duels(opponent_id, status);
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their duels" ON public.duels FOR SELECT TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
CREATE POLICY "Challenger creates duels" ON public.duels FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "Participants update duels" ON public.duels FOR UPDATE TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
CREATE POLICY "Challenger deletes pending duels" ON public.duels FOR DELETE TO authenticated
  USING (auth.uid() = challenger_id AND status = 'pending');

CREATE TRIGGER duels_updated_at BEFORE UPDATE ON public.duels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-user progress snapshots in a duel
CREATE TABLE public.duel_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  duel_id UUID NOT NULL REFERENCES public.duels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  baseline NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(duel_id, user_id)
);
ALTER TABLE public.duel_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View progress in own duels" ON public.duel_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.duels d WHERE d.id = duel_id
    AND (d.challenger_id = auth.uid() OR d.opponent_id = auth.uid())));
CREATE POLICY "Users upsert own progress" ON public.duel_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.duel_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subs" ON public.push_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subs" ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own subs" ON public.push_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Seed weekly quests (rotating). Pre-load a pool — runtime selects active set.
INSERT INTO public.quests (code, title, description, type, criteria, xp_reward, coin_reward, active_from, active_to) VALUES
  ('w_3_workouts', 'Workout Trio', 'Log 3 workouts this week', 'weekly',
    '{"metric":"workouts","target":3}'::jsonb, 200, 25, now(), now() + interval '100 years'),
  ('w_5_workouts', 'Iron Five', 'Log 5 workouts this week', 'weekly',
    '{"metric":"workouts","target":5}'::jsonb, 350, 40, now(), now() + interval '100 years'),
  ('w_sleep_5', 'Rested Athlete', 'Log sleep on 5 nights', 'weekly',
    '{"metric":"sleep_logs","target":5}'::jsonb, 250, 30, now(), now() + interval '100 years'),
  ('w_protein_5', 'Protein Push', 'Hit protein goal 5 days', 'weekly',
    '{"metric":"protein_goal","target":5}'::jsonb, 250, 30, now(), now() + interval '100 years'),
  ('w_volume_15k', '15K Volume', 'Lift 15,000 kg total', 'weekly',
    '{"metric":"volume_kg","target":15000}'::jsonb, 300, 35, now(), now() + interval '100 years'),
  ('w_checkin_5', 'Mindful Mornings', 'Morning check-in 5 days', 'weekly',
    '{"metric":"biometric_checkin","target":5}'::jsonb, 200, 25, now(), now() + interval '100 years'),
  ('w_pr_1', 'New Heights', 'Hit 1 personal record', 'weekly',
    '{"metric":"personal_record","target":1}'::jsonb, 250, 30, now(), now() + interval '100 years'),
  ('w_water_5', 'Hydration Hero', 'Hit water goal 5 days', 'weekly',
    '{"metric":"water_goal","target":5}'::jsonb, 200, 25, now(), now() + interval '100 years');

-- Daily quests pool (3 rotate per day)
INSERT INTO public.quests (code, title, description, type, criteria, xp_reward, coin_reward, active_from, active_to) VALUES
  ('d_workout', 'Get Moving', 'Log 1 workout today', 'daily',
    '{"metric":"workouts","target":1}'::jsonb, 50, 5, now(), now() + interval '100 years'),
  ('d_sleep', 'Sleep Tracker', 'Log your sleep', 'daily',
    '{"metric":"sleep_logs","target":1}'::jsonb, 30, 3, now(), now() + interval '100 years'),
  ('d_protein', 'Protein Hit', 'Hit your protein goal', 'daily',
    '{"metric":"protein_goal","target":1}'::jsonb, 40, 4, now(), now() + interval '100 years'),
  ('d_water', 'Stay Hydrated', 'Hit your water goal', 'daily',
    '{"metric":"water_goal","target":1}'::jsonb, 30, 3, now(), now() + interval '100 years'),
  ('d_food', 'Track Food', 'Log at least 1 meal', 'daily',
    '{"metric":"food_log","target":1}'::jsonb, 30, 3, now(), now() + interval '100 years'),
  ('d_checkin', 'Morning Check-in', 'Log your morning biometrics', 'daily',
    '{"metric":"biometric_checkin","target":1}'::jsonb, 40, 4, now(), now() + interval '100 years'),
  ('d_bodyweight', 'Step on the Scale', 'Log your bodyweight', 'daily',
    '{"metric":"bodyweight","target":1}'::jsonb, 30, 3, now(), now() + interval '100 years');

-- RPC: leaderboard-visible challengeable users
CREATE OR REPLACE FUNCTION public.list_challengeable_users(p_limit integer DEFAULT 50)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, season_tier text, season_rp integer, level integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    COALESCE(p.display_name, 'Anonymous') AS display_name,
    p.avatar_url,
    COALESCE(up.season_tier, 'bronze') AS season_tier,
    COALESCE(up.season_rp, 0) AS season_rp,
    COALESCE(up.level, 1) AS level
  FROM public.profiles p
  LEFT JOIN public.user_progress up ON up.user_id = p.user_id
  WHERE p.leaderboard_visible = true
    AND p.user_id <> auth.uid()
  ORDER BY COALESCE(up.season_rp, 0) DESC
  LIMIT p_limit;
$$;

-- RPC: settle a duel by transferring RP zero-sum
CREATE OR REPLACE FUNCTION public.settle_duel(p_duel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d RECORD;
  c_val NUMERIC;
  o_val NUMERIC;
  winner UUID;
  loser UUID;
  stake INTEGER;
BEGIN
  SELECT * INTO d FROM public.duels WHERE id = p_duel_id;
  IF d IS NULL THEN RAISE EXCEPTION 'Duel not found'; END IF;
  IF auth.uid() <> d.challenger_id AND auth.uid() <> d.opponent_id THEN
    RAISE EXCEPTION 'Forbidden'; END IF;
  IF d.status <> 'active' THEN RETURN; END IF;
  IF d.ends_at IS NULL OR d.ends_at > now() THEN RETURN; END IF;

  SELECT value INTO c_val FROM public.duel_progress WHERE duel_id = d.id AND user_id = d.challenger_id;
  SELECT value INTO o_val FROM public.duel_progress WHERE duel_id = d.id AND user_id = d.opponent_id;
  c_val := COALESCE(c_val, 0); o_val := COALESCE(o_val, 0);
  stake := d.rp_stake;

  IF c_val > o_val THEN winner := d.challenger_id; loser := d.opponent_id;
  ELSIF o_val > c_val THEN winner := d.opponent_id; loser := d.challenger_id;
  ELSE
    UPDATE public.duels SET status = 'completed', winner_id = NULL WHERE id = d.id;
    RETURN;
  END IF;

  UPDATE public.user_progress SET season_rp = GREATEST(0, COALESCE(season_rp,0) + stake)
    WHERE user_id = winner;
  UPDATE public.user_progress SET season_rp = GREATEST(0, COALESCE(season_rp,0) - stake)
    WHERE user_id = loser;
  UPDATE public.duels SET status = 'completed', winner_id = winner WHERE id = d.id;
END;
$$;
