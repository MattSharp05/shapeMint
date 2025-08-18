# Shapeways API — Summary

Brief summary and extract of the Shapeways Developers documentation (materials, models, orders, cart shipping, auth). Source files: [`API_information/developers.shapeways.com/api-reference.html`](API_information/developers.shapeways.com/api-reference.html:1) and [`API_information/developers.shapeways.com/quick-start.html`](API_information/developers.shapeways.com/quick-start.html:1).

API Token (will be added later to Supabase): eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOjM0NTMyNjgsImF1ZCI6MjE1MSwiZXhwIjoxNzU1MjkzOTAzLCJzY29wZSI6IiJ9.wMOKBxzjBxOdRW-Pnkdb0vdw5SQ_9ETr5gYN30CAFOa-Rwgq3fnM0cbCFe8g2C-DXXNDUuzf0Z1cq-ksGWcCDw

---

## Base URLs

- API base: https://api.shapeways.com
- Developer docs (archived): https://developers.shapeways.com (local copy in repository)

---

## Authentication

The Shapeways API uses OAuth 2.0 for authorization. Two common flows are shown:

- Client credentials (app owner only) — request an access token from:
  - POST https://api.shapeways.com/oauth2/token (grant_type=client_credentials)
- Authorization code flow (multi-user) — redirect users to:
  - GET https://api.shapeways.com/oauth2/authorize?response_type=code&client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}
  - Exchange returned code for tokens at POST https://api.shapeways.com/oauth2/token (grant_type=authorization_code)

Access tokens typically expire (expires_in ~ 3600). Use refresh tokens where applicable:
- POST https://api.shapeways.com/oauth2/token (grant_type=refresh_token)

Example curl (client_credentials):

```
curl -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -X POST https://api.shapeways.com/oauth2/token
```

Example token response:

```
{
  "access_token":"ACCESS_TOKEN",
  "token_type":"bearer",
  "expires_in":3600
}
```

Use the access token on requests:

- Header: Authorization: Bearer {ACCESS_TOKEN}

---

## Global response conventions

- Many endpoints return a top-level "result" field set to "success" on success.
- Some responses include "nextActionSuggestions": object or array for suggested follow-up actions.

---

## Endpoints (extracted and summarized)

The docs expose the following primary endpoints (paths and verbs shown as in docs):

- Materials
  - GET /materials/v1 — List materials
  - GET /materials/{materialId}/v1 — Get material information

- Models (Model management)
  - POST /models/v1 — Upload a model
  - GET /models/v1 — List models (paged)
  - GET /models/{modelId}/v1 — Get model information
  - DELETE /models/{modelId}/v1 — Delete a model

- Orders
  - POST /orders/v1 — Place an order
  - GET /orders/v1 — List orders (filters supported)
  - GET /orders/{orderId}/v1 — Get order information

- Cart / Shipping Options
  - GET /cart/shipping-options/v1 — Get available shipping options for a shipping address

