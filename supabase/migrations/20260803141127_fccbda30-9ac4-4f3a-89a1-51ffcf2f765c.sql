-- 1. Attach a session to a coach message
ALTER TABLE public.coach_messages
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.workout_history(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS coach_messages_thread_idx
  ON public.coach_messages (coach_user_id, athlete_user_id, created_at DESC);

-- 2. Coach session review / acknowledgement
CREATE TABLE IF NOT EXISTS public.coach_session_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL,
  athlete_user_id uuid NOT NULL,
  workout_history_id uuid NOT NULL REFERENCES public.workout_history(id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_user_id, workout_history_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_session_reviews TO authenticated;
GRANT ALL ON public.coach_session_reviews TO service_role;

ALTER TABLE public.coach_session_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can view own session reviews"
  ON public.coach_session_reviews FOR SELECT TO authenticated
  USING (auth.uid() = coach_user_id);

CREATE POLICY "Coach can create session reviews for roster"
  ON public.coach_session_reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = coach_user_id
    AND EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      WHERE ca.coach_user_id = auth.uid()
        AND ca.athlete_user_id = coach_session_reviews.athlete_user_id
    )
  );

CREATE POLICY "Coach can update own session reviews"
  ON public.coach_session_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = coach_user_id)
  WITH CHECK (auth.uid() = coach_user_id);

CREATE POLICY "Coach can delete own session reviews"
  ON public.coach_session_reviews FOR DELETE TO authenticated
  USING (auth.uid() = coach_user_id);

CREATE TRIGGER update_coach_session_reviews_updated_at
  BEFORE UPDATE ON public.coach_session_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS coach_session_reviews_coach_idx
  ON public.coach_session_reviews (coach_user_id, acknowledged_at DESC);

-- 3. Coaches can read legacy sets where workout_sets.user_id is NULL, via parent session
CREATE POLICY "Coach can view roster sets via history"
  ON public.workout_sets FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coach'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.workout_history wh
      JOIN public.coach_athletes ca ON ca.athlete_user_id = wh.user_id
      WHERE wh.id = workout_sets.workout_history_id
        AND ca.coach_user_id = auth.uid()
    )
  );

-- 4. Realtime for messages
ALTER TABLE public.coach_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_messages;