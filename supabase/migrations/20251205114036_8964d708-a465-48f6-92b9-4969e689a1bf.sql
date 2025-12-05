-- Add image_model column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS image_model TEXT DEFAULT 'seedream-4.5';

-- Add image_model column to presets table
ALTER TABLE public.presets 
ADD COLUMN IF NOT EXISTS image_model TEXT DEFAULT 'seedream-4.5';