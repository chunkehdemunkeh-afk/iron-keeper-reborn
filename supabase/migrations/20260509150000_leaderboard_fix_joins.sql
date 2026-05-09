-- Fix leaderboard RPC functions to use LEFT JOIN on profiles so users
-- without a profiles row still appear (early users / missed signup trigger).
-- leaderboard_visible defaults to true for anyone without a profile row.

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
  LEFT JOIN profiles p ON p.user_id = ws.user_id
  WHERE ws.set_type IN ('working', '1rm_test')
    AND ws.weight > 0
    AND (p.leaderboard_visible IS NULL OR p.leaderboard_visible = true)
    AND CASE
      WHEN p_time_filter = 'weekly'  THEN ws.created_at >= date_trunc('week',  now())
      WHEN p_time_filter = 'monthly' THEN ws.created_at >= date_trunc('month', now())
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
  logged_at    timestamptz,
  rank         bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH ranked_sets AS (
    SELECT
      ws.user_id,
      ws.weight,
      ws.reps,
      ws.created_at,
      CASE
        WHEN ws.set_type = '1rm_test' AND ws.reps = 1 THEN ws.weight
        WHEN ws.reps > 1 THEN ws.weight * (1.0 + ws.reps / 30.0)
        ELSE ws.weight
      END AS epley_1rm,
      ROW_NUMBER() OVER (
        PARTITION BY ws.user_id
        ORDER BY
          CASE
            WHEN ws.set_type = '1rm_test' AND ws.reps = 1 THEN ws.weight
            WHEN ws.reps > 1 THEN ws.weight * (1.0 + ws.reps / 30.0)
            ELSE ws.weight
          END DESC
      ) AS rn
    FROM workout_sets ws
    LEFT JOIN profiles p ON p.user_id = ws.user_id
    WHERE ws.exercise_id = p_exercise_id
      AND ws.set_type IN ('working', '1rm_test')
      AND ws.weight > 0
      AND (p.leaderboard_visible IS NULL OR p.leaderboard_visible = true)
      AND CASE
        WHEN p_time_filter = 'weekly'  THEN ws.created_at >= date_trunc('week',  now())
        WHEN p_time_filter = 'monthly' THEN ws.created_at >= date_trunc('month', now())
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
    SELECT ws.user_id, MAX(ws.weight) AS max_weight
    FROM workout_sets ws
    LEFT JOIN profiles p ON p.user_id = ws.user_id
    WHERE ws.exercise_id = p_exercise_id
      AND ws.set_type IN ('working', '1rm_test')
      AND ws.weight > 0
      AND (p.leaderboard_visible IS NULL OR p.leaderboard_visible = true)
      AND CASE
        WHEN p_time_filter = 'weekly'  THEN ws.created_at >= date_trunc('week',  now())
        WHEN p_time_filter = 'monthly' THEN ws.created_at >= date_trunc('month', now())
        ELSE true
      END
    GROUP BY ws.user_id
  ),
  best_set AS (
    SELECT DISTINCT ON (ws.user_id)
      ws.user_id, ws.weight, ws.reps, ws.created_at
    FROM workout_sets ws
    JOIN user_max um ON um.user_id = ws.user_id AND um.max_weight = ws.weight
    WHERE ws.exercise_id = p_exercise_id
    ORDER BY ws.user_id, ws.reps DESC, ws.created_at DESC
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
  WITH user_heaviest AS (
    SELECT ws.user_id, MAX(ws.weight) AS heaviest_weight
    FROM workout_sets ws
    LEFT JOIN profiles p ON p.user_id = ws.user_id
    WHERE ws.exercise_id = p_exercise_id
      AND ws.set_type IN ('working', '1rm_test')
      AND ws.weight > 0
      AND (p.leaderboard_visible IS NULL OR p.leaderboard_visible = true)
      AND CASE
        WHEN p_time_filter = 'weekly'  THEN ws.created_at >= date_trunc('week',  now())
        WHEN p_time_filter = 'monthly' THEN ws.created_at >= date_trunc('month', now())
        ELSE true
      END
    GROUP BY ws.user_id
  ),
  max_reps_at_heaviest AS (
    SELECT DISTINCT ON (ws.user_id)
      ws.user_id, ws.weight, ws.reps, ws.created_at
    FROM workout_sets ws
    JOIN user_heaviest uh ON uh.user_id = ws.user_id AND uh.heaviest_weight = ws.weight
    WHERE ws.exercise_id = p_exercise_id
    ORDER BY ws.user_id, ws.reps DESC, ws.created_at DESC
  )
  SELECT
    mr.user_id,
    COALESCE(p.display_name, 'Anonymous')              AS display_name,
    p.avatar_url,
    mr.weight::numeric                                  AS heaviest_weight,
    mr.reps::integer                                    AS max_reps,
    mr.created_at                                       AS logged_at,
    RANK() OVER (ORDER BY mr.reps DESC, mr.weight DESC) AS rank
  FROM max_reps_at_heaviest mr
  LEFT JOIN profiles p ON p.user_id = mr.user_id
  WHERE (p.leaderboard_visible IS NULL OR p.leaderboard_visible = true)
  ORDER BY max_reps DESC, heaviest_weight DESC;
$$;

CREATE OR REPLACE FUNCTION get_session_volume_leaderboard(
  p_session_type text DEFAULT 'All',
  p_time_filter  text DEFAULT 'all'
)
RETURNS TABLE (
  user_id      uuid,
  display_name text,
  avatar_url   text,
  total_volume numeric,
  workout_name text,
  session_date date,
  rank         bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH session_vols AS (
    SELECT
      wh.user_id,
      wh.id          AS session_id,
      wh.workout_name,
      wh.date::date  AS session_date,
      SUM(ws.weight * ws.reps) AS total_volume
    FROM workout_history wh
    JOIN workout_sets ws ON ws.workout_history_id = wh.id
    LEFT JOIN profiles p ON p.user_id = wh.user_id
    WHERE ws.set_type IN ('working', '1rm_test')
      AND ws.weight > 0
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
        WHEN p_time_filter = 'weekly'  THEN wh.date >= date_trunc('week',  now())
        WHEN p_time_filter = 'monthly' THEN wh.date >= date_trunc('month', now())
        ELSE true
      END
    GROUP BY wh.user_id, wh.id, wh.workout_name, wh.date
  ),
  best_per_user AS (
    SELECT DISTINCT ON (user_id)
      *
    FROM session_vols
    ORDER BY user_id, total_volume DESC
  )
  SELECT
    bpu.user_id,
    COALESCE(p.display_name, 'Anonymous')       AS display_name,
    p.avatar_url,
    ROUND(bpu.total_volume::numeric)             AS total_volume,
    bpu.workout_name,
    bpu.session_date,
    RANK() OVER (ORDER BY bpu.total_volume DESC) AS rank
  FROM best_per_user bpu
  LEFT JOIN profiles p ON p.user_id = bpu.user_id
  ORDER BY total_volume DESC;
$$;
