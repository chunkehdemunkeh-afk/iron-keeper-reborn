
-- Seasons table
CREATE TABLE public.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read seasons" ON public.seasons
  FOR SELECT TO authenticated USING (true);

-- Season results
CREATE TABLE public.season_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  final_rp INTEGER NOT NULL DEFAULT 0,
  final_tier TEXT NOT NULL DEFAULT 'bronze',
  final_rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, user_id)
);
ALTER TABLE public.season_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own season results" ON public.season_results
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_season_results_season ON public.season_results(season_id);
CREATE INDEX idx_season_results_user ON public.season_results(user_id);

-- Seed Season 1 (8 weeks from now)
INSERT INTO public.seasons (number, starts_at, ends_at, status)
VALUES (1, now(), now() + interval '8 weeks', 'active')
ON CONFLICT (number) DO NOTHING;

-- 35 additional badges
INSERT INTO public.badges (code, name, description, category, tier, icon, xp_reward, coin_reward, criteria, hidden) VALUES
  -- Consistency (extras)
  ('legend_streak', 'Legend', '365-day streak', 'consistency', 'gold', 'Crown', 5000, 500, '{"type":"streak","days":365}'::jsonb, false),
  ('sleep_30', 'Well Rested', 'Log sleep 30 nights', 'consistency', 'silver', 'Moon', 200, 30, '{"type":"sleep_count","count":30}'::jsonb, false),
  ('food_30', 'Tracked', 'Log food 30 days', 'consistency', 'silver', 'Apple', 200, 30, '{"type":"food_days","count":30}'::jsonb, false),
  ('checkin_30', 'Tuned In', '30 morning check-ins', 'consistency', 'silver', 'HeartPulse', 200, 30, '{"type":"checkin_count","count":30}'::jsonb, false),

  -- Strength (extras)
  ('pr_10', 'PR Hunter', 'Hit 10 PRs', 'strength', 'silver', 'Award', 300, 50, '{"type":"pr_count","count":10}'::jsonb, false),
  ('pr_50', 'PR Beast', 'Hit 50 PRs', 'strength', 'gold', 'Award', 1000, 150, '{"type":"pr_count","count":50}'::jsonb, false),
  ('bench_bw', 'Bench Bodyweight', 'Bench press your bodyweight', 'strength', 'silver', 'Dumbbell', 300, 50, '{"type":"lift_ratio","lift":"bench","ratio":1.0}'::jsonb, false),
  ('squat_1_5bw', 'Squat 1.5×BW', 'Squat 1.5× your bodyweight', 'strength', 'gold', 'Dumbbell', 500, 100, '{"type":"lift_ratio","lift":"squat","ratio":1.5}'::jsonb, false),
  ('deadlift_2bw', 'Deadlift 2×BW', 'Deadlift 2× your bodyweight', 'strength', 'gold', 'Dumbbell', 800, 150, '{"type":"lift_ratio","lift":"deadlift","ratio":2.0}'::jsonb, false),

  -- Volume (extras)
  ('sessions_50', 'Veteran', '50 sessions logged', 'volume', 'silver', 'Trophy', 300, 50, '{"type":"session_count","count":50}'::jsonb, false),
  ('sessions_100', 'Centurion', '100 sessions logged', 'volume', 'gold', 'Trophy', 750, 100, '{"type":"session_count","count":100}'::jsonb, false),
  ('sessions_500', 'Iron Devotee', '500 sessions logged', 'volume', 'gold', 'Crown', 3000, 400, '{"type":"session_count","count":500}'::jsonb, false),
  ('volume_iron_megaton', 'Iron Megatonne', '1,000,000 kg lifted', 'volume', 'gold', 'Mountain', 5000, 500, '{"type":"lifetime_volume_kg","kg":1000000}'::jsonb, false),

  -- Recovery
  ('recovery_8h_7', 'Sleep Champion', '7 nights ≥8h sleep', 'recovery', 'bronze', 'Moon', 150, 20, '{"type":"sleep_8h_streak","count":7}'::jsonb, false),
  ('hrv_30', 'Recovery Sage', 'Log HRV for 30 days', 'recovery', 'silver', 'Activity', 250, 35, '{"type":"hrv_count","count":30}'::jsonb, false),
  ('perfect_recovery_week', 'In The Green', '7 days recovery score ≥75', 'recovery', 'gold', 'Heart', 400, 60, '{"type":"recovery_streak","score":75,"days":7}'::jsonb, false),

  -- Nutrition
  ('protein_7', 'Protein Pro', 'Hit protein goal 7 days', 'nutrition', 'bronze', 'Beef', 100, 15, '{"type":"protein_streak","days":7}'::jsonb, false),
  ('protein_30', 'Protein Machine', 'Hit protein goal 30 days', 'nutrition', 'silver', 'Beef', 350, 50, '{"type":"protein_count","count":30}'::jsonb, false),
  ('protein_100', 'Protein King', 'Hit protein goal 100 days', 'nutrition', 'gold', 'Beef', 1500, 200, '{"type":"protein_count","count":100}'::jsonb, false),
  ('full_log_week', 'Macro Master', 'Log every meal for 7 days', 'nutrition', 'silver', 'Apple', 300, 40, '{"type":"full_log_streak","days":7}'::jsonb, false),
  ('water_30', 'Hydration Hero', 'Hit water goal 30 days', 'nutrition', 'silver', 'Droplet', 250, 35, '{"type":"water_count","count":30}'::jsonb, false),

  -- Exploration
  ('exercises_25', 'Curious', 'Try 25 different exercises', 'exploration', 'bronze', 'Compass', 100, 15, '{"type":"unique_exercises","count":25}'::jsonb, false),
  ('exercises_100', 'Explorer', 'Try 100 different exercises', 'exploration', 'silver', 'Compass', 400, 60, '{"type":"unique_exercises","count":100}'::jsonb, false),
  ('all_splits', 'Programme Hopper', 'Train under every built-in split', 'exploration', 'gold', 'BookOpen', 500, 75, '{"type":"all_splits"}'::jsonb, false),
  ('cardio_10', 'Cardio Convert', 'Log 10 cardio sessions', 'exploration', 'bronze', 'Activity', 100, 15, '{"type":"cardio_count","count":10}'::jsonb, false),
  ('photo_10', 'Picture Perfect', 'Log 10 progress photos', 'exploration', 'bronze', 'Camera', 150, 25, '{"type":"photo_count","count":10}'::jsonb, false),
  ('reviews_10', 'Reflective', '10 weekly reviews completed', 'exploration', 'silver', 'BookOpen', 300, 40, '{"type":"review_count","count":10}'::jsonb, false),

  -- Social
  ('first_duel', 'Step Up', 'Enter your first duel', 'social', 'bronze', 'Swords', 50, 10, '{"type":"duel_count","count":1}'::jsonb, false),
  ('duel_winner_10', 'Duelist', 'Win 10 duels', 'social', 'silver', 'Swords', 400, 60, '{"type":"duel_wins","count":10}'::jsonb, false),
  ('top_10_pct', 'Elite', 'Finish a season in the top 10%', 'social', 'gold', 'Trophy', 750, 100, '{"type":"season_top_pct","pct":10}'::jsonb, false),
  ('challenge_5', 'Team Player', 'Contribute to 5 community challenges', 'social', 'silver', 'Users', 300, 40, '{"type":"challenge_count","count":5}'::jsonb, false),
  ('champion_tier', 'Champion', 'Reach Champion tier', 'social', 'gold', 'Crown', 2000, 300, '{"type":"reach_tier","tier":"champion"}'::jsonb, false),

  -- Hidden
  ('early_bird', 'Early Bird', 'Workout before 5am', 'hidden', 'silver', 'Sunrise', 200, 30, '{"type":"workout_before_hour","hour":5}'::jsonb, true),
  ('night_owl', 'Night Owl', 'Workout after 11pm', 'hidden', 'silver', 'Moon', 200, 30, '{"type":"workout_after_hour","hour":23}'::jsonb, true),
  ('comeback', 'Comeback Kid', 'Return after 14-day break', 'hidden', 'silver', 'RotateCcw', 250, 40, '{"type":"comeback","days":14}'::jsonb, true)
ON CONFLICT (code) DO NOTHING;
