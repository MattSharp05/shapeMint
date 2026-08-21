# Architecture Overview

> Last updated: 2025-01-20 | Source of truth: CLAUDE.md, frontend/src/services/, frontend/supabase/functions/

## Services

ShapeMint is composed of six primary services that work together to deliver AI-powered 3D model generation and on-demand manufacturing.

| # | Service | Primary Responsibility | Technology / Runtime |
|---|---------|----------------------|---------------------|
| 1 | **React Frontend** | Single-page application providing the user interface for model generation, 3D viewing, ordering, marketplace, and admin dashboard | React 18 + TypeScript + Vite + Tailwind CSS, runs in browser |
| 2 | **Express Proxy Server** | Local development CORS proxy that forwards `/api/meshy/*` and `/api/fal/*` requests to external APIs (Meshy AI, fal.ai) | Node.js + Express, port 3001 (dev only) |
| 3 | **Vercel Serverless Functions** | Production API routes serving the same `/api/meshy/*` and `/api/fal/*` paths that the proxy handles in dev, plus a health endpoint | Node.js (`@vercel/node`), deployed to Vercel |
| 4 | **Supabase** | Managed backend providing Postgres database, authentication (with anonymous sessions), ~50 Deno Edge Functions (Meshy orchestration, Stripe, vendor integrations, thumbnails, mesh ops), and object storage for 3D model files | Supabase hosted: Postgres + Auth + Edge Functions (Deno) + Storage |
| 5 | **Modal Blender Service** | Headless mesh processing — repair, hollow, and scale 3D models using Blender 4.0 in GPU-capable containers | Python 3.11 + Blender 4.0 + Modal, endpoints at `matthew-77976--*.modal.run` |
| 6 | **External Vendor APIs** | Third-party printing services that receive STL/OBJ files and fulfill physical 3D print orders | Slant3D, Shapeways, Treatstock, CraftCloud, Sculpteo (REST APIs) |

## Service Connections

| Source | Destination | Protocol | Direction | Data Category |
|--------|-------------|----------|-----------|---------------|
| React Frontend | Express Proxy (dev) / Vercel Functions (prod) | HTTP/REST | Frontend → Backend | Meshy generation requests, fal.ai image transforms, GLB file proxying |
| React Frontend | Supabase | HTTP/REST + WebSocket | Bidirectional | Auth tokens, database queries (RLS-enforced), storage file uploads/downloads, Edge Function invocations |
| Express Proxy | Meshy AI API | HTTPS/REST | Outbound | Text-to-3D / Image-to-3D task creation and polling, GLB file download |
| Express Proxy | fal.ai API | HTTPS/REST | Outbound | Image upload, transformation requests, result polling |
| Vercel Functions | Meshy AI API | HTTPS/REST | Outbound | Same as proxy — text-to-3D, image-to-3D, GLB proxying |
| Vercel Functions | fal.ai API | HTTPS/REST | Outbound | Image transformation (production path) |
| Supabase Edge Functions | Stripe API | HTTPS/REST | Bidirectional | Checkout session creation, webhook events (payment confirmation) |
| Supabase Edge Functions | Slant3D API | HTTPS/REST | Outbound | Quotes, file upload, order creation, order status |
| Supabase Edge Functions | Shapeways API | HTTPS/REST | Outbound | OAuth2 auth, quotes, order creation, order tracking |
| Supabase Edge Functions | Treatstock API | HTTPS/REST | Outbound | Materials, quotes, order creation, order tracking |
| Supabase Edge Functions | CraftCloud API | HTTPS/REST | Outbound | Quotes, cart orders, order creation, order tracking |
| Supabase Edge Functions | Sculpteo API | HTTPS/REST | Outbound | Quotes, order creation, order submission |
| Supabase Edge Functions | Modal Blender Service | HTTPS/REST | Outbound | GLB/STL URLs, processing parameters, signed upload URLs |
| Modal Blender Service | Supabase REST API | HTTPS/REST | Outbound (callback) | Repair reports, STL URLs, model status updates (via service-role key) |
| Modal Blender Service | Supabase Storage | HTTPS/PUT | Outbound | Processed STL/OBJ/GLB file uploads (via signed URLs) |
| Stripe | Supabase Edge Functions | HTTPS/Webhook | Inbound | `checkout.session.completed`, `payment_intent.payment_failed`, `checkout.session.expired` |
| Slant3D | Supabase Edge Functions | HTTPS/Webhook | Inbound | Order status updates |

