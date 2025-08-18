# Getting Started
**Description:** This API is made for anyone that wants to build on top of the Slant3D Print Factory! If you want to checkout a sample project that utilizes the API follow the link to this repository: https://github.com/slantdev4/branchedPODSample

---

# Authorization
**Description:** Requesting an API Key is done through the Home Page by clicking the "Request API Key" button. After you have connected a card and your API Key is available, you can use that key to connect to the Slant API to start slicing files and creating orders. Remember to take the proper security measures to ensure that your API key is not lost or used by someone without your authorized access.

### Example Request Axios
```
// This is an example of how to attach your API KEY to a request

let apiKeyValue = "YOUR_PROVIDED_API_KEY";

let res = await api.post('https://www.slant3dapi.com/api/ENDPOINT',
  { 
    headers: { 
    "api-key": apiKeyValue,
    "Content-Type": 'application/json'
    } 
  }
);
```

---

# Slice File
**Method: POST**

**URL:** https://www.slant3dapi.com/api/slicer

**Description:** Processes a slicing request for a 3D model file. It downloads the file from the provided URL, calculates the slicing metrics, and stores the sliced file and its metrics in the database.

## Parameters
### Required
**fileURL:** Attached to the body of the request. This is the URL of the file to be sliced. The file should be accessible from the provided URL for downloading and processing.

### Example Request Axios
```
let res = await api.post('https://www.slant3dapi.com/api/slicer',
  { 
    fileURL: 'https://firebasestorage.googleapis.com/v0/b/etsy-tester.appspot.com/o/uploads%2F1-20.stl?alt=media&token=93636d89-1b98-4d61-8249-70a2bac8cd20'
  }, // This fileUrl can be tested with the slicer
  { 
    headers: { 
    "api-key": apiKeyValue,
    "Content-Type": 'application/json'
    }
  }
);
```

### Example Response
```
{
  "message": "Slicing successful",
  "data": {
    "price": "$8.23"
  }
}
```

---

# Filament
**Method: GET**

**URL:** https://www.slant3dapi.com/api/filament

**Description:** Returns a list of filaments available for ordering via the API

### Example Request Axios
```
let res = await api.get('https://www.slant3dapi.com/api/filament',

  { 
    headers: { 
    "api-key": apiKeyValue,
    "Content-Type": 'application/json'
    }
  }
);
```

Example Response
```
{
    "filaments": [
        {
            "filament": "PLA BLACK", 
            "hexColor": "000000", 
            "colorTag": "black", 
            "profile": "PLA"
        },
        {
            "filament": "PLA WHITE",
            "hexColor": "ffffff",
            "colorTag": "white",
            "profile": "PLA"
        },
        .....
    ]
}
    
hexColor: Representative color of the filament for web display. This does not accurately depict the filament's true color

colorTag: The shortname to use for the color of the filament. This is to be used for API calls that specify a filament such as Create Order

profile:  The profile of the filament. This will be used to support other material types and unique filaments that require a special consideration like PETG. Add this to create order as well as {profile: 'PETG'}
```

---

# Create Order
**Method: POST**

**URL:** https://www.slant3dapi.com/api/order

**Description:** Creates an order based on the provided file URL, processes payment via Stripe, where it is put in the order queue at Slant 3D

## Parameters
### Required
**apiKey:** API Key attached in the headers of your request

**order:** This is all of the order data that is used to process an order. Pass an array of orderData objects to assign numerous items to the same order.

