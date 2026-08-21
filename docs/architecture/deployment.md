# Deployment and Infrastructure

> Last updated: 2025-07-14 | Source of truth: `CLAUDE.md`, `frontend/proxy-server.js`, `frontend/api/`, `frontend/vercel.json`

## Production Deployment Topology

ShapeMint runs across three hosting platforms in production:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION TOPOLOGY                              │
│                                                                          │
│  ┌──────────────────┐     HTTPS/REST      ┌──────────────────────────┐  │
│  │  Vercel           │◄──────────────────►│  Supabase (Hosted)        │  │
│  │  • React SPA      │                     │  • Postgres (RLS)         │  │
│  │  • Serverless API │                     │  • Auth (JWT)             │  │
│  │    /api/meshy/*   │                     │  • Edge Functions (~50)   │  │
│  │    /api/fal/*     │                     │  • Storage (3d-models)    │  │
│  └────────┬─────────┘                     └────────────┬─────────────┘  │
│           │                                             │                │
│           │  HTTPS (browser)                            │ HTTPS/REST     │
│           ▼                                             ▼                │
│  ┌──────────────────┐                     ┌──────────────────────────┐  │
│  │  User Browser     │                     │  Modal                    │  │
│  │  (React SPA)      │                     │  • Blender 4.0 headless   │  │
│  └──────────────────┘                     │  • repair-mesh endpoint   │  │
│                                            │  • hollow-model endpoint  │  │
│                                            │  • process-model endpoint │  │
│                                            └──────────────────────────┘  │
│                                                          │               │
│                                                          │ HTTPS/REST    │
│                                                          ▼               │
│                                            ┌──────────────────────────┐  │
│                                            │  External Vendor APIs     │  │
│                                            │  • Meshy AI              │  │
│                                            │  • Slant3D, Shapeways    │  │
│                                            │  • Treatstock, CraftCloud │  │
│                                            │  • Stripe                │  │
│                                            └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Communication Flows

| Source | Destination | Protocol | Direction | Data |
|--------|-------------|----------|-----------|------|
| Browser (SPA) | Vercel Serverless | HTTPS | Request/Response | Meshy API calls, fal.ai image transforms |
| Browser (SPA) | Supabase | HTTPS | Request/Response | Auth tokens, DB queries (via PostgREST), Storage uploads |
| Vercel Serverless | Meshy AI | HTTPS | Request/Response | 3D generation requests, task polling, GLB file proxy |
| Vercel Serverless | fal.ai | HTTPS | Request/Response | Image transformation requests |
| Supabase Edge Functions | Stripe | HTTPS | Request/Response | Checkout sessions, webhook events |
| Supabase Edge Functions | Vendor APIs | HTTPS | Request/Response | Quotes, order creation, status tracking |
| Supabase Edge Functions | Modal | HTTPS | Request/Response | Mesh repair/hollow/scale requests |
| Modal | Supabase REST API | HTTPS | Request/Response | Model record updates (stl_url, repair_report) |
| Modal | Supabase Storage | HTTPS | PUT | Processed STL/OBJ/GLB file uploads |

### Platform Responsibilities

| Platform | Services Hosted | Artifact Type |
|----------|----------------|---------------|
| **Vercel** | React SPA (static build), Serverless API routes (`/api/meshy/*`, `/api/fal/*`) | Vite production bundle + Node.js serverless functions |
| **Supabase** | Postgres database, Auth (JWT), ~50 Deno Edge Functions, Storage buckets | Hosted managed service + deployed Deno functions |
| **Modal** | Blender 4.0 mesh processing (repair, hollow, scale+hollow) | Python container with Blender binary, deployed via `modal deploy` |

---

## Environment Variables

### Frontend (Vite Client — `frontend/.env`)

These are baked into the client bundle at build time via the `VITE_` prefix.

| Variable | Purpose | Where to Obtain |
|----------|---------|-----------------|
| `VITE_SUPABASE_URL` | Supabase project REST API base URL | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key (safe for client) | Supabase Dashboard → Settings → API → anon/public key |
| `VITE_MESHY_API_KEY` | Meshy AI API key (used by proxy-server in dev) | Meshy AI Dashboard → API Keys |

### Frontend (Server-side — proxy-server.js and Vercel)

These are server-only secrets, never exposed to the client bundle.

| Variable | Purpose | Where to Obtain |
|----------|---------|-----------------|
| `MESHY_API_KEY` | Meshy AI API key for Vercel serverless functions | Meshy AI Dashboard → API Keys |
| `FAL_API_KEY` | fal.ai API key for image transformation | fal.ai Dashboard → API Keys |
| `RESEND_API_KEY` | Resend email service key (order/model notifications) | Resend Dashboard → API Keys |

### Supabase Edge Functions

These are configured via `supabase secrets set` and available to all Edge Functions at runtime.

| Variable | Purpose | Where to Obtain |
|----------|---------|-----------------|
| `SUPABASE_URL` | Supabase project URL (auto-injected by Supabase runtime) | Auto-provided |
| `SUPABASE_ANON_KEY` | Supabase anon key (auto-injected) | Auto-provided |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for RLS bypass in background operations | Supabase Dashboard → Settings → API → service_role key |
| `STRIPE_SECRET_KEY` | Stripe secret key for checkout sessions and webhooks | Stripe Dashboard → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret for event verification | Stripe Dashboard → Developers → Webhooks → Signing secret |
| `SLANT3D_API_KEY` | Slant3D vendor API key | Slant3D partner portal |
| `SLANT3D_PLATFORM_ID` | Slant3D platform identifier | Slant3D partner portal |
| `SLANT3D_WEBHOOK_SECRET` | Slant3D webhook verification secret | Slant3D partner portal |
| `SHAPEWAYS_CLIENT_ID` | Shapeways OAuth2 client ID | Shapeways Developer Portal |
| `SHAPEWAYS_CLIENT_SECRET` | Shapeways OAuth2 client secret | Shapeways Developer Portal |
| `TREATSTOCK_API_KEY` | Treatstock vendor API key | Treatstock partner account |
| `MESHY_API_KEY` | Meshy AI key for Edge Functions (webhook, status checks) | Meshy AI Dashboard → API Keys |
| `MESHY_WEBHOOK_SECRET` | Meshy webhook verification secret | Meshy AI Dashboard → Webhooks |
| `FAL_API_KEY` | fal.ai key for image transformation Edge Function | fal.ai Dashboard → API Keys |
| `RESEND_API_KEY` | Resend email key for notification Edge Functions | Resend Dashboard → API Keys |
| `MODAL_REPAIR_ENDPOINT_URL` | Modal repair-mesh endpoint URL | Modal Dashboard → Deployments (e.g., `https://matthew-77976--repair-mesh.modal.run`) |
| `MODAL_PROCESS_ENDPOINT_URL` | Modal process-model endpoint URL | Modal Dashboard → Deployments (e.g., `https://matthew-77976--process-model.modal.run`) |
| `SCULPTEO_API_KEY` | Sculpteo API key (optional, feature-flagged) | Sculpteo developer account |
| `SCULPTEO_API_BASE` | Sculpteo API base URL (defaults to `https://www.sculpteo.com`) | Sculpteo documentation |
| `SCULPTEO_ENABLED` | Feature flag to enable/disable Sculpteo integration (`true`/`false`) | Set manually |

### Blender Service (Modal)

| Variable | Purpose | Where to Obtain |
|----------|---------|-----------------|
| `MODAL_TOKEN_ID` | Modal authentication token ID | `modal token new` CLI command |
| `MODAL_TOKEN_SECRET` | Modal authentication token secret | `modal token new` CLI command |

---

## Local Development Setup

### Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| Node.js | 18+ | Frontend dev server and proxy |
| npm | 9+ | Package management |
| Git | Any recent | Version control |
| Supabase CLI | Latest | Edge Function development and deployment |
| Modal CLI | Latest | Blender service deployment |
| Python | 3.10+ | Blender service local testing (optional) |

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shapeMint
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Configure environment variables**

   Copy the root `.env` file structure (or create `frontend/.env`):
   ```bash
   # frontend/.env
   VITE_SUPABASE_URL=<your-supabase-project-url>
   VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   VITE_MESHY_API_KEY=<your-meshy-api-key>
   MESHY_API_KEY=<your-meshy-api-key>
   FAL_API_KEY=<your-fal-api-key>
   SLANT3D_API_KEY=<your-slant3d-api-key>
   RESEND_API_KEY=<your-resend-api-key>
   ```

4. **Start the Express proxy server** (Terminal 1)
   ```bash
   cd frontend
   node proxy-server.js
   ```
   The proxy starts on **port 3001**. It handles `/api/meshy/*` and `/api/fal/*` routes.

5. **Start the Vite dev server** (Terminal 2)
   ```bash
   cd frontend
   npm run dev
   ```
   The Vite dev server starts on **port 5175** (strictPort enforced).

### Startup Order

The proxy server **must** be running before the Vite dev server is useful — Vite proxies all `/api` requests to `localhost:3001`. Without the proxy, Meshy API calls and fal.ai image transforms will fail.

### Verification

- Vite dev server accessible at: `http://localhost:5175`
- Proxy health check responds at: `http://localhost:3001/api/health`
- Application loads without console errors related to missing environment variables

### Important Notes

- `npm start` is just an alias for `npm run dev` (Vite only) — it does **not** start the proxy. You must launch `node proxy-server.js` separately.
- There is no `npm run proxy` script. Run the proxy directly with `node proxy-server.js`.
- The root `package.json` is for Supabase CLI tooling; all frontend work uses `frontend/package.json`.

---

## Deployment Process

### Vercel (Frontend + Serverless API)

Vercel auto-deploys on push to the connected Git branch.

**Configuration** (`frontend/vercel.json`):
- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite
- Rewrites: All non-`/api/` paths → `index.html` (SPA routing)
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`

**Manual deployment:**
```bash
cd frontend
vercel --prod
```

**Prerequisites:**
```bash
npm i -g vercel
vercel login
```

**Environment variables** must be configured in the Vercel Dashboard (Settings → Environment Variables):
- `MESHY_API_KEY`
- `FAL_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MESHY_API_KEY`

**Verification:**
```bash
curl https://<your-vercel-domain>/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Supabase Edge Functions

**Deploy a single function:**
```bash
cd frontend
supabase functions deploy <function-name>
```

**Deploy all functions:**
```bash
cd frontend
supabase functions deploy
```

**Prerequisites:**
```bash
npm i -g supabase
supabase login
supabase link --project-ref <project-ref>
```

**Set secrets:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SLANT3D_API_KEY=sl-...
# ... etc
```

**Verification:**
```bash
# Invoke a function directly
supabase functions invoke <function-name> --body '{"test": true}'
```

### Modal (Blender Service)

**Deploy:**
```bash
cd blender-service
modal deploy modal_app.py
```

**Prerequisites:**
```bash
pip install modal
modal token new
```

**Verification:**
```bash
# Warm endpoint (lightweight health check)
curl https://matthew-77976--warm.modal.run
# Expected: 200 OK

# Test repair endpoint
curl -X POST -H "Content-Type: application/json" \
  -d '{"glb_url": "https://..."}' \
  https://matthew-77976--repair-mesh.modal.run
```

**Endpoints deployed:**
- `https://matthew-77976--repair-mesh.modal.run` — Mesh repair (GLB → STL)
- `https://matthew-77976--hollow-model.modal.run` — Model hollowing
- `https://matthew-77976--process-model.modal.run` — Scale + hollow + export

---

## Local Dev vs Production Routing

The frontend makes API calls to `/api/meshy/*` and `/api/fal/*` paths. These are handled by different backends depending on the environment:

### Local Development

```
┌──────────────┐    /api/*     ┌──────────────┐    HTTPS    ┌──────────────┐
│  Browser      │─────────────►│  Vite Dev     │───────────►│  Express      │
│  localhost:   │              │  Server       │  proxy     │  Proxy        │
│  5175         │              │  port 5175    │  config    │  port 3001    │
└──────────────┘              └──────────────┘            └──────┬───────┘
                                                                  │
                                                    ┌─────────────┼─────────────┐
                                                    ▼             ▼             ▼
                                              Meshy API      fal.ai       Supabase
                                                                          Storage
```

**How it works:**

1. The Vite dev server (`vite.config.ts`) has a proxy rule:
   ```typescript
   proxy: {
     '/api': {
       target: 'http://localhost:3001',
       changeOrigin: true,
     }
   }
   ```
2. All requests to `/api/*` on port 5175 are forwarded to the Express proxy on port 3001.
3. `proxy-server.js` handles:
   - `POST /api/meshy/text-to-3d` → Meshy API v2
   - `GET /api/meshy/text-to-3d/:taskId` → Meshy task status
   - `POST /api/meshy/image-to-3d` → Meshy OpenAPI v1
   - `GET /api/meshy/image-to-3d/:taskId` → Meshy task status
   - `GET /api/meshy/glb?url=...` → GLB file proxy (CORS bypass)
   - `POST /api/fal/transform-image` → fal.ai image transformation
   - `GET /api/health` → Health check
4. The proxy injects API keys (`VITE_MESHY_API_KEY`, `FAL_API_KEY`) server-side so they are never exposed to the browser.
5. CORS is configured to allow origins `http://localhost:5175` and `http://localhost:5176`.

### Production (Vercel)

```
┌──────────────┐    /api/*     ┌──────────────────────────────────────┐
│  Browser      │─────────────►│  Vercel                               │
│  (SPA from    │              │  ┌────────────────────────────────┐   │
│   Vercel CDN) │              │  │  Serverless Functions           │   │
│               │              │  │  frontend/api/meshy/text-to-3d  │   │
│               │              │  │  frontend/api/meshy/glb         │   │
│               │              │  │  frontend/api/fal/transform-... │   │
│               │              │  │  frontend/api/health            │   │
│               │              │  └────────────────────────────────┘   │
└──────────────┘              └──────────────────────────────────────┘
```

**How it works:**

1. Vercel's file-based routing maps `frontend/api/` directory structure to serverless function endpoints:
   - `frontend/api/meshy/text-to-3d.ts` → `POST /api/meshy/text-to-3d`
   - `frontend/api/meshy/glb.ts` → `GET /api/meshy/glb`
   - `frontend/api/fal/transform-image.ts` → `POST /api/fal/transform-image`
   - `frontend/api/health.ts` → `GET /api/health`
2. Each serverless function is a `@vercel/node` handler that reads API keys from Vercel environment variables.
3. The `vercel.json` rewrite rule `/((?!api/).*)` → `/index.html` ensures SPA routing works while preserving `/api/` paths for serverless functions.
4. No proxy server is needed — Vercel handles CORS and API key injection natively.

### Key Differences

| Aspect | Local Dev | Production |
|--------|-----------|------------|
| API handler | `proxy-server.js` (Express) | `frontend/api/*.ts` (Vercel serverless) |
| Port | Vite on 5175, proxy on 3001 | Single Vercel domain |
| Routing | Vite proxy config forwards `/api` → `:3001` | Vercel file-based routing |
| CORS | Express `cors()` middleware | Vercel handles natively |
| API keys | Loaded from `frontend/.env` via `dotenv` | Configured in Vercel Dashboard |
| GLB proxy | Express streams via `axios` + `arraybuffer` | Serverless function streams response |
| Startup | Two processes (proxy + Vite) | Zero — auto-deployed |

### Frontend Environment Detection

The frontend does **not** need to detect which environment it's in for API routing. Both environments serve `/api/*` at the same relative path — the SPA always calls `/api/meshy/text-to-3d` regardless of whether it's running locally or in production. The routing infrastructure (Vite proxy vs Vercel serverless) handles the difference transparently.

<!-- TODO: Document CI/CD pipeline if one is added in the future -->
<!-- TODO: Add staging environment details if a staging deployment is configured -->
