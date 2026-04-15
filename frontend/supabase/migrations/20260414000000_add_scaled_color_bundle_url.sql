-- Add scaled_color_bundle_url column for color-print OBJ+MTL+textures+GLB zip.
-- Produced by the scale pipeline (Modal Blender) and sent to CraftCloud for
-- color print orders so downstream manufacturers receive the full material set.
alter table public.generated_models
  add column if not exists scaled_color_bundle_url text;

comment on column public.generated_models.scaled_color_bundle_url is
  'Public URL of the color print bundle (zip: OBJ + MTL + textures/ + scaled GLB). Built by scale_and_hollow.py.';
