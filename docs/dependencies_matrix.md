# Dependencies — Roles Matrix (concise, with file:line references)

Purpose: quick reference of critical dependencies, their role in the Order/Quote flow, and exact places in the codebase where they are used or configured.

Format: Dependency — Role — Primary code references (file:line)

---

1) Supabase (client SDK + Edge Functions + Auth + Storage + DB)
- Role: Primary backend platform — authentication, edge functions, storage buckets, and Postgres DB (tables like `generated_models`, `orders`).
- Key references:
  - Client creation: [`frontend/src/supabaseClient.ts`](frontend/src/supabaseClient.ts:2)
  - `supabase.functions.invoke` calls from client (quote/order): [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:869), [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:355)
  - Edge Functions (Deno) calling external APIs and DB inserts: 
    - Quote function: [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:4)
    - Order function: [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:10)
  - Storage usage for model files (bucket `model-files`): [`frontend/src/services/storage.ts`](frontend/src/services/storage.ts:5)
  - Server-side DB insert (orders): [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:181)

2) Slant3D (external manufacturing API)
- Role: Provide price estimates (quote) and accept manufacturing orders (order placement). Edge functions forward client payloads to Slant3D and return/format responses.
- Key references:
  - Quote endpoint usage: [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:3)
  - Order endpoint usage: [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:3)
  - Client mapping + forced defaults (profile/color) before calling order function: [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:343)

3) Meshy (3D generation service) — (integration via Edge Function)
- Role: Generate 3D models (GLB/OBJ), which are then converted as needed (STL) and stored. Generated STLs are used to request quotes / place orders.
- Key references:
  - Client triggers generate-3d-model Edge Function: [`frontend/src/services/modelService.ts`](frontend/src/services/modelService.ts:19)
  - Generated model types used by UI: [`frontend/src/types/model.ts`](frontend/src/types/model.ts:24)

4) Stripe (payments) — present but disabled
- Role: Optional payment processing (Stripe Checkout). In current code Stripe flow is commented out; the project uses Slant direct order flow instead.
- Key references:
  - Frontend helper (disabled): [`frontend/src/services/stripe.ts`](frontend/src/services/stripe.ts:1)
  - Edge server stub (disabled): [`frontend/supabase/functions/create-checkout-session/index.ts`](frontend/supabase/functions/create-checkout-session/index.ts:1)
  - Comments on switching flows in Order UI: [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:270)

5) React / Router / UI libraries
- Role: Frontend UI framework & routing.
- Key references:
  - Order page imports React and router hooks: [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:1), [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:2)
  - Icon library usage (UI): [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:3)

6) supabase-js package (JS SDK)
- Role: Client-side SDK used to call Edge Functions, auth, storage, and Postgres.
- Key references:
  - SDK import in client bootstrap: [`frontend/src/supabaseClient.ts`](frontend/src/supabaseClient.ts:2)
  - Usage across services: [`frontend/src/services/modelService.ts`](frontend/src/services/modelService.ts:2), [`frontend/src/services/storage.ts`](frontend/src/services/storage.ts:1)

7) Deno (edge runtime for server functions)
- Role: Edge function runtime (Deno.serve used in each function).
- Key references:
  - Deno serve in quote function: [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:4)
  - Deno serve in order function: [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:10)

8) Project-specific services and utilities
- Model services: create/read/update models, and upload files.
  - Client wrapper: [`frontend/src/services/modelService.ts`](frontend/src/services/modelService.ts:16)
  - Server-side model DB utilities: [`frontend/src/services/model.ts`](frontend/src/services/model.ts:7)
- Storage service wrapper:
  - Upload + DB save: [`frontend/src/services/storage.ts`](frontend/src/services/storage.ts:16)
- Order UI helpers (color mapping):
  - Color → Slant mapping: [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:69)

---

## Quick risk & action summary
- Auth-dependent persistence: `slant3d-order` attempts to resolve a user via Authorization header — ensure the client call carries auth if `orders.user_id` matters. See: [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:51)
- Stripe is disabled: if payments must be handled via Stripe instead of Slant, re-enable and wire [`frontend/src/services/stripe.ts`](frontend/src/services/stripe.ts:1) together with the server stub [`frontend/supabase/functions/create-checkout-session/index.ts`](frontend/supabase/functions/create-checkout-session/index.ts:1).
- External API keys required in environment:
  - `SLANT3D_API_KEY` for Slant endpoints: [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:31)
  - `SUPABASE_SERVICE_ROLE_KEY` for server-side DB writes in order function: [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:35)

---

If you want, I will:
- create a short `docs/dependencies_actions.md` listing environment variables to verify and a checklist for re-enabling Stripe, or
- proceed to catalog materials/colors/vendors with exact line refs. Choose next via the ask tool.