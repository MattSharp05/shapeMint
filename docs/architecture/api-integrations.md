# API Integrations

> Last updated: 2025-01-27 | Source of truth: `frontend/supabase/functions/`, `docs/API_information/`, `blender-service/modal_app.py`

This document provides a consolidated view of all external API integrations in the ShapeMint platform, including vendor printing services, AI generation services, payment processing, and mesh processing infrastructure.

---

## Table of Contents

1. [Printing Vendors](#printing-vendors)
   - [Slant3D](#slant3d)
   - [Shapeways](#shapeways)
   - [Treatstock](#treatstock)
   - [CraftCloud](#craftcloud)
   - [Sculpteo](#sculpteo)
2. [AI Generation Services](#ai-generation-services)
   - [Meshy AI](#meshy-ai)
   - [fal.ai](#falai)
3. [Payment Processing](#payment-processing)
   - [Stripe](#stripe)
4. [Mesh Processing](#mesh-processing)
   - [Modal / Blender Service](#modal--blender-service)

---

## Printing Vendors

### Slant3D

| Field | Value |
|-------|-------|
| **Name** | Slant3D |
| **Category** | FDM 3D Printing (Print Farm) |
| **Base URL** | `https://slant3dapi.com/v2/api` |
| **Supported File Formats** | STL only |
| **Integration Status** | Active |

#### Authentication

- **Method:** API Key via Bearer header
- **Header:** `Authorization: Bearer <SLANT3D_API_KEY>`
- **Environment Variables:** `SLANT3D_API_KEY`, `SLANT3D_PLATFORM_ID`

#### Edge Functions

| Function | Purpose |
|----------|---------|
| `vendor-slant3d-get-quote` | Upload file, get price estimate, draft order for shipping costs |
| `vendor-slant3d-create-order` | Draft and process a paid order |
| `vendor-slant3d-get-order` | Retrieve order status by vendor order ID |
| `vendor-slant3d-get-filaments` | List available filament materials |
| `vendor-slant3d-upload-file` | Upload STL file to Slant3D storage |
| `vendor-slant3d-webhook` | Receive order status updates from Slant3D |

#### Endpoints Called

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v2/api/filaments` | GET | List available filaments |
| `/v2/api/files` | POST | Upload file via URL |
| `/v2/api/files/direct-upload` | POST | Request presigned upload URL |
| `/v2/api/files/confirm-upload` | POST | Confirm presigned upload completion |
| `/v2/api/files/{publicFileServiceId}` | GET | Check file processing status |
| `/v2/api/files/{publicFileServiceId}/estimate` | POST | Get price estimate for a file |
| `/v2/api/orders` | POST | Draft an order (creates order in draft state) |
| `/v2/api/orders/{publicOrderId}` | POST | Process/confirm a drafted order (charges payment) |
| `/v2/api/orders/{publicOrderId}` | GET | Get order status and tracking |
| `/v2/api/platforms` | POST | Create a platform |
| `/v2/api/usage` | GET | Check API usage |

#### Order Flow

1. **Upload File** — `vendor-slant3d-get-quote` uploads the STL to Slant3D via `POST /v2/api/files` (or uses cached `publicFileServiceId`). Polls `GET /v2/api/files/{id}` until `STLMetrics` are available (up to 10 attempts, 2s apart).
2. **Get Estimate** — Calls `POST /v2/api/files/{id}/estimate` with filament ID and quantity to get item price.
3. **Draft Order** — Calls `POST /v2/api/orders` with customer details, file ID, filament, and quantity. Returns draft order with shipping costs.
4. **Process Order** — `vendor-slant3d-create-order` calls `POST /v2/api/orders/{publicOrderId}` to confirm and charge payment.
5. **Track Order** — `vendor-slant3d-get-order` calls `GET /v2/api/orders/{publicOrderId}` to retrieve status. Webhooks also push updates to `vendor-slant3d-webhook`.

#### Rate Limits

- **Free Tier:** 100 requests/minute per API key
- Rate limit headers included in responses: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-RateLimit-Role`
- File uploads limited to 100/day per platform

#### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "message": "Detailed error message"
  }
}
```

---

### Shapeways

| Field | Value |
|-------|-------|
| **Name** | Shapeways |
| **Category** | Multi-material 3D Printing (SLS, MJF, Full Color) |
| **Base URL** | `https://api.shapeways.com` |
| **Supported File Formats** | STL, GLB (base64-encoded upload) |
| **Integration Status** | Active |

#### Authentication

- **Method:** OAuth2 Client Credentials
- **Token Endpoint:** `POST https://api.shapeways.com/oauth2/token`
- **Header:** `Authorization: Bearer <access_token>`
- **Environment Variables:** `SHAPEWAYS_CLIENT_ID`, `SHAPEWAYS_CLIENT_SECRET`
- **Token Lifetime:** 3600 seconds (1 hour), cached with 30s early refresh buffer

#### Edge Functions

| Function | Purpose |
|----------|---------|
| `vendor-shapeways-auth` | Obtain and cache OAuth2 access token |
| `vendor-shapeways-get-quote` | Upload model, poll material price, compute quote |
| `vendor-shapeways-create-order` | Re-verify pricing, place order with Shapeways |
| `vendor-shapeways-get-order` | Retrieve order status |

#### Endpoints Called

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oauth2/token` | POST | Obtain access token (client_credentials grant) |
| `/models/v1` | POST | Upload model (base64-encoded file) |
| `/models/v1` | GET | List all models |
| `/models/{modelId}/v1` | GET | Get model info (material prices, printability) |
| `/models/{modelId}/v1` | DELETE | Delete a model |
| `/materials/v1` | GET | List all materials |
| `/materials/{materialId}/v1` | GET | Get material details |
| `/orders/v1` | POST | Place an order |
| `/orders/{orderId}/v1` | GET | Get order status |
| `/cart/shipping-options/v1` | GET | Get shipping options by country/zip |

#### Order Flow

1. **Authenticate** — `vendor-shapeways-auth` obtains OAuth2 token via client_credentials grant. Token is cached in-memory with early refresh.
2. **Upload Model** — `vendor-shapeways-get-quote` downloads the model file, computes SHA-256 hash, checks `sw_models_cache` table. If not cached, base64-encodes and uploads via `POST /models/v1`.
3. **Poll Material Price** — Polls `GET /models/{modelId}/v1` up to 30 times (4s intervals, ~2 min total) waiting for material price to stabilize (requires 2 consecutive identical non-zero prices).
4. **Compute Quote** — Applies US multiplier (1.03x), calculates item subtotal, $25 minimum order surcharge, and cheapest shipping via `GET /cart/shipping-options/v1`.
5. **Create Order** — `vendor-shapeways-create-order` re-verifies pricing (5¢ or 1% tolerance), inserts pending order row, calls `POST /orders/v1` with model ID, material ID, quantity, and shipping address.
6. **Track Order** — `vendor-shapeways-get-order` calls `GET /orders/{orderId}/v1` for status (placed, in_production, shipped, cancelled).

#### Rate Limits

- Not explicitly documented in Shapeways API docs
- Token expires after 3600 seconds; refresh via new client_credentials request
<!-- TODO: Confirm Shapeways rate limits from their developer documentation -->

#### Error Response Format

```json
{
  "result": "failure",
  "reason": "Error description"
}
```

Common error codes: `billing_address_required`, `payment_method_required`, model processing timeouts.

---

### Treatstock

| Field | Value |
|-------|-------|
| **Name** | Treatstock |
| **Category** | 3D Printing Marketplace (multi-provider) |
| **Base URL** | `https://www.treatstock.com/api/v2` |
| **Supported File Formats** | STL, PLY, 3MF |
| **Integration Status** | Active |

#### Authentication

- **Method:** API Key via query parameter
- **Parameter:** `?private-key=<TREATSTOCK_API_KEY>`
- **Environment Variables:** `TREATSTOCK_API_KEY`

#### Edge Functions

| Function | Purpose |
|----------|---------|
| `vendor-treatstock-get-quote` | Upload model, get prices from multiple providers |
| `vendor-treatstock-create-order` | Place order with selected provider |
| `vendor-treatstock-get-order` | Retrieve order status |
| `vendor-treatstock-get-materials` | List available material groups and colors |

#### Endpoints Called

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/printable-packs/?private-key=<key>` | POST | Upload 3D model file (creates printable pack) |
| `/printable-packs/<id>?private-key=<key>` | GET | Get minimum price for uploaded model |
| `/printable-packs/<id>?private-key=<key>` | PUT | Set scale unit or quantity |
| `/printable-pack-costs/?printablePackId=<id>&private-key=<key>` | GET | Get prices from multiple providers |
| `/place-order/create?private-key=<key>` | POST | Place an order with selected provider |
| `/material-group-colors/?private-key=<key>` | GET | List material groups and colors |

#### Order Flow

1. **Upload Model** — `vendor-treatstock-get-quote` uploads STL via `POST /printable-packs/` (supports direct file upload or URL). Returns `printablePackId`.
2. **Get Prices** — Calls `GET /printable-pack-costs/` with pack ID and location to get prices from multiple providers. May return `not_calculated_yet` requiring retry.
3. **Place Order** — `vendor-treatstock-create-order` calls `POST /place-order/create` with `printablePackId`, `providerId`, shipping address, and material/color selection.
4. **Track Order** — `vendor-treatstock-get-order` retrieves order status via the order URL returned at creation.

#### Rate Limits

- **GET requests:** 7 concurrent connections per API key
- **POST requests:** 15 concurrent connections per API key
- **PUT requests:** 30 concurrent connections per API key
- Each connection type operates independently

#### Error Response Format

```json
{
  "success": false,
  "errors": {
    "field_name": ["Error message"]
  }
}
```

Or for order errors:
```json
{
  "success": false,
  "message": "Specified provider cannot print with given details"
}
```

---

### CraftCloud

| Field | Value |
|-------|-------|
| **Name** | CraftCloud (by All3DP) |
| **Category** | 3D Printing Aggregator (multi-vendor, multi-material) |
| **Base URL** | `https://api.craftcloud3d.com` |
| **Supported File Formats** | STL, OBJ, 3MF (with color bundle ZIP for full-color) |
| **Integration Status** | Active |

#### Authentication

- **Method:** API Key (details not fully documented in available Swagger spec)
- **Environment Variables:** Used implicitly in Edge Functions
<!-- TODO: Confirm CraftCloud auth header format from production configuration -->

#### Edge Functions

| Function | Purpose |
|----------|---------|
| `vendor-craftcloud-get-quote` | Upload model, poll parsing, request prices, return cheapest |
| `vendor-craftcloud-create-order` | Create order from cart with shipping/billing |
| `vendor-craftcloud-create-cart-order` | Create cart-based order (multi-item) |
| `vendor-craftcloud-get-order` | Retrieve order status |

#### Endpoints Called

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/model` | POST | Upload model file (multipart/form-data) |
| `/v5/model/{modelId}` | GET | Poll model parsing status (206 = still parsing) |
| `/v5/price` | POST | Create price request |
| `/v5/price/{priceId}` | GET | Poll for price results |
| `/v5/price/{priceId}/grouped` | GET | Get prices grouped by vendor |
| `/v5/cart` | POST | Create cart with selected quotes and shipping |
| `/v5/order` | POST | Create order from cart |
| `/v5/order/{orderId}/status` | GET | Get order status |
| `/v5/payment/invoice` | POST | Create invoice payment |
| `/v5/payment/invoice/{paymentId}` | PATCH | Execute invoice payment |

#### Order Flow

1. **Upload Model** — `vendor-craftcloud-get-quote` uploads STL/ZIP via `POST /v5/model`. Polls `GET /v5/model/{modelId}` until parsing completes (200 = done, 206 = still parsing).
2. **Request Prices** — Calls `POST /v5/price` with model ID, quantity, country code, and optional material config IDs. Returns `priceId`.
3. **Poll Prices** — Polls `GET /v5/price/{priceId}` until quotes are available. Also supports WebSocket at `ws(s)://<host>/v5/price/:priceId`.
4. **Create Cart** — Calls `POST /v5/cart` with selected quote IDs and shipping IDs.
5. **Create Order** — Calls `POST /v5/order` with cart ID, user details (email, shipping, billing addresses).
6. **Pay via Invoice** — After Stripe payment succeeds (webhook), calls `POST /v5/payment/invoice` then `PATCH /v5/payment/invoice/{paymentId}` to execute CraftCloud-side payment.
7. **Track Order** — `vendor-craftcloud-get-order` calls `GET /v5/order/{orderId}/status`.

#### Rate Limits

<!-- TODO: CraftCloud rate limits not documented in available API spec -->
- Not explicitly documented in available Swagger spec
- Model parsing is asynchronous; polling recommended with reasonable intervals

#### Error Response Format

```json
{
  "error": "Error description",
  "statusCode": 400
}
```

Order status values: `ordered`, `in_production`, `shipped`, `received`, `blocked`, `cancelled`

---

### Sculpteo

| Field | Value |
|-------|-------|
| **Name** | Sculpteo |
| **Category** | Professional 3D Printing Service (SLS, Color) |
| **Base URL** | `https://www.sculpteo.com` |
| **Supported File Formats** | STL, OBJ (with color bundle ZIP for full-color) |
| **Integration Status** | In Progress |

#### Authentication

- **Method:** API Token via Authorization header (when `SCULPTEO_API_KEY` is set)
- **Header:** `Authorization: Token <SCULPTEO_API_KEY>`
- **Environment Variables:** `SCULPTEO_ENABLED`, `SCULPTEO_API_KEY`, `SCULPTEO_API_BASE`
- **Note:** Price endpoint may work unauthenticated; upload endpoint may require credentials

#### Edge Functions

| Function | Purpose |
|----------|---------|
| `vendor-sculpteo-get-quote` | Upload design, get price by material product code |
| `vendor-sculpteo-create-order` | Create order with Sculpteo |
| `vendor-sculpteo-create-cart-order` | Create cart-based order |
| `vendor-sculpteo-submit-order` | Submit/finalize order |

#### Endpoints Called

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/design/` | POST | Upload 3D model (returns design UUID) |
| `/api/price_by_uuid` | GET | Get price for design by UUID and product name |

#### Product Code Mapping

| Print Type | Sculpteo Product Code |
|-----------|----------------------|
| `color` | `color_plastic` |
| `mono` | `white_plastic` |
| `sls` | `nylon_pa12` |

#### Order Flow

1. **Upload Design** — Downloads model from Supabase storage, uploads to Sculpteo's design endpoint. Returns a design UUID.
2. **Get Price** — Calls `GET /api/price_by_uuid?uuid=<uuid>&productname=<product>` to get material price.
3. **Create Order** — `vendor-sculpteo-create-order` places order with design UUID and selected material.
4. **Track Order** — `vendor-sculpteo-submit-order` finalizes and tracks order status.

#### Rate Limits

<!-- TODO: Sculpteo rate limits not documented; integration is in-progress -->
- Not documented; integration is partially implemented
- Function returns empty `vendorOptions: []` when `SCULPTEO_ENABLED` is not `"true"`

#### Error Response Format

- Function is designed to never throw on Sculpteo-side failures
- Logs errors and returns empty vendor options list to avoid degrading other vendor quotes

---

## AI Generation Services

### Meshy AI

| Field | Value |
|-------|-------|
| **Name** | Meshy AI |
| **Category** | AI 3D Model Generation |
| **Base URL** | `https://api.meshy.ai` |
| **Authentication** | Bearer token via `Authorization: Bearer <MESHY_API_KEY>` |
| **Environment Variables** | `MESHY_API_KEY` |

#### Capabilities

- **Text-to-3D** (v2): Generate 3D models from text prompts
- **Image-to-3D** (v1): Generate 3D models from a single image
- **Multi-Image-to-3D** (v1): Generate 3D models from multiple reference images

#### Edge Functions

| Function | Purpose |
|----------|---------|
| `generate-3d-model` | Create a Meshy generation task (text/image/multi-image) |
| `check-model-status` | Poll Meshy task status, store completed GLB in Supabase |
| `refine-model` | Trigger text-to-3D refine pass for textures |
| `meshy-webhook` | Receive task completion notifications from Meshy |

#### Endpoints Called

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v2/text-to-3d` | POST | Create text-to-3D task (preview or refine mode) |
| `/v1/image-to-3d` | POST | Create image-to-3D task |
| `/v1/multi-image-to-3d` | POST | Create multi-image-to-3D task |
| `/v2/text-to-3d/{taskId}` | GET | Poll text-to-3D task status |
| `/v1/image-to-3d/{taskId}` | GET | Poll image-to-3D task status |
| `/openapi/v1/multi-image-to-3d/{taskId}` | GET | Poll multi-image task status |

#### Generation Flow

1. **Submit Task** — `generate-3d-model` sends prompt/image to the appropriate Meshy endpoint. Returns a `taskId` (result field). Stores task record in `generated_models` table with status `processing`.
2. **Poll Status** — Frontend calls `check-model-status` which polls the Meshy task endpoint. Task progresses through states: `PENDING` → `IN_PROGRESS` → `SUCCEEDED` or `FAILED`.
3. **Text-to-3D Refine** — For text-to-3D, when preview completes, `check-model-status` automatically kicks off a refine task for full textures.
4. **Store Model** — On `SUCCEEDED`, downloads GLB from Meshy CDN and uploads to Supabase Storage (`3d-models` bucket). Updates `generated_models` record with model URL.
5. **Post-Processing** — Triggers Modal/Blender repair service for print-readiness (pre-warmed during generation via `MODAL_WARM_ENDPOINT_URL`).

#### Polling Mechanism

- **Interval:** Frontend polls every 3-5 seconds via `check-model-status` Edge Function
- **Timeout:** No hard timeout; tasks typically complete in 1-5 minutes
- **Webhook Alternative:** `meshy-webhook` Edge Function can receive completion notifications directly from Meshy

#### Model Format Outputs

| Format | Use Case |
|--------|----------|
| GLB | Primary output; stored in Supabase Storage for 3D viewer display |
| OBJ | Used for color printing workflows (with MTL + textures) |
| STL | Generated by Blender repair service for vendor printing |

#### Rate Limits

<!-- TODO: Confirm Meshy AI rate limits from their documentation -->
- Per-API-key limits (not explicitly documented in codebase)
- Generation tasks are queued server-side

---

### fal.ai

| Field | Value |
|-------|-------|
| **Name** | fal.ai |
| **Category** | AI Image Generation / Transformation |
| **Base URL** | `https://fal.run` |
| **Authentication** | API Key via `Authorization: Key <FAL_API_KEY>` |
| **Environment Variables** | `FAL_API_KEY` |

#### Edge Function

| Function | Purpose |
|----------|---------|
| `transform-image` | Generate 2D image variations for 3D model reference |

#### Models Used

| Model ID | Purpose |
|----------|---------|
| `fal-ai/nano-banana-2/edit` | Image editing (requires input image) |
| `fal-ai/nano-banana-2` | Text-to-image (no input image needed) |

#### Input Format

```json
{
  "prompt": "Combined system prompt + user request",
  "num_images": 4,
  "output_format": "png",
  "resolution": "1K",
  "aspect_ratio": "1:1",
  "image_urls": ["https://..."]  // Only for edit mode
}
```

#### Output Format

```json
{
  "images": [
    { "url": "https://fal.run/output/..." }
  ]
}
```

#### Rate Limits

- Per-IP daily cap: 80 images/day (20 batches of 4)
- Anonymous user lifetime cap: 8 images total
- Rate limiting implemented via Supabase `rate_limit_check_and_bump` RPC

---

## Payment Processing

### Stripe

| Field | Value |
|-------|-------|
| **Name** | Stripe |
| **Category** | Payment Processing |
| **API Version** | `2023-10-16` |
| **SDK** | `stripe@14.9.0` (Deno ESM) |
| **Environment Variables** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

#### Edge Functions

| Function | Purpose |
|----------|---------|
| `create-checkout-session` | Create Stripe Checkout session, store order data |
| `stripe-webhook` | Handle Stripe webhook events, update order status |

#### Endpoints / SDK Methods

| Operation | Method | Purpose |
|-----------|--------|---------|
| `stripe.checkout.sessions.create()` | SDK | Create checkout session with line items |
| `stripe.webhooks.constructEventAsync()` | SDK | Verify webhook signature |
| `stripe.paymentIntents.retrieve()` | SDK | Get payment intent details |
| `stripe.paymentMethods.retrieve()` | SDK | Get payment method (card brand/last4) |

#### Checkout Flow

1. **Create Session** — `create-checkout-session` validates input (amount, user_id, model details), rejects anonymous users, creates a Stripe Checkout session with `payment_method_types: ['card']`, mode `payment`.
2. **Store Order Data** — Inserts session record into `stripe_sessions` table with all order metadata (bypasses RLS using service role key).
3. **Redirect** — Returns `session.url` to frontend for redirect to Stripe-hosted checkout page.
4. **Webhook Confirmation** — After payment, Stripe sends webhook to `stripe-webhook` Edge Function.
5. **Process Payment** — Webhook handler verifies signature, updates order status, triggers vendor-specific actions (e.g., CraftCloud invoice payment).

#### Webhook Event Types Handled

| Event Type | Action |
|------------|--------|
| `checkout.session.completed` | Update order to `paid`, log payment event, trigger CraftCloud invoice (if applicable), send confirmation email, clear cart items |
| `payment_intent.payment_failed` | Update order to `failed`, log payment event |
| `checkout.session.expired` | Update order to `expired` |

#### CraftCloud Invoice Integration

When a CraftCloud order's Stripe payment succeeds:
1. Creates CraftCloud invoice via `POST /v5/payment/invoice`
2. Executes invoice via `PATCH /v5/payment/invoice/{paymentId}`
3. Updates order status to `confirmed` on success, `paid_invoice_failed` on failure

---

## Mesh Processing

### Modal / Blender Service

| Field | Value |
|-------|-------|
| **Name** | Modal (Blender Mesh Processing) |
| **Category** | 3D Mesh Repair, Hollowing, and Scaling |
| **Platform** | Modal (serverless GPU/CPU containers) |
| **Runtime** | Python 3.11 + Blender 4.0.2 headless |
| **Deploy Command** | `modal deploy modal_app.py` |
| **Environment Variables** | `MODAL_WARM_ENDPOINT_URL` (for pre-warming) |

#### Operations

| Operation | Endpoint Label | Python Entry Point | Description |
|-----------|---------------|-------------------|-------------|
| **Repair** | `repair-mesh` | `/app/repair.py` | Mesh validation, topology cleanup, solidify, decimation → STL |
| **Hollow** | `hollow-model` | `/app/hollow.py` | Interior hollowing with drain holes → STL |
| **Scale + Hollow** | `process-model` | `/app/scale_and_hollow.py` | Scale to target dimensions, hollow, export OBJ + STL + GLB + color bundle ZIP |

#### Input/Output File Formats

| Operation | Input Formats | Output Formats |
|-----------|--------------|----------------|
| Repair | GLB (URL or base64) | STL (base64 or uploaded to Supabase Storage) |
| Hollow | GLB, STL, OBJ (URL or base64) | STL (base64 or uploaded to Supabase Storage) |
| Scale + Hollow | GLB, OBJ | OBJ + STL + GLB + ZIP color bundle |

#### Repair Endpoint

**POST** `/repair-mesh`

```json
{
  "glb_url": "https://...",
  "min_wall_thickness": 0.8,
  "auto_solidify": true,
  "voxel_fallback": true,
  "upload_url": "https://...",
  "stl_public_url": "https://...",
  "supabase_url": "...",
  "supabase_service_key": "...",
  "model_id": "..."
}
```

Returns repair report with `print_ready` boolean, updates `generated_models` table.

#### Hollow Endpoint

**POST** `/hollow-model`

```json
{
  "model_url": "https://...",
  "wall_thickness": 2.0,
  "drain_holes": 2,
  "hole_diameter": 3.0,
  "iterations": 300,
  "step_size": 0.2,
  "upload_url": "https://...",
  "stl_public_url": "https://..."
}
```

#### Scale + Hollow (Process Model) Endpoint

**POST** `/process-model`

```json
{
  "glb_url": "https://...",
  "scale_value": 7,
  "scale_unit": "cm",
  "scale_target": "height",
  "wall_thickness": 2.0,
  "drain_holes": 2,
  "hole_diameter": 3.0,
  "upload_url_obj": "https://...",
  "upload_url_stl": "https://...",
  "upload_url_glb": "https://...",
  "upload_url_bundle": "https://...",
  "supabase_url": "...",
  "supabase_service_key": "...",
  "model_id": "..."
}
```

#### Warm-up Endpoint

**GET** `/warm` — Lightweight endpoint to pre-warm the container and avoid cold starts. Called fire-and-forget during model generation.

#### Container Configuration

- **Timeout:** 600 seconds (10 minutes)
- **Memory:** 2048 MB
- **CPU:** 2.0 cores
- **Concurrency:** Up to 4 concurrent inputs per container
- **Blender subprocess timeout:** 480 seconds (8 minutes)

#### Rate Limits

- No explicit rate limits; constrained by Modal container scaling
- Concurrent processing limited to 4 inputs per container instance via `@modal.concurrent(max_inputs=4)`
