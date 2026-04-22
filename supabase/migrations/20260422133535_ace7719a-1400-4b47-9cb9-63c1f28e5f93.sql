-- Progress photos table
CREATE TABLE public.progress_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  storage_path TEXT NOT NULL,
  pose TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_progress_photos_user_date ON public.progress_photos(user_id, date DESC);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress photos"
ON public.progress_photos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress photos"
ON public.progress_photos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress photos"
ON public.progress_photos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress photos"
ON public.progress_photos FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view all progress photos"
ON public.progress_photos FOR SELECT
USING (public.has_role(auth.uid(), 'coach'));

-- Weekly reviews table
CREATE TABLE public.weekly_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  went_well TEXT,
  to_improve TEXT,
  focus_next TEXT,
  photo_id UUID REFERENCES public.progress_photos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX idx_weekly_reviews_user_week ON public.weekly_reviews(user_id, week_start DESC);

ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly reviews"
ON public.weekly_reviews FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly reviews"
ON public.weekly_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly reviews"
ON public.weekly_reviews FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly reviews"
ON public.weekly_reviews FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view all weekly reviews"
ON public.weekly_reviews FOR SELECT
USING (public.has_role(auth.uid(), 'coach'));

CREATE TRIGGER update_weekly_reviews_updated_at
BEFORE UPDATE ON public.weekly_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for progress photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can view their own progress photo files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own progress photo files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own progress photo files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own progress photo files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Coaches can view all progress photo files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'progress-photos'
  AND public.has_role(auth.uid(), 'coach')
);
