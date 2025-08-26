# Phase 3 — High-level overview: Order placement (Shapeways)

Goal: Implement end-to-end ordering for Shapeways from the app so logged-in users can place paid orders for generated models. Phase 3 uses Shapeways credit-card ordering (server-side) for MVP; Stripe integration for hosted payment will be introduced later.

## Acceptance criteria

- A logged-in user can place an order from the Order flow and receive a confirmed vendor order id (or a clear failure). 
- Orders and order events are recorded in DB with robust state transitions and audit trail. 
- Payments are captured/authorized per chosen payment flow (Shapeways card-on-file or vendor-supplied charge). 
- The system can track vendor-side order state via webhooks and/or background polling and update local order state.
- RLS and secrets ensure only service_role code can call vendor APIs and sensitive data is never exposed to clients.

## Big pieces (components)

1. Database
   - `orders` (canonical app order): id, user_id, vendor, quote_id (nullable), vendor_order_id, model_url, file_hash, material_id, selections jsonb, quantity, price_subtotal, shipping_price, tax, price_total, currency, payment_status, fulfillment_status, shipping_address jsonb, billing_info jsonb (service_role only), raw_vendor_response jsonb, created_at, updated_at.
   - `order_events` (audit log): id, order_id, event_type, payload jsonb, created_at.
   - `vendor_orders` (optional): vendor-specific metadata for retries/ids/webhook tokens.
   - Existing `quotes` table will be referenced (quote_id) for provenance.

2. Edge Functions (Supabase) — server-only
   - `vendor-shapeways-create-order` (main): given a quoteId (or request payload), place the order with Shapeways, handle payment (card capture if available), persist vendor_order_id + raw response, return sanitized result to FE.
   - `vendor-shapeways-order-status-webhook` (endpoint): receive Shapeways webhooks (if Shapeways provides) and translate to `order_events` + update `orders` rows. Protect endpoint with a secret and verify signature.
   - `vendor-shapeways-cancel-order` (support): cancel/void if supported by vendor.
   - Shared helpers: material-mapping, token management (cached), fetch wrappers (401 refresh + retry), and request signing helpers.

3. Payment flow (MVP)
   - Option A (MVP): Use Shapeways's server-side payment flow where the platform charges the user's card on file / Shapeways account via API. This requires server-side credentials and potentially storing a Shapeways payment token.
   - Option B (future): Use Stripe as primary payment processor for checkout; after capture, forward payment details to vendor (or place order with vendor using account funding). Phase 3 will implement Option A MVP and design for easy migration to Option B.

4. Order lifecycle & state machine
   - States: created -> placed -> vendor_confirmed -> in_production -> shipped -> delivered | failed | cancelled.
   - Ensure idempotency keys on create-order to avoid duplicate vendor orders (use quote id + user id + request nonce).
   - Implement `order_events` for external state updates and operator troubleshooting.

5. Webhooks & background sync
   - Accept vendor webhooks (fulfillment/shipping) and update `orders` and `order_events`.
   - If vendor webhooks are unavailable/limited, add a scheduled background job (Edge Function run by cron) to poll vendor order status for pending orders.

6. Security & secrets
   - Store SHAPEWAYS_CLIENT_ID/SECRET and any payment tokens in Supabase secrets (Edge Function env). Never log secrets or full billing details.
   - RLS: `orders` rows readable by owner only; service_role functions can manage all. Admin views (service_role) for operators.
   - Webhook endpoint validated by HMAC or secret token.

7. Frontend changes
   - Add `services/shapeways.createOrder` that calls the `vendor-shapeways-create-order` edge function.
   - On FE: build a minimal checkout confirmation screen showing breakdown, payment method, and final confirmation.
   - Show live order status in `UserProfile` / `Order History` (poll or subscribe to realtime DB changes).

8. Observability & retries
   - Centralize vendor-call wrapper: 10s timeout + 1 retry (except idempotent create where retry must be idempotent). Log structured events to function logs and `function_errors` if failing.
   - Insert `order_events` for all key transitions and errors.

9. Tests & QA
   - Integration tests (Deno or test harness) mocking Shapeways endpoints for happy/sad paths.
   - Manual staging flow end-to-end test: UI -> create-order -> vendor order created -> webhook simulation -> final status update.

## MVP rollout plan (high-level)

1. Create DB schemas (`orders`, `order_events`) + RLS policies and migration SQL.
2. Implement `vendor-shapeways-create-order` with simple flow: accept quoteId, validate ownership, call Shapeways order API, persist vendor_order_id, return minimal status to FE. Use card-on-file flow if available.
3. Wire FE `Order.tsx` to call `createOrder` after user confirms and payment (server-side).
4. Add webhook endpoint + local webhook test harness; update `orders` upon webhook receipt.
5. Add background poller (cron) to reconcile any stuck orders.
6. Run tests and perform a careful staging test with a non-production Shapeways account.

## Risks & unknowns

- Shapeways payment APIs and what payment flows they allow (direct card charge vs deferred capture vs redirect) — confirm API capabilities before implementing captures.
- Webhook availability and signature verification details — get vendor docs or implement polling fallback.
- Tax/compliance and refunds — plan for Phase 4 for refund and lifecycle automation.