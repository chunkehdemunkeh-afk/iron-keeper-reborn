-- daily_biometrics and daily_scores were created with "users own" policies only
-- (auth.uid() = user_id), unlike sibling tables (workout_history, sleep_logs,
-- food_logs, etc.) which already grant coaches read access. Add the matching
-- coach SELECT policy so the coach athlete drill-down page can show recovery data.
-- Scoped to the coach's own roster (coach_athletes, added in the next migration)
-- rather than a blanket "any coach sees everyone" grant.
CREATE POLICY "Coach can view roster daily_biometrics" ON public.daily_biometrics
  FOR SELECT USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = daily_biometrics.user_id
    )
  );

CREATE POLICY "Coach can view roster daily_scores" ON public.daily_scores
  FOR SELECT USING (
    has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      WHERE ca.coach_user_id = auth.uid() AND ca.athlete_user_id = daily_scores.user_id
    )
  );
