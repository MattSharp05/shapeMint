-- Add missing model_url column expected by Phase 3 order insertion logic
-- Backfills from legacy file_url if present. Idempotent.

begin;

alter table orders add column if not exists model_url text;

-- Backfill once (safe to re-run; will only fill NULLs)
update orders set model_url = file_url
  where model_url is null
    and exists (
      select 1 from information_schema.columns 
      where table_name='orders' and column_name='file_url'
    );

commit;
