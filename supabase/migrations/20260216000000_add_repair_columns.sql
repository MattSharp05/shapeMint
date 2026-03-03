-- Add columns for the Blender mesh repair pipeline
ALTER TABLE public.generated_models
  ADD COLUMN IF NOT EXISTS repair_report jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS print_ready boolean DEFAULT FALSE;

COMMENT ON COLUMN public.generated_models.repair_report IS
  'JSON report from the Blender mesh repair pipeline. Contains: is_manifold, is_watertight, volume_cm3, bounding_box_mm, min_wall_thickness_mm, wall_thickness_passed, repair_steps_applied, used_voxel_remesh, applied_solidify, warnings, print_ready, processing_time_seconds.';

COMMENT ON COLUMN public.generated_models.print_ready IS
  'Whether the model passed all SLS printability checks (manifold, watertight, positive volume, wall thickness >= 0.8mm).';
