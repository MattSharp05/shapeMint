-- Add meshy_task_id column to generated_models table
ALTER TABLE public.generated_models 
ADD COLUMN IF NOT EXISTS meshy_task_id text;