### Example Order
```
let orderNumber = 'My_Own_Generated_Order_Number';

let fileData = {
  filename: 'Test Object',
  fileUrl: 'url goes here',
  quantity: '1', // Number as a string
  color: 'Black',
  profile: 'PLA'
};

let customerDetails = {
  name: 'John Doe'
  email: 'sample@sample.com',
  phone: '123-123-1234',
  address: '123 River Street'
  city: 'Sample City',
  state: 'State',
  zip: '11111'
};

const orderData = {
    email: customerDetails.email, // REQUIRED
    phone: customerDetails.phone, // REQUIRED
    name: customerDetails.name, // REQUIRED
    orderNumber: orderNumber, // REQUIRED Your own order number logic 
    filename: filename, // REQUIRED
    fileURL: fileUrl, // REQUIRED The same fileUrl that was passed into the Slicer 
    bill_to_street_1: customerDetails.address, // REQUIRED
    bill_to_street_2: '',
    bill_to_street_3: '',
    bill_to_city: customerDetails.city, // REQUIRED
    bill_to_state: customerDetails.state, // REQUIRED
    bill_to_zip: customerDetails.zip, // REQUIRED
    bill_to_country_as_iso: 'US',
    bill_to_is_US_residential: 'true',
    ship_to_name: customerDetails.name, // REQUIRED
    ship_to_street_1: customerDetails.address, // REQUIRED
    ship_to_street_2: '',
    ship_to_street_3: '',
    ship_to_city: customerDetails.city, // REQUIRED
    ship_to_state: customerDetails.state, // REQUIRED Only when shipping to valid US address
    ship_to_zip: customerDetails.zip, // REQUIRED
    ship_to_country_as_iso: 'US', //REQUIRED  Using Country Code ISO 3166-1 Standards
    ship_to_is_US_residential: 'true', // Adjust if not in US
    order_item_name: fileName, // Your Own File Name Logic
    order_quantity: fileData.quantity // REQUIRED Quantity is sent up as a string
    order_image_url: '', // Your own Image URL
    order_sku: orderSKU, // Your own Order SKU logic
    order_item_color: fileData.color, // REQUIRED Must be set as one of our colors we support
    profile: fileData.profile //OPTIONAL defaults to PLA
};
const order = [orderData, ...] //We can add many orderData's here to wrap many items in the same order.
```

### Example Request Axios
```
let res = await api.post('https://www.slant3dapi.com/api/order', 
    order, // Attached as the body of the request
  { 
    headers: { 
    "api-key": apiKeyValue,
    "Content-Type": 'application/json'
    }
  }
);
```

### Example Response
```
{
  "orderId": "314144241",
}
```

---

# Estimate Order
**Method: POST**

**URL:** https://www.slant3dapi.com/api/order/estimate

**Description:** Creates an order estimate based on the provided file URL. Does not process payments for the file itself or go to Slant's production system. Has a validator that will pass back any malformed object errors.

## Parameters
### Required
**apiKey:** API Key attached in the headers of your request

**order:** This is all of the order data that is used to process an order. Pass an array of orderData objects to assign numerous items to the same order.

### Example Order
```
let orderNumber = 'My_Own_Generated_Order_Number';

let fileData = {
  filename: 'Test Object',
  fileUrl: 'url goes here',
  quantity: '1', // Number as a string
  color: 'Black',
  profile: 'PLA'
};

let customerDetails = {
  name: 'John Doe'
  email: 'sample@sample.com',
  phone: '123-123-1234',
  address: '123 River Street'
  city: 'Sample City',
  state: 'State',
  zip: '11111'
};

const orderData = {
    email: customerDetails.email, // REQUIRED
    phone: customerDetails.phone, // REQUIRED
    name: customerDetails.name, // REQUIRED
    orderNumber: orderNumber, // REQUIRED Your own order number logic 
    filename: filename, // REQUIRED
    fileURL: fileUrl, // REQUIRED The same fileUrl that was passed into the Slicer 
    bill_to_street_1: customerDetails.address, // REQUIRED
    bill_to_street_2: '',
    bill_to_street_3: '',
    bill_to_city: customerDetails.city, // REQUIRED
    bill_to_state: customerDetails.state, // REQUIRED
    bill_to_zip: customerDetails.zip, // REQUIRED
    bill_to_country_as_iso: 'US',
    bill_to_is_US_residential: 'true',
    ship_to_name: customerDetails.name, // REQUIRED
    ship_to_street_1: customerDetails.address, // REQUIRED
    ship_to_street_2: '',
    ship_to_street_3: '',
    ship_to_city: customerDetails.city, // REQUIRED
    ship_to_state: customerDetails.state, // REQUIRED Only when shipping to valid US address
    ship_to_zip: customerDetails.zip, // REQUIRED
    ship_to_country_as_iso: 'US', //REQUIRED  Using Country Code ISO 3166-1 Standards
    ship_to_is_US_residential: 'true', // Adjust if not in US
    order_item_name: fileName, // Your Own File Name Logic
    order_quantity: fileData.quantity // REQUIRED Quantity is sent up as a string
    order_image_url: '', // Your own Image URL
    order_sku: orderSKU, // Your own Order SKU logic
    order_item_color: fileData.color, // REQUIRED Must be set as one of our colors we support
    profile: fileData.profile //OPTIONAL defaults to PLA
};
const order = [orderData, ...] //We can add many orderData's here to wrap many items in the same order.
```