(Base path: https://api.shapeways.com)

---

### Materials — GET /materials/v1

Purpose: retrieve up-to-date information about Shapeways' materials.

Request:

```
GET https://api.shapeways.com/materials/v1
Authorization: Bearer {ACCESS_TOKEN}
```

Response (representative):

```
{
  "result":"success",
  "Materials":{
    "<materialId>": {
      "id":"<materialId>",
      "title":"Material name",
      "supportsColorFiles": boolean,
      "printerId": int,
      "swatch":"https://.../material-swatch.jpg",
      "restrictions": { ... }
    },
    ...
 },
 "nextActionSuggestions":[]
}
```

Notes:

- Material objects include nested "restrictions" keyed by restrictionId and may include "restrictionEntityIds" arrays.

### Materials — GET /materials/{materialId}/v1

Request:

```
GET https://api.shapeways.com/materials/{materialId}/v1
Authorization: Bearer {ACCESS_TOKEN}
```

Representative fields returned:

- materialId (int)
- title (string)
- supportsColorFiles (boolean)
- printerId (int)
- swatch (string URL)
- restrictions (object)
- rejections (array of rejection objects with reasonTitle, comment, pictureUrl)

---

### Models — POST /models/v1 (Upload a model)

Purpose: Upload a 3D model file to Shapeways, obtain modelId and material printability info.

Required parameters (in JSON body):

- file: Base64-encoded file data (string)
- fileName: original filename including extension (string)
- hasRightsToModel: boolean / int (1 or 0)
- acceptTermsAndConditions: boolean / int (1 or 0)

Optional / recommended:
- uploadScale (float) — model scale in meters (default 1.0)
- title, description (strings)
- isPublic, isClaimable, isForSale, isDownloadable (flags)
- tags (array of strings)
- materials (object with per-material markup/pricing overrides)

Example (minimal JSON body):

```
{
  "fileName":"cube.stl",
  "file": "<base64-encoded-file>",
  "hasRightsToModel": 1,
  "acceptTermsAndConditions": 1,
  "description":"Optional description"
}
```

Representative response:

```
{
  "result":"success",
  "modelId": 123456,
  "modelVersion": 0,
  "title":"cube",
  "fileName":"cube.stl",
  "contentLength": 684,
  "fileMd5Checksum":"<md5>",
  "materials": {
    "<materialId>": {
      "materialId": <int>,
      "markup": <float>,
      "isActive": boolean,
      "price": <float>
    }
  },
  "nextActionSuggestions": {...}
}
```

Notes:

- The response includes "secretKey" and "claimKey" fields when applicable:
  - secretKey allows access to a private model via ?key=[key]
  - claimKey allows others to claim the model into their account (if claimable)

### Models — GET /models/v1 (List models)

Request parameters:

- page (int) optional, starting at 1. Each page contains 36 models.

Response snippet:

```
{
 "result":"success",
 "models":[ { "modelId": 123, "modelVersion": 0, "title":"cube" }, ... ],
 "nextActionSuggestions": {}
}
```

### Models — GET /models/{modelId}/v1 (Get model information)

Returns detailed model information including materials, categories, tags, urls, printability info, printerId, swatch, restrictions, rejections, spin, printable, etc.

Representative fields (partial):

- modelId, modelVersion, title, fileName, contentLength, fileMd5Checksum
- fileData (string) — model file data if returned
- materials: object keyed by materialId (markup, isActive, price)
- secretKey, claimKey
- categories (object), tags (array), urls (object)
- printable, spin, printerId, swatch, restrictions, rejections

### Models — DELETE /models/{modelId}/v1

Request:

```
DELETE https://api.shapeways.com/models/{modelId}/v1
Authorization: Bearer {ACCESS_TOKEN}
```

Response:

```
{ "result":"success", "modelId": <deletedModelId>, "nextActionSuggestions": { ... } }
```

---

### Orders — POST /orders/v1 (Place an order)

Purpose: Create and place a new order. Payment is charged to the credit card on file or via app-authorized payment method (paymentMethod value e.g., "credit_card").

Required fields (examples from docs):

- firstName, lastName, country (2-letter ISO), state, city, address1, zipCode, phoneNumber
- items (array) — required; item object includes modelId (int), materialId (int), quantity (int)
- paymentMethod (string) — e.g., "credit_card"
- shippingOption (string) — e.g., "Cheapest" or "Fastest"

Example item object:

```
{
  "modelId": 123,
  "materialId": 6,
  "quantity": 1
}
```

Representative request body (simplified):

```
{
 "firstName":"John",
 "lastName":"Doe",
 "country":"US",
 "state":"NY",
 "city":"New York",
 "address1":"419 Park Ave S",
 "zipCode":"10016",
 "phoneNumber":"1234567890",
 "items": [ { "modelId": MODEL_ID, "materialId": MATERIAL_ID, "quantity": 1 } ],
 "paymentMethod":"credit_card",
 "shippingOption":"Cheapest"
}
```

Representative response:

```
{
  "result":"success",
  "orderId":123,
  "productionOrderIds":[ "1234" ],
  "nextActionSuggestions": { ... }
}
```

Notes:

- Optional paymentVerificationId may be required for apps authorized to charge payments on behalf of users.

### Orders — GET /orders/v1 (List orders)

Filters available (examples):

- orderIds (comma-separated), limit (int, default 20, max 100), and many address/name/email filters for searching.

Response includes:

- ordersCount (summary object: total, placed, in_production, cancelled, unknown, shipped)
- ordersStatus (detailed per-order status objects)
- ordersInfo (array with target ship/delivery dates and shipments)

Example ordersCount snippet:

```
{
  "ordersCount": { "total": 10, "placed": 2, "in_production": 5, "cancelled": 1, "shipped": 2 }
}
```

### Orders — GET /orders/{orderId}/v1 (Get order information)

Returns detailed info per order including shipments (shipmentId, shipDate, carrier, trackingNumber, trackingLink), orderProducts, models in each product, rejection info, etc.

Representative portion:

```
{
 "ordersInfo": [
   {
     "orderId": 123,
     "targetDeliveryDate":"2023-10-31 00:00:00",
     "targetShipDate":"2023-11-02 00:00:00",
     "shipments":[ { "shipmentId": 1, "shipDate":"2023-11-01", "carrier":"usps", "trackingNumber":"XYZ" } ],
     "orderProducts":[ { "orderProductId": "789", "spin":"ABC", "productTitle":"cube", "quantity":"1", "models":[ { "modelId": "MODEL_ID", "materialId":"MATERIAL_ID", "title":"cube" } ] } ]
   }
 ]
}
```

---

### Cart — GET /cart/shipping-options/v1

Purpose: returns shippingOptions available for a country/zip combination.

Request:

```
GET https://api.shapeways.com/cart/shipping-options/v1?country=US&zipCode=10016
Authorization: Bearer {ACCESS_TOKEN}
```

Response (representative):

```
{
  "result":"success",
  "shippingOptions": {
    "<shippingOptionId>": {
      "shippingOptionId": <int>,
      "price": <float>,
      "name": "Display name",
      "inTransitDaysMin": <int>,
      "inTransitDaysMax": <int>
    }
  }
}
```

---

## Quick Start examples

- Obtain token (client_credentials) — see Authentication section.

- Test Materials endpoint (curl):

```
curl -X GET -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  https://api.shapeways.com/materials/v1
```

- Upload model (minimal pseudocode idea):

```
POST https://api.shapeways.com/models/v1
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{ "fileName":"cube.stl","file":"<base64>","hasRightsToModel":1,"acceptTermsAndConditions":1 }
```

- Place order (simplified):

```
POST https://api.shapeways.com/orders/v1
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{ "firstName":"Jane","lastName":"Doe","country":"US","state":"NY","city":"NYC","address1":"1 Example St","zipCode":"10001","phoneNumber":"1234567890","items":[{"modelId":123,"materialId":6,"quantity":1}],"paymentMethod":"credit_card","shippingOption":"Cheapest" }
```

---

## Parsing notes and tips (for future automated parsers)

- Use the endpoint path tokens (materials, models, orders, cart/shipping-options) to map resources.
- Many response objects are keyed by id as strings (e.g., "6": { ... }) — ensure parsers allow string keys representing numeric ids.
- Top-level "result" is a reliable success indicator, but also validate presence of expected payload fields.
- nextActionSuggestions may be object or array; treat flexibly.
- Fields that may contain nested objects: materials -> restrictions, models -> materials, orders -> orderProducts -> models.

---

## Notes and caveats

- Documentation examples show PHP / curl / Python snippets; behaviors (exact param names and types) are derived from those snippets.
- Some optional fields have enumerated meanings (e.g., isPublic: 1 = public, 0 = private).
- Certain features (claimKey, secretKey) have business-effect constraints (e.g., once claimable cannot be set to public or for-sale).
- Shipping and payment behaviors (fees, paymentVerificationId) may require app onboarding with Shapeways.

---

## References (local copies)

- [`API_information/developers.shapeways.com/api-reference.html`](API_information/developers.shapeways.com/api-reference.html:1)
- [`API_information/developers.shapeways.com/quick-start.html`](API_information/developers.shapeways.com/quick-start.html:1)

End of summary.
## Validation — live docs comparison

I scraped the live Shapeways developer reference at https://developers.shapeways.com/api-reference and compared it to this summary. No major discrepancies were found; I added clarifications and explicit limits/values where the live docs specify them. The following concrete clarifications were added to the summary content:

- Model list paging: GET /models/v1 pages contain 36 models per page.
- Orders list: the `limit` parameter defaults to 20 and cannot exceed 100 (GET /orders/v1).
- zipCode rules: US zipCode must be less than 10 characters; GB zipCode must be less than 7 characters.
- phoneNumber rules: Customer phone number must be 10 digits in the US and CA.
- Shipping options: shippingOption values like `Cheapest` and `Fastest` are documented (GET /orders/v1).
- manufacturingSpeed options: `Economy` and `Priority` (Priority is usually ~+30% more per item).
- Payment: `paymentVerificationId` may be required/used by apps authorized to process payments.
- Responses: top-level `result` field commonly indicates success; note that some payloads use id-strings as object keys (parsers should handle numeric ids serialized as strings).
- nextActionSuggestions may be an object or array — treat flexibly.

I used the live scrape to validate these values and updated the summary accordingly. See the summary file: [`API_information/Shapeways_API_info.md`](API_information/Shapeways_API_info.md:1) for the full, updated content.
## Compact JSON Schemas (token-efficient, for LLM parsing)

Use these compact JSON Schema snippets to support token-sensitive automated parsing and LLM consumption. Each schema is intentionally small, uses clear property names, and marks critical required fields to guide validation.

- Materials list response schema [`json.declaration()`](API_information/Shapeways_API_info.md:1)
```json
{
  "$id":"MaterialsListResponse",
  "type":"object",
  "properties":{
    "result":{"type":"string"},
    "Materials":{
      "type":"object",
      "additionalProperties":{
        "$ref":"#/definitions/Material"
      }
    },
    "nextActionSuggestions":{"type":["array","object","null"]}
  },
  "required":["result","Materials"],
  "definitions":{
    "Material":{
      "type":"object",
      "properties":{
        "id":{"type":["string","integer"]},
        "title":{"type":"string"},
        "supportsColorFiles":{"type":"boolean"},
        "printerId":{"type":"integer"},
        "swatch":{"type":"string","format":"uri"},
        "restrictions":{
          "type":"object",
          "additionalProperties":{
            "type":"object",
            "properties":{
              "restrictionId":{"type":"integer"},
              "restrictionName":{"type":"string"},
              "restrictionEntityIds":{"type":"array","items":{"type":"integer"}}
            },
            "required":["restrictionId"]
          }
        }
      },
      "required":["id","title"]
    }
  }
}
```

- Single material response schema [`json.declaration()`](API_information/Shapeways_API_info.md:1)
```json
{
  "$id":"MaterialResponse",
  "type":"object",
  "properties":{
    "result":{"type":"string"},
    "materialId":{"type":"integer"},
    "title":{"type":"string"},
    "supportsColorFiles":{"type":"boolean"},
    "printerId":{"type":"integer"},
    "swatch":{"type":"string","format":"uri"},
    "restrictions":{"type":"object"},
    "rejections":{"type":"array"}
  },
  "required":["result","materialId","title"]
}
```

- Model upload response schema [`json.declaration()`](API_information/Shapeways_API_info.md:1)
```json
{
  "$id":"ModelUploadResponse",
  "type":"object",
  "properties":{
    "result":{"type":"string"},
    "modelId":{"type":"integer"},
    "modelVersion":{"type":"integer"},
    "title":{"type":"string"},
    "fileName":{"type":"string"},
    "contentLength":{"type":"integer"},
    "fileMd5Checksum":{"type":"string"},
    "materials":{
      "type":"object",
      "additionalProperties":{
        "type":"object",
        "properties":{
          "materialId":{"type":"integer"},
          "markup":{"type":"number"},
          "isActive":{"type":"boolean"},
          "price":{"type":"number"}
        },
        "required":["materialId"]
      }
    },
    "secretKey":{"type":["string","null"]},
    "claimKey":{"type":["string","null"]},
    "nextActionSuggestions":{"type":["object","array","null"]}
  },
  "required":["result","modelId","fileName"]
}
```

- Model list response schema [`json.declaration()`](API_information/Shapeways_API_info.md:1)
```json
{
  "$id":"ModelListResponse",
  "type":"object",
  "properties":{
    "result":{"type":"string"},
    "models":{
      "type":"array",
      "items":{
        "type":"object",
        "properties":{
          "modelId":{"type":"integer"},
          "modelVersion":{"type":"integer"},
          "title":{"type":"string"}
        },
        "required":["modelId"]
      }
    },
    "nextActionSuggestions":{"type":["object","array","null"]}
  },
  "required":["result","models"]
}
```

- Model object schema (detailed) [`json.declaration()`](API_information/Shapeways_API_info.md:1)
```json
{
  "$id":"ModelObject",
  "type":"object",
  "properties":{
    "modelId":{"type":"integer"},
    "modelVersion":{"type":"integer"},
    "title":{"type":"string"},
    "fileName":{"type":"string"},
    "contentLength":{"type":"integer"},
    "fileMd5Checksum":{"type":"string"},
    "fileData":{"type":"string"},
    "description":{"type":"string"},
    "isPublic":{"type":"boolean"},
    "isClaimable":{"type":"boolean"},
    "isForSale":{"type":"boolean"},
    "isDownloadable":{"type":"boolean"},
    "materials":{"type":"object"},
    "categories":{"type":"object"},
    "tags":{"type":"array","items":{"type":"string"}},
    "urls":{"type":"object"},
    "printable":{"type":"string"},
    "spin":{"type":"string"},
    "printerId":{"type":"integer"},
    "swatch":{"type":"string","format":"uri"},
    "restrictions":{"type":"object"},
    "rejections":{"type":"array"}
  },
  "required":["modelId","title"]
}
```

- Order request schema (compact) [`json.declaration()`](API_information/Shapeways_API_info.md:1)
```json
{
  "$id":"OrderRequest",
  "type":"object",
  "properties":{
    "firstName":{"type":"string"},
    "lastName":{"type":"string"},
    "country":{"type":"string"},
    "state":{"type":"string"},
    "city":{"type":"string"},
    "address1":{"type":"string"},
    "zipCode":{"type":"string"},
    "phoneNumber":{"type":"string"},
    "items":{
      "type":"array",
      "items":{
        "type":"object",
        "properties":{
          "modelId":{"type":"integer"},
          "materialId":{"type":"integer"},
          "quantity":{"type":"integer"}
        },
        "required":["modelId","materialId","quantity"]
      }
    },
    "paymentMethod":{"type":"string"},
    "paymentVerificationId":{"type":["string","null"]},
    "shippingOption":{"type":"string"},
    "manufacturingSpeed":{"type":"string"},
    "incentives":{"type":"array","items":{"type":"string"}},
    "metadata":{"type":"array"}
  },
  "required":["firstName","lastName","country","address1","zipCode","phoneNumber","items","paymentMethod","shippingOption"]
}
```

- Order response schema (compact) [`json.declaration()`](API_information/Shapeways_API_info.md:1)
```json
{
  "$id":"OrderResponse",
  "type":"object",
  "properties":{
    "result":{"type":"string"},
    "orderId":{"type":"integer"},
    "productionOrderIds":{"type":"array","items":{"type":"integer"}},
    "nextActionSuggestions":{"type":["object","array","null"]}
  },
  "required":["result","orderId"]
}
```

- Orders list summary schema [`json.declaration()`](API_information/Shapeways_API_info.md:1)
```json
{
  "$id":"OrdersListResponse",
  "type":"object",
  "properties":{
    "result":{"type":"string"},
    "ordersCount":{
      "type":"object",
      "properties":{
        "total":{"type":"integer"},
        "placed":{"type":"integer"},
        "in_production":{"type":"integer"},
        "cancelled":{"type":"integer"},
        "unknown":{"type":"integer"},
        "shipped":{"type":"integer"}
      },
      "required":["total"]
    },
    "ordersStatus":{"type":"object"},
    "ordersInfo":{"type":"array"}
  },
  "required":["result","ordersCount"]
}
```

- Order info / shipments schema [`json.declaration()`](API_information/Shapeways_API_info.md:1)
```json
{
  "$id":"OrderInfo",
  "type":"object",
  "properties":{
    "orderId":{"type":"integer"},
    "targetDeliveryDate":{"type":"string"},
    "targetShipDate":{"type":"string"},
    "shipments":{
      "type":"array",
      "items":{
        "type":"object",
        "properties":{
          "shipmentId":{"type":"integer"},
          "shipDate":{"type":"string"},
          "carrier":{"type":"string"},
          "trackingNumber":{"type":"string"},
          "trackingLink":{"type":"string","format":"uri"}
        },
        "required":["shipmentId"]
      }
    },
    "orderProducts":{"type":"array"}
  },
  "required":["orderId"]
}
```

- Shipping options response schema [`json.declaration()`](API_information/Shapeways_API_info.md:1)
```json
{
  "$id":"ShippingOptionsResponse",
  "type":"object",
  "properties":{
    "result":{"type":"string"},
    "shippingOptions":{
      "type":"object",
      "additionalProperties":{
        "type":"object",
        "properties":{
          "shippingOptionId":{"type":"integer"},
          "price":{"type":"number"},
          "name":{"type":"string"},
          "inTransitDaysMin":{"type":"integer"},
          "inTransitDaysMax":{"type":"integer"}
        },
        "required":["shippingOptionId","price"]
      }
    }
  },
  "required":["result","shippingOptions"]
}
```

Parsing guidance:
- Prefer validating presence of "result" first, then validate the compact schema to save tokens.
- When keys are dynamic (id-as-string), use "additionalProperties" style schemas.
- Use these compact schemas as canonical, token-efficient references for LLM prompts and automated parsers.
