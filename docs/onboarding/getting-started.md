# Getting Started

> Last updated: 2025-01-20 | Source of truth: `CLAUDE.md`, `frontend/package.json`

This guide walks you through setting up ShapeMint locally and understanding the codebase layout. By the end, you should have both dev servers running and know where to find things.

---

## Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| Node.js | 18+ | Frontend SPA, proxy server, build tooling |
| npm | 9+ | Package management (ships with Node.js 18+) |
| Git | Any recent | Version control |
| Supabase CLI | Latest | Edge Function development and deployment |
| Modal CLI | Latest | Blender service deployment (`pip install modal`) |
| Python | 3.10+ | Blender service local testing |

Install the Supabase CLI via npm (already in devDependencies):

```bash
npx supabase --version
```

Install the Modal CLI:

```bash
pip install modal
modal token new   # authenticates your local environment
```

---

## Local Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd shapeMint
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

> **Note:** The root `package.json` exists for Supabase CLI tooling. Most development work happens inside `frontend/`.

### 3. Configure environment variables

Copy the environment file structure into `frontend/.env`:

```bash
# frontend/.env
# ─── Client-side (bundled into the SPA) ───
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_MESHY_API_KEY=<your-meshy-api-key>

# ─── Server-side (proxy-server.js only, never in client bundle) ───
MESHY_API_KEY=<your-meshy-api-key>
SLANT3D_API_KEY=<your-slant3d-api-key>
FAL_API_KEY=<your-fal-ai-api-key>
RESEND_API_KEY=<your-resend-api-key>
```

