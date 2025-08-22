-- Defensive migration: drop NOT NULL on any leftover legacy-era columns not needed by new order flow.
-- Run once to stop iterative insert failures.

begin;

DO $$
DECLARE r record; BEGIN
  FOR r IN
    SELECT attname FROM pg_attribute
    WHERE attrelid='orders'::regclass
      AND attnotnull
      AND attname IN (
        'filename',
        'file_name',
        'model_name',
        'model_title',
        'print_type',
        'size',
        'dimensions',
        'uuid',
        'material',
        'material_name',
        'material_id_legacy',
        'color',
        'finish',
        'finish_type'
      )
  LOOP
    EXECUTE format('ALTER TABLE orders ALTER COLUMN %I DROP NOT NULL', r.attname);
  END LOOP;
END $$;

commit;
