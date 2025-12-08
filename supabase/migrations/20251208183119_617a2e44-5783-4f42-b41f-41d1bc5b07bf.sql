-- Add custom system prompt column to projects table
ALTER TABLE public.projects 
ADD COLUMN prompt_system_message TEXT;