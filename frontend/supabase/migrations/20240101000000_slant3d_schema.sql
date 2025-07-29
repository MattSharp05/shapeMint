-- Add thumbnail management columns to generated_models table
ALTER TABLE generated_models ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE generated_models ADD COLUMN IF NOT EXISTS thumbnail_angles JSONB DEFAULT '[]';
ALTER TABLE generated_models ADD COLUMN IF NOT EXISTS thumbnail_selected INTEGER DEFAULT 0;
ALTER TABLE generated_models ADD COLUMN IF NOT EXISTS thumbnail_custom BOOLEAN DEFAULT FALSE;
ALTER TABLE generated_models ADD COLUMN IF NOT EXISTS thumbnail_status TEXT DEFAULT 'pending';
ALTER TABLE generated_models ADD COLUMN IF NOT EXISTS thumbnail_error TEXT;

-- Create thumbnail_processing_queue table for background processing
CREATE TABLE IF NOT EXISTS thumbnail_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES generated_models(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT,
  processing_started_at TIMESTAMP WITH TIME ZONE
);

-- Create index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_thumbnail_queue_status_priority ON thumbnail_processing_queue(status, priority DESC, created_at); 