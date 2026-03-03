# Craftcloud API (v4) — Extracted Notes (v5 endpoints)

Source: `https://api.craftcloud3d.com/api-docs.json` (Swagger/OpenAPI 2.0)  
Generated from pasted Swagger UI excerpts.

> **Note:** This document is formatted from the portions you pasted. If you paste more sections later, I can append/merge them cleanly.

---

## Table of Contents
- [Overview](#overview)
- [Known Swagger Resolver Errors](#known-swagger-resolver-errors)
- [Auth](#auth)
- [Endpoints](#endpoints)
  - [Admin / System management](#admin--system-management)
  - [Carts](#carts)
  - [Configurations](#configurations)
  - [Inquiry](#inquiry)
  - [Models](#models)
  - [Offers](#offers)
  - [Orders](#orders)
  - [Payments](#payments)
  - [Prices](#prices)
  - [Referral](#referral)
  - [VAT ID Validation](#vat-id-validation)
- [Schemas (Models)](#schemas-models)

---

## Overview

- **Spec:** OAS 2.0 (Swagger)  
- **API host (from docs):** `https://api.craftcloud3d.com`  
- **Version label (from UI):** Craftcloud **v4**  
- **Endpoint namespace shown:** `/v5/...`

The API supports a full **quote → cart → order → payment → status** flow:
1. Upload a model (`POST /v5/model`) and poll parsing completion (`GET /v5/model/{modelId}`; may return `206` while parsing).
2. Request prices (`POST /v5/price`) then fetch results (`GET /v5/price/{priceId}` or `/grouped`).
3. Create a cart (`POST /v5/cart`) using selected quote ids + shipping ids.
4. Create an order from the cart (`POST /v5/order`), then pay (`/v5/payment/...`) and track status (`GET /v5/order/{orderId}/status`).

---

## Known Swagger Resolver Errors

Swagger UI reported unresolved `$ref` pointers:

- `paths./v5/order/{orderId}/additionalCost.post.responses.200.schema.$ref`  
  Could not resolve pointer: `/definitions/additionalCostResponse` does not exist in document

- `paths./v5/order/{orderId}/additionalCost/{additionalCostId}.get.responses.200.schema.$ref`  
  Could not resolve pointer: `/definitions/additionalCostResponse` does not exist in document

In the UI excerpts you pasted, those endpoints return `"string"` as the example response.

---

## Auth

The UI shows an **Authorize** button, but the pasted excerpt did not include:
- auth scheme type (API key vs Bearer JWT vs OAuth2),
- header name(s),
- required scopes.

If you paste the “Authorize” modal contents (or the security definitions from the JSON), I’ll add a precise auth section.

---

## Endpoints

### Admin / System management

#### `GET /v5/health_check`
System health check.

**Responses**
- `200` — System up and running.

```json
{ "status": "ok" }
```

---

### Carts

#### `POST /v5/cart`
Create cart.

**Request body** (`application/json`)
```json
{
  "quotes": [
    { "id": "string", "types": ["economy"], "note": "string" }
  ],
  "shippingIds": ["20106a2d-1fc5-4a04-8393-6139e5803dfd"],
  "currency": "USD",
  "note": "string",
  "customerReference": "string",
  "voucherCode": "string"
}
```

**Responses**
- `201` — Successfully created cart.
- `400` — Invalid request

**Response example**
```json
{
  "cartId": "string",
  "shippings": [
    {
      "shippingId": "dcf5a4d5-f639-4d0a-9d2c-829b7ec9f0fc",
      "name": "UPS Ground",
      "deliveryTime": "3-5",
      "price": 15.9,
      "priceInclVat": 18.9,
      "type": "standard",
      "vendorId": "schmidtproto",
      "currency": "USD",
      "carrier": "UPS"
    }
  ],
  "quotes": [
    {
      "quoteId": "bf2b604ae33685f698f2d603d9d78761546b87ee62874fc1e380ba5dea1a4848",
      "vendorId": "wenext",
      "modelId": "81dee7e88f5d780e1ba0e6317ffec3c68bed50e3",
      "materialConfigId": "a97a2a21-0e71-51d1-b642-93b168660053",
      "printingMethodId": "9bf95166-8a54-4f91-80ef-d05fb8712223",
      "quantity": 1,
      "productionTimeFast": 9,
      "productionTimeSlow": 10,
      "scale": 1,
      "options": [
        {
          "types": ["expedited"],
          "productionTimeFast": 6,
          "productionTimeSlow": 7,
          "price": 93.65,
          "priceInclVat": 111.44
        }
      ],
      "currency": "USD",
      "price": 72.03,
      "priceInclVat": 85.72,
      "discount": 0
    }
  ],
  "models": [
    {
      "modelId": "6a507bb3-0ae7-4551-8934-84dcb4516431",
      "fileName": "testmodel.stl",
      "fileUnit": "mm",
      "area": 6919.494140625,
      "volume": 36753.34375,
      "dimensions": { "x": 69.88224792480469, "y": 34.520084381103516, "z": 34.52690124511719 },
      "thumbnailUrl": "some-url",
      "sceneId": "some-scene-id",
      "created": "2025-02-27T08:21:17.217Z"
    }
  ],
  "voucher": { "discount": 10, "code": "FREE", "error": "" },
  "currency": "USD",
  "countryCode": "NR",
  "note": "string",
  "customerReference": "string",
  "expiresAt": 1658972807453
}
```

---

### Configurations

#### `POST /v5/configuration`
Create configuration.

**Request body**
```json
{
  "items": [
    { "modelId": "some-model-id", "quantity": 42, "scale": 1 }
  ]
}
```

**Responses**
- `201` — Successfully created configuration.
```json
{ "configurationId": "20106a2d-1fc5-4a04-8393-6139e5803dfd" }
```

#### `GET /v5/configuration/{configurationId}`
Get configuration by id.

**Path params**
- `configurationId` (string, required)

**Responses**
- `200` — The requested configuration.

---

### Inquiry

#### `POST /v5/inquiry`
Broadcast manual inquiry to all vendors.

**Form fields** (`multipart/form-data`)
- `title` (string, required)
- `description` (string, required)
- `file[]` (file attachments)
- `vendorIds[]` (array<string>, optional; defaults to all vendors)

**Responses**
- `201` — Successfully created manual inquiry.
- `400` — Invalid request
- `401` — Unauthorized

---

### Models

#### `POST /v5/model`
Upload model.

> For previously unknown models, the initial response may contain neither geometry nor a rendered `sceneId`. Parsing/rendering happens asynchronously; poll via `GET /v5/model/{modelId}`.

**Form fields** (`multipart/form-data`)
- `file` (file, required) — model file
- `unit` (string) — `mm | cm | in` (default `mm`)
- `refresh` (boolean) — force cache refresh of prices (default `false`)

**Responses**
- `201` — Successfully uploaded model.
```json
[
  {
    "modelId": "6a507bb3-0ae7-4551-8934-84dcb4516431",
    "fileName": "testmodel.stl",
    "fileUnit": "mm",
    "area": 6919.494140625,
    "volume": 36753.34375,
    "dimensions": { "x": 69.88224792480469, "y": 34.520084381103516, "z": 34.52690124511719 },
    "thumbnailUrl": "some-url",
    "sceneId": "some-scene-id",
    "created": "2025-02-27T08:21:17.217Z"
  }
]
```

#### `GET /v5/model/{modelId}`
Get Model by ID.

- `206` indicates geometry parsing still in progress (retry).
- `200` indicates parsing completed (successfully or not).

**Path params**
- `modelId` (string, required)

**Query params**
- `refresh` (boolean, default `false`) — optional re-rendering if preview is outdated

**Responses**
- `200` — full model info
- `206` — partial model info (null geometry fields)
- `404` — Could not find model record

#### `POST /v5/model/{modelId}/evolve`
Create Model from existing model with different properties.

**Request body**
```json
{ "fileUnit": "mm" }
```

**Response** `200`
```json
[ { "modelId": "…", "fileName": "…", "fileUnit": "mm", "created": "…" } ]
```

---

### Offers

#### `POST /v5/offer`
Create offer.

**Request body**
```json
{ "cartId": "string", "expires": true }
```

**Responses**
- `201` — Successfully created offer.
```json
{ "offerId": "string" }
```
- `400` — Invalid request

#### `GET /v5/offer/{offerId}/cart`
Return a cart object for the given `offerId`.

**Path params**
- `offerId` (string, required)

**Query params**
- `currency` (string) — `USD | EUR | GBP | AUD | CAD`

**Responses**
- `200` — cart object
- `404` — Unknown offerId

#### `GET /v5/offer/{offerId}/configuration`
Return the model configuration for the given `offerId`.

**Responses**
- `200` — configuration
- `404` — Unknown offerId

---

### Orders

#### `POST /v5/order`
Create order from cart.

**Request body**
```json
{
  "cartId": "some-cart-id",
  "user": {
    "emailAddress": "max@mustermann.de",
    "shipping": {
      "firstName": "Max",
      "lastName": "Mustermann",
      "address": "Musterstraße 1",
      "city": "Musterstadt",
      "zipCode": "12345",
      "countryCode": "DE",
      "phoneNumber": "01234567"
    },
    "billing": {
      "firstName": "Max",
      "lastName": "Mustermann",
      "address": "Musterstraße 1",
      "city": "Musterstadt",
      "zipCode": "12345",
      "isCompany": false,
      "countryCode": "DE"
    }
  },
  "utmParams": { "source": "…", "medium": "…", "campaign": "…", "term": "…", "content": "…" },
  "gaClientId": "bdebde4b-9b92-4638-b1b7-b7e1eb894a28",
  "customsInformation": { "purpose": "Glasses frame", "industry": "Consumer goods" },
  "appId": "craftcloud"
}
```

**Responses**
- `201` — Successfully created order.
```json
{ "orderId": "20106a2d-1fc5-4a04-8393-6139e5803dfd", "orderNumber": "string", "amounts": { "total": { "totalNetPrice": 100, "totalGrossPrice": 120, "currency": "EUR" } } }
```

#### `POST /v5/order/manual`
Create manual order (explicit vendor + item pricing).

**Responses**
- `201` — Successfully created order.

#### `GET /v5/order/{orderId}/status`
Get order status.

**Responses**
- `200` — status payload
- `404` — Could not find order

#### `PATCH /v5/order/{orderId}/status`
Update vendor order statuses.

**Request body** (array)
```json
[
  {
    "vendorId": "…",
    "status": "ordered",
    "trackingUrl": "string",
    "trackingNumber": "string"
  }
]
```

**Responses**
- `204` — Successfully updated
- `400` — Validation failed
- `401` — Not authenticated
- `404` — Could not find order

#### `PATCH /v5/order/{orderId}`
Update order data (quotes, user, printingService mapping).

**Responses**
- `200` — Successfully updated order
- `400` — Validation failed
- `401` — Not authenticated
- `404` — Could not find order

#### `GET /v5/order/{orderId}/configuration`
Return the quote configuration for the given orderId.

**Responses**
- `200` — configuration payload (includes `items`, `additionalCosts`, `amounts`, etc.)
- `404` — Unknown orderId

#### `POST /v5/order/{orderId}/additionalCost`
Create additional cost for an order.

**Request body**
```json
{ "vendorId": "…", "description": "string", "net": 10.85 }
```

**Responses**
- `200` — Example shown as `"string"` (Swagger resolver error mentioned above)
- `400` — Validation failed
- `401` — Not authenticated
- `404` — Could not find order

#### `GET /v5/order/{orderId}/additionalCost/{additionalCostId}`
Retrieve additional cost.

**Responses**
- `200` — Example shown as `"string"` (Swagger resolver error mentioned above)
- `404` — Could not find order or additional cost

---

### Payments

#### `POST /v5/payment/invoice`
Create invoice payment.

#### `POST /v5/payment/quote`
Create quote for order and attach invoice payment.

#### `PATCH /v5/payment/invoice/{paymentId}`
Execute invoice payment (verification token required).

#### `POST /v5/payment/paypal`
Create a PayPal payment and return PayPal order info (for checkout flow).

#### `GET /v5/payment/paypal/{paypalOrderId}/capture`
Capture PayPal payment and execute order.

#### `POST /v5/payment/stripe`
Create Stripe Checkout session.

#### `POST /v5/payment/adyen`
Create Adyen Checkout session.

#### `PATCH /v5/payment/adyen/{adyenSessionId}/async`
Flag payment as async.

Common payment responses include `{ "paymentId": "...", "status": true }` and gateway session IDs/URLs.

---

### Prices

#### `POST /v5/price`
Create price request.

**Request body**
```json
{
  "refresh": true,
  "currency": "USD",
  "countryCode": "XN",
  "models": [{ "modelId": "string", "quantity": 1, "scale": 1 }],
  "materialConfigIds": ["string"],
  "vendorIds": ["string"],
  "cartId": "string",
  "topMaterialConfigsOnly": true
}
```

**Response** `201`
```json
{ "priceId": "20106a2d-1fc5-4a04-8393-6139e5803dfd" }
```

#### `GET /v5/price/{priceId}`
Retrieve prices for a `priceId`.

> Docs mention a corresponding `ws(s)://<host>/v5/price/:priceId` endpoint for notifications when new prices are available.

**Responses**
- `200` — price payload (quotes + shippings + completion flags)
- `404` — Price request not found

#### `GET /v5/price/{priceId}/grouped`
Retrieve prices grouped by vendor.

---

### Referral

#### `POST /v5/referral`
Generate user referral voucher.

#### `GET /v5/referral`
Get referral vouchers.

---

### VAT ID Validation

#### `POST /v5/vat-validation`
Validate a VAT ID.

---

## Schemas (Models)

Below are the **key schemas** visible in your pasted excerpt. (I’m keeping these concise and readable; if you want the full “verbatim” schema blocks duplicated exactly as pasted, tell me and I’ll mirror them 1:1.)

### Option types (`types` / `newTypes` enums)
`economy, expedited, infill_40, infill_60, infill_80, infill_95, infill_100, tolerance_004, tolerance_003, tolerance_002, tolerance_001, tolerance_tighter_001`

### `healthCheckResponse`
- `status`: `"ok"`

### `Model`
Represents a file uploaded to Craftcloud.
- `modelId` (string)
- `fileName` (string)
- `fileUnit` (`mm | cm | in`)
- `area` (number|null)
- `volume` (number|null)
- `dimensions` { `x`, `y`, `z` } (number|null)
- `thumbnailUrl` (uri)
- `sceneId` (string|null)
- `created` (date-time)
- `attachments[]` optional list

### `createPriceRequest`
- `currency` (enum: USD/EUR/GBP/CAD/AUD/CHF/NOK/JPY/ILS)
- `countryCode` (ISO 3166-1 alpha-2)
- `models[]`: `{ modelId, quantity>=1, scale>=0 (default 1) }`
- optional `materialConfigIds[]`, `vendorIds[]`
- optional `cartId`
- optional `topMaterialConfigsOnly` (boolean)

### `orderStatusUpdateRequest` item
- `vendorId` (^[a-z0-9]+$)
- `status` (`ordered | in_production | shipped | received | blocked | cancelled`)
- `trackingUrl` (uri, optional)
- `trackingNumber` (optional)

---

## Missing / likely additional sections

Your paste appears to include the core flow endpoints. Common Craftcloud docs also include things like material catalogs, vendors, printing methods, etc.—but those are not present in this excerpt.

If you paste additional endpoint sections (e.g., materials catalog / vendors / printing methods), I’ll slot them into the same format and update the TOC.
---

## Additions / checks from your pasted Swagger JSON snippet

This snippet appears to be a **Swagger 2.0** spec for **v5 endpoints** (even though the `info.version` says `v4`).

### Endpoints present in your JSON snippet (v5)

**Admin**
- `GET /v5/health_check` — health check (`{ status: "ok" }`)

**Models**
- `POST /v5/model` — upload model (`multipart/form-data`: `file`, `unit`, `refresh`)
- `GET /v5/model/{modelId}` — retrieve model  
  - `200` = parsing done (maybe success/failure)  
  - `206` = geometry parsing still in progress (retry recommended)
- `POST /v5/model/{modelId}/evolve` — create a derived model with different properties (`fileUnit`)

**Prices**
- `POST /v5/price` — create price request (returns `priceId`)
- `GET /v5/price/{priceId}` — poll for prices; **also mentions a WS endpoint**: `ws(s)://<host>/v5/price/:priceId`
- `GET /v5/price/{priceId}/grouped` — prices grouped by vendor

**Carts / Offers / Configurations**
- `POST /v5/cart` — create cart (returns `cartResponse`)
- `POST /v5/offer` — create offer from cart (returns `offerId`)
- `GET /v5/offer/{offerId}/cart` — cart object for an offer (optional `currency`)
- `GET /v5/offer/{offerId}/configuration` — model configuration for an offer
- `POST /v5/configuration` — create configuration (returns `configurationId`)
- `GET /v5/configuration/{configurationId}` — get configuration by id

**Orders**
- `POST /v5/order` — create order from cart
- `POST /v5/order/manual` — create manual order
- `GET /v5/order/{orderId}/status` — get order status
- `PATCH /v5/order/{orderId}/status` — update vendor order part statuses
- `PATCH /v5/order/{orderId}` — update order data (quotes, user fields, printing-service mapping)
- `GET /v5/order/{orderId}/configuration` — quote configuration snapshot for an order
- `POST /v5/order/{orderId}/additionalCost` — create additional cost for an order
- `GET /v5/order/{orderId}/additionalCost/{additionalCostId}` — fetch that additional cost

**Payments**
- `POST /v5/payment/invoice` — create invoice payment
- `POST /v5/payment/quote` — create quote + attach invoice payment
- `PATCH /v5/payment/invoice/{paymentId}` — execute invoice payment (with secret token)
- `POST /v5/payment/paypal` — create PayPal payment (returns PayPal order id)
- `GET /v5/payment/paypal/{paypalOrderId}/capture` — capture PayPal payment
- `POST /v5/payment/stripe` — create Stripe checkout session (returns session id + URL)
- `POST /v5/payment/adyen` — create Adyen checkout session (returns `id` + `sessionData`)
- `PATCH /v5/payment/adyen/{adyenSessionId}/async` — mark Adyen payment as async

**Inquiry**
- `POST /v5/inquiry` — create/broadcast manual inquiry (`multipart/form-data`: `title`, `description`, optional `file[]`, optional `vendorIds[]`)

**Referral / VAT**
- `POST /v5/referral` — create/get referral voucher for current user
- `GET /v5/referral` — list enabled referral vouchers
- `POST /v5/vat-validation` — validate a VAT ID

### Schemas that look “new or easy to miss”
- **`cartResponse.amounts`** includes totals and per-vendor totals with VAT + optional sales tax fields.
- **`minimumProductionPrice`** includes a per-vendor `productionFee` (difference between vendor min and sum of quotes).
- **Shipping `materialPrice` map**: shipping price can vary by `materialId` (requires reverse lookup in the material catalog).
- **Order status model**: `orderStatus` is a list of status events with `{ type, date }`.
- **`updateOrderRequest`** can update:
  - quotes (option types, vendorId swap, quantity, material/printing-method ids),
  - user details (shipping/billing),
  - printingService vendor mapping.

### Inconsistencies / missing references to flag
- Your snippet includes paths referencing **`additionalCostResponse`**, but I do not see its definition in the pasted content (it may exist elsewhere in the full spec).
- `tags` includes `"Referral"` / `"VAT ID"` in the `paths`, but the `tags` array you pasted lists `"Inquiry"` .. `"Prices"` only — so the tags list may be incomplete in the snippet.

If you want, I can also turn *this exact Swagger JSON* into a clean OpenAPI 3.0 spec (or generate typed TS clients) — but for that I’d want the full, valid JSON file (with quoted keys), not the truncated snippet.