### Example Request Axios
```
let res = await api.post('https://www.slant3dapi.com/api/order', 
    order, // Attached as the body of the request
  { 
    headers: { 
    "api-key": apiKeyValue,
    "Content-Type": 'application/json'
    }
  }
);
```

### Example Response
```
{
    "totalPrice": 9.31, //USD is the default currency
    "shippingCost": 5.56,
    "printingCost": 3.75
}
```

---

# Estimate Shipping
**Method: POST**

**URL:** https://www.slant3dapi.com/api/order/estimate

**Description:** Creates an order shipping estimate based on the provided file URL and shipping address. Does not process payments for the file itself or go to Slant's production system. Has a validator that will pass back any malformed object errors.

## Parameters
### Required
apiKey: API Key attached in the headers of your request

order: This is all of the order data that is used to process an order. Pass an array of orderData objects to assign numerous items to the same order.

### Example Order
```
let orderNumber = 'My_Own_Generated_Order_Number';

let fileData = {
  filename: 'Test Object',
  fileUrl: 'url goes here',
  quantity: '1', // Number as a string
  color: 'Black',
  profile: 'PLA'
};

let customerDetails = {
  name: 'John Doe'
  email: 'sample@sample.com',
  phone: '123-123-1234',
  address: '123 River Street'
  city: 'Sample City',
  state: 'State',
  zip: '11111'
};

const orderData = {
    email: customerDetails.email, // REQUIRED
    phone: customerDetails.phone, // REQUIRED
    name: customerDetails.name, // REQUIRED
    orderNumber: orderNumber, // REQUIRED Your own order number logic 
    filename: filename, // REQUIRED
    fileURL: fileUrl, // REQUIRED The same fileUrl that was passed into the Slicer 
    bill_to_street_1: customerDetails.address, // REQUIRED
    bill_to_street_2: '',
    bill_to_street_3: '',
    bill_to_city: customerDetails.city, // REQUIRED
    bill_to_state: customerDetails.state, // REQUIRED
    bill_to_zip: customerDetails.zip, // REQUIRED
    bill_to_country_as_iso: 'US',
    bill_to_is_US_residential: 'true',
    ship_to_name: customerDetails.name, // REQUIRED
    ship_to_street_1: customerDetails.address, // REQUIRED
    ship_to_street_2: '',
    ship_to_street_3: '',
    ship_to_city: customerDetails.city, // REQUIRED
    ship_to_state: customerDetails.state, // REQUIRED Only when shipping to valid US address
    ship_to_zip: customerDetails.zip, // REQUIRED
    ship_to_country_as_iso: 'US', //REQUIRED  Using Country Code ISO 3166-1 Standards
    ship_to_is_US_residential: 'true', // Adjust if not in US
    order_item_name: fileName, // Your Own File Name Logic
    order_quantity: fileData.quantity // REQUIRED Quantity is sent up as a string
    order_image_url: '', // Your own Image URL
    order_sku: orderSKU, // Your own Order SKU logic
    order_item_color: fileData.color, // REQUIRED Must be set as one of our colors we support
    profile: fileData.profile //OPTIONAL defaults to PLA
};
const order = [orderData, ...] //We can add many orderData's here to wrap many items in the same order. 
```

