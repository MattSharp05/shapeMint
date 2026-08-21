# Feature Inventory

> Last updated: 2025-01-27 | Source of truth: codebase analysis (frontend/src/, frontend/supabase/functions/, blender-service/, NEXT_STEPS.md, docs/phase3_high_level_overview.md)

This document catalogs every feature in the ShapeMint platform, organized by domain. Each entry includes its current status, a description, and the services it touches.

---

## Status Legend

| Status | Meaning |
|--------|---------|
| **Completed** | Fully functional and deployed |
| **In Progress** | Partially implemented; some functionality works, some remains |
| **Planned** | Referenced in documentation but not yet implemented |

---

## Generation

| Feature | Status | Description | Services |
|---------|--------|-------------|----------|
| AI Model Generation (Text-to-3D) | Completed | Users enter a text prompt that is sent to Meshy AI to generate a 3D model (GLB/OBJ/STL). The system polls for completion, stores files in Supabase Storage, and displays the result in the 3D viewer. | frontend, Edge Functions, database |
| AI Model Generation (Image-to-3D) | Completed | Users upload an image which is preprocessed via fal.ai (background removal/cleanup) and then sent to Meshy AI for 3D generation. Same polling and storage pipeline as text-to-3D. | frontend, Edge Functions, database |
| 3D Model Viewer | Completed | Interactive React Three Fiber viewer with rotate, zoom, and pan controls. Loads GLB models through the proxy endpoint (`/api/meshy/glb?url=...`) to avoid CORS issues. | frontend |
| Mesh Post-Processing (Repair/Hollow/Scale) | Completed | Python service on Modal using headless Blender 4.0 and trimesh. Provides mesh repair, hollowing (for reduced print material), and scaling operations. Edge Functions orchestrate calls to Modal endpoints. | frontend, Edge Functions, Blender service, database |
| Thumbnail Generation | Completed | Automated thumbnail pipeline that renders 3D model previews as 2D images. Includes a processing queue (`thumbnail_processing_queue` table), Edge Functions for generation, and a backfill worker script. | frontend, Edge Functions, database |
| HY3D Generation Pipeline | In Progress | Alternative 3D generation pipeline using ComfyUI-based HY3D workflow. Database tables exist (`hy_generated_jobs`, `hy_generated_models`, `hy_generation_jobs`) with RLS policies. **Functional:** schema and database layer. **Remaining:** frontend UI integration, Edge Function orchestration, polling/status flow. | database |

---

## Ordering

| Feature | Status | Description | Services |
|---------|--------|-------------|----------|
| Multi-Vendor Quoting | Completed | Fetches price quotes from multiple 3D printing vendors (Slant3D, Shapeways, Treatstock, CraftCloud) and presents them to the user for comparison. Each vendor has dedicated Edge Functions for quote retrieval. | frontend, Edge Functions, database |
| Order Management | Completed | Full order lifecycle from creation through fulfillment. Orders are tracked in the `orders` table with vendor-specific fields (`slant_order_id`, `slant_response`). Failed orders are captured in `failed_orders` for reprocessing. | frontend, Edge Functions, database |
| Slant3D Integration | Completed | End-to-end FDM printing integration: file upload, quoting, order creation, order tracking, and webhook handling. Includes filament/material selection. | frontend, Edge Functions, database |
| Shapeways Integration | Completed | Multi-material printing integration: OAuth2 authentication, quoting with material/shipping options, and order creation. | frontend, Edge Functions, database |
| Treatstock Integration | Completed | Printing marketplace integration: material listing, quoting, order creation, and order status tracking. | frontend, Edge Functions, database |
| CraftCloud Integration | Completed | Printing aggregator integration: quoting, order creation (single and cart), and order status retrieval. | frontend, Edge Functions, database |
| Sculpteo Integration | In Progress | Printing service integration with quoting and order placement. **Functional:** Edge Functions for quoting (`vendor-sculpteo-get-quote`), order creation (`vendor-sculpteo-create-order`, `vendor-sculpteo-create-cart-order`, `vendor-sculpteo-submit-order`), frontend service with feature flag (`SCULPTEO_FRONTEND_ENABLED`), cart checkout support. **Remaining:** order status tracking/polling, full production enablement (currently behind feature flag), webhook handling. | frontend, Edge Functions, database |
| Cart / Multi-Item Checkout | In Progress | Shopping cart allowing users to add multiple models with different print types and quantities, then check out in a single session. **Functional:** cart context/provider (`useCart`), cart service with add/remove/update/clear, `CartCheckout` page with address picker, Stripe redirect, mixed-source handling (CraftCloud + Sculpteo split). **Remaining:** order history integration for cart orders, cart persistence across sessions for anonymous users, stale-quote UX refinement. | frontend, Edge Functions, database |
| Vendor Webhook Polling | Planned | Background polling job (cron-triggered Edge Function) to reconcile order statuses when vendor webhooks are unavailable or unreliable. Referenced in `docs/phase3_high_level_overview.md` (Section 5: Webhooks & background sync). | Edge Functions, database |

