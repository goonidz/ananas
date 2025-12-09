-- Create pending_predictions table to track async image generations
CREATE TABLE public.pending_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  prediction_id TEXT NOT NULL UNIQUE,
  prediction_type TEXT NOT NULL, -- 'thumbnail', 'scene_image'
  scene_index INTEGER, -- for scene images
  thumbnail_index INTEGER, -- for thumbnails (0, 1, 2)
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  result_url TEXT, -- final Supabase Storage URL
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.pending_predictions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own predictions"
ON public.pending_predictions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own predictions"
ON public.pending_predictions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own predictions"
ON public.pending_predictions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions"
ON public.pending_predictions FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_pending_predictions_job_id ON public.pending_predictions(job_id);
CREATE INDEX idx_pending_predictions_prediction_id ON public.pending_predictions(prediction_id);
CREATE INDEX idx_pending_predictions_status ON public.pending_predictions(status);