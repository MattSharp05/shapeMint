# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Stack**: React 18 + TS + Vite + Tailwind SPA · Express proxy · Vercel serverless · Deno Supabase Edge Functions · Python + Blender on Modal.

## Repository layout

ShapeMint is a monorepo with four distinct surfaces. Understand which one you're touching before making changes — they have different runtimes, deploy pipelines, and languages:

- `frontend/` — React 18 + TypeScript + Vite + Tailwind SPA. Main app code lives here.
- `frontend/proxy-server.js` — Node/Express CORS proxy that fronts the Meshy API and fal.ai image-transform in **local dev**. The SPA calls `/api/meshy/*` and `/api/fal/*`, which Vite forwards to this proxy on port 3001.
- `frontend/api/` — **Vercel serverless functions** (`@vercel/node`) that serve the same `/api/meshy/*` and `/api/fal/*` paths in **production on Vercel**. Keep these in sync with `proxy-server.js` when changing either — both handle the same routes for different environments.
- `frontend/supabase/functions/` — Deno-based Supabase Edge Functions (~50 of them: Meshy orchestration, Stripe, Slant3D/Shapeways/Treatstock/CraftCloud/Sculpteo vendor integrations, thumbnail pipeline, etc.).
- `blender-service/` — Python service deployed to Modal (`modal_app.py`) providing mesh repair / hollow / scale via headless Blender 4.0 + trimesh. Endpoints live at `matthew-77976--*.modal.run`.

There are **two `supabase/` directories**: `frontend/supabase/` (functions + most migrations) and root-level `supabase/migrations/` (a few newer migrations). Neither is the source of truth for schema — see `docs/supabase-backup/schema.sql`.

Canonical docs live in `docs/` — prefer these over grepping the codebase for API/schema questions:
- `docs/supabase-backup/schema.sql` — **canonical** DB schema, RLS, triggers, enums. Trust this over the `migrations/` folder (migrations can be out of date).
- `docs/API_information/` — vendor API references (Slant3D, Shapeways, Treatstock, CraftCloud, Xometry).

## Common commands

All JS commands run from `frontend/` unless noted:

```bash
# Dev — run BOTH servers (the SPA depends on the proxy for Meshy/fal.ai)
node proxy-server.js              # port 3001 (Meshy + fal.ai proxy)
npm run dev                       # port 5175 (Vite), fixed via strictPort

# Lint / build
npm run lint                      # ESLint (flat config in eslint.config.js)
npm run build                     # vite build (no separate tsc step)
npm run preview

# Thumbnail backfill worker
npm run process-thumbnails        # runs scripts/process-thumbnails.js

# Supabase (from frontend/supabase/)
supabase functions serve          # local edge runtime
supabase functions deploy <name>  # deploy a specific function
supabase db push                  # push migrations (but see note below)

# Modal Blender service (from blender-service/)
modal deploy modal_app.py
```

Notes:
- `frontend/package.json`'s `"start"` is just `vite` — it does NOT also start the proxy. Older docs claim otherwise. You must launch the proxy separately.
- Only scripts defined in `frontend/package.json`: `dev`, `build`, `lint`, `preview`, `start` (= `npm run dev`, proxy NOT included), `process-thumbnails`. There is no `npm run proxy` — run `node proxy-server.js` directly.
- `README.md` and `.github/copilot-instructions.md` both claim `npm start` launches both servers and reference a `public.profiles` table — **both are stale**. Trust this file over those.
- There is no test runner wired up. `downloadService.test.ts` exists but has no runner — don't claim tests pass without adding one.
- There is also a root `package.json` (different from `frontend/package.json`, pinned to React 19 / Vite 7) that appears vestigial — all real work happens in `frontend/`.

## Architecture: the model-generation pipeline

The central flow — user input → physical print — cuts across every surface in the repo. Tracing it is the fastest way to understand the code:

