CREATE TABLE public.exercise_progression (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL DEFAULT '',
  target_weight NUMERIC NOT NULL DEFAULT 0,
  target_reps_low INTEGER NOT NULL DEFAULT 0,
  target_reps_high INTEGER NOT NULL DEFAULT 0,
  pending_suggestion JSONB,
  last_evaluated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_id)
);

ALTER TABLE public.exercise_progression ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own progression"
ON public.exercise_progression FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own progression"
ON public.exercise_progression FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own progression"
ON public.exercise_progression FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own progression"
ON public.exercise_progression FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Coach views all progression"
ON public.exercise_progression FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'coach'::app_role));

CREATE TRIGGER update_exercise_progression_updated_at
BEFORE UPDATE ON public.exercise_progression
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_exercise_progression_user ON public.exercise_progression(user_id);
CREATE INDEX idx_exercise_progression_pending ON public.exercise_progression(user_id) WHERE pending_suggestion IS NOT NULL;