# Tech Stack

> Last updated: 2025-01-20 | Source of truth: `frontend/package.json`, `blender-service/requirements.txt`, `frontend/supabase/functions/deno.json`

## Programming Languages

| Language | Where Used |
|----------|-----------|
| TypeScript | React frontend SPA, Vercel serverless functions (`frontend/api/`), type definitions throughout `frontend/src/` |
| Python | Blender mesh processing service deployed on Modal (`blender-service/`) |
| SQL | Supabase Postgres schema, migrations, RLS policies, triggers, and views |
| Deno/TypeScript | Supabase Edge Functions (~50 functions in `frontend/supabase/functions/`) |

## Frameworks & Libraries

### Frontend Layer

| Library | Version | Purpose |
|---------|---------|---------|
| React | ^18.3.1 | UI component framework |
| React DOM | ^18.3.1 | React DOM renderer |
| React Router DOM | ^6.20.1 | Client-side routing and navigation state |
| Vite | ^5.4.2 | Build tool and dev server (port 5175) |
| Tailwind CSS | ^3.4.1 | Utility-first CSS framework |
| Framer Motion | ^12.35.0 | Animation library for UI transitions |
| Lucide React | ^0.344.0 | Icon library |
| Axios | ^1.11.0 | HTTP client for API requests |

### 3D Rendering Layer

| Library | Version | Purpose |
|---------|---------|---------|
| Three.js | ^0.158.0 | 3D rendering engine (WebGL) |
| React Three Fiber | ^8.15.11 | React renderer for Three.js |
| @react-three/drei | ^9.88.13 | Helpers and abstractions for React Three Fiber |

### Backend / Server Layer

| Library | Version | Purpose |
|---------|---------|---------|
| Express | 4.x | CORS proxy server for local dev (`proxy-server.js`, port 3001) |
| @vercel/node | ^3.0.0 | Vercel serverless function runtime (production API routes) |
| @supabase/supabase-js | ^2.56.0 | Supabase client for auth, database, and storage |
| dotenv | ^17.2.1 | Environment variable loading |

### Blender Service (Python)

| Library | Version | Purpose |
|---------|---------|---------|
| modal | latest | Serverless GPU/CPU deployment platform |
| numpy | latest | Numerical operations for mesh processing |
| trimesh | latest | Mesh analysis and manipulation |
| httpx | latest | Async HTTP client for Supabase API calls |
| FastAPI | latest | Web framework for Modal endpoints (bundled via `fastapi[standard]`) |

### Development Tooling Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| TypeScript | ^5.5.3 | Static type checking |
| ESLint | ^9.9.1 | Code linting (flat config in `eslint.config.js`) |
| @vitejs/plugin-react | ^4.3.1 | React support for Vite |
| PostCSS | ^8.4.35 | CSS processing pipeline |
| Autoprefixer | ^10.4.18 | Automatic vendor prefixes for CSS |

## Database & Storage

| Technology | Description |
|-----------|-------------|
| Supabase Postgres | Primary relational database with RLS policies, custom enums, triggers, and views |
| Supabase Storage | Object storage for 3D model files (GLB, OBJ, STL) in the `3d-models` bucket |
| Supabase Auth | Authentication service supporting anonymous sessions and email/password signup with JWT tokens |

## Third-Party Services

| Service | Role |
|---------|------|
| Meshy AI | AI-powered text-to-3D and image-to-3D model generation with polling-based task completion |
| fal.ai | Image transformation and cleanup (nano-banana endpoint) before image-to-3D generation |
| Stripe | Payment processing via checkout sessions, webhooks, and redirect-based payment flow |
| Slant3D | FDM 3D printing vendor — quoting, order creation, filament selection, and order tracking |
| Shapeways | Multi-material 3D printing vendor — OAuth2 auth, quoting, order creation, and tracking |
| Treatstock | 3D printing marketplace vendor — material listing, quoting, and order fulfillment |
| CraftCloud | 3D printing aggregator — cart-based ordering, quoting, and order management |
| Sculpteo | 3D printing service — quoting, order creation, and cart-based ordering (in progress) |
| Modal | Serverless compute platform hosting the Blender mesh processing service (repair, hollow, scale) |

## Deployment Targets

| Target | Service | Artifact Type |
|--------|---------|--------------|
| Vercel | Frontend SPA + serverless API routes | Static bundle + Node.js serverless functions (`frontend/api/`) |
| Supabase (hosted) | Edge Functions + Postgres + Auth + Storage | Deno functions deployed via `supabase functions deploy` |
| Modal | Blender mesh processing service | Python app deployed via `modal deploy modal_app.py` |

## Development Tooling

| Tool | Command / Workflow |
|------|-------------------|
| Vite dev server | `npm run dev` — serves frontend on port 5175 with HMR |
| Express proxy | `node proxy-server.js` — CORS proxy on port 3001 for Meshy/fal.ai in local dev |
| ESLint | `npm run lint` — lints TypeScript/React code using flat config |
| Vite build | `npm run build` — production build (no separate tsc step) |
| Vite preview | `npm run preview` — preview production build locally |
| Supabase CLI | `supabase functions serve` (local) / `supabase functions deploy <name>` (production) |
| Modal CLI | `modal deploy modal_app.py` — deploys Blender service to Modal |
| Thumbnail backfill | `npm run process-thumbnails` — runs `scripts/process-thumbnails.js` |

## Version Maintenance

> **Note:** Version numbers in this document should be updated alongside dependency bumps in `package.json`, `requirements.txt`, or `import_map.json`. When upgrading a framework or library, update the corresponding entry in this document within the same pull request.
