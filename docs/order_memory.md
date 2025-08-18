# Order Page — Memory Index (concise)

Purpose: short, token-conscious reference for future agents about the Order flow, where to find code, types, and critical notes.

## Quick pointers
- Order page component: [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:96)
  - Reads navigation state: const { modelData, modelUrl, stlUrl } = location.state (see [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:96:99)).
  - Auto-populates Slant form from `stlUrl` in useEffect: [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:183).
  - Quote call (client → edge function): calls `supabase.functions.invoke('slant3d-quote', ...)` (see [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:868) and [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:979)).
  - Place order call (client → edge function): calls `supabase.functions.invoke('slant3d-order', ...)` (see [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:355)).

- Navigation sources that supply model to Order:
  - Generate page (generated models): [`frontend/src/pages/Generate.tsx`](frontend/src/pages/Generate.tsx:200) — navigates with { modelData, modelUrl, stlUrl }.
  - Marketplace: [`frontend/src/pages/Marketplace.tsx`](frontend/src/pages/Marketplace.tsx:142) — navigates with { modelData, modelUrl, stlUrl }.
  - DesignDetails: [`frontend/src/pages/DesignDetails.tsx`](frontend/src/pages/DesignDetails.tsx:370) — navigates with { modelData, modelUrl }.

## Edge Functions (server)
- Quote function: [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:1)
  - Endpoint: SLANT3D_QUOTE_URL = `https://www.slant3dapi.com/api/order/estimate` (see top of file).
  - Validates critical fields: fileURL, email, name, phone (`slant3d-quote` requires these) — see validation at [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:68).
  - POSTs an array [orderData] to Slant estimate API and returns parsed JSON to client.

- Order function: [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:1)
  - Endpoint: SLANT3D_ORDER_URL = `https://www.slant3dapi.com/api/order`.
  - Validates many required fields (email, phone, name, orderNumber, filename, fileURL, billing/shipping fields, order item details) — see requiredFields at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:95).
  - Sends array [orderData] to Slant order API and, on success, inserts an `orders` row:
    - Inserted columns: slant_order_id, order_number, customer_name, customer_email, file_url, filename, quantity, color, profile, status, order_data (JSONB) — see DB insert at [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:181).
  - Returns normalized order summary for UI to display (used by OrderSuccess modal).

- Stripe integration:
  - Disabled / commented out. Server stub exists: [`frontend/supabase/functions/create-checkout-session/index.ts`](frontend/supabase/functions/create-checkout-session/index.ts:1).
  - Frontend helper `stripeService` is commented out: [`frontend/src/services/stripe.ts`](frontend/src/services/stripe.ts:1).

## DB tables (where used / referenced)
- generated_models: stores generated model metadata & URLs (glb_url / stl_url / obj_url). Used widely:
  - Model types: [`frontend/src/types/model.ts`](frontend/src/types/model.ts:24).
  - Fetch marketplace models: [`frontend/src/services/modelService.ts`](frontend/src/services/modelService.ts:219).
  - UI listing: Dashboard and other pages reference `generated_models`.
- orders: used to persist manufacturing orders after Slant success.
  - Insert details in `slant3d-order` function: [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:181).
- manufacturing_quotes: referenced in backup notes (where quotes would be stored).

## Types (exact files)
- Model / GeneratedModel: [`frontend/src/types/model.ts`](frontend/src/types/model.ts:24).
- ModelUrls / ModelOutput: [`frontend/src/types/model.ts`](frontend/src/types/model.ts:1).
- App Order / ManufacturingQuote types: [`frontend/src/types/index.ts`](frontend/src/types/index.ts:41) and [`frontend/src/types/index.ts`](frontend/src/types/index.ts:52).

## UI components
- Order success modal: [`frontend/src/components/Order/OrderSuccessModal.tsx`](frontend/src/components/Order/OrderSuccessModal.tsx:36).
- Model viewer used across pages: [`frontend/src/components/3D/ModelViewer.tsx`](frontend/src/components/3D/ModelViewer.tsx:1).

## Important behavioral notes (short)
- The Order page requires a valid STL URL (`stlUrl`) to get quotes; `stlUrl` is auto-filled when supplied. If missing, users must paste a file URL manually.
  - Auto-fill code: [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:183).
- Quote endpoint requires contact fields (name/email/phone). The UI pre-fills some defaults but user review is needed.
  - Quote validation: [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:68).
- Color/profile: client currently maps user color to Slant values via `mapColorToSlantAPI` and in places forces defaults (`order_item_color: 'white'`, `profile: 'PLA'`) for compatibility. See mapping and forced values at:
  - `mapColorToSlantAPI`: [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:69).
  - Forced values during order creation: [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:343).
- Auth / user linking: `slant3d-order` attempts to derive userId from Authorization header, but client-side `supabase.functions.invoke(...)` calls may not attach the auth header automatically — if linking orders to users is required, ensure invocation includes user session/auth header.
  - Auth logic: [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:49).

## Short TODOs (for next agent)
- Verify all navigation sources include `stlUrl` (Generate, Marketplace, DesignDetails) or add fallback flow.
- Decide: re-enable Stripe or keep Slant direct billing (adjust UI copy that still references Stripe).
- Add explicit mapping/validation for colors and materials to prevent forced defaulting.
- Surface DB insert errors (currently logged but non-blocking) so failed persistence can be remedied.

## One-line summary
Order page auto-receives model state from generation/marketplace, uses Supabase Edge Functions to request quotes (slant3d-quote) and place orders (slant3d-order) with Slant3D; Stripe exists but is disabled. Key files: [`frontend/src/pages/Order.tsx`](frontend/src/pages/Order.tsx:96), [`frontend/supabase/functions/slant3d-quote/index.ts`](frontend/supabase/functions/slant3d-quote/index.ts:1), [`frontend/supabase/functions/slant3d-order/index.ts`](frontend/supabase/functions/slant3d-order/index.ts:1).
