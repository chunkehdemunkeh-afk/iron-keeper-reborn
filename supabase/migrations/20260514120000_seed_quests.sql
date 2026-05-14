-- Seed quest catalog. Idempotent: skip if already seeded.
-- active_to IS NULL = never expires. Rotate logic is client-side (date hash).
-- Metrics must match the switch cases in src/lib/data/quest-queries.ts:computeMetric().

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.quests LIMIT 1) THEN
    INSERT INTO public.quests (code, title, description, type, criteria, xp_reward, coin_reward)
    VALUES
      -- Daily quests (7 in pool → 3 shown per day via rotation)
      ('daily_workout',    'Iron Session',      'Complete a workout today.',                   'daily',  '{"metric":"workouts","target":1}',             40,  5),
      ('daily_food_log',   'Track Your Fuel',   'Log at least 3 meals today.',                'daily',  '{"metric":"food_log","target":3}',             20,  3),
      ('daily_water',      'Stay Hydrated',     'Hit your daily water goal.',                 'daily',  '{"metric":"water_goal","target":1}',           15,  2),
      ('daily_sleep',      'Rest & Recover',    'Log your sleep for last night.',             'daily',  '{"metric":"sleep_logs","target":1}',           20,  3),
      ('daily_checkin',    'Morning Check-In',  'Complete your morning biometric check-in.',  'daily',  '{"metric":"biometric_checkin","target":1}',    25,  3),
      ('daily_bodyweight', 'Weigh In',          'Log your bodyweight today.',                 'daily',  '{"metric":"bodyweight","target":1}',           15,  2),
      ('daily_pr',         'Hit a New PR',      'Set a new personal record in your session.', 'daily',  '{"metric":"personal_record","target":1}',      50,  8),

      -- Weekly quests (5 in pool → all 5 shown each week)
      ('weekly_workouts',  'Weekly Warrior',    'Complete 3 workouts this week.',             'weekly', '{"metric":"workouts","target":3}',             75, 10),
      ('weekly_sleep',     'Sleep Discipline',  'Log your sleep 5 days this week.',           'weekly', '{"metric":"sleep_logs","target":5}',           50,  7),
      ('weekly_nutrition', 'Full Fuel Week',    'Log food on 5 days this week.',              'weekly', '{"metric":"food_log","target":5}',             60,  8),
      ('weekly_checkins',  'Check-In Streak',   'Complete 4 morning check-ins this week.',    'weekly', '{"metric":"biometric_checkin","target":4}',    60,  8),
      ('weekly_volume',    'Volume King',       'Lift 5,000 kg of total volume this week.',   'weekly', '{"metric":"volume_kg","target":5000}',         80, 12);
  END IF;
END $$;