## Excalidraw Diagram Description

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SHAPEMINT ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         HTTP/REST          ┌──────────────────────────┐
│                  │ ──────────────────────────► │  Express Proxy (dev)     │
│  React Frontend  │         /api/meshy/*        │  Port 3001               │
│  (Browser SPA)   │         /api/fal/*          │  Node.js + Express       │
│  React 18 + TS   │                            └────────────┬─────────────┘
│  + Vite          │                                         │
│  Port 5175       │         HTTP/REST          ┌────────────▼─────────────┐
│                  │ ──────────────────────────► │  Vercel Serverless (prod)│
│                  │         /api/meshy/*        │  @vercel/node            │
│                  │         /api/fal/*          └────────────┬─────────────┘
│                  │                                         │
│                  │                                         │ HTTPS
│                  │                                         ▼
│                  │                            ┌──────────────────────────┐
│                  │                            │  Meshy AI API            │
│                  │                            │  text-to-3D, image-to-3D │
│                  │                            └──────────────────────────┘
│                  │                            ┌──────────────────────────┐
│                  │                            │  fal.ai API              │
│                  │                            │  Image transformation    │
│                  │                            └──────────────────────────┘
│                  │
│                  │   HTTP/REST + WS    ┌─────────────────────────────────────────┐
│                  │ ──────────────────► │  Supabase (Hosted)                      │
│                  │   Auth, DB, Storage │  ┌─────────────┐  ┌──────────────────┐  │
│                  │   Edge Fn invoke    │  │  Postgres   │  │  Auth            │  │
└──────────────────┘                    │  │  (RLS)      │  │  (anon + email)  │  │
                                        │  └─────────────┘  └──────────────────┘  │
                                        │  ┌─────────────┐  ┌──────────────────┐  │
                                        │  │  Storage    │  │  Edge Functions  │  │
                                        │  │  (3d-models)│  │  (~50 Deno fns)  │  │
                                        │  └─────────────┘  └───────┬──────────┘  │
                                        └───────────────────────────┼──────────────┘
                                                                    │
                                         ┌──────────────────────────┼───────────┐
                                         │                          │           │
                                         ▼                          ▼           ▼
                            ┌──────────────────┐   ┌─────────────────┐  ┌──────────────┐
                            │  Stripe API      │   │  Modal Blender  │  │  Vendor APIs │
                            │  Payments        │   │  Service        │  │  Slant3D     │
                            │  Webhooks        │   │  repair/hollow/ │  │  Shapeways   │
                            └──────────────────┘   │  scale          │  │  Treatstock  │
                                                   │  Python+Blender │  │  CraftCloud  │
                                                   └────────┬────────┘  │  Sculpteo    │
                                                            │           └──────────────┘
                                                            │ HTTPS (callback)
                                                            ▼
                                                   ┌─────────────────┐
                                                   │  Supabase REST  │
                                                   │  (service-role) │
                                                   └─────────────────┘

Arrows:
  Frontend ──► Proxy/Vercel: "HTTP/REST, generation requests + GLB proxy"
  Proxy/Vercel ──► Meshy AI: "HTTPS, task creation + polling + file download"
  Proxy/Vercel ──► fal.ai: "HTTPS, image upload + transform + polling"
  Frontend ──► Supabase: "HTTP+WS, auth tokens + DB queries + storage + Edge Fn calls"
  Edge Functions ──► Stripe: "HTTPS, checkout sessions"
  Stripe ──► Edge Functions: "HTTPS webhook, payment events"
  Edge Functions ──► Modal: "HTTPS, mesh processing requests"
  Modal ──► Supabase REST: "HTTPS, DB updates via service-role"
  Modal ──► Supabase Storage: "HTTPS PUT, processed file uploads"
  Edge Functions ──► Vendor APIs: "HTTPS, quotes + orders + tracking"
  Slant3D ──► Edge Functions: "HTTPS webhook, order status"
```

## Model Generation Pipeline

The central pipeline transforms user input into a viewable and printable 3D model:

| Stage | Service | Action | Output → Next Stage |
|-------|---------|--------|---------------------|
| 1. **User Input** | React Frontend (`pages/Generate.tsx`, `pages/CreatePage.tsx`) | User submits a text prompt or uploads an image. For images, `falImageService.ts` calls `/api/fal/transform-image` to optimize the image for 3D conversion first. | Text prompt or optimized image URL |
| 2. **Meshy Task Creation** | Express Proxy (dev) or Vercel Functions (prod) | Frontend calls `/api/meshy/text-to-3d` or `/api/meshy/image-to-3d`. The proxy/function forwards to Meshy AI API with auth. For text: preview task → refine task (two-step). | Meshy task ID |
| 3. **Generation Polling** | React Frontend (`hooks/useModelGeneration.ts`, `services/meshy.ts`) | `MeshyService.waitForTaskCompletion()` polls task status every 3–8s (adaptive). Task ID persisted on `generated_models.meshy_task_id`. | Completed Meshy response with model URLs (GLB, OBJ, STL) |
| 4. **Model File Storage** | Supabase Edge Functions / Frontend | Finished GLB/OBJ/STL downloaded from Meshy (CloudFront signed URLs) and mirrored into Supabase Storage bucket `3d-models`. URLs stored on the `generated_models` row. | Supabase Storage URLs |
| 5. **3D Model Display** | React Frontend (`components/3D/ModelViewer.tsx`) | React Three Fiber loads GLB via `/api/meshy/glb?url=...` (always proxied to avoid CORS). User can rotate/zoom the model. | Viewable 3D model in browser |
| 6. **Post-Processing** | Supabase Edge Functions → Modal Blender Service | Edge Functions (`scale-model`, `hollow-model`, `repair-and-export-stl`) call Modal endpoints. Modal runs Blender headless: scale to target dimensions, hollow for material savings, repair for print-readiness. Results uploaded to Storage; DB updated via service-role key. | Print-ready STL with repair report |

## Order Fulfillment Pipeline

The fulfillment pipeline takes a print-ready model through payment to physical delivery:

| Stage | Service | Action | Output → Next Stage |
|-------|---------|--------|---------------------|
| 1. **Checkout Initiation** | React Frontend | User selects model, vendor, material, and quantity. Frontend invokes `create-checkout-session` Edge Function with order details and amount. | Stripe Checkout Session URL |
| 2. **Payment Processing** | Stripe (external) | User redirected to Stripe Checkout. On success, Stripe fires `checkout.session.completed` webhook to `stripe-webhook` Edge Function. | Payment confirmation + order ID |
| 3. **Order Record Creation** | Supabase Edge Functions (`stripe-webhook`) | Webhook handler updates `orders` table (status → `paid`), records `stripe_sessions` entry, logs `payment_events`. For CraftCloud: also executes invoice payment flow. | Confirmed order record in database |
| 4. **Vendor Order Submission** | Supabase Edge Functions (`vendor-slant3d-create-order`, `vendor-craftcloud-create-order`, etc.) | STL/OBJ file URL + shipping address + material sent to selected vendor API. Vendor returns order ID. Stored in `orders.slant_order_id` / `orders.vendor_order_id`. | Vendor order confirmation |
| 5. **Order Status Tracking** | Supabase Edge Functions (`vendor-slant3d-get-order`, `vendor-craftcloud-get-order`, etc.) + Webhooks | Status polled from vendor APIs or received via webhooks (Slant3D). Vendor-specific statuses mapped to common lifecycle states. | Updated order status |
| 6. **Delivery Status Update** | Supabase Edge Functions | Tracking information and delivery status written to `orders` table. User notified via order confirmation email (`send-order-confirmation-email`). | Order complete |

## Authentication Flow

ShapeMint uses an anonymous-first authentication model powered by Supabase Auth:

```
┌─────────────┐     signInAnonymously()     ┌──────────────────┐
│   Browser   │ ─────────────────────────── │  Supabase Auth   │
│  (new visit)│                             │                  │
└──────┬──────┘                             │  Issues JWT with │
       │                                    │  is_anonymous=true│
       │  ◄── JWT (access + refresh) ────── └──────────────────┘
       │
       │  All API calls include:
       │  Authorization: Bearer <JWT>
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Supabase Postgres (RLS enforced)                                │
│                                                                  │
│  Policy example:                                                 │
│    auth.uid() = user_id   → user sees only their own rows        │
│    is_anonymous check     → some operations blocked for anon     │
│                                                                  │
│  Role hierarchy:                                                 │
│    anon (3s timeout) < authenticated (8s) < service_role (no RLS)│
└──────────────────────────────────────────────────────────────────┘
```

**Flow steps:**

1. **Anonymous session**: On first visit, `useAuth` hook calls `supabase.auth.signInAnonymously()`. User gets a JWT with `is_anonymous=true`. All generated models are attributed to this anonymous user ID.

2. **Token forwarding**: The JWT is included in all Supabase client calls automatically. Edge Functions receive it via the `Authorization` header. The Express proxy and Vercel functions use their own API keys (not user tokens) for Meshy/fal.ai calls.

3. **RLS enforcement**: Postgres Row Level Security policies use `auth.uid()` to scope data access. Each user (anonymous or authenticated) only sees their own `generated_models`, `orders`, etc. The `service_role` key (used by Edge Functions, Modal callbacks, and background workers) bypasses RLS for administrative operations.

4. **Account conversion**: At checkout, anonymous users are prompted to create an account. `supabase.auth.updateUser()` converts the anonymous session to a permanent account (same user ID preserved). The `merge-anon-user` Edge Function handles edge cases where a separate merge is needed. All prior models carry over because the `user_id` foreign key doesn't change.

5. **Checkout gate**: The `create-checkout-session` Edge Function rejects anonymous users (HTTP 403) — a real email and account are required for Stripe receipts and shipping addresses.

## Metadata

- **Last updated**: 2025-01-20
- **Source of truth**: `CLAUDE.md` for architecture overview; `frontend/proxy-server.js` and `frontend/api/` for routing; `frontend/supabase/functions/` for Edge Function inventory; `blender-service/modal_app.py` for mesh processing endpoints
