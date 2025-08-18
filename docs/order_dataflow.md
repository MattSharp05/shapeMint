# Order — End-to-End Data Flow (UI → Edge Functions → DB)

Purpose: concise, line-referenced data flow for the Order/Quote flow so future agents can trace requests, auth, validation, and persistence.

---

## High-level flow (one-liner)
User selects a model → frontend Order UI builds an order payload → calls Supabase Functions (`slant3d-quote` or `slant3d-order`) → Edge Function forwards to Slant3D → Edge Function returns quote/order response → (for orders) Edge Function persists to `orders` DB table → frontend shows success.

---

## 1) UI entry and data sources
- Order page component and state extraction:
  - [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:96) — component entry and
  - Extract navigation state: `const { modelData, modelUrl, stlUrl } = location.state` at [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:99).

- Pages that navigate to Order (they supply `modelData`, `modelUrl`, optionally `stlUrl`):
  - Generate → Order: [`frontend/src/pages/Generate.tsx`](frontend/src/pages/Generate.tsx:200)
  - Marketplace → Order: [`frontend/src/pages/Marketplace.tsx`](frontend/src/pages/Marketplace.tsx:142)
  - DesignDetails → Order: [`frontend/src/pages/DesignDetails.tsx`](frontend/src/pages/DesignDetails.tsx:370)

- Auto-fill of STL URL into Slant form:
  - useEffect auto-populate: [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:183) — sets `slantForm.fileURL` from `stlUrl`.

---

## 2) Client-side: Quote request (Get Quote)
- Button/Modal trigger builds `orderData` object (mapping color via `mapColorToSlantAPI`) and invokes quote:
  - Quote call locations:
    - Inline "Get Quote" button flow: [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:833) — builds `orderData`.
    - Calls Supabase Functions: `await supabase.functions.invoke('slant3d-quote', { body: { orderData } })` at [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:869) and inside modal at [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:979).

---

## 3) Edge function `slant3d-quote` (request → Slant3D estimate → response)
- Entry point: [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:1).
- Key steps:
  - Validate method/CORS: [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:9).
  - Read `SLANT3D_API_KEY` (env): [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:31).
  - Parse body and validate critical fields: `fileURL`, `email`, `name`, `phone` — validation at [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:68).
  - POST to Slant estimate endpoint (array payload): [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:96).
  - Parse and return Slant JSON to client: [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:130) → response returned at [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:147).

Auth: this function uses only `SLANT3D_API_KEY` (server-side env). No user auth required for quoting.

Errors:
- Missing critical fields → 400 with message at [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:74).
- External API error → returned as received (status preserved) at [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:110).

---

## 4) Client-side: Place Order (Buy Now / Place Order)
- `handlePlaceOrder()` builds `orderData` (shipping/billing + item) and calls `slant3d-order`:
  - Build & forced defaults (note forced `order_item_color: 'white'`, `profile: 'PLA'`) at [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:315) and logging at [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:347).
  - Invoke edge function:
    - `const { data: orderResponse, error: orderError } = await supabase.functions.invoke('slant3d-order', { body: { orderData, paymentInfo } })` at [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:355).

Auth: frontend `supabase.functions.invoke(...)` will include the session implicitly when called from a logged-in client using the JS SDK. However, `slant3d-order` also inspects the Authorization header (see server side) if present — see next section.

---

## 5) Edge function `slant3d-order` (order → Slant3D order → DB persistence)
- Entry point: [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:1).
- Key steps:
  - Validate method/CORS: [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:14).
  - Read env vars: `SLANT3D_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:32).
  - Create Supabase server client using Service Role: `createClient(supabaseUrl, supabaseServiceKey)` at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:49).
  - Attempt to extract `userId` from Authorization header:
    - Read header: `const authHeader = req.headers.get('Authorization')` at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:51).
    - If present, create a client with that header to call `auth.getUser()` to resolve `user.id` at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:55).
    - If header missing or invalid, function logs a warning and continues (`⚠️ No auth header provided`) at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:73-75).
  - Parse request body: `const { orderData, paymentInfo } = await req.json()` at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:76).
  - Validate required fields (long list) at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:95). Missing fields → 400 error.
  - POST to Slant order endpoint (`SLANT3D_ORDER_URL`) with array payload at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:137).
  - On success, parse `slantData` and extract tracking info at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:164).
  - Persist order to DB (`orders` table) using Service Role client:
    - Insert object keys: `slant_order_id`, `order_number`, `customer_name`, `customer_email`, `file_url`, `filename`, `quantity`, `color`, `profile`, `status`, `order_data` at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:181).
    - DB errors are logged but not fatal; function continues to return success to caller (intentional design) at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:196).
  - Return normalized order summary JSON for UI consumption at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:206).

Auth notes:
- The function supports linking the order to a user by reading the Authorization header if present. For the edge function to discover the user, the client must send the user's session Authorization header (some SDK calls do this automatically). If you require reliable `userId` linkage in DB, confirm the client invocation sends the auth header (or set it explicitly).

---

## 6) DB and Storage
- `generated_models` table (model metadata) is used earlier in the flow (model generation) and provides `stl_url` passed into Order UI. See model schema/type: [`frontend/src/types/model.ts`](frontend/src/types/model.ts:24).
- `orders` table: inserted by `slant3d-order` with `order_data` JSONB and vendor `slant_order_id` at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:181).
- Storage bucket `model-files` used for model assets and public URLs via Storage Service: [`frontend/src/services/storage.ts`](frontend/src/services/storage.ts:5).

---

## 7) Error handling & user feedback points
- Client-side validation prevents quote/order calls if basic fields missing:
  - `slantForm.fileURL`, `slantForm.name`, `slantForm.email` validated in `handlePlaceOrder()` at [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:248).
- Edge functions validate server-side and return structured errors:
  - Quote missing critical fields → explicit 400 message at [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:74).
  - Order missing required fields → explicit 400 message at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:116).
  - Slant API errors are forwarded or summarized (see handling in both functions at [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:110) and [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:148)).

---

## 8) Recommended quick checks / improvements
- Ensure client invocation of `slant3d-order` includes the Authorization header if order-user linkage is required. See auth extraction: [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:50).
- Consider surfacing DB insertion failures to an admin alert (currently only logged) at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:196).
- Unify color/profile mapping so the UI doesn't force `white/PLA` during order creation at [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:343).

---

## 9) Quick trace example (successful quote)
1. User clicks "Get Quote" on Order page (UI builds `orderData`) — see [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:833).
2. Frontend: supabase JS SDK issues POST to Edge Function `slant3d-quote` at [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:869).
3. Edge function validates `orderData` and sends POST to Slant estimate endpoint (`SLANT3D_QUOTE_URL`) at [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:96).
4. Edge function returns quote JSON to frontend; frontend updates `quoteSuccess` and displays breakdown at [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:798).

---

## 10) Files of interest (quick index)
- Order UI: [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:96)
- Quote function: [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:1)
- Order function: [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:1)
- Storage service: [`frontend/src/services/storage.ts`](frontend/src/services/storage.ts:3)
- Model services: [`frontend/src/services/modelService.ts`](frontend/src/services/modelService.ts:16), [`frontend/src/services/model.ts`](frontend/src/services/model.ts:7)
- Stripe (disabled): [`frontend/src/services/stripe.ts`](frontend/src/services/stripe.ts:1), server stub [`frontend/supabase/functions/create-checkout-session/index.ts`](frontend/supabase/functions/create-checkout-session/index.ts:1)