### Example Request Axios
```
let res = await api.post('https://www.slant3dapi.com/api/order/estimateShipping', 
    order, // Attached as the body of the request
  { 
    headers: { 
    "api-key": apiKeyValue,
    "Content-Type": 'application/json'
    }
  }
);
```

### Example Response
```
{
    "shippingCost": 4.81,
    "currencyCode": "usd"
}
```

---

# Shipping and Tracking
**Method: GET**

**URL:** https://www.slant3dapi.com/api/order/${orderId}/get-tracking

**Description:** Get tracking numbers and shipping status.

## Parameters
### Required
OrderId: Included as a parameter in the URL. This is the orderId of the order returned in the Create Order.

### Example Request Axios
```
let res = await api.get('https://www.slant3dapi.com/api/order/${orderId}/get-tracking',

  { 
    headers: { 
    "api-key": apiKeyValue,
    "Content-Type": 'application/json'
    }
  }
);
```

### Example Response
```
{
  "status": "awaiting_shipment",
  "trackingNumbers": []
}
```

---

# Get Orders
**Method: GET**

**URL:** https://www.slant3dapi.com/api/order/

**Description:** Get tracking numbers of all the orders tied to your account

### Example Request Axios
```
let res = await api.get('https://www.slant3dapi.com/api/order/',

  { 
    headers: { 
    "api-key": apiKeyValue,
    "Content-Type": 'application/json'
    }
  }
);
```

### Example Response
```
{
    "ordersData": [
        {
            "orderId": 1234567890,
            "orderTimestamp": {
                "_seconds": 1719510986,
                "_nanoseconds": 710000000
            }
        }
    ]
}
```

---

# Cancel Order
**Method: DELETE**

**URL:** https://www.slant3dapi.com/api/order/${orderId}

**Description:** Attempts to delete an order and refund. Orders are only cancellable up until a part has printed. If there are issues with this endpoint, please reach out to us in the discord.

## Parameters
### Required
OrderId: Included as a parameter in the URL. This is the orderId of the order returned in the Create Order.

### Example Request Axios
```
let res = await api.delete('https://www.slant3dapi.com/api/order/${orderId}',

  { 
    headers: { 
    "api-key": apiKeyValue,
    "Content-Type": 'application/json'
    }
  }
);
```

### Example Response
```
{
    "status": "Order cancelled"
}
```

---

# Subscribe Webhook
**Method: POST**

**URL:** https://www.slant3dapi.com/api/customer/subscribeWebhook

**Description:** Subscribes a given webhook endpoint URL for order updates. Currently, this will only tell you when the order gets shipped with tracking information. When succesfully set, we will send a test payload to the endpoint. If there are issues with this endpoint, please reach out to us in the discord.

## Parameters
### Required
endPoint: This will be passed in the request body. It is the endpoint URL you are wishing to subscribe with.

### Example Request Axios
```
let res = await api.post('https://www.slant3dapi.com/api/customer/webhookSubscribe',
  {
    "endPoint": endPoint
  },
  { 
    headers: { 
    "api-key": apiKeyValue,
    "Content-Type": 'application/json'
    }
  }
);
```

### Example Response
```
Request Response:
{
    "message": "Endpoint Configured",
    "endPoint": "https://example.com"
}
    
Webhook Example:
{
  "orderId": "1234567890",
  "status": "SHIPPED",
  "trackingNumber": "ABCDEF123456",
  "carrierCode": "usps"
}
```