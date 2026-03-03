# Shapeways API Documentation

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Model Management](#model-management)
4. [Materials](#materials)
5. [Orders](#orders)
6. [Shipping Options](#shipping-options)

---

## Getting Started

Get up and running with our API to start developing your own Shapeways integrations. Once you have registered and verified your Shapeways account you are ready to create your first app.

### Create your first app

Create a new app to generate the API keys you'll use to authenticate your API requests. You can access all apps associated with your account from the **Manage apps** page on the Shapeways Developers site.

> **Note:** From the Manage apps screen, you can create, edit, or delete your applications.

---

## Authentication

### API user account authorization

Your application will need access to users' Shapeways accounts to upload models and place orders. To get started, you'll need to decide what type of access your app will need as the user authorization process is different.

> **Note:** The Shapeways API uses OAuth 2.0 to authenticate users. Learn more about [OAuth 2.0](https://oauth.net/2/).

#### 1. How many accounts will need access to the API?

- **Only the app owner account** - This is the simplest way to get started using the API. Choose this option if the API only needs access to your Shapeways account.
- **Multiple user accounts** - Choose this option if you need access to multiple user accounts.

#### 2. Requesting the API Access Tokens

In **Manage apps > (Your App)** copy your Client ID and Client Secret. Add them to the code below and make a POST request. Save this Access Token & Refresh Token (only for multiple user accounts flow) in a safe place.

**Endpoint:** `POST https://api.shapeways.com/oauth2/token`

**Request Body:**
```json
{
  "grant_type": "client_credentials"
}
```

**Example Request (PHP):**
```php
// Add your Client ID & Client Secret to the following code examples:
$clientId = 'YOUR_CLIENT_ID';  // replace this
$clientSecret = 'YOUR_CLIENT_SECRET';  // replace this
$url = 'https://api.shapeways.com/oauth2/token';
$params = ['grant_type' => 'client_credentials'];

try {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_USERPWD, $clientId . ':' . $clientSecret);
  curl_setopt($ch, CURLOPT_TIMEOUT, 30);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $response = curl_exec($ch);
  curl_close($ch);
  // showing response on screen
  print_r($response);
} catch (\Exception $e) {
  // printing error on screen
  echo 'Exception: '. $e->getMessage();
}
```

**Example Request (Python):**
```python
import requests

client_id = 'YOUR_CLIENT_ID'
client_secret = 'YOUR_CLIENT_SECRET'
url = 'https://api.shapeways.com/oauth2/token'
params = {'grant_type': 'client_credentials'}

response = requests.post(
    url,
    auth=(client_id, client_secret),
    data=params
)
print(response.json())
```

**Example Response:**
```json
{
  "access_token": "ACCESS_TOKEN",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Make an API test request

Let's see if you can make a successful request from the API using our Materials endpoint.

**Example Request (PHP):**
```php
// Add your access token to the code example
$accessToken = 'YOUR_ACCESS_TOKEN';
$url = 'https://api.shapeways.com/materials/v1';

try {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_HTTPHEADER,
    ['Authorization: Bearer ' . $accessToken,
     'Content-type: application/json']);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $response = curl_exec($ch);
  curl_close($ch);
  // printing API response on screen
  print_r($response);
} catch (\Exception $e) {
  // printing error on screen
  echo 'Exception: ' . $e->getMessage();
}
```

**Example Response:**
```json
{
  "result": "success",
  "Materials": {
    "6": {
      "materialId": "6",
      "title": "White Natural Versatile Plastic",
      "supportsColorFiles": "0",
      "printerId": "5",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "Restrictions": null
    }
  },
  "nextActionSuggestions": []
}
```

Congratulations! You're ready to start integrating with the Shapeways API endpoints.

### About refresh tokens

After an access token expires, using it to make a request from the API will result in an "Invalid Token Error". Your refresh token can be used to request a fresh access token from the authorization server.

**Endpoint:** `POST https://api.shapeways.com/oauth2/token`

**Request Body:**
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "YOUR_REFRESH_TOKEN",
  "client_id": "YOUR_CLIENT_ID"
}
```

**Example Request (PHP):**
```php
// Add your Refresh token, Client id, & Client Secret to the following code examples:
$clientId = 'YOUR_CLIENT_ID';
$clientSecret = 'YOUR_CLIENT_SECRET';
$refreshToken = 'YOUR_REFRESH_TOKEN';

$url = 'https://api.shapeways.com/oauth2/token';
$headers[] = 'Authorization: Basic ' . $clientSecret;
$params = array(
  'grant_type' => 'refresh_token',
  'refresh_token' => $refreshToken,
  'client_id' => $clientId
);

try {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
  $response = curl_exec($ch);
  curl_close($ch);
  // printing API response on screen
  print_r($response);
} catch (\Exception $e) {
  // printing error on screen
  echo 'Exception: ' . $e->getMessage();
}
```

---

## Model Management

Easily manage your Shapeways' models with the `/models/v1` API endpoint. Quickly learn how to:

- Upload a model(s)
- Get model information (Model IDs, material printability, etc)

### Upload a model

Upload 3D models to your Shapeways account to check material printability and to prepare your model for ordering.

> **Note:** Learn more about the file types that can be uploaded to Shapeways.

**Endpoint:** `POST https://api.shapeways.com/models/v1`

**Example Request (PHP):**
```php
// Model upload example showing the required fields only
// Add your access token to the following code examples:
// Make sure to use json encoded body and have the application/json for your header
$accessToken = 'YOUR_ACCESS_TOKEN';
$url = 'https://api.shapeways.com/models/v1';

// loading file data
$file = file_get_contents(YOUR_FILE_PATH);

// generating request data
$postFields = [
  "fileName" => "cube.stl", // make sure include the correct file extension
  "file" => rawurlencode(base64_encode($file)),
  "description" => "This is a nice cube!",
  "hasRightsToModel" => 1,
  "acceptTermsAndConditions" => 1
];
$postData = json_encode($postFields);

try {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_HTTPHEADER,
    ['Authorization: Bearer ' . $accessToken, 'Content-type: application/json']);
  curl_setopt($ch, CURLOPT_TIMEOUT, 30);
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $response = curl_exec($ch);
  curl_close($ch);
  // printing API response on screen
  print_r($response);
} catch (\Exception $e) {
  // printing error on screen
  echo $e->getMessage();
}
```

**Example Response:**
```json
{
  "result": "success",
  "modelId": 123456,
  "modelVersion": 0,
  "title": "cube",
  "fileName": "cube.stl",
  "contentLength": 684,
  "fileMd5Checksum": "a6d5646bcb5a1437cb38ad07c45adf7",
  "description": "This is a nice cube!",
  "isPublic": 0,
  "isClaimable": 0,
  "isForSale": false,
  "isDownloadable": 0,
  "materials": {
    "6": {
      "materialId": 6,
      "markup": 0,
      "isActive": 1,
      "price": 4
    }
  },
  "addModelPhoto": {
    "method": "POST",
    "restUrl": "https://api.shapeways.com/models/v1",
    "link": "/models/v1"
  }
}
```

### Get model information

Once you've uploaded a model to Shapeways, you can use GET requests to find out more about it, including:

- The Model ID
- Which materials the model is printable in
- The base price of the model

**Endpoint:** `GET https://api.shapeways.com/models/{MODEL_ID}/v1`

**Example Request (PHP):**
```php
// Add your access token and a Model ID to the code example
$accessToken = 'YOUR_ACCESS_TOKEN';
$url = 'https://api.shapeways.com/models/{MODEL_ID}/v1';

try {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_HTTPHEADER,
    ['Authorization: Bearer ' . $accessToken, 'Content-type: application/json']);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $response = curl_exec($ch);
  curl_close($ch);
  // printing API response on screen
  print_r($response);
} catch (\Exception $e) {
  // printing error on screen
  echo 'Exception: ' . $e->getMessage();
}
```

**Example Response:**
```json
{
  "result": "success",
  "modelId": 123456,
  "modelVersion": 0,
  "title": "cube",
  "fileName": "cube.stl",
  "contentLength": 684,
  "fileMd5Checksum": "a6d5646bcb5a1437cb38ad07c45adf7",
  "description": "This is a nice cube!",
  "isPublic": 0,
  "isClaimable": 0,
  "isForSale": false,
  "isDownloadable": 0,
  "materials": {
    "6": {
      "materialId": 6,
      "markup": 0,
      "isActive": 1,
      "price": 4
    }
  },
  "addModelPhoto": {
    "method": "POST",
    "restUrl": "https://api.shapeways.com/models/v1",
    "link": "/models/v1"
  }
}
```

---

## Materials

Use the `/materials/v1` API endpoint to get up-to-date information about Shapeways' materials. Similar information can be found at [https://www.shapeways.com/materials](https://www.shapeways.com/materials).

**Endpoint:** `GET https://api.shapeways.com/materials/v1`

**Example Request (PHP):**
```php
// Add your access token to the code example
$accessToken = 'YOUR_ACCESS_TOKEN';
$url = 'https://api.shapeways.com/materials/v1';

try {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_HTTPHEADER,
    ['Authorization: Bearer ' . $accessToken, 'Content-type: application/json']);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $response = curl_exec($ch);
  curl_close($ch);
  // printing API response on screen
  print_r($response);
} catch (\Exception $e) {
  // printing error on screen
  echo 'Exception: ' . $e->getMessage();
}
```

**Example Response:**
```json
{
  "result": "success",
  "Materials": {
    "6": {
      "materialId": "6",
      "title": "White Natural Versatile Plastic",
      "supportsColorFiles": "0",
      "printerId": "5",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "Restrictions": null
    }
  },
  "nextActionSuggestions": []
}
```

---

## Orders

Use the `/orders/v1` API endpoint to integrate with Shapeways fulfillment services to seamlessly place and manage orders. Quickly learn how to:

- Place orders
- Check order statuses

### Placing your first order

#### 1. Setting up a payment method

In **Settings** add and save a credit card. Placed orders will be charged to the credit card on file for this Shapeways account.

#### 2. Get the Model ID and Material ID

To place an order, the API needs to know both:
1. The model you want to order
2. Which material you want to print it in

Below are two different ways you can locate the Model ID and Material ID.

**Example 1: Upload a new model**
- Upload a model using `POST /models/v1`
- Locate the `modelId` and `materialId` in the API response

**Example 2: Locate with an existing model**
- If you have a model, use `GET /models/v1` to get a list of all your models
- Choose a model from the list and use `GET /models/{modelId}/v1` to return a list of materials the model can be printed in.

#### 3. Place the Order

Use the `modelID`, `materialID`, and required fields for the shipping address to create the order.

**Endpoint:** `POST https://api.shapeways.com/orders/v1`

**Example Request (PHP):**
```php
// Place an order example showing the required shipping address fields only
$accessToken = 'YOUR_ACCESS_TOKEN'; // replace this

$url = 'https://api.shapeways.com/orders/v1';

// initialize items list
$items = [];

// adding a item to items list
$items[] = [
  'materialId' => MATERIAL_ID, // replace this
  'modelId' => MODEL_ID, // replace this
  'quantity' => 1
];

// generating request data
$postFields = [
  'items' => $items,
  'firstName' => 'John',
  'lastName' => 'Doe',
  'country' => 'US',
  'state' => 'NY',
  'city' => 'New York',
  'address1' => '419 Park Ave S',
  'address2' => 'Suite 900',
  'zipCode' => '10016',
  'phoneNumber' => '1234567890',
  'paymentMethod' => 'credit_card',
  'shippingOption' => 'Cheapest'
];
$postData = json_encode($postFields);

try {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_HTTPHEADER,
    ['Authorization: Bearer ' . $accessToken, 'Content-type: application/json']);
  curl_setopt($ch, CURLOPT_TIMEOUT, 30);
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $response = curl_exec($ch);
  curl_close($ch);
  // printing API response on screen
  print_r($response);
} catch (\Exception $e) {
  // printing error on screen
  echo $e->getMessage();
}
```

**Example Response:**
```json
{
  "result": "success",
  "orderId": 123,
  "productionOrderIds": [
    "1234"
  ],
  "nextActionSuggestions": {
    "checkOrderStatus": "/checkout/receipt?orderId=123"
  }
}
```

### Check the status of an order

Once an order has been placed, you can use `GET /orders/{orderId}/v1` to find out about its current status.

**Endpoint:** `GET https://api.shapeways.com/orders/{ORDER_ID}/v1`

**Example Request (PHP):**
```php
// Add your access token and an Order ID to the code example
$accessToken = 'YOUR_ACCESS_TOKEN';
$url = 'https://api.shapeways.com/orders/{ORDER_ID}/v1';

try {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_HTTPHEADER,
    ['Authorization: Bearer ' . $accessToken, 'Content-type: application/json']);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $response = curl_exec($ch);
  curl_close($ch);
  // printing API response on screen
  print_r($response);
} catch (\Exception $e) {
  // printing error on screen
  echo 'Exception: ' . $e->getMessage();
}
```

**Example Response:**
```json
{
  "result": "success",
  "ordersCount": {
    "total": 1,
    "placed": 0,
    "in_production": 1,
    "cancelled": 0,
    "unknown": 0,
    "shipped": 0
  },
  "ordersStatus": {
    "123": {
      "status": "in_production",
      "items": {
        "789": {
          "title": "cube",
          "quantity": 1,
          "status": {
            "processing": 1,
            "in_production": 0,
            "complete": 0,
            "cancelled": 0
          }
        }
      }
    }
  },
  "ordersInfo": [
    {
      "orderId": 123,
      "refNumber": null,
      "targetDeliveryDate": "2023-10-31 00:00:00",
      "targetShipDate": "2023-11-02 00:00:00",
      "shipments": null,
      "orderProducts": [
        {
          "orderProductId": "789",
          "spin": "LV9DZGVW7",
          "productTitle": "cube",
          "optionId": "987",
          "optionDescription": "White Natural Versatile Plastic",
          "quantity": "1",
          "models": [
            {
              "modelId": "MODEL_ID",
              "materialId": "MATERIAL_ID",
              "title": "cube",
              "rejection": {
                "rejectionReasons": [],
                "affectedMaterials": []
              }
            }
          ]
        }
      ]
    }
  ],
  "nextActionSuggestions": {
    "url": null
  }
}
```

### Transaction fees

By default, orders placed through the Shapeways API are charged a 5% fee per order. Contact us if you are a growing business and want to learn about volume discounts.

---

## API Reference

### Materials

#### GET - List materials

Retrieves information on all available 40+ Shapeways' materials.

**Endpoint:** `GET /materials/v1`

**Response Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `result` | string | A 'result' field stating 'success' |
| `materials` | object | Material objects |
| `nextActionSuggestions` | object | Suggestions for next actions |

**Material Object Structure:**
```json
{
  "<materialId>": {
    "id": "<materialId>",
    "type": "object",
    "description": "Material Object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Material name"
      },
      "supportsColorFiles": {
        "type": "boolean",
        "description": "Material supports color"
      },
      "printerId": {
        "type": "int",
        "description": "Printer id that this material is printed on"
      },
      "swatch": {
        "type": "string",
        "description": "The url for the material swatch"
      },
      "restrictions": {
        "id": "restrictions",
        "type": "object",
        "description": "Material Restriction Object",
        "properties": {
          "<restrictionId>": {
            "id": "<restrictionId>",
            "type": "object",
            "description": "Material Restriction Object",
            "properties": {
              "restrictionId": {
                "type": "int",
                "description": "Material Restriction ID"
              },
              "restrictionName": {
                "type": "string",
                "description": "Material Restriction Name"
              },
              "restrictionEntityIds": {
                "type": "array",
                "description": "Material Restriction Entity Ids",
                "default": [],
                "items": {
                  "type": "int",
                  "description": "Material Restriction Entity Id"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

#### GET - Material information

Retrieves information for a specific material (Specified by the materialId).

**Endpoint:** `GET /materials/{materialId}/v1`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `materialId` | int | required | Material id |

**Response Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `result` | string | A 'result' field stating 'success' |
| `materialId` | int | Material ID |
| `title` | string | Material name |
| `supportsColorFiles` | boolean | Material supports color |
| `printerId` | int | Printer id that this material is printed on |
| `swatch` | string | The url for the material swatch |
| `restrictions` | object | Material Restriction Object |
| `rejections` | array | List of rejection Objects |
| `nextActionSuggestions` | object | Suggestions for next actions |

**Rejection Object Structure:**
```json
{
  "rejections": [
    {
      "reasonTitle": {
        "type": "string",
        "description": "The rejection reason type name"
      },
      "comment": {
        "type": "string",
        "description": "The rejection comment with details about the rejection"
      },
      "pictureUrl": {
        "type": "string",
        "description": "A url containing the rejection picture (if present)"
      }
    }
  ]
}
```

### Models

Easily manage your Shapeways' 3D models with the `/models/v1` API endpoint.

#### POST - Upload a model

Uploads a new model. See [Upload a model](#upload-a-model) for instructions and code examples.

**Endpoint:** `POST /models/v1`

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | string | required | Model file data |
| `fileName` | string | required | Model filename (with correct file extension) |
| `uploadScale` | float | optional | Model scale in meters<br>- 1.0 (default) - meter<br>- 0.001 - millimeter<br>- 0.0254 - inch |
| `hasRightsToModel` | boolean | required | You have the rights to model<br>- 0 - You do not have rights to, nor have authorization to use this model<br>- 1 - You have rights to, or have authorization to use this model |
| `acceptTermsAndConditions` | boolean | required | You accept the Shapeways' Terms and Conditions<br>- 0 - You do not accept the Terms and Conditions<br>- 1 - You accept the Terms and Conditions |
| `title` | string | optional | Model title |
| `description` | string | optional | Model description |
| `isPublic` | boolean | optional | Model visibility<br>- 1 - Public Model<br>- 0 (default) - Private Model (viewable only with a private key) |
| `isClaimable` | boolean | optional | Whether a model is claimable with a claim key - Default: false |
| `isForSale` | int | optional | Model is for sale<br>- 0 (default) - Model cannot be purchased<br>- 1 - Model can be purchased |
| `isDownloadable` | boolean | optional | Model is downloadable<br>- 0 (default) - Model cannot be downloaded<br>- 1 - Model can be downloaded |
| `tags` | array | optional | Model tags |
| `materials` | object | optional | Material objects |
| `defaultMaterialId` | int | optional | The material id for this model's default material |
| `categories` | array | optional | Array of category ids |

**Response Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `result` | string | A 'result' field stating 'success' |
| `modelId` | int | Model ID |
| `modelVersion` | int | Model version |
| `title` | string | Model title |
| `fileName` | string | Model filename |
| `contentLength` | int | The file size of the uploaded file in bytes |
| `fileMd5Checksum` | string | The md5 checksum of the file |
| `description` | string | Model description |
| `isPublic` | boolean | Can be seen by the public |
| `isClaimable` | boolean | Can be claimed via claimKey |
| `isForSale` | boolean | Model is for sale |
| `isDownloadable` | boolean | Model is downloadable |
| `materials` | object | Material objects |
| `secretKey` | string | Model secret key<br>The secret key is used to allow ANY user to access a private model. The model can be accessed using the url query parameter `?key=[key]` at the end of the url |
| `claimKey` | string | Model claim key<br>The claim key is used to allow ANY user to claim a model into their own account. The claim function should be used when your app is generating models using your own permanent access tokens. To enable a user to claim a model, send them to `shapeways.com/model/claim/[modelId]` with a query parameter of `?key=[key]`. If the model is not "claimable" this key will be blank. Once a model is set to claimable, it cannot be set to public or for-sale. The page will redirect to the model edit view after it has been claimed. |
| `defaultMaterialId` | int | The material id for this model's default material |
| `categories` | object | Category Objects |
| `tags` | string | Tags |
| `urls` | object | Url Objects |
| `spin` | string | SPIN |
| `printable` | string | Model Printability |
| `nextActionSuggestions` | object | Suggestions for next actions |

#### GET - List models

Retrieves a list of models in the Shapeways account.

**Endpoint:** `GET /models/v1`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | int | optional | The model page, starting with 1. Each page contains 36 models. |

**Response Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `result` | string | A 'result' field stating 'success' |
| `models` | array | List of models |
| `nextActionSuggestions` | object | Suggestions for next actions |

**Model Object in List:**
```json
{
  "modelId": {
    "type": "int",
    "description": "Model ID"
  },
  "modelVersion": {
    "type": "int",
    "description": "Model version"
  },
  "title": {
    "type": "string",
    "description": "Model title"
  }
}
```

#### GET - Model information

Retrieves information for a specific model like material printability and price (Specified by the modelId). See [Get model information](#get-model-information) for instructions and code examples.

**Endpoint:** `GET /models/{modelId}/v1`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `modelId` | int | required | Model id |

**Response Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `result` | string | A 'result' field stating 'success' |
| `modelId` | int | Model ID |
| `modelVersion` | int | Model version |
| `title` | string | Model title |
| `fileName` | string | Model filename |
| `contentLength` | int | The file size of the uploaded file in bytes |
| `fileMd5Checksum` | string | The md5 checksum of the file |
| `fileData` | string | Model file data |
| `description` | string | Model description |
| `isPublic` | boolean | Can be seen by the public |
| `isClaimable` | boolean | Can be claimed via claimKey |
| `isForSale` | boolean | Model is for sale |
| `isDownloadable` | boolean | Model is downloadable |
| `materials` | object | Material objects |
| `secretKey` | string | Model secret key |
| `claimKey` | string | Model claim key |
| `defaultMaterialId` | int | The material id for this model's default material |
| `categories` | object | Category Objects |
| `tags` | string | Tags |
| `urls` | object | Url Objects |
| `spin` | string | SPIN |
| `printable` | string | Model Printability |
| `printerId` | int | Printer id that this material is printed on |
| `swatch` | string | The url for the material swatch |
| `restrictions` | object | Material Restriction Object |
| `nextActionSuggestions` | object | Suggestions for next actions |

#### DELETE - Delete a model

Deletes a model from the Shapeways' account (Specified by the modelId).

**Endpoint:** `DELETE /models/{modelId}/v1`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `modelId` | int | required | ID of the model to delete. |

**Response Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `result` | string | A 'result' field stating 'success' |
| `modelId` | int | ID of the model that was deleted. |
| `nextActionSuggestions` | object | Suggestions for next actions |

### Orders

Use the `/orders/v1` API endpoint to integrate with Shapeways fulfillment services to seamlessly place and manage orders.

#### POST - Place an order

Creates and places a new order. See [Placing your first order](#placing-your-first-order) instructions and code examples.

**Endpoint:** `POST /orders/v1`

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `firstName` | string | required | First name for shipping address |
| `lastName` | string | required | Last name for shipping address |
| `country` | string | required | Shipping address country name or 2-letter code (ISO 3166) |
| `state` | string | required | Shipping address state or region. In the US, must be the 2-letter abbreviation. |
| `city` | string | required | Shipping address city name |
| `address1` | string | required | Street Address |
| `address2` | string | optional | Apartment or Suite |
| `address3` | string | optional | Company or c/o |
| `zipCode` | string | required | Shipping address zip code. In the US, zipCode must be less than 10 characters. In GB zipCode must be less than 7 chars |
| `phoneNumber` | string | required | Customer phone number. Must be 10 digits in the US and CA |
| `items` | array | required | Set of items in your order |
| `incentives` | array | optional | Set of incentives to apply to the order |
| `paymentVerificationId` | string | optional | Shapeways-issued id to authorize payments for your app |
| `paymentMethod` | string | required | Payment method for this order<br>- `credit_card` - use the credit card you have on file with Shapeways to process this order |
| `shippingOption` | string | required | Shipping option for this order<br>- `Cheapest` - use the cheapest shipping option available<br>- `Fastest` - use the fastest shipping option available. If multiple options are the fastest, use the cheapest |
| `manufacturingSpeed` | string | optional | Manufacturing speed for this order<br>- `Economy` - Save by not hurrying. Economy will take approximately 10 business days longer than Priority when manufactured capacity is available<br>- `Priority` - (Usually +30% more per item) Get in front of the line. Ensure your deliveries with our published manufacturing times |
| `refNumber` | string | optional | Reference number associated with this order.<br>- 20 characters max.<br>- This string will be printed on the packing slip inside the box and on the downloadable PDF invoice. |
| `metadata` | array | optional | metadata |

**Item Object:**
```json
{
  "type": "object",
  "description": "Item in your order",
  "properties": {
    "modelId": {
      "type": "int",
      "description": "Model id"
    },
    "materialId": {
      "type": "int",
      "description": "Material id"
    },
    "quantity": {
      "type": "int",
      "description": "Quantity of models in this material"
    }
  }
}
```

**Incentive Object:**
```json
{
  "type": "string",
  "description": "Incentive code"
}
```

**Metadata Object:**
```json
{
  "type": "object",
  "description": "Metadata can only be used by certain applications.",
  "properties": {
    "modelId": {
      "type": "int",
      "description": "Model id"
    },
    "name": {
      "type": "string",
      "description": "Metadata Name"
    },
    "value": {
      "type": "string",
      "description": "Metadata value"
    }
  }
}
```

**Response Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `result` | string | A 'result' field stating 'success' |
| `orderId` | int | Id of the order that was created |
| `productionOrderIds` | array | Set of production order ids |
| `nextActionSuggestions` | object | Suggestions for next actions |

**Production Order ID:**
```json
{
  "type": "int",
  "description": "Production Order Id"
}
```

#### GET - List orders

Retrieves information like number of orders, their statuses, and shipping dates.

**Endpoint:** `GET /orders/v1`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderIds` | string | optional | comma separated list of order ids |

**Response Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `result` | string | A 'result' field stating 'success' |
| `ordersCount` | object | Contains a summary of the number of orders classified by status |
| `ordersStatus` | json_object | Contains a detailed summary of each order and it's status |
| `ordersInfo` | array | Contains target ship date, target delivery date and shipments for each order |
| `nextActionSuggestions` | object | Suggestions for next actions |

**Orders Count Object:**
```json
{
  "total": {
    "type": "int",
    "description": "Total number of orders"
  },
  "placed": {
    "type": "int",
    "description": "Number of orders placed"
  },
  "in_production": {
    "type": "int",
    "description": "Number of orders in production"
  },
  "cancelled": {
    "type": "int",
    "description": "Number of orders cancelled"
  },
  "unknown": {
    "type": "int",
    "description": "Number of orders in an unknown status"
  },
  "shipped": {
    "type": "int",
    "description": "Number of orders shipped"
  }
}
```

**Order Info Object:**
```json
{
  "id": "<orderId>",
  "type": "object",
  "description": "Contains target ship date, target delivery date and shipments for each order",
  "properties": {
    "orderId": {
      "type": "int",
      "description": "Order id"
    },
    "targetDeliveryDate": {
      "type": "string",
      "description": "Target delivery date"
    },
    "targetShipDate": {
      "type": "string",
      "description": "Target to ship date"
    },
    "shipments": {
      "type": "array",
      "description": "Shipments for this order",
      "items": {
        "id": "<shipmentId>",
        "type": "object",
        "description": "Shipment Information",
        "properties": {
          "shipmentId": {
            "type": "int",
            "description": "Shipment id"
          },
          "shipDate": {
            "type": "string",
            "description": "Ship date"
          },
          "carrier": {
            "type": "string",
            "description": "Shipment carrier"
          },
          "trackingNumber": {
            "type": "string",
            "description": "Tracking number"
          }
        }
      }
    },
    "orderProducts": {
      "type": "array",
      "description": "Contains detailed information for the items contained within each purchased product.",
      "items": {
        "id": "<orderProductId>",
        "type": "object",
        "description": "Contains a detailed summary of each item and it's status",
        "properties": {
          "orderProductId": {
            "type": "int",
            "description": "Unique id for this product in this order"
          },
          "spin": {
            "type": "string",
            "description": "Shapeways Product Identification Number"
          },
          "productTitle": {
            "type": "string",
            "description": "Product title at the time of purchase"
          },
          "optionId": {
            "type": "int",
            "description": "Unique id for this product in its purchased option"
          },
          "optionDescription": {
            "type": "int",
            "description": "Name of this item in its ordered material and variant options"
          },
          "quantity": {
            "type": "int",
            "description": "Total quantity of this product purchased in this order"
          },
          "models": {
            "type": "array",
            "description": "Contains detailed information for each model in the purchased product",
            "items": {
              "type": "object",
              "description": "3D printed models in your ordered product",
              "properties": {
                "modelId": {
                  "type": "int",
                  "description": "Model id"
                },
                "materialId": {
                  "type": "int",
                  "description": "Material id"
                },
                "title": {
                  "type": "int",
                  "description": "The title of the model at time of purchase"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

#### GET - Order information

Retrieves information for a specific order placed through the API (Specified by the orderId). See [Check the status of an order](#check-the-status-of-an-order) for instructions and code examples.

**Endpoint:** `GET /orders/{orderId}/v1`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | string | required | Filter by the order id provided for the api order |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderIds` | string | optional | Filter by order ids provided for the api orders |
| `firstName` | string | optional | Filter by first name on the address that was used to place the order |
| `lastName` | string | optional | Filter by lastName name on the address that was used to place the order |
| `country` | string | optional | Filter by country on the address that was used to place the order |
| `state` | string | optional | Filter by state or region on the address that was used to place the order |
| `city` | string | optional | Filter by city on the address that was used to place the order |
| `address1` | string | optional | Filter by address1 that was used to place the order |
| `address2` | string | optional | Filter by address street (line 1) that was used to place the order |
| `address3` | string | optional | Filter by address street (line 3) that was used to place the order |
| `zipCode` | string | optional | Filter by zip code on the address that was used to place the order |
| `phoneNumber` | string | optional | Filter by phone number used to place the order |
| `email` | string | optional | Filter by email used to place the order |
| `limit` | int | optional | Limits the number of orders returned. Limit cannot exceed 100<br>- Default: 20 |

**Response Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `result` | string | A 'result' field stating 'success' |
| `ordersCount` | object | Contains a summary of the number of orders classified by status |
| `ordersStatus` | json_object | Contains a detailed summary of each order and it's status |
| `ordersInfo` | array | Contains target ship date, target delivery date and shipments for each order |
| `nextActionSuggestions` | object | Suggestions for next actions |

**Shipment Object (with trackingLink):**
```json
{
  "shipmentId": {
    "type": "int",
    "description": "Shipment id"
  },
  "shipDate": {
    "type": "string",
    "description": "Ship date"
  },
  "carrier": {
    "type": "string",
    "description": "Shipment carrier"
  },
  "trackingNumber": {
    "type": "string",
    "description": "Tracking number"
  },
  "trackingLink": {
    "type": "string",
    "description": "Shipment carrier's tracking URL (returned only if trackingNumber is available)"
  }
}
```

### Shipping Options

Use the `/cart/shipping-options/v1` API endpoint to determine what shipping options are available for your order.

#### GET - Shipping Options

Retrieves information about the shipping options available to the shipping location.

**Endpoint:** `GET /cart/shipping-options/v1`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `country` | string | required | 2-letter country code (ISO 3166) of the shipping address |
| `zipCode` | string | optional | Shipping address zip code |

**Response Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `result` | string | A 'result' field stating 'success' |
| `shippingOptions` | object | Available shipping options |

**Shipping Option Object:**
```json
{
  "shippingOptionId": {
    "type": "int",
    "description": "Id of the intended shipping option. Should be included in the request to the order creation endpoint to set the shipping option"
  },
  "price": {
    "type": "float",
    "description": "Cost of that shipping option without tax in USD"
  },
  "name": {
    "type": "string",
    "description": "Display name of shipping option"
  },
  "inTransitDaysMin": {
    "type": "int",
    "description": "Minimum shipping days (Business days)"
  },
  "inTransitDaysMax": {
    "type": "int",
    "description": "Maximum shipping days (Business days)"
  }
}
```

---

## Base URL

All API requests should be made to:

```
https://api.shapeways.com
```

## Authentication

All API requests require authentication using OAuth 2.0. Include your access token in the Authorization header:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Content Type

All requests should include:

```
Content-Type: application/json
```

---

## Support

For additional support and information, visit the [Shapeways Developers site](https://developers.shapeways.com/).
