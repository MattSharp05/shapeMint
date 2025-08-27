-- Add progress column to generated_models table
ALTER TABLE public.generated_models 
ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0;
