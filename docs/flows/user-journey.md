# User Journey Flows

> Last updated: 2025-01-20 | Source of truth: `frontend/src/pages/`, `frontend/src/hooks/`, `frontend/src/services/`

This document describes the end-to-end user flows through the ShapeMint platform. Each flow is presented as numbered steps identifying the actor, action, and resulting system state. Page routes, component names, and service names are referenced at each step.

---

## Table of Contents

1. [Model Generation Flow](#1-model-generation-flow)
2. [Ordering Flow](#2-ordering-flow)
3. [Authentication Flow](#3-authentication-flow)
4. [Marketplace Flow](#4-marketplace-flow)

---

## 1. Model Generation Flow

**Summary:** User provides a text prompt or image → fal.ai generates 2D variations → user selects a variation → fal.ai generates angle views → Meshy AI generates a 3D model → model is stored in Supabase → post-processing (scale + hollow) via Modal Blender → displayed in 3D viewer with quotes.

| Step | Actor | Action | Resulting State |
|------|-------|--------|-----------------|
| 1 | User | Navigates to generation page | Generate page loads |
| 2 | User | Enters text prompt or uploads image, sets dimensions | Form populated |
| 3 | System | Creates anonymous session if none exists | User has auth identity |
| 4 | System | Creates draft model row in `generated_models` table | Draft row with `stage: 'uploaded'` |
| 5 | System | Sends 4 parallel requests to fal.ai via `transform-image` Edge Function | 2D variations generated progressively |
| 6 | User | Selects preferred variation from 4 options | `stage: 'reference_selected'` |
| 7 | System | Generates 4 angle views (front/back/left/right) via fal.ai | `stage: 'angles_ready'` |
| 8 | User | Provides name/email (InfoCollection step) | Info collected |
| 9 | System | Calls `generate-3d-model` Edge Function (multi-image-to-3d or image-to-3d) | Meshy task created, `stage: 'generating_3d'` |
| 10 | System | Redirects user to model result page | ModelResult page loads with polling |
| 11 | System | Polls Meshy via `check-model-status` Edge Function every 5 seconds | Progress updates displayed |
| 12 | System | Meshy webhook fires on completion; stores GLB/OBJ/STL URLs in Supabase | `status: 'completed'` |
| 13 | System | Triggers post-processing (scale + hollow) via Modal Blender service | `processing_status: 'processing'` |
| 14 | System | Blender service scales model to user-specified dimensions and hollows for printing | `processing_status: 'completed'`, scaled URLs stored |
| 15 | System | Fetches quotes from CraftCloud + Sculpteo using scaled model files | Quotes cached on model row |
| 16 | User | Views completed 3D model in interactive viewer with rotate/zoom | Model displayed with price quotes |

### References

| Step | Route | Component | Service/Hook |
|------|-------|-----------|--------------|
| 1–9 | `/generate` or `/create/:printType` | `Generate`, `GenerationForm`, `ImageVariationPicker`, `InfoCollection` | `useModelGeneration`, `falImageService`, `modelService.generate3DModel`, `draftModel` |
| 10–16 | `/model/:id` | `ModelResult`, `ModelViewer` | `modelService.checkModelStatus`, `craftcloud.getQuote`, `sculpteo.getSculpteoQuote` |

### Alternative Paths (Failure Conditions)

| Condition | Feedback | Recovery |
|-----------|----------|----------|
| fal.ai rate limit (daily IP limit) | Error toast: "You've hit today's generation limit. Try again tomorrow." | User waits and retries next day |
| fal.ai rate limit (anonymous lifetime limit) | `SaveAccountModal` appears requiring account creation | User creates account, generation retries automatically |
| fal.ai variation generation fails for one slot | Slot shows empty; other slots still display | User can click "Regenerate all" to retry |
| Meshy generation fails | Status shows "failed" on ModelResult page | User returns to `/generate` and starts over |
| Post-processing (Blender) fails | `processing_status: 'failed'`; quotes may use unscaled files | Quotes still load from original model files; user can order |
| Quote fetch fails | Error message per quote type (color/mono/SLS) | "Refresh Quotes" button available on ModelResult page |
| Resume interrupted session | User clicks in-progress model on Dashboard | Redirects to `/generate?resume=<id>`, rehydrates state from DB |

---

## 2. Ordering Flow

**Summary:** User selects a completed model → views vendor/material quotes → adds to cart or orders directly → provides shipping address → Stripe checkout (via CraftCloud) or direct vendor order → order tracked on Dashboard.

| Step | Actor | Action | Resulting State |
|------|-------|--------|-----------------|
| 1 | User | Views completed model on ModelResult page | Quotes displayed (color, mono, SLS) |
| 2 | User | Selects print type and vendor from quote list | Vendor selected |
| 3 | User | Clicks "Add to Cart" or "Order Now" | Item added to cart or shipping form shown |
| 4 | User | Fills in shipping address (or uses saved profile address) | Address validated |
| 5 | System | Calls `vendor-craftcloud-create-order` Edge Function | Order created with vendor, Stripe checkout URL returned |
| 6 | System | Redirects user to Stripe Checkout page | User on Stripe hosted page |
| 7 | User | Completes payment on Stripe | Payment processed |
| 8 | System | Stripe redirects to `/success` (PaymentSuccess page) | Order confirmed |
| 9 | System | Stripe webhook fires `checkout.session.completed` event | Order status updated to `submitted` |
| 10 | System | Vendor begins manufacturing | Order status: `in_production` |
| 11 | System | Vendor ships order, tracking number stored | Order status: `shipped` |
| 12 | User | Views order status and tracking on Dashboard | Tracking info displayed |

### Cart Flow (Multi-Item)

| Step | Actor | Action | Resulting State |
|------|-------|--------|-----------------|
| 1 | User | Adds multiple items to cart from different models | Cart populated |
| 2 | User | Opens cart drawer (`CartDrawer` component) | Cart items displayed |
| 3 | User | Navigates to `/cart-checkout` | CartCheckout page loads |
| 4 | User | Provides shipping address and confirms | Checkout initiated |
| 5 | System | Creates orders for each cart item | Stripe checkout URL(s) returned |
| 6 | User | Completes Stripe payment | All orders placed |

### References

| Step | Route | Component | Service/Hook |
|------|-------|-----------|--------------|
| 1–4 | `/model/:id` | `ModelResult` | `craftcloud.getQuote`, `sculpteo.getSculpteoQuote`, `useCart` |
| 3 (cart) | — | `CartDrawer` | `cartService`, `useCart` |
| 5–6 | `/cart-checkout` | `CartCheckout` | `craftcloudOrder.createOrder`, `sculpteoOrder.createSculpteoOrder` |
| 7–8 | `/success` | `PaymentSuccess` | — |
| 12 | `/dashboard` | `Dashboard` | `vendor-craftcloud-get-order` Edge Function |

### Alternative Paths (Failure Conditions)

| Condition | Feedback | Recovery |
|-----------|----------|----------|
| Quote fetch returns no vendors | "No [type] vendors available" message | User tries different print type or refreshes |
| Anonymous user tries to order | `SaveAccountModal` appears requiring account creation | User creates account, then proceeds |
| Shipping address validation fails | Form field errors highlighted | User corrects fields |
| CraftCloud order creation fails | Error message displayed below order button | User retries; failed order logged to `failed_orders` table |
| Stripe payment cancelled | Redirected to `/cancel` (PaymentCancel page) | User can retry from model page |
| Stripe payment fails | Stripe shows error on checkout page | User retries with different payment method |
| Country mismatch (profile vs. quote) | System re-quotes with correct country at checkout | Updated price shown before payment |

---

## 3. Authentication Flow

**Summary:** Every visitor starts with an anonymous Supabase session → generates models freely → prompted to create account at rate limit or checkout → anonymous session converted to permanent account preserving all data.

| Step | Actor | Action | Resulting State |
|------|-------|--------|-----------------|
| 1 | System | App loads, `AuthProvider` checks for existing session | Loading state |
| 2 | System | No session found → calls `supabase.auth.signInAnonymously()` | Anonymous session created, `isAnonymous: true` |
| 3 | User | Generates models, browses marketplace | All activity attributed to anonymous user ID |
| 4 | System | Anonymous user hits rate limit or attempts checkout | `SaveAccountModal` displayed |
| 5 | User | Enters email, password, and name in modal | Form submitted |
| 6 | System | Calls `supabase.auth.updateUser()` with email/password (converts anon → permanent) | Same user ID preserved, `isAnonymous: false` |
| 7 | System | Creates user record in `public.users` table via `userService.createUser` | Profile row created |
| 8 | System | All existing `generated_models` rows remain linked (same `user_id`) | No data migration needed |
| 9 | User | Continues with full account capabilities | Rate limits reset, checkout enabled |

### Direct Registration (Alternative Path)

| Step | Actor | Action | Resulting State |
|------|-------|--------|-----------------|
| 1 | User | Navigates to `/sign-in` | SignIn page loads |
| 2 | User | Clicks "Create Account" and fills form | Registration form submitted |
| 3 | System | Calls `supabase.auth.signUp()` + `userService.createUser()` | New authenticated user created |
| 4 | User | Redirected to app with full session | Authenticated state |

### Logout Flow

| Step | Actor | Action | Resulting State |
|------|-------|--------|-----------------|
| 1 | User | Clicks logout | `supabase.auth.signOut()` called |
| 2 | System | Immediately starts new anonymous session | Fresh anonymous identity |
| 3 | User | Can continue browsing/generating as anonymous | Previous account data not visible |

### References

| Step | Route | Component | Service/Hook |
|------|-------|-----------|--------------|
| 1–3 | Any page | `AuthProvider` (wraps entire app) | `useAuth`, `supabaseClient` |
| 4–5 | Any page (modal overlay) | `SaveAccountModal` | `useAuth.convertAnonToUser` |
| Direct reg | `/sign-in` | `SignIn` | `useAuth.register`, `userService.createUser` |
| Logout | Any page (Header) | `Header` | `useAuth.logout` |

### Alternative Paths (Failure Conditions)

| Condition | Feedback | Recovery |
|-----------|----------|----------|
| Supabase unreachable on load | "Loading..." state persists; app continues without auth | User can retry page refresh |
| Anonymous sign-in fails | `user` remains `null`; generation still possible via fallback user ID | Limited functionality |
| Account conversion fails (email already exists) | Error message in SaveAccountModal | User tries different email or logs into existing account |
| Network error during registration | Error toast displayed | User retries submission |

---

## 4. Marketplace Flow

**Summary:** User browses community-published 3D models → views model details with 3D preview → clicks "Get it Printed" → routed to ordering flow.

| Step | Actor | Action | Resulting State |
|------|-------|--------|-----------------|
| 1 | User | Navigates to marketplace | Marketplace page loads |
| 2 | System | Fetches all models where `is_marketplace_listed = true` and `status = 'completed'` | Model grid displayed |
| 3 | User | Searches/filters by category, sorts by date | Filtered results shown |
| 4 | User | Clicks model card title or thumbnail | Navigates to DesignDetails page |
| 5 | User | Views 3D model in interactive viewer, reads details | Model inspected |
| 6 | User | Clicks "Get it Printed" | Navigates to `/order` with model data in route state |
| 7 | System | Order page loads with model URL and metadata | Ordering flow begins (see Section 2) |

### Publishing to Marketplace (Creator Flow)

| Step | Actor | Action | Resulting State |
|------|-------|--------|-----------------|
| 1 | Creator | Generates and completes a 3D model | Model on ModelResult page |
| 2 | Creator | Clicks "Publish to Marketplace" | Publish form shown |
| 3 | Creator | Fills title, description, category, tags | Form submitted |
| 4 | System | Calls `modelService.publishToMarketplace()` | `is_marketplace_listed: true` set on model row |
| 5 | System | Model appears in marketplace listings | Visible to all users |

### References

| Step | Route | Component | Service/Hook |
|------|-------|-----------|--------------|
| 1–3 | `/marketplace` (not in App.tsx routes but page exists) | `Marketplace` | `modelService.fetchMarketplaceModels` |
| 4–5 | `/design/:id` | `DesignDetails`, `ModelViewer` | `supabase.from('generated_models')`, `modelUrlService.ensureStableModelUrl` |
| 6–7 | `/order` | `Order` | Navigation state passing via React Router |
| Publishing | `/model/:id` | `ModelResult` | `modelService.publishToMarketplace` |

### Alternative Paths (Failure Conditions)

| Condition | Feedback | Recovery |
|-----------|----------|----------|
| Marketplace fetch fails | Error state with "Unable to Load Marketplace" message and retry button | User clicks "Try Again" to reload |
| Model not found on DesignDetails | "Model Not Found" card with links to marketplace and generate | User navigates to marketplace or generates own model |
| 3D viewer cannot load model file | Placeholder shown: "3D model not available" | User can still click "Get it Printed" if model URLs exist |
| No models listed in marketplace | Empty grid displayed | User generates their own models |

---

## Excalidraw-Ready Flow Descriptions

### Model Generation Flow (Simplified)

```
[User] --"enters prompt/image"--> [Generate Page]
[Generate Page] --"4 parallel requests"--> [fal.ai (transform-image Edge Fn)]
[fal.ai] --"4 variations"--> [Generate Page]
[User] --"selects variation"--> [Generate Page]
[Generate Page] --"4 angle requests"--> [fal.ai]
[fal.ai] --"4 angle views"--> [Generate Page]
[User] --"submits info"--> [Generate Page]
[Generate Page] --"generate-3d-model"--> [Meshy AI (Edge Fn)]
[Meshy AI] --"webhook on completion"--> [Supabase DB]
[Supabase DB] --"triggers"--> [Modal Blender (scale+hollow)]
[Modal Blender] --"scaled files"--> [Supabase Storage]
[Supabase DB] --"quotes request"--> [CraftCloud + Sculpteo]
[User] --"views model"--> [ModelResult Page + ModelViewer]
```

### Ordering Flow (Simplified)

```
[User] --"selects vendor/material"--> [ModelResult Page]
[ModelResult Page] --"create order"--> [vendor-craftcloud-create-order Edge Fn]
[Edge Fn] --"Stripe checkout URL"--> [Browser Redirect]
[User] --"pays"--> [Stripe Checkout]
[Stripe] --"webhook"--> [Supabase (order status update)]
[Vendor] --"manufactures + ships"--> [Tracking Update]
[User] --"views status"--> [Dashboard]
```

### Authentication Flow (Simplified)

```
[New Visitor] --"app loads"--> [AuthProvider]
[AuthProvider] --"no session"--> [signInAnonymously()]
[Anonymous User] --"generates models"--> [attributed to anon user_id]
[Rate Limit / Checkout] --"triggers"--> [SaveAccountModal]
[User] --"email + password"--> [supabase.auth.updateUser()]
[System] --"same user_id preserved"--> [Full Account]
```
