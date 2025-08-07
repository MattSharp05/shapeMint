-- Create hy_generated_jobs table
CREATE TABLE IF NOT EXISTS public.hy_generated_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  prompt TEXT,
  image_filename TEXT,
  workflow_type TEXT DEFAULT 'hy3d',
  workflow_nodes INTEGER,
  comfyui_server TEXT,
  output_files JSONB,
  primary_model_url TEXT,
  primary_preview_url TEXT,
  execution_time TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hy_generated_models table (if you plan to use it)
CREATE TABLE IF NOT EXISTS public.hy_generated_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.hy_generated_jobs(id) ON DELETE CASCADE,
  model_url TEXT NOT NULL,
  model_type TEXT DEFAULT 'glb',
  file_size INTEGER,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hy_generated_jobs_user_id ON public.hy_generated_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_hy_generated_jobs_status ON public.hy_generated_jobs(status);
CREATE INDEX IF NOT EXISTS idx_hy_generated_jobs_prompt_id ON public.hy_generated_jobs(prompt_id);
CREATE INDEX IF NOT EXISTS idx_hy_generated_jobs_created_at ON public.hy_generated_jobs(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.hy_generated_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hy_generated_models ENABLE ROW LEVEL SECURITY;

-- Create policies for hy_generated_jobs
CREATE POLICY "Users can view their own jobs" ON public.hy_generated_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON public.hy_generated_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON public.hy_generated_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for hy_generated_models
CREATE POLICY "Users can view their own models" ON public.hy_generated_models
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.hy_generated_jobs 
      WHERE id = hy_generated_models.job_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert models for their jobs" ON public.hy_generated_models
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hy_generated_jobs 
      WHERE id = hy_generated_models.job_id 
      AND user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.hy_generated_jobs TO authenticated;
GRANT ALL ON public.hy_generated_models TO authenticated;
GRANT ALL ON public.hy_generated_jobs TO service_role;
GRANT ALL ON public.hy_generated_models TO service_role; 