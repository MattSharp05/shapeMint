-- Add missing type column to generated_models table
ALTER TABLE generated_models ADD COLUMN IF NOT EXISTS type VARCHAR(50);

-- Update existing records to have a default type
UPDATE generated_models SET type = 'text-to-3d' WHERE type IS NULL;
