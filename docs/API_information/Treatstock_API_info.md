# Treatstock API Documentation

## Getting Started

To work with our API you will need an `<api token>`. There are two types of API tokens:

* **private-key** - Provides full access to the API and should not be disclosed to users because they will then have the ability to retrieve confidential data about 3D model uploads of other users.
* **public-upload-key** - Restricted to the upload of new models only.

### Supported File Formats

Our API supports the following 3D printing file formats: **STL**, **PLY** and **3MF**.

> **Need help?** Contact technical support.

---

## Authentication

All API requests require authentication using the `private-key` parameter. Include it as a query parameter in your requests:

```
?private-key=<api-token>
```

---

## Upload 3D Model File

Upload your 3D model file to create a printable pack.

### Endpoint

```
POST https://www.treatstock.com/api/v2/printable-packs/?private-key=<api-key>
```

### Parameters

**Required:**
* `files` - 3D model files (STL format)

**Optional:**
* `location[country]` - Specify country ISO code ([ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)). If you want to get a print price, you should set one of these location parameters: country or ip.
* `location[ip]` - Specify client IP address.
* `description` - Model description
* `files-urls[]` - URL to 3D model file (alternative to direct file upload)

### Request Examples

**CURL Example - Direct File Upload:**

```bash
curl -F "files[]=@robots.stl" -F location[ip]=83.69.106.68 https://www.treatstock.com/api/v2/printable-packs?private-key=<api-token>
```

**CURL Example - With Description:**

```bash
curl -F "files[]=@robots.stl" -F location[ip]=83.69.106.68 -F description="Some model description" https://www.treatstock.com/api/v2/printable-packs?private-key=<api-token>
```

**CURL Example - With Country:**

```bash
curl -F "files[]=@robots.stl" -F location[country]=US https://www.treatstock.com/api/v2/printable-packs?private-key=<api-token>
```

**CURL Example - Upload from URL:**

```bash
curl -F "files-urls[]=https://mysite.com/my-model.stl" -F location[country]=US https://www.treatstock.com/api/v2/printable-packs?private-key=<api-token>
```

### Success Response

```json
{
    "success": true,
    "id": 223672,
    "redir": "https://www.treatstock.com/catalog/model3d/preload-printable-pack?packPublicToken=e6c2f63-60815dd-2f91e10",
    "widgetUrl": "https://www.treatstock.com/api/v2/printable-pack-widget/?apiPrintablePackToken=e6c2f63-60815dd-2f91e10",
    "widgetHtml": "<!-- ApiWidget: e6c2f63-60815dd-2f91e10 --><link href='https://www.treatstock.com/css/embed-user.css' rel='stylesheet' /><iframe class='ts-embed-userwidget' width='100%' height='650px' src='https://www.treatstock.com/api/v2/printable-pack-widget/?apiPrintablePackToken=e6c2f63-60815dd-2f91e10' frameborder='0'></iframe>",
    "parts": {
        "MP:1815136": {
            "uid": "MP:1815136",
            "name": "test.stl",
            "qty": 1,
            "hash": "7e02f089e3e508459c967de27c10d45c"
        }
    }
}
```

**Response Fields:**
* `id` - Created printable pack identification
* `redir` - Link to access the created 3D model (a key is used for personal access). Note that this 3D model will only be valid for 24 hours.
* `widgetUrl` - May be used to insert into iframe with custom settings
* `widgetHtml` - Please insert this code into HTML page to show Treatstock widget

### Error Response

```json
{
    "success": false,
    "errors": {
        "file": [
            "No file"
        ]
    }
}
```

---

## Retrieve Minimum Price for Uploaded 3D Model

Get the minimum price and details for an uploaded 3D model.

### Endpoint

```
GET https://www.treatstock.com/api/v2/printable-packs/<id>?private-key=<api-token>
```

Where `<id>` is the identification from the upload response.

### Response Example

