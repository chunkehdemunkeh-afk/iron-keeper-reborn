CREATE TABLE public.sleep_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  hours numeric(3,1) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  quality smallint NOT NULL CHECK (quality BETWEEN 1 AND 5),
  source text NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX idx_sleep_logs_user_date ON public.sleep_logs (user_id, date DESC);

ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sleep logs"
  ON public.sleep_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sleep logs"
  ON public.sleep_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep logs"
  ON public.sleep_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sleep logs"
  ON public.sleep_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Coach can view all sleep logs"
  ON public.sleep_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'coach'::app_role));

CREATE TRIGGER update_sleep_logs_updated_at
  BEFORE UPDATE ON public.sleep_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();