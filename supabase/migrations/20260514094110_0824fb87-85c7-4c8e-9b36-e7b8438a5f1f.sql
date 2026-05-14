
ALTER TABLE public.xp_events
  ADD CONSTRAINT xp_events_xp_cap CHECK (xp >= 0 AND xp <= 1000),
  ADD CONSTRAINT xp_events_coins_cap CHECK (coins >= 0 AND coins <= 500);

CREATE OR REPLACE FUNCTION public.enforce_user_progress_caps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF NEW.xp - OLD.xp > 1000 THEN
      RAISE EXCEPTION 'xp delta too large';
    END IF;
    IF NEW.coins - OLD.coins > 1000 THEN
      RAISE EXCEPTION 'coins delta too large';
    END IF;
    IF NEW.level - OLD.level > 1 THEN
      RAISE EXCEPTION 'level delta too large';
    END IF;
    IF NEW.season_rp - OLD.season_rp > 200 THEN
      RAISE EXCEPTION 'season_rp delta too large';
    END IF;
    IF NEW.freeze_tokens > 3 THEN
      RAISE EXCEPTION 'freeze_tokens cap is 3';
    END IF;
    IF NEW.longest_streak < OLD.longest_streak THEN
      RAISE EXCEPTION 'longest_streak cannot decrease';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_progress_caps ON public.user_progress;
CREATE TRIGGER user_progress_caps
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_progress_caps();

CREATE POLICY "Users can view their own coach notifications"
  ON public.coach_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Coach can view all season results"
  ON public.season_results
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'coach'::app_role));

REVOKE EXECUTE ON FUNCTION public.lookup_user_bodyweight(uuid, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.estimate_strength_burn(uuid, integer, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_1rm_leaderboard(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_max_reps_leaderboard(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_max_weight_leaderboard(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_session_volume_leaderboard(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_top_exercises(text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_challengeable_users(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.settle_duel(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.settle_season(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.lookup_user_bodyweight(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estimate_strength_burn(uuid, integer, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_1rm_leaderboard(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_max_reps_leaderboard(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_max_weight_leaderboard(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_volume_leaderboard(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_exercises(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_challengeable_users(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_duel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_season(uuid) TO authenticated;
