# Phase 2 — Finishing touches (deferred)

This file captures the small, low-risk finishing items to do later before marking Phase 2 "fully complete". We will defer these to focus on Phase 3.

## Checklist

- [ ] Add 401-refresh + single-retry wrapper for all Shapeways API calls (upload, model-info, shipping).
- [ ] Add a lightweight retry/backoff for transient network errors on upload and shipping (retry once with short backoff).
- [ ] Cache the Shapeways auth token in module scope (or reuse `vendor-shapeways-auth`) to reduce token calls under load.
- [ ] Expand structured logging: add `quote_request_start`, `shipping_selected`, and `material_price_stabilized` events.
- [ ] Improve error mapping: translate internal errors (`upload_failed`, `shipping_options_failed`, `material_price_unavailable`) to friendlier client codes/messages.
- [ ] Add Deno tests for:
  - material mapping negative cases
  - function-level mocked flows: success, 401->retry success, shipping failure, price timeout
- [ ] Decide whether to keep the commented "reuse existing quote" block or reintroduce with strict validation (file_hash + material_id + shipping_zip + quantity + TTL). Document choice.
- [ ] Consider returning breakdown fields to the frontend in quote response (shippingPrice, itemTotal, surcharge) for clearer UX.
- [ ] Harden JWT handling: prefer Supabase runtime auth helpers (or validate parsed JWT more defensively).
- [ ] Confirm frontend/server material mapping parity and prune any unreachable combos.
- [ ] Perform a quick security review of `quote_summary` view exposure and ensure it isn't accidentally exposed to client role.

## Notes / Rationale

- These are small improvements that reduce user-facing flakiness and improve observability, but are not blockers for Phase 3 work.
- Priorities: token refresh + retry wrapper (high), tests + logging (medium), UX payload changes (low).

## Deferment

We defer implementing these items now so we can move into Phase 3 (order placement, webhooks, payment finalization). Keep this file as the single source of truth for Phase 2 follow-ups.
