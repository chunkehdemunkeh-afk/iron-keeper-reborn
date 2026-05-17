INSERT INTO public.community_contributions (challenge_id, user_id, value, updated_at)
SELECT '63d08711-7725-4a2a-8576-7b1e37be843f', wh.user_id, COALESCE(SUM(ws.weight * ws.reps), 0), now()
FROM workout_history wh
JOIN workout_sets ws ON ws.workout_history_id = wh.id
WHERE wh.date >= '2026-05-13'
  AND ws.set_type IN ('working','1rm_test')
  AND ws.weight > 0 AND ws.reps > 0
GROUP BY wh.user_id
ON CONFLICT DO NOTHING;