```json
{
    "id": 223674,
    "model3d_id": 2965969,
    "created_at": "2019-07-29 10:33:03",
    "affiliate_price": "0.0000",
    "affiliate_currency": "USD",
    "calculated_min_cost": {
        "materialGroup": "PLA",
        "color": "White",
        "cost": 5.74
    },
    "success": true,
    "scaleUnit": "mm",
    "largestPartSize": {
        "length": 32.567,
        "width": 65.245,
        "height": 65.246,
        "measure": "mm"
    },
    "parts": {
        "MP:1815145": {
            "uid": "MP:1815145",
            "name": "test.stl",
            "qty": 1,
            "hash": "7e02f089e3e508459c967de27c10d45c",
            "size": {
                "length": 32.567,
                "width": 65.245,
                "height": 65.246,
                "measure": "mm"
            },
            "originalSize": {
                "length": 32.567,
                "width": 65.245,
                "height": 65.246,
                "measure": "mm"
            },
            "weight": 27.5,
            "texture": {
                "color": "White",
                "materialGroup": "PLA"
            }
        }
    }
}
```

**Note:** Calculated cost is the minimum price for PLA material and White color.

---

## Set Scaling Factors or Quantity

Update the scale unit or quantity for a printable pack.

### Endpoint

```
PUT https://www.treatstock.com/api/v2/printable-packs/<id>?private-key=<api-token>
```

Where `<id>` is the identification from the upload response.

### Parameters

**Set Scale Unit:**
* `scaleUnit=in` - Set scale unit to inches
* `scaleUnit=cm` - Set scale unit to centimeters
* `scaleUnit=mm` - Set scale unit to millimeters

**Change Quantity:**
* `qty["MP:1815155"]=7` - Set quantity for a specific part

### Request Examples

**Set Scale Unit to Inches:**

```bash
curl -X PUT -d scaleUnit=in https://www.treatstock.com/api/v2/printable-packs/<id>?private-key=<api-token>
```

**Set Scale Unit to Centimeters:**

```bash
curl -X PUT -d scaleUnit=cm https://www.treatstock.com/api/v2/printable-packs/<id>?private-key=<api-token>
```

**Set Scale Unit to Millimeters:**

```bash
curl -X PUT -d scaleUnit=mm https://www.treatstock.com/api/v2/printable-packs/<id>?private-key=<api-token>
```

**Change Quantity:**

```bash
curl -X PUT -d qty["MP:1815155"]=7 https://www.treatstock.com/api/v2/printable-packs/<id>?private-key=<api-token>
```

### Response Example

```json
{
    "success": true
}
```

---

## Receive Prices for Different Materials

Get prices for different materials and printers. If you set printable package location, you can receive prices for different materials.

### Endpoint

```
GET https://www.treatstock.com/api/v2/printable-pack-costs/?printablePackId=<id>&private-key=<api-token>
```

### Optional Parameters

* `location[ip]=83.69.106.68` - Specify client IP address
* `location[country]=US` - Specify country ISO code
* `printerMaterialGroup=Pla` - Filter by material group
* `printerColor=Black` - Filter by color

### Request Examples

**Basic Request:**

```bash
curl "https://www.treatstock.com/api/v2/printable-pack-costs/?printablePackId=<id>&private-key=<api-token>"
```

**With IP Location:**

```bash
curl "https://www.treatstock.com/api/v2/printable-pack-costs/?printablePackId=<id>&private-key=<api-token>&location[ip]=83.69.106.68"
```

**With Country Location:**

```bash
curl "https://www.treatstock.com/api/v2/printable-pack-costs/?printablePackId=<id>&private-key=<api-token>&location[country]=US"
```

**With Material and Color Filters:**

```bash
curl "https://www.treatstock.com/api/v2/printable-pack-costs/?printablePackId=<id>&private-key=<api-token>&location[country]=US&printerMaterialGroup=Pla&printerColor=Black"
```