1. **Input** (`pages/Generate.tsx`, `pages/CreatePage.tsx`): text prompt or image. For images, `services/falImageService.ts` + `/api/fal/transform-image` cleans it up via fal.ai nano-banana first.
2. **Meshy generation**: frontend calls `/api/meshy/text-to-3d` or `/api/meshy/image-to-3d`. Three backends can serve that path: `proxy-server.js` (local dev), `frontend/api/meshy/*.ts` (Vercel prod), or the `generate-3d-model` Edge Function. All are wired.
3. **Polling**: `useModelGeneration` hook polls status. Meshy task IDs are persisted on `generated_models.meshy_task_id`.
4. **Storage**: finished GLB/OBJ/STL are downloaded from Meshy (CloudFront signed URLs) and mirrored into Supabase storage bucket `3d-models`. URLs are stored on the `generated_models` row.
5. **Display**: `components/3D/ModelViewer.tsx` (React Three Fiber) loads models through `/api/meshy/glb?url=...` — ALWAYS via the proxy to avoid CORS. Never pass raw Meshy/CloudFront URLs to three.js loaders directly.
6. **Post-processing** (`blender-service/`): scale + hollow + repair runs in Modal. The Edge Functions `scale-model`, `hollow-model`, `repair-and-export-stl` call Modal endpoints; Modal writes back to `generated_models` via the Supabase REST API using a service-role key passed in the request body.
7. **Checkout**: `services/stripe.ts` → `create-checkout-session` Edge Function → Stripe redirect. `stripe-webhook` Edge Function creates the `orders` row on payment success.
8. **Fulfillment**: vendor Edge Functions (`vendor-slant3d-*`, `vendor-shapeways-*`, `vendor-treatstock-*`, `vendor-craftcloud-*`) submit orders to print-on-demand partners. Results populate `orders.slant_order_id` / `slant_response`, `manufacturing_quotes`, etc.

The GLB/STL dichotomy matters: GLB is for viewer display, STL is what gets printed. Several Edge Functions exist solely to convert between formats (`obj-to-stl`, `save-stl-to-bucket`, `repair-and-export-stl`).

## Supabase conventions

- **RLS-first**: nearly every `public.*` table has RLS on. Table-level grants to `anon`/`authenticated`/`service_role` are permissive; the RLS policies are what enforce access. When a query returns no rows, suspect RLS before assuming the data is missing.
- **`service_role` for background work**: Edge Functions, Modal callbacks, and the thumbnail worker authenticate with the service-role key to bypass RLS. Low statement timeouts apply to `anon` (3s) and `authenticated` (8s) — long jobs must use service_role (see `docs/supabase-backup/roles.sql`).
- **Users table is `public.users`** — NOT `public.profiles`. There's a legacy `create_profiles_table` migration; ignore it and trust `docs/supabase-backup/schema.sql`.
- **Enums**: `model_status`, `order_status`, `provider_type`, `source_type`. Use the enum values, not ad-hoc strings.
- **Auth mirroring**: `handle_new_user()` and `update_auth_user_metadata()` keep `public.users` in sync with `auth.users`.
- **Anonymous-first flow**: the app supports anonymous Supabase sessions that merge into a real account at checkout (`merge-anon-user` Edge Function). Don't assume `auth.uid()` corresponds to a real signup when tracing order flows.

## Project-specific conventions

- **DB schema changes**: the user prefers raw SQL they can paste into the Supabase SQL editor. Don't auto-generate files in `migrations/` unless asked. The migrations folder is not the source of truth.
- **Proxy URL for 3D assets**: always load GLBs via `/api/meshy/glb?url=${encodeURIComponent(...)}`. Direct Meshy/CloudFront URLs will fail with CORS.
- **Admin dashboard**: `/admin` route is password-gated (client-side). RLS policies in `20260407000000_admin_read_policies.sql` back it server-side.
- **Navigation state**: pages pass model data between routes via React Router's `state` (e.g. `navigate('/order', { state: { modelData, modelUrl, stlUrl } })`). Order / checkout pages auto-populate from this, with fallback fetches.
- **Logging style**: existing code uses emoji prefixes (🔄 in-progress, ✅ success, ❌ error) in console logs for scannability. Match the convention in code you add to the same files, but don't introduce emoji to files that don't already use them.
- **Env vars**: `VITE_*` vars are baked into the client bundle. Server-only secrets (`STRIPE_SECRET_KEY`, `FAL_API_KEY`, Modal/Supabase service keys) live in the proxy server env or Edge Function env — never in `VITE_*`.

## Where to look for things

- Model generation: `hooks/useModelGeneration.ts`, `services/modelService.ts`, `services/meshy.ts`
- Thumbnails: `hooks/useAutoThumbnail.ts`, `services/thumbnail*.ts`, `scripts/process-thumbnails.js`, Edge Fns `generate-thumbnail` / `process-thumbnail-queue`
- Payments: `services/stripe.ts`, Edge Fns `create-checkout-session` / `stripe-webhook`
- Vendor fulfillment: `services/{slant3d,shapeways,treatstock,craftcloud}*.ts` + matching `vendor-*` Edge Functions
- Auth: `hooks/useAuth.tsx`, `lib/secureAuth.ts`, `lib/tokenStorage.ts`
- 3D viewer: `components/3D/ModelViewer.tsx`
- Mesh post-processing: `blender-service/{repair,hollow,scale_and_hollow}.py`, deployed via `modal_app.py`