---

## Payments

| Feature | Status | Description | Services |
|---------|--------|-------------|----------|
| Stripe Checkout | Completed | Stripe-hosted checkout flow via `create-checkout-session` Edge Function. On payment success, `stripe-webhook` Edge Function processes `checkout.session.completed` events and creates order records. Session data stored in `stripe_sessions` table. | frontend, Edge Functions, database |
| Download Checkout | In Progress | Free digital download flow allowing users to download model files (STL, OBJ, GLB) after providing an email. **Functional:** `DownloadCheckout` page with email validation, model preview, file download via `downloadService`. **Remaining:** email confirmation delivery, download tracking/analytics, integration with user account history. | frontend |
| Refund Automation | Planned | Automated refund processing for cancelled or failed orders. Referenced in `docs/phase3_high_level_overview.md` (Risks & unknowns: "Tax/compliance and refunds — plan for Phase 4 for refund and lifecycle automation"). | Edge Functions, database |

---

## User Management

| Feature | Status | Description | Services |
|---------|--------|-------------|----------|
| Authentication (Supabase Auth) | Completed | Full auth flow with login, registration, and password reset. Supports email/password authentication via Supabase Auth with JWT tokens forwarded through the proxy and Edge Functions. | frontend, Edge Functions, database |
| Anonymous-to-Authenticated User Merge | Completed | Anonymous Supabase sessions allow model generation without signup. At checkout, users create an account and the `merge-anon-user` Edge Function transfers anonymous session models to the new authenticated account. | frontend, Edge Functions, database |

---

## Admin

| Feature | Status | Description | Services |
|---------|--------|-------------|----------|
| Admin Dashboard | Completed | Password-gated `/admin` route providing oversight of all models, orders, and users. Includes search, pagination, model preview, order details with vendor labels, and contact form submissions. Backed by RLS admin read policies. | frontend, Edge Functions, database |

---

## Marketplace

| Feature | Status | Description | Services |
|---------|--------|-------------|----------|
| Marketplace Browse & Order | Completed | Public marketplace displaying community-published 3D models. Users can search, filter by category, sort, and order physical prints of any listed model. Models are fetched from `generated_models` where published. | frontend, Edge Functions, database |
| Marketplace Upload / Publish | Completed | Users can publish their generated models to the marketplace via the `MarketplaceUpload` page and `publish-model` Edge Function. Published models become visible to all marketplace visitors. | frontend, Edge Functions, database |

---

## Infrastructure

| Feature | Status | Description | Services |
|---------|--------|-------------|----------|
| Express CORS Proxy (Local Dev) | Completed | Node/Express proxy server (`proxy-server.js`) on port 3001 that forwards `/api/meshy/*` and `/api/fal/*` requests to external APIs during local development, handling CORS. | frontend |
| Vercel Serverless Functions (Production) | Completed | Serverless functions in `frontend/api/` that serve the same proxy routes (`/api/meshy/*`, `/api/fal/*`) in production on Vercel, replacing the local Express proxy. | frontend |
| Supabase Edge Functions (~50) | Completed | Deno-based serverless functions handling Meshy orchestration, Stripe payments, vendor integrations, thumbnail pipeline, model processing, user merge, and notifications. Deployed via Supabase CLI. | Edge Functions |
| Modal Blender Service | Completed | Python service deployed to Modal providing headless Blender 4.0 mesh operations (repair, hollow, scale). Called by Edge Functions with service-role authentication. | Blender service |
| Comprehensive Test Suite | Planned | Automated test runner with unit and integration tests. Currently no test runner is configured; `downloadService.test.ts` exists but has no runner. Referenced in `NEXT_STEPS.md` (Phase 5: Documentation) and `CLAUDE.md` ("There is no test runner wired up"). | frontend, Edge Functions, Blender service |

---

## Summary by Status

### Completed (18 features)
- AI Model Generation (Text-to-3D)
- AI Model Generation (Image-to-3D)
- 3D Model Viewer
- Mesh Post-Processing (Repair/Hollow/Scale)
- Thumbnail Generation
- Multi-Vendor Quoting
- Order Management
- Slant3D Integration
- Shapeways Integration
- Treatstock Integration
- CraftCloud Integration
- Stripe Checkout
- Authentication (Supabase Auth)
- Anonymous-to-Authenticated User Merge
- Admin Dashboard
- Marketplace Browse & Order
- Marketplace Upload / Publish
- Express CORS Proxy, Vercel Serverless, Edge Functions, Modal Blender Service (Infrastructure)

### In Progress (4 features)
- Sculpteo Integration
- HY3D Generation Pipeline
- Cart / Multi-Item Checkout
- Download Checkout

### Planned (3 features)
- Refund Automation
- Vendor Webhook Polling
- Comprehensive Test Suite