### Response Example

```json
[
    {
        "printablePackId": 30,
        "materialGroup": "Plastic2",
        "printer": "US PS: Ditto-pro",
        "color": "Blue",
        "price": 4,
        "url": "https://www.treatstock.com/model3d/preload-printable-pack?packPublicToken=0...e&printerMaterialGroupId=6&printerColorId=90"
    },
    {
        "printablePackId": 30,
        "materialGroup": "Plastic2",
        "printer": "US 6: MakerBot Replicator",
        "color": "White",
        "price": 2.53,
        "url": "https://www.treatstock.com/model3d/preload-printable-pack?packPublicToken=0...e&printerMaterialGroupId=7&printerColorId=91"
    }
]
```

**Note:** If you get `{"reason": "not_calculated_yet", "success": false}`, try the attempt again.

---

## Place an Order

Place an order for 3D printing. You need to get `providerId` from the "printable-pack-costs" API request.

### Endpoint

```
POST https://www.treatstock.com/api/v2/place-order/create?private-key=<api-token>
```

### Request Body

```json
{
    "printablePackId": "223682",
    "providerId": "1371",
    "comment": "Please print it as fast as possible.",
    "location": {
        "email": "test@company.com",
        "company": "Big company"
    },
    "shippingAddress": {
        "country": "US",
        "zip": "20003",
        "city": "WASHINGTON",
        "state": "DC",
        "street": "727 C ST SE",
        "firstName": "Bill",
        "lastName": "Jobs"
    },
    "modelTextureInfo": {
        "isOneMaterialForKit": "1",
        "modelTexture": {
            "color": "Green",
            "materialGroup": "PLA"
        }
    }
}
```

### Success Response

```json
{
    "orderId": 26448,
    "total": 132.02,
    "url": "https://www.treatstock.com/workbench/order/view/26448"
}
```

### Error Responses

**Invalid Delivery Address:**

```json
{
    "errors": {
        "deliveryform-street": "This address is not supported by Treatstock Delivery Service. Please select another address. Reason: Address not found."
    }
}
```

**Validated Address Suggestion:**

```json
{
    "validatedAddress": {
        "id": 58214,
        "contact_name": "User name",
        "country": "US",
        "state": "DC",
        "city": "WASHINGTON",
        "street": "10 4TH ST SE",
        "street2": null,
        "zip": "20003",
        "comment": null,
        "phone": null,
        "email": "test@test.com",
        "company": null
    }
}
```

**Provider Cannot Print:**

```json
{
    "success": false,
    "message": "Specified provider cannot print with given details"
}
```

**Invalid Request:**

```json
{
    "success": false,
    "message": "Please specify printablePackId."
}
```

---

## Receive Possible Printer Material Groups and Colors

Get the full list of possible material groups and colors.

### Endpoint

```
GET https://www.treatstock.com/api/v2/material-group-colors/?private-key=<api-token>
```

### Request Example

```bash
curl "https://www.treatstock.com/api/v2/material-group-colors/?private-key=<api-token>"
```

### Response Example

```json
[
    {
        "code": "Metals and Alloys",
        "description": "Aluminum, stainless steel, titanium, nickel and cobalt chromium are the available materials which are industrial grade metals that are laser sintered from metal powder.",
        "colors": [
            {
                "code": "Silver",
                "rgb": "230,232,230"
            },
            {
                "code": "Gray",
                "rgb": "190,190,190"
            }
        ]
    }
]
```

---

## API Limits

Limits for one API key:

* **GET requests:** 7 connections at one time
* **POST requests:** 15 connections at one time
* **PUT requests:** 30 connections at one time

One connection type operates independently with other types.

---

## PHP Examples

You can use API wrapper for our API: [https://github.com/Treatstock/apiv2/](https://github.com/Treatstock/apiv2/)

---

## Support

Need help? Contact technical support.
