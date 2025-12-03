-- Add custom_prompt column to thumbnail_presets table
ALTER TABLE public.thumbnail_presets
ADD COLUMN custom_prompt text;