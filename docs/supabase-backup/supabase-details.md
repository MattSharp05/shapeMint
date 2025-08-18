## Supabase details — quick reference for AI coding agents

Checklist (requirements covered):
- Big-picture architecture and service boundaries — Done
- Developer workflows & deploy hints (discoverable) — Done
- Project-specific conventions & examples from SQL — Done
- Integration points & external dependencies — Done
- Key files/directories to inspect — Done

Summary
- The project uses Supabase as its primary backend DB + auth. The SQL in `docs/supabase-backup/schema.sql` defines the canonical schema, RLS policies, triggers, functions, enums, and indexes. `docs/supabase-backup/roles.sql` sets session-level role timeouts.

Big picture / architecture
- Auth: Supabase auth schema (`auth.users`) is the canonical identity store. The DB mirrors some user profile fields into `public.users` via a trigger/function pair:
  - Function: `public.handle_new_user()` inserts into `public.users` when an auth user is created.
  - Function: `public.update_auth_user_metadata()` keeps `auth.users.raw_user_meta_data` in sync with display_name.
- RLS-first design: Almost all `public.*` tables have ROW LEVEL SECURITY enabled and scoped policies (see `generated_models`, `hy_generation_jobs`, `orders`, etc.). However, the SQL grants broad table/function privileges to `anon`/`authenticated`/`service_role` and relies on RLS policies to restrict effective access. Key implication: DB privileges are permissive but enforced by policies.
- Worker / async flows: Several tables model background work queues and tasks:
  - `generation_tasks`, `hy_generation_jobs`, `hy_generated_jobs`, `thumbnail_processing_queue` — used by serverless functions and background workers (see `supabase/functions/*` and `frontend/scripts/process-thumbnails.js`).
  - `generated_models` and `hy_generated_models` are the canonical generated-artifact records (obj/stl/glb urls, thumbnail metadata, statuses).
- Payments & manufacturing: `stripe_sessions` stores Stripe session records; `orders` includes `slant_order_id` and `slant_response` for integration with vendor Slant3D (or similar). `manufacturing_quotes` holds vendor quotes.

Key discoverable conventions & patterns (with SQL examples)
- Enum types: `model_status`, `order_status`, `provider_type`, `source_type` — prefer using these enums when manipulating state fields.
- Triggers for bookkeeping:
  - `update_updated_at_column()` used by `update_generation_tasks_updated_at` and `update_orders_updated_at` triggers to auto-update timestamps.
  - New auth user handling: `handle_new_user()` grants a single source-of-truth flow from `auth.users` -> `public.users`.
- Row-level policies (examples):
  - "Users can view their own models" on `generated_models` uses `auth.uid() = user_id`.
  - "Allow read of completed models for all" on `generated_models` allows public SELECT when `status = 'completed'`.
  - "Service role can manage all orders" uses `auth.role() = 'service_role'` — service_role is the elevated server credential used by backend functions.
- Indexes & query patterns: e.g., `idx_thumbnail_queue_status_priority` orders by `(status, priority DESC, created_at)` — worker dequeue queries likely sort by status + priority.

Integration points & external dependencies
- Auth: `auth.users` — look for code that calls Supabase auth (frontend supabase clients: `frontend/supabaseClient.ts`, `frontend/src/lib/supabase.ts`).
- Serverless functions: `supabase/functions/*` (e.g., `process-thumbnail-queue`, `generate-thumbnail`, `generate-3d-model`) contain DB-driven workers. Inspect them when tracing async flows.
- Frontend/service code referencing DB objects:
  - Thumbnail flows: `frontend/src/services/thumbnailService.ts`, `thumbnailGenerator.ts`, `thumbnailRenderer.ts` and `scripts/process-thumbnails.js`.
  - Generation flows: `frontend/src/services/modelService.ts`, and hooks such as `useModelGeneration.ts` and `useAutoThumbnail.ts`.
- Payments & vendors: look for Stripe usage (`stripe_sessions` table) and Slant3D integrations (`slant_order_id`, `manufacturing_quotes`). Search `stripe` and `slant3d` in `frontend/src/services` and `supabase/functions`.

Developer workflows (discoverable hints)
- Supabase project layout: `supabase/config.toml`, `supabase/functions/`, and `migrations/` are present — the project uses the Supabase CLI workflow (local dev / push functions & schema). Reasonable first commands (standard for this layout): `supabase start`, `supabase db push`, `supabase functions deploy` — verify locally before running in prod.
- Timeouts: `roles.sql` sets low statement timeouts for roles (e.g., `anon` 3s, `authenticated` 8s). Long-running queries (bulk jobs) should use the `service_role` or server functions to avoid client timeouts.

Practical notes for AI agents (actionable)
- When querying tables, always account for RLS: some rows may be invisible depending on the JWT/role. For debugging, emulate `service_role` or run queries as a DB superuser to see full data.
- Use the `auth.uid()` and `auth.role()` helpers in policy-aware logic. Many inserts/updates expect `user_id` to match `auth.uid()` (see policies on `generation_tasks`, `hy_generation_jobs`, `generated_models`).
- To discover who/what updates user profiles, search for `handle_new_user` and `update_auth_user_metadata` (DB-level) and `auth` usage in frontend hooks (`useAuth.tsx`).

Where to look next (key files)
- SQL canonical: `docs/supabase-backup/schema.sql`, `docs/supabase-backup/roles.sql`
- Supabase project: `supabase/config.toml`, `supabase/functions/*`, `migrations/`
- Frontend interaction points: `frontend/supabaseClient.ts`, `frontend/src/lib/supabase.ts`, `frontend/src/services/*` (thumbnail, model, stripe)
- Background scripts: `frontend/scripts/process-thumbnails.js`

If any of these areas are unclear or you want more detail (example queries, common worker queries, or a short checklist for safely running destructive commands), tell me which section to expand and I will iterate.
