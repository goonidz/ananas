-- Create lora_presets table for saving LoRA configurations
CREATE TABLE public.lora_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  lora_url TEXT NOT NULL,
  lora_steps INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lora_presets ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own lora presets" 
ON public.lora_presets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lora presets" 
ON public.lora_presets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lora presets" 
ON public.lora_presets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lora presets" 
ON public.lora_presets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lora_presets_updated_at
BEFORE UPDATE ON public.lora_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();