The proxy server loads these via `dotenv` from `frontend/.env`. See the [Environment Variables](#environment-variables) section below for details on where to obtain each value.

### 4. Start the proxy server

From the `frontend/` directory:

```bash
node proxy-server.js
```

This starts the Express CORS proxy on **port 3001**. It handles `/api/meshy/*` and `/api/fal/*` routes in local development.

### 5. Start the Vite dev server

In a separate terminal, from the `frontend/` directory:

```bash
npm run dev
```

This starts the Vite dev server on **port 5175** (fixed via `strictPort: true`). Vite proxies all `/api` requests to the Express server on port 3001.

> **Startup order matters:** Start the proxy server first, then the Vite dev server. The SPA depends on the proxy for Meshy and fal.ai API calls.

---

## Environment Variables

### Client-side (`VITE_` prefix — bundled into the browser)

| Variable | Purpose | Where to obtain |
|----------|---------|-----------------|
| `VITE_SUPABASE_URL` | Supabase project REST API URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase Dashboard → Settings → API |
| `VITE_MESHY_API_KEY` | Meshy AI API key (used by proxy) | [meshy.ai](https://meshy.ai) account dashboard |

### Server-side (proxy server and Edge Functions — never exposed to client)

| Variable | Purpose | Where to obtain |
|----------|---------|-----------------|
| `MESHY_API_KEY` | Meshy AI API key for proxy server | [meshy.ai](https://meshy.ai) account dashboard |
| `SLANT3D_API_KEY` | Slant3D vendor API key | Slant3D partner portal |
| `FAL_API_KEY` | fal.ai image transformation key | [fal.ai](https://fal.ai) dashboard |
| `RESEND_API_KEY` | Resend email service key | [resend.com](https://resend.com) dashboard |
| `STRIPE_SECRET_KEY` | Stripe payment processing (Edge Functions) | Stripe Dashboard → Developers → API keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS for background jobs (Edge Functions, Modal) | Supabase Dashboard → Settings → API |

### Blender service (Modal)

| Variable | Purpose | Where to obtain |
|----------|---------|-----------------|
| `MODAL_TOKEN_ID` | Modal authentication | Auto-configured by `modal token new` |
| `MODAL_TOKEN_SECRET` | Modal authentication | Auto-configured by `modal token new` |

---

## Repository Layout

```
shapeMint/
├── frontend/                  React 18 + TypeScript + Vite + Tailwind SPA and Express proxy server
│   ├── src/                   Application source code (pages, components, hooks, services)
│   ├── proxy-server.js        Express CORS proxy for Meshy/fal.ai in local dev (port 3001)
│   ├── api/                   Vercel serverless functions (production equivalent of proxy-server.js)
│   ├── supabase/functions/    ~50 Deno-based Supabase Edge Functions (Meshy, Stripe, vendors, thumbnails)
│   └── supabase/migrations/   Database migrations (not the source of truth — see docs/supabase-backup/)
├── blender-service/           Python mesh processing service deployed to Modal (repair, hollow, scale)
├── supabase/                  Root-level Supabase directory with additional migrations
├── docs/                      Project documentation, API references, and schema backups
├── scripts/                   Utility scripts (e.g., fix-processing-models.ts)
├── dist/                      Build output (generated by `npm run build`)
└── CLAUDE.md                  Canonical project conventions and architecture reference
```

---

## Key Conventions

### RLS-first database access

Nearly every `public.*` table has Row Level Security enabled. Table-level grants to `anon`/`authenticated`/`service_role` are permissive — the RLS policies enforce access. When a query returns no rows unexpectedly, suspect RLS before assuming data is missing.

### Proxy URL for 3D assets

Always load GLB models through the proxy path:

```
/api/meshy/glb?url=${encodeURIComponent(modelUrl)}
```

Never pass raw Meshy/CloudFront URLs directly to Three.js loaders — they will fail with CORS errors.

### Navigation state between pages

Pages pass model data between routes via React Router's `state`:

```tsx
navigate('/order', { state: { modelData, modelUrl, stlUrl } });
```

Order and checkout pages auto-populate from this state, with fallback fetches if state is missing.

### Emoji logging

Existing code uses emoji prefixes for scannable console output:
- 🔄 — in-progress
- ✅ — success
- ❌ — error

Match this convention in files that already use it. Don't introduce emoji to files that don't.

### `VITE_` prefix for client-side env vars

Only variables prefixed with `VITE_` are bundled into the client. Server-only secrets (`STRIPE_SECRET_KEY`, `FAL_API_KEY`, etc.) must never use the `VITE_` prefix.

---

## Where to Look

| Task | Key Files |
|------|-----------|
| Model generation | `hooks/useModelGeneration.ts`, `services/modelService.ts`, `services/meshy.ts` |
| Thumbnails | `hooks/useAutoThumbnail.ts`, `services/thumbnail*.ts`, `scripts/process-thumbnails.js`, Edge Functions `generate-thumbnail` / `process-thumbnail-queue` |
| Payments | `services/stripe.ts`, Edge Functions `create-checkout-session` / `stripe-webhook` |
| Vendor fulfillment | `services/{slant3d,shapeways,treatstock,craftcloud}*.ts` + matching `vendor-*` Edge Functions |
| Auth | `hooks/useAuth.tsx`, `lib/secureAuth.ts`, `lib/tokenStorage.ts` |
| 3D viewer | `components/3D/ModelViewer.tsx` |
| Mesh processing | `blender-service/{repair,hollow,scale_and_hollow}.py`, deployed via `modal_app.py` |

All frontend paths are relative to `frontend/src/` unless otherwise noted.

---

## Known Gotchas

1. **README.md is partially stale** — It claims `npm start` launches both servers and references a `public.profiles` table. Neither is accurate. Trust `CLAUDE.md` over `README.md`.

2. **No test runner configured** — `downloadService.test.ts` exists but there is no test framework wired up. Don't assume tests pass without adding a runner (e.g., Vitest).

3. **`npm start` does not launch the proxy** — The `"start"` script in `frontend/package.json` is just `npm run dev` (Vite only). You must run `node proxy-server.js` separately.

4. **Two `supabase/` directories** — `frontend/supabase/` contains Edge Functions and most migrations. The root `supabase/migrations/` has a few newer migrations. Neither is the source of truth for schema — use `docs/supabase-backup/schema.sql` instead.

5. **Root `package.json` is not the main one** — The root `package.json` is for Supabase CLI tooling. All frontend development uses `frontend/package.json`.

6. **`.env` exists at both root and `frontend/`** — The proxy server loads from `frontend/.env` via dotenv. The root `.env` may contain overlapping variables but `frontend/.env` is what the dev servers use.

---

## Verification

After completing setup, confirm the following:

| Check | Expected Outcome |
|-------|-----------------|
| Proxy server running | Terminal shows `✅ Proxy server running on http://localhost:3001` |
| Vite dev server running | Terminal shows local URL `http://localhost:5175` and browser opens automatically |
| Health check | `curl http://localhost:3001/api/health` returns `{"status":"ok","timestamp":"..."}` |
| App loads without env errors | Browser console has no errors about missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` |
| API proxy works | Network tab shows `/api/meshy/*` requests proxied successfully (no CORS errors) |

If the app loads and you can see the landing page without console errors related to missing environment variables, your local setup is complete.
