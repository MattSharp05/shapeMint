-- Consolidated legacy constraint relax migration (unique version 202508260001)
-- Avoids repeated version collisions from date-only prefixes.
-- Drops NOT NULL from legacy columns no longer populated by new order flow.

begin;

DO $$
DECLARE r record; 
BEGIN
  -- List of legacy columns we allow to be nullable going forward
  FOR r IN 
    SELECT attname FROM pg_attribute 
    WHERE attrelid='orders'::regclass 
      AND attnotnull 
      AND attname IN (
        'customer_name',
        'customer_email',
        'file_url',
        'color',
        'finish',
        'material',
        'material_name'
      )
  LOOP
    EXECUTE format('ALTER TABLE orders ALTER COLUMN %I DROP NOT NULL', r.attname);
  END LOOP;
END $$;

commit;
