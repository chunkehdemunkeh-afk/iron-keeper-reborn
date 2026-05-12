-- Leaderboard enhancements:
-- 1. Volume: cumulative SUM across all sessions (not best single session) + session_count
-- 2. Max Reps: true max rep count across all sets (not max reps at heaviest weight)
-- 3. 1RM: add is_tested boolean to distinguish actual 1RM tests from Epley estimates
-- 4. All RPCs: add prev_weekly / prev_monthly time filter values for trend comparisons

-- Drop functions whose return type changes (CREATE OR REPLACE can't change return types)
DROP FUNCTION IF EXISTS get_1rm_leaderboard(text, text);
DROP FUNCTION IF EXISTS get_session_volume_leaderboard(text, text);

CREATE OR REPLACE FUNCTION get_top_exercises(
  p_time_filter text DEFAULT 'all',
  p_limit       integer DEFAULT 20
)
RETURNS TABLE (exercise_id text, exercise_name text, log_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ws.exercise_id,
    ws.exercise_name,
    COUNT(*) AS log_count
  FROM workout_sets ws
  JOIN workout_history wh ON wh.id = ws.workout_history_id
  LEFT JOIN profiles p ON p.user_id = wh.user_id
  WHERE ws.set_type IN ('working', '1rm_test')
    AND ws.weight > 0
    AND (p.leaderboard_visible IS NULL OR p.leaderboard_visible = true)
    AND CASE
      WHEN p_time_filter = 'weekly'       THEN ws.created_at >= date_trunc('week',  now())
      WHEN p_time_filter = 'monthly'      THEN ws.created_at >= date_trunc('month', now())
      WHEN p_time_filter = 'prev_weekly'  THEN ws.created_at >= date_trunc('week',  now() - interval '7 days')
                                               AND ws.created_at <  date_trunc('week',  now())
      WHEN p_time_filter = 'prev_monthly' THEN ws.created_at >= date_trunc('month', now() - interval '1 month')
                                               AND ws.created_at <  date_trunc('month', now())
      ELSE true
    END
  GROUP BY ws.exercise_id, ws.exercise_name
  ORDER BY log_count DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION get_1rm_leaderboard(
  p_exercise_id text,
  p_time_filter text DEFAULT 'all'
)
RETURNS TABLE (
  user_id      uuid,
  display_name text,
  avatar_url   text,
  best_1rm     numeric,
  weight       numeric,
  reps         integer,
  is_tested    boolean,
  logged_at    timestamptz,
  rank         bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH ranked_sets AS (
    SELECT
      wh.user_id,
      ws.weight,
      ws.reps,
      ws.created_at,
      (ws.set_type = '1rm_test' AND ws.reps = 1) AS is_tested,
      CASE
        WHEN ws.set_type = '1rm_test' AND ws.reps = 1 THEN ws.weight
        WHEN ws.reps > 1 THEN ws.weight * (1.0 + ws.reps / 30.0)
        ELSE ws.weight
      END AS epley_1rm,
      ROW_NUMBER() OVER (
        PARTITION BY wh.user_id
        ORDER BY
          CASE
            WHEN ws.set_type = '1rm_test' AND ws.reps = 1 THEN ws.weight
            WHEN ws.reps > 1 THEN ws.weight * (1.0 + ws.reps / 30.0)
            ELSE ws.weight
          END DESC
      ) AS rn
    FROM workout_sets ws
    JOIN workout_history wh ON wh.id = ws.workout_history_id
    LEFT JOIN profiles p ON p.user_id = wh.user_id
    WHERE ws.exercise_id = p_exercise_id
      AND ws.set_type IN ('working', '1rm_test')
      AND ws.weight > 0
      AND (p.leaderboard_visible IS NULL OR p.leaderboard_visible = true)
      AND CASE
        WHEN p_time_filter = 'weekly'       THEN ws.created_at >= date_trunc('week',  now())
        WHEN p_time_filter = 'monthly'      THEN ws.created_at >= date_trunc('month', now())
        WHEN p_time_filter = 'prev_weekly'  THEN ws.created_at >= date_trunc('week',  now() - interval '7 days')
                                                 AND ws.created_at <  date_trunc('week',  now())
        WHEN p_time_filter = 'prev_monthly' THEN ws.created_at >= date_trunc('month', now() - interval '1 month')
                                                 AND ws.created_at <  date_trunc('month', now())
        ELSE true
      END
  ),
  best_per_user AS (
    SELECT * FROM ranked_sets WHERE rn = 1
  )
  SELECT
    bpu.user_id,
    COALESCE(p.display_name, 'Anonymous') AS display_name,
    p.avatar_url,
    ROUND(bpu.epley_1rm::numeric, 1)      AS best_1rm,
    bpu.weight::numeric                    AS weight,
    bpu.reps::integer                      AS reps,
    bpu.is_tested,
    bpu.created_at                         AS logged_at,
    RANK() OVER (ORDER BY bpu.epley_1rm DESC) AS rank
  FROM best_per_user bpu
  LEFT JOIN profiles p ON p.user_id = bpu.user_id
  ORDER BY best_1rm DESC;
$$;

CREATE OR REPLACE FUNCTION get_max_weight_leaderboard(
  p_exercise_id text,
  p_time_filter text DEFAULT 'all'
)
RETURNS TABLE (
  user_id      uuid,
  display_name text,
  avatar_url   text,
  max_weight   numeric,
  reps         integer,
  logged_at    timestamptz,
  rank         bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH user_max AS (
    SELECT wh.user_id, MAX(ws.weight) AS max_weight
    FROM workout_sets ws
    JOIN workout_history wh ON wh.id = ws.workout_history_id
    LEFT JOIN profiles p ON p.user_id = wh.user_id
    WHERE ws.exercise_id = p_exercise_id
      AND ws.set_type IN ('working', '1rm_test')
      AND ws.weight > 0
      AND (p.leaderboard_visible IS NULL OR p.leaderboard_visible = true)
      AND CASE
        WHEN p_time_filter = 'weekly'       THEN ws.created_at >= date_trunc('week',  now())
        WHEN p_time_filter = 'monthly'      THEN ws.created_at >= date_trunc('month', now())
        WHEN p_time_filter = 'prev_weekly'  THEN ws.created_at >= date_trunc('week',  now() - interval '7 days')
                                                 AND ws.created_at <  date_trunc('week',  now())
        WHEN p_time_filter = 'prev_monthly' THEN ws.created_at >= date_trunc('month', now() - interval '1 month')
                                                 AND ws.created_at <  date_trunc('month', now())
        ELSE true
      END
    GROUP BY wh.user_id
  ),
  best_set AS (
    SELECT DISTINCT ON (wh.user_id)
      wh.user_id, ws.weight, ws.reps, ws.created_at
    FROM workout_sets ws
    JOIN workout_history wh ON wh.id = ws.workout_history_id
    JOIN user_max um ON um.user_id = wh.user_id AND um.max_weight = ws.weight
    WHERE ws.exercise_id = p_exercise_id
    ORDER BY wh.user_id, ws.reps DESC, ws.created_at DESC
  )
  SELECT
    bs.user_id,
    COALESCE(p.display_name, 'Anonymous') AS display_name,
    p.avatar_url,
    bs.weight::numeric                     AS max_weight,
    bs.reps::integer                       AS reps,
    bs.created_at                          AS logged_at,
    RANK() OVER (ORDER BY bs.weight DESC)  AS rank
  FROM best_set bs
  LEFT JOIN profiles p ON p.user_id = bs.user_id
  WHERE (p.leaderboard_visible IS NULL OR p.leaderboard_visible = true)
  ORDER BY max_weight DESC;
$$;

-- Rewritten: finds true max reps across all sets (not max reps at heaviest weight).
-- heaviest_weight now means "weight used when max reps were achieved" (for context).
-- Ranked by max_reps DESC, then weight DESC as tiebreaker.
CREATE OR REPLACE FUNCTION get_max_reps_leaderboard(
  p_exercise_id text,
  p_time_filter text DEFAULT 'all'
)
RETURNS TABLE (
  user_id         uuid,
  display_name    text,
  avatar_url      text,
  heaviest_weight numeric,
  max_reps        integer,
  logged_at       timestamptz,
  rank            bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH ranked_sets AS (
    SELECT
      wh.user_id,
      ws.reps,
      ws.weight,
      ws.created_at,
      ROW_NUMBER() OVER (
        PARTITION BY wh.user_id
        ORDER BY ws.reps DESC, ws.weight DESC, ws.created_at DESC
      ) AS rn
    FROM workout_sets ws
    JOIN workout_history wh ON wh.id = ws.workout_history_id
    LEFT JOIN profiles p ON p.user_id = wh.user_id
    WHERE ws.exercise_id = p_exercise_id
      AND ws.set_type IN ('working', '1rm_test')
      AND ws.weight > 0
      AND ws.reps > 0
      AND (p.leaderboard_visible IS NULL OR p.leaderboard_visible = true)
      AND CASE
        WHEN p_time_filter = 'weekly'       THEN ws.created_at >= date_trunc('week',  now())
        WHEN p_time_filter = 'monthly'      THEN ws.created_at >= date_trunc('month', now())
        WHEN p_time_filter = 'prev_weekly'  THEN ws.created_at >= date_trunc('week',  now() - interval '7 days')
                                                 AND ws.created_at <  date_trunc('week',  now())
        WHEN p_time_filter = 'prev_monthly' THEN ws.created_at >= date_trunc('month', now() - interval '1 month')
                                                 AND ws.created_at <  date_trunc('month', now())
        ELSE true
      END
  ),
  best_per_user AS (
    SELECT * FROM ranked_sets WHERE rn = 1
  )
  SELECT
    bpu.user_id,
    COALESCE(p.display_name, 'Anonymous')              AS display_name,
    p.avatar_url,
    bpu.weight::numeric                                 AS heaviest_weight,
    bpu.reps::integer                                   AS max_reps,
    bpu.created_at                                      AS logged_at,
    RANK() OVER (ORDER BY bpu.reps DESC, bpu.weight DESC) AS rank
  FROM best_per_user bpu
  LEFT JOIN profiles p ON p.user_id = bpu.user_id
  ORDER BY max_reps DESC, heaviest_weight DESC;
$$;

-- Rewritten: cumulative SUM across all matching sessions (not best single session).
-- Returns session_count instead of workout_name / session_date.
CREATE OR REPLACE FUNCTION get_session_volume_leaderboard(
  p_session_type text DEFAULT 'All',
  p_time_filter  text DEFAULT 'all'
)
RETURNS TABLE (
  user_id       uuid,
  display_name  text,
  avatar_url    text,
  total_volume  numeric,
  session_count integer,
  rank          bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH user_volumes AS (
    SELECT
      wh.user_id,
      SUM(ws.weight * ws.reps)   AS total_volume,
      COUNT(DISTINCT wh.id)      AS session_count
    FROM workout_history wh
    JOIN workout_sets ws ON ws.workout_history_id = wh.id
    LEFT JOIN profiles p ON p.user_id = wh.user_id
    WHERE ws.set_type IN ('working', '1rm_test')
      AND ws.weight > 0
      AND ws.reps > 0
      AND (p.leaderboard_visible IS NULL OR p.leaderboard_visible = true)
      AND (
        p_session_type = 'All'
        OR (p_session_type = 'Push'      AND wh.workout_name ILIKE '%push%')
        OR (p_session_type = 'Pull'      AND wh.workout_name ILIKE '%pull%')
        OR (p_session_type = 'Legs'      AND wh.workout_name ILIKE '%leg%')
        OR (p_session_type = 'Upper'     AND wh.workout_name ILIKE '%upper%')
        OR (p_session_type = 'Lower'     AND wh.workout_name ILIKE '%lower%')
        OR (p_session_type = 'Full Body' AND (wh.workout_name ILIKE '%full%' OR wh.workout_name ILIKE '%full body%'))
      )
      AND CASE
        WHEN p_time_filter = 'weekly'       THEN wh.date >= date_trunc('week',  now())::date
        WHEN p_time_filter = 'monthly'      THEN wh.date >= date_trunc('month', now())::date
        WHEN p_time_filter = 'prev_weekly'  THEN wh.date >= date_trunc('week',  now() - interval '7 days')::date
                                                 AND wh.date <  date_trunc('week',  now())::date
        WHEN p_time_filter = 'prev_monthly' THEN wh.date >= date_trunc('month', now() - interval '1 month')::date
                                                 AND wh.date <  date_trunc('month', now())::date
        ELSE true
      END
    GROUP BY wh.user_id
  )
  SELECT
    uv.user_id,
    COALESCE(p.display_name, 'Anonymous')       AS display_name,
    p.avatar_url,
    ROUND(uv.total_volume::numeric)              AS total_volume,
    uv.session_count::integer                    AS session_count,
    RANK() OVER (ORDER BY uv.total_volume DESC)  AS rank
  FROM user_volumes uv
  LEFT JOIN profiles p ON p.user_id = uv.user_id
  ORDER BY total_volume DESC;
$$;
