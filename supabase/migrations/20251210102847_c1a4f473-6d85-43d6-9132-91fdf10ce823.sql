-- Add preset_name column to track which preset was used for thumbnail generation
ALTER TABLE public.generated_thumbnails 
ADD COLUMN preset_name TEXT DEFAULT NULL;