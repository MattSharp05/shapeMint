# Order Lifecycle

> Last updated: 2025-01-27 | Source of truth: `docs/supabase-backup/schema.sql`, `frontend/supabase/functions/stripe-webhook/index.ts`, `frontend/supabase/functions/vendor-*/index.ts`

This document describes the order state machine, vendor-specific status mappings, payment flow, error handling, and the relationship between the `orders`, `stripe_sessions`, and `failed_orders` tables.

---

## Table of Contents

1. [Order State Machine](#order-state-machine)
2. [Vendor-Specific Status Mapping](#vendor-specific-status-mapping)
3. [Payment Flow](#payment-flow)
4. [Error Handling](#error-handling)
5. [Vendor-Specific Data on Orders](#vendor-specific-data-on-orders)
6. [Status Relationship Diagram](#status-relationship-diagram)

---

## Order State Machine

### Valid States

| State | Description |
|-------|-------------|
| `created` | Order record exists but no payment or vendor action has occurred (legacy Slant3D flow) |
| `pending` | Order inserted in DB, awaiting vendor submission (Shapeways, Treatstock direct flow) |
| `pending_payment` | Order created with vendor, Stripe checkout session issued, awaiting customer payment (CraftCloud, Sculpteo) |
| `paid` | Stripe webhook confirmed payment; order not yet submitted to vendor (generic Stripe flow) |
| `submitted` | Order successfully placed with the printing vendor |
| `confirmed` | CraftCloud invoice payment executed successfully after Stripe payment |
| `in_production` | Vendor has begun manufacturing the order |
| `shipped` | Vendor has shipped the order; tracking number available |
| `delivered` | Order received by customer |
| `cancelled` | Order cancelled (by user, vendor, or system) |
| `failed` | Payment failed or vendor order creation failed |
| `expired` | Stripe checkout session expired without payment |
| `paid_invoice_failed` | Stripe payment succeeded but CraftCloud invoice creation/execution failed |

### Valid State Transitions

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         ORDER STATE MACHINE                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────┐   payment     ┌──────┐   vendor submit   ┌───────────┐    │
│  │ created │──────────────►│ paid │──────────────────►│ submitted │    │
│  └─────────┘   (webhook)   └──────┘                   └─────┬─────┘    │
│                                                              │          │
│  ┌─────────┐   vendor OK   ┌───────────┐                    │          │
│  │ pending │──────────────►│ submitted │◄───────────────────┘          │
│  └─────────┘               └─────┬─────┘                               │
│                                   │                                      │
│  ┌─────────────────┐  payment    │  vendor starts                       │
│  │ pending_payment │────────┐    │  manufacturing                       │
│  └────────┬────────┘        │    ▼                                      │
│           │                 │  ┌───────────────┐                        │
│           │  (CraftCloud)   │  │ in_production │                        │
│           │  invoice OK     │  └───────┬───────┘                        │
│           ▼                 │          │                                 │
│  ┌───────────┐             │          │  vendor ships                   │
│  │ confirmed │             │          ▼                                  │
│  └───────────┘             │  ┌─────────┐                               │
│                             │  │ shipped │                               │
│                             │  └────┬────┘                               │
│                             │       │  customer receives                 │
│                             │       ▼                                    │
│                             │  ┌───────────┐                             │
│                             │  │ delivered │                             │
│                             │  └───────────┘                             │
│                             │                                            │
│  TERMINAL / ERROR STATES:   │                                            │
│  ┌─────────┐  ┌────────┐  ┌──────────────────────┐  ┌───────────┐     │
│  │ expired │  │ failed │  │ paid_invoice_failed  │  │ cancelled │     │
│  └─────────┘  └────────┘  └──────────────────────┘  └───────────┘     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Transition Table

| From | To | Triggering Event |
|------|----|-----------------|
| `created` | `paid` | `checkout.session.completed` webhook received |
| `created` | `expired` | `checkout.session.expired` webhook received |
| `created` | `failed` | `payment_intent.payment_failed` webhook received |
| `pending` | `submitted` | Vendor API order creation succeeds (Shapeways, Treatstock) |
| `pending` | `failed` | Vendor API order creation fails |
| `pending_payment` | `paid` | `checkout.session.completed` webhook (generic) |
| `pending_payment` | `confirmed` | CraftCloud invoice payment succeeds after Stripe payment |
| `pending_payment` | `paid_invoice_failed` | CraftCloud invoice creation or execution fails after Stripe payment |
| `pending_payment` | `expired` | `checkout.session.expired` webhook received |
| `paid` | `submitted` | Vendor order placed successfully (post-payment submission) |
| `submitted` | `in_production` | Vendor status poll returns production status |
| `submitted` | `shipped` | Vendor webhook or status poll indicates shipment |
| `submitted` | `cancelled` | Vendor cancels the order |
| `in_production` | `shipped` | Vendor webhook or status poll indicates shipment |
| `shipped` | `delivered` | Vendor status poll indicates delivery |
| Any state | `cancelled` | Manual cancellation or vendor cancellation |

---

## Vendor-Specific Status Mapping

Each vendor uses its own status vocabulary. The system maps these to common internal states when polling or receiving webhooks.

### Slant3D

| Slant3D Status | Internal Status | Source |
|----------------|-----------------|--------|
| (draft created) | `submitted` | `vendor-slant3d-create-order` sets status on successful process |
| `order.shipped` (webhook event) | `shipped` | `vendor-slant3d-webhook` updates on webhook receipt |

Slant3D uses webhooks to push status updates. The `vendor-slant3d-webhook` function listens for `order.shipped` events and updates the order status accordingly. Tracking numbers are stored in `vendor_status` JSONB field.

### Shapeways

| Shapeways Status | Internal Status | Source |
|------------------|-----------------|--------|
| `placed` | `submitted` | Initial state after `POST /orders/v1` succeeds |
| `in_production` | `in_production` | `vendor-shapeways-get-order` polls and maps via regex |
| `shipped` | `shipped` | `vendor-shapeways-get-order` polls and maps via regex |
| `delivered` | `delivered` | `vendor-shapeways-get-order` polls and maps via regex |
| `cancelled` | `cancelled` | `vendor-shapeways-get-order` polls and maps via regex |

Shapeways uses polling via `GET /orders/{orderId}/v1`. The `vendor-shapeways-get-order` function maps vendor statuses using regex matching (`/shipped/i`, `/delivered/i`, `/production|in_production/i`).

### CraftCloud

| CraftCloud Status | Internal Status | Source |
|-------------------|-----------------|--------|
| `ordered` | `submitted` | `STATUS_MAP` in `vendor-craftcloud-get-order` |
| `in_production` | `in_production` | `STATUS_MAP` in `vendor-craftcloud-get-order` |
| `shipped` | `shipped` | `STATUS_MAP` in `vendor-craftcloud-get-order` |
| `received` | `delivered` | `STATUS_MAP` in `vendor-craftcloud-get-order` |
| `blocked` | `failed` | `STATUS_MAP` in `vendor-craftcloud-get-order` |
| `cancelled` | `cancelled` | `STATUS_MAP` in `vendor-craftcloud-get-order` |

CraftCloud uses polling via `GET /v5/order/{orderId}/status`. The get-order function enforces forward-only status progression (status can only advance, never regress) except for terminal states (`failed`, `cancelled`).

### Treatstock

| Treatstock Status | Internal Status | Source |
|-------------------|-----------------|--------|
| (order placed) | `submitted` | Set by `vendor-treatstock-create-order` on success |

Treatstock does not provide a direct API endpoint for order status polling. The `vendor-treatstock-get-order` function returns data stored in the local database. Status updates rely on manual checks or future webhook integration.

### Sculpteo

| Sculpteo Status | Internal Status | Source |
|-----------------|-----------------|--------|
| (order created, pre-payment) | `pending_payment` | Set by `vendor-sculpteo-create-order` |
| (payment confirmed) | `paid` | Stripe webhook updates status |

Sculpteo integration is in progress. The `vendor-sculpteo-submit-order` function is intended to submit the order to Sculpteo after payment confirmation, but the webhook-to-submit wiring is not yet complete. Orders remain in `pending_payment` → `paid` without being placed at Sculpteo until this is connected.

---

## Payment Flow

The payment flow varies by vendor but follows a common pattern centered on Stripe Checkout.

### Generic Flow (Legacy / Download Orders)

```
Frontend                    create-checkout-session         Stripe              stripe-webhook
   │                              │                          │                       │
   │  POST /create-checkout-session                          │                       │
   │──────────────────────────────►│                          │                       │
   │                              │  stripe.checkout.sessions.create()               │
   │                              │─────────────────────────►│                       │
   │                              │◄─────────────────────────│                       │
   │                              │  INSERT stripe_sessions   │                       │
   │                              │  (session_id, metadata)   │                       │
   │◄──────────────────────────────│                          │                       │
   │  { url: stripe_checkout_url }│                          │                       │
   │                              │                          │                       │
   │  REDIRECT to Stripe Checkout │                          │                       │
   │─────────────────────────────────────────────────────────►│                       │
   │                              │                          │                       │
   │  Customer completes payment  │                          │                       │
   │                              │                          │  POST /stripe-webhook │
   │                              │                          │──────────────────────►│
   │                              │                          │                       │
   │                              │                          │  Verify signature     │
   │                              │                          │  UPDATE orders SET    │
   │                              │                          │    status='paid',     │
   │                              │                          │    payment_status=    │
   │                              │                          │    'paid'             │
   │                              │                          │◄──────────────────────│
   │  REDIRECT to success_url     │                          │                       │
   │◄─────────────────────────────────────────────────────────│                       │
```

### Step-by-Step

1. **Session Creation** — Frontend calls `create-checkout-session` with amount, user_id, model details, and redirect URLs. Anonymous users are rejected (HTTP 403).
2. **Stripe Session** — Edge Function creates a Stripe Checkout session with `payment_method_types: ['card']`, mode `payment`, and metadata containing `order_id`, `user_id`, and `payment_type`.
3. **Store in stripe_sessions** — Order metadata is inserted into the `stripe_sessions` table using the service role key (bypasses RLS). Fields stored: `session_id`, `payment_status` ('pending'), `amount_total`, `customer_email`, and full order metadata in JSONB.
4. **Redirect** — Frontend receives `session.url` and redirects the customer to Stripe's hosted checkout page.
5. **Webhook Confirmation** — After payment, Stripe sends a `checkout.session.completed` event to the `stripe-webhook` Edge Function.
6. **Signature Verification** — Webhook verifies the Stripe signature using `STRIPE_WEBHOOK_SECRET`.
7. **Order Update** — Updates the `orders` row: `status='paid'`, `payment_status='paid'`, `stripe_session_id`, `amount_paid`.
8. **Post-Payment Actions** — Sends order confirmation email, clears cart items (if cart order), and triggers vendor-specific actions (e.g., CraftCloud invoice).

### CraftCloud Payment Flow (Two-Phase)

CraftCloud orders use a "collect payment first, pay vendor via invoice" model:

1. `vendor-craftcloud-create-order` creates a CraftCloud cart and order, then creates a ShapeMint Stripe session.
2. Order is inserted with `status='pending_payment'`.
3. After Stripe payment succeeds, `stripe-webhook` detects `payment_type='craftcloud_invoice'` in metadata.
4. Webhook creates a CraftCloud invoice via `POST /v5/payment/invoice`.
5. Webhook executes the invoice via `PATCH /v5/payment/invoice/{paymentId}`.
6. On success: order status → `confirmed`. On failure: order status → `paid_invoice_failed`.

### Sculpteo Payment Flow

Sculpteo follows the same two-phase pattern as CraftCloud:

1. `vendor-sculpteo-create-order` creates a Stripe session with `payment_type='sculpteo_direct'`.
2. Order is inserted with `status='pending_payment'`.
3. After payment, `vendor-sculpteo-submit-order` is intended to place the order with Sculpteo.
4. <!-- TODO: stripe-webhook does not yet detect payment_type='sculpteo_direct' to trigger submission -->

### Slant3D / Shapeways / Treatstock Payment Flow (Direct)

These vendors use a "submit order first, payment handled separately" model:

- **Slant3D**: Order is drafted and processed (charged) directly via Slant3D's API. Payment is handled by Slant3D's billing system, not ShapeMint's Stripe.
- **Shapeways**: Order is placed via `POST /orders/v1` with `paymentMethod: 'credit_card'`. Payment is charged to the Shapeways account's stored payment method.
- **Treatstock**: Order is placed via `POST /place-order/create`. Payment terms are handled by Treatstock.

### Webhook Event Types

| Stripe Event | Action Taken |
|--------------|-------------|
| `checkout.session.completed` | Update order to `paid`, log payment event, trigger CraftCloud invoice (if applicable), send confirmation email, clear cart items |
| `payment_intent.payment_failed` | Update order to `failed`, log payment event |
| `checkout.session.expired` | Update order to `expired` |

---

## Error Handling

### failed_orders Table

The `failed_orders` table captures orders that could not be processed successfully. It serves as a dead-letter queue for orders that need manual intervention or automated reprocessing.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (auto-generated) |
| `order_data` | jsonb | Complete order payload that failed (NOT NULL) |
| `payment_info` | jsonb | Payment details associated with the failed order |
| `error_message` | text | Human-readable error description |
| `api_status` | integer | HTTP status code from the vendor API that caused the failure |
| `processed` | boolean | Whether this failed order has been reprocessed (default: `false`) |
| `created_at` | timestamptz | When the failure was recorded |

**Reprocessing Conditions:**
- A failed order can be reprocessed when `processed = false`.
- After reprocessing (successful or abandoned), `processed` is set to `true`.
- An index `idx_failed_orders_processed` exists on `processed WHERE processed = false` for efficient querying of unprocessed failures.

**RLS:** Managed exclusively by `service_role` — no direct user access.

### function_errors Table

The `function_errors` table provides a centralized error log for Edge Function failures, useful for debugging and monitoring.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (auto-generated) |
| `function_name` | text | Name of the Edge Function that errored (NOT NULL) |
| `error_message` | text | Error message text |
| `error_stack` | text | Stack trace for debugging |
| `created_at` | timestamptz | When the error was recorded |

**RLS:** Managed exclusively by `service_role` — no direct user access.

### Error Scenarios by Vendor

| Scenario | Behavior | Recovery |
|----------|----------|----------|
| Slant3D file upload fails | Returns error to frontend | User retries |
| Slant3D draft order fails (price determination) | Returns `price_determination_error` | User retries after file processing completes |
| Slant3D process order fails | Returns error; draft order exists but unprocessed | May need manual processing |
| Shapeways model still processing | Returns `model_still_processing` error | User waits 2-3 minutes and retries |
| Shapeways billing address missing | Returns `billing_address_required` with instructions | User configures Shapeways account |
| Shapeways price drift detected | Returns `price_changed` (HTTP 200 with error body) | User re-quotes |
| CraftCloud invoice creation fails | Order status → `paid_invoice_failed` | Manual intervention required |
| CraftCloud invoice execution fails | Order status → `paid_invoice_failed` | Manual intervention required |
| Treatstock prices not ready | Returns `prices_not_ready` | User retries after a few moments |
| Treatstock provider cannot print | Returns `provider_cannot_print` | User selects different material/provider |
| Stripe webhook signature invalid | Returns HTTP 400, no DB changes | Stripe retries webhook delivery |
| Stripe payment fails | Order status → `failed`, payment event logged | User retries checkout |

---

## Vendor-Specific Data on Orders

The `orders` table stores vendor-specific data in dedicated columns and generic JSONB fields.

### Slant3D Fields

| Column | Type | Description |
|--------|------|-------------|
| `slant_order_id` | text (UNIQUE) | Slant3D's public order ID (e.g., `SLANT_...`) |
| `slant_response` | jsonb | Raw JSON response from Slant3D at order creation |

The `vendor-slant3d-create-order` function stores the Slant3D `publicOrderId` in `vendor_order_id` and sets `vendor='slant3d'`. The legacy `slant_order_id` column exists for backward compatibility.

### Sculpteo Fields

| Column | Type | Description |
|--------|------|-------------|
| `sculpteo_order_id` | text (UNIQUE) | Sculpteo-issued order ID (populated by `vendor-sculpteo-submit-order` after payment) |
| `sculpteo_response` | jsonb | Raw JSON response from Sculpteo at order submission |

These columns were added via migration (`docs/sql-snippets/2026-sculpteo-orders-columns.sql`) to mirror the Slant3D pattern.

### Generic JSONB Fields (All Vendors)

| Column | Type | Description |
|--------|------|-------------|
| `order_data` | jsonb | Generic order payload data (used by legacy flows) |
| `vendor_order_raw` | jsonb | Raw vendor API response at order creation (CraftCloud, Shapeways, Treatstock, Sculpteo) |
| `last_vendor_status` | jsonb | Most recent vendor status response from polling |
| `selections` | jsonb | Material/configuration selections made by the user |
| `shipping_address` | jsonb | Customer shipping address |
| `billing_address` | jsonb | Customer billing address |

### Vendor-Specific selections JSONB Content

| Vendor | selections Content |
|--------|-------------------|
| **Slant3D** | `{ filamentId: "<uuid>" }` |
| **Shapeways** | `{ baseMaterialId, colorId?, finishId? }` |
| **CraftCloud** | `{ craftcloudQuoteId, craftcloudShippingId, craftcloudPriceId, cartId }` |
| **Treatstock** | `{ materialGroup, color, providerId? }` |
| **Sculpteo** | `{ sculpteoDesignUuid, sculpteoProductCode, sculpteoShippingCode, modelId }` |

### Vendor-Specific vendor_order_raw Content

| Vendor | vendor_order_raw Content |
|--------|--------------------------|
| **Slant3D** | Full Slant3D process order response |
| **Shapeways** | Shapeways `POST /orders/v1` response (`{ result, orderId, ... }`) |
| **CraftCloud** | `{ orderId, orderNumber, cartData, craftcloudTotal, paymentMethod }` |
| **Treatstock** | Full Treatstock `POST /place-order/create` response |
| **Sculpteo** | `{ provider, designUuid, productCode, shippingCode, priorQuote, paymentMethod }` |

---

## Status Relationship Diagram

The following table shows how `orders.status`, `orders.payment_status`, and the `failed_orders` table relate to each other across different order scenarios.

### orders.status vs orders.payment_status

| orders.status | orders.payment_status | Scenario |
|---------------|----------------------|----------|
| `created` | `pending` | Order record created, no payment attempted |
| `pending` | (not set) | Vendor-direct order inserted, awaiting vendor submission |
| `pending_payment` | `pending` | Stripe session created, customer hasn't paid yet |
| `paid` | `paid` | Stripe payment confirmed via webhook |
| `confirmed` | `paid` | CraftCloud invoice executed after Stripe payment |
| `submitted` | (not set) | Vendor-direct order placed (Slant3D/Shapeways/Treatstock handle payment) |
| `in_production` | `paid` | Vendor manufacturing; payment was confirmed earlier |
| `shipped` | `paid` | Order shipped by vendor |
| `delivered` | `paid` | Order received by customer |
| `failed` | `pending` or `failed` | Payment failed or vendor rejected order |
| `expired` | `pending` | Stripe session expired without payment |
| `paid_invoice_failed` | `paid` | Stripe payment succeeded but CraftCloud invoice failed |
| `cancelled` | varies | Order cancelled at any stage |

### When Orders Go to failed_orders vs Stay in orders

| Condition | Storage Location | Rationale |
|-----------|-----------------|-----------|
| Vendor API returns error during order creation | `orders` table with `status='failed'` | Order row already exists; status tracks the failure |
| Payment fails (Stripe webhook) | `orders` table with `status='failed'` | Order row exists; payment_status updated |
| Order cannot be created at all (pre-insert failure) | `failed_orders` table | No order row exists; raw payload preserved for retry |
| CraftCloud invoice fails after payment | `orders` table with `status='paid_invoice_failed'` | Order row exists; customer was charged |
| Stripe session expires | `orders` table with `status='expired'` | Order row exists; no payment was collected |

### Key Insight

The `failed_orders` table is a **fallback for catastrophic failures** where an order row could not be created in the `orders` table at all. Most error scenarios are handled by updating the existing `orders` row status to a terminal state (`failed`, `expired`, `paid_invoice_failed`, `cancelled`). The `failed_orders` table captures the raw `order_data` JSONB so that an admin can manually reprocess the order later.

### Excalidraw-Ready Diagram Description

```
[Stripe Checkout Session] ---(payment succeeds)---> [stripe-webhook]
    |                                                      |
    | stores session_id + metadata                         | verifies signature
    v                                                      v
[stripe_sessions table]                            [orders table]
    - session_id (UNIQUE)                              - status: paid
    - payment_status: pending → paid                   - payment_status: paid
    - amount_total                                     - stripe_session_id (links back)
    - metadata (JSONB: order_id, user_id, etc.)        - amount_paid
                                                       |
                                                       | (if vendor API fails)
                                                       v
                                                  [orders.status = 'failed']
                                                       
[Pre-insert catastrophic failure] ──────────────► [failed_orders table]
    - order_data (JSONB)                              - processed: false → true
    - error_message                                   - reprocessable
    - api_status
```
