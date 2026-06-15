CREATE TABLE public.deload_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','dismissed','completed','expired')),
  signals JSONB NOT NULL,
  plan JSONB,
  week_start DATE,
  week_end DATE,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deload_recommendations TO authenticated;
GRANT ALL ON public.deload_recommendations TO service_role;

ALTER TABLE public.deload_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own deload recs"
  ON public.deload_recommendations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_deload_recommendations_updated_at
  BEFORE UPDATE ON public.deload_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_deload_recs_user_status ON public.deload_recommendations(user_id, status, created_at DESC);