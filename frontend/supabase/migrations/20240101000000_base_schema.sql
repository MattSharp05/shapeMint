-- Create the base generated_models table
CREATE TABLE IF NOT EXISTS generated_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt TEXT,
  style TEXT DEFAULT 'base',
  obj_url TEXT,
  stl_url TEXT,
  glb_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS idx_generated_models_user_id ON generated_models(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_models_status ON generated_models(status);
CREATE INDEX IF NOT EXISTS idx_generated_models_created_at ON generated_models(created_at DESC); 