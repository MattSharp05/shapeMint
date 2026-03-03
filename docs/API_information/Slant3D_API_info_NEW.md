# Slant3D API Documentation (Updated)

**Last Updated:** 2025-01-27  
**Status:** New API Documentation

---

## Introduction

**Slant 3D API V2 | REST**

Welcome to the Slant 3D API
Our API is for developers wanting to build an application on top of a print farm without any of the labor or costs associated with managing a print farm. We do all of the printing, post-processing, and shipping here at Slant 3D.

Turn your apps, file repositories, and ideas into real rapidly produced and direct to customer delivered products with Slant 3D's mega-print farm in the US.

### Capabilities
• 3D Printing

• 3rd Party Components

• Available Filaments

• Multi-Platform Support

• Customer Support

• Print Farm directly integrated into the API

• International Shipping

• File Storage Management

• Warehouse Order Tracking

• Fulfillment

• Stripe Connect

• Webhook Updates

• Print Tracking

### Limitations
• Request Limits

• Material Limitations

• Bulk Orders

• Split Fulfillment

• Refunds & Cancellations

### Overview

**Print Lifecycle**  
How we turn code into plastic

Your Application
Process Order

Slant 3D API
Order Management

Print Farm
Queue & Print

Fulfillment
Pack & ship

Customer  
Receives Product

### Quality Control
Each file goes through a manual review process before slicing and after printing. The print farm is directly integrated into the API for order tracking, part processing.

File Review
Queue analysis

Slice
Optimize Print

Print
Begins Printing

Collection
Gather parts

QC Review
Quality check

Approval
Pass or retry

Post Process
Part Completion

Fulfillment
Packed & Shipped

Customer  
Receives Product

### About Slant 3D
To learn more about Slant 3D visit the official site here

If you're not a developer, but still want to use Slant 3D's print farm for your shop.

Checkout one of our Print on Demand applications which use Slant 3D's API Portals or Teleport for 3D Print on Demand.

Teleport is our Shipping provider integration that works with shops like Etsy, Shopify, Ebay or any marketplace store. With Portals you can upload a file, it creates a product link, and then you can sell direct to customer in less than 3 minutes. Both are built using the API!

Technical Support
support@slant3d.com

dev4@slant3d.com

---

## Getting Started
Welcome to the Slant3D API! This guide will help you get up and running with our 3D printing on-demand service.

> **Note:** Detailed Walkthrough Coming Soon...

### Steps to Submit Your First Order
1. Get API Key
2. Create Platform
3. Upload File with platformId
4. Draft Order with publicFileServiceId
5. Process Order

---

## Authentication

### API Keys
Your generated API Key is used to authenticate your requests. Each key is unique to your account and should be kept and stored securely. When generated your API Key will only be displayed once. You need to store or save your generated API Key at time of creation. Keys can be regenerated at any time.

You can have a maximum of 3 API Keys per account. If you require more keys, please reach out to Slant 3D to increase your limits.

Your API Key will only be displayed once.
You need to store your API key securely.
Once you have an account and are ready, you can generate your API key on the account page. Once you have generated an API key, you can begin making requests to the Slant 3D API.

If you had beta access to V2 your V1 API Key will no longer be supported and you will need to create an account and new API Key here.

Test your API Key by grabbing all available materials at Slant 3D.

### Authentication Example

**GET** `https://slant3dapi.com/v2/api/filaments`

```javascript
// API Key authentication example
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

async function getAvailableFilaments() {
    try {
        const response = await fetch(`${baseURL}/filaments`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Available filaments:", data);
        return data;
    } catch (error) {
        console.error("Error fetching filaments:", error);
        throw error;
    }
}

getAvailableFilaments();
```

#### cURL Example

**GET** `https://slant3dapi.com/v2/api/filaments`

```bash
curl -X GET https://slant3dapi.com/v2/api/filaments \
  -H "Authorization: Bearer sl-api_key_here" \
  -H "Content-Type: application/json"
```

---

### Rate Limits
Rate Limits are calculated per API Key. Currently we only provide one free tier to cover all types of users. If you require more requests please reach out to Slant 3D.

**Free Tier:** 100 Requests / Minute

> **Note:** Rate limits are subject to change

#### Monitoring Your API Usage
Every API response includes rate limit headers that show your current usage and limits. This helps you track consumption and avoid hitting limits.

##### Checking Rate Limit Headers

```javascript
// Check rate limit headers in API response
async function makeAPIRequest() {
  const response = await fetch('https://slant3dapi.com/v2/api/filaments', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer sl-api_key_here',
      'Content-Type': 'application/json'
    }
  });

  // Access rate limit headers
  const limit = response.headers.get('X-RateLimit-Limit');
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');
  const role = response.headers.get('X-RateLimit-Role');

  console.log(`Rate Limit: ${remaining}/${limit} requests remaining`);
  console.log(`Resets at: ${new Date(parseInt(reset) * 1000)}`);
  console.log(`Account tier: ${role}`);

  // Check if approaching limit
  if (remaining / limit < 0.1) {
    console.warn('⚠️ Approaching rate limit!');
  }

  const data = await response.json();
  return data;
}
```

**Rate Limit Headers Explained:**
- **X-RateLimit-Limit:** Total requests allowed per time window
- **X-RateLimit-Remaining:** Requests remaining in current window
- **X-RateLimit-Reset:** Unix timestamp when limit resets
- **X-RateLimit-Role:** Your account tier (free only - for now)

#### Check Usage
Check your full account usage. This response includes each API key and it's current session usage. Currently the API is free to all users and rate limits are defaulted for all users. If you require greater limits please reach out to us.

**GET** `https://slant3dapi.com/v2/api/usage`

```javascript
// Check current usage per API key
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

async function checkUsage() {
    try {
        const response = await fetch(`${baseURL}/usage`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Usage data:", data);
        return data;
    } catch (error) {
        console.error("Error checking usage:", error);
        throw error;
    }
}

checkUsage();

        

Platforms
What is a Platform?
Platforms are the entry point for an application on the API. It allows you to upload files, create orders, and create customers for you application via the API. Anyone who uses the API from individual to commercial business should create a platform to start using the API.

> **Note:** API Keys work across all platforms  
> Platforms can be created & edited on the Account page

### How are Platforms used?
Platforms are used for organization and authorization of files and orders. Notifications around orders are sent to your platform's webhookURL. You can create multiple platforms per account to support different environments or applications.

When setting up your webhook URL an 'https' endpoint is required. To learn more about how to setup a webhook URL for testing you can check out these resources:

- [ngrok](https://ngrok.com/)
- [Cloudflare](https://www.cloudflare.com/)
- [localtunnel](https://localtunnel.github.io/www/)

Once you have an endpoint setup you can start receiving webhooks to your platform.

### Platform Structure
Here is how the platform object looks. Contains all information about your application as well as the endpoint where all webhooks will be sent.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Required | Max 100 Characters. Name of your Application (Example: The Big 3D Printing Store) |
| url | string | Required | The main URL of your platform. Must be a valid HTTPS URL for production environments. (Example: https://mystore.com) |
| webhookURL | string | Optional | The endpoint where Slant3D will send webhook notifications for orders and payments. Must be HTTPS. (Example: https://mystore.com/api/slant3d/webhook) |
| description | string | Optional | Max 500 Characters. A brief description of your platform to help identify its purpose. (Example: E-commerce platform for custom 3D printed products) |
| webhookSecret | string | Auto-Generated | Secret automatically generated when platform is created for webhook authentication (Example: abcdefghijklmnopqrstuvwxyz123/123=) |
| createdAt | string | Auto-Generated | ISO timestamp of when the platform was created (Example: 2025-09-30T15:27:14.416Z) |
| updatedAt | string | Auto-Generated | ISO timestamp of when the platform was last modified (Example: 2025-09-30T15:27:14.416Z) |

### Create Platform
Creating a platform will automatically generate the webhook secret used to authenticate requests from Slant 3D. Learn more about how to authenticate a webhook in the Webhooks section.

**POST** `https://slant3dapi.com/v2/api/platforms`

```javascript
// Create Platform
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

const platformCreateBody = {
  name: 'Magical 3D Printing',
  description: 'Convert your favorite images into prints!',
  url: 'https://magical3dprintingapplication.com',
  webhookURL: 'https://magical3dprintingapplication.com/api/slant/webhook'
};

async function createPlatform(platformCreateBody) {
    try {
        const response = await fetch(`${baseURL}/platforms`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(platformCreateBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Platform created:", data);
        return data;
    } catch (error) {
        console.error("Error creating platform:", error);
        throw error;
    }
}

createPlatform(platformCreateBody);
```

#### Create Platform Body Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Required | The name of your platform. This will be used to identify your platform in the dashboard. (Example: My E-commerce Store) |
| url | string | Required | The main URL of your platform. Must be a valid HTTPS URL for production environments. (Example: https://mystore.com) |
| webhookURL | string | Optional | The endpoint where Slant3D will send webhook notifications for orders and payments. Must be HTTPS. (Example: https://mystore.com/api/slant3d/webhook) |
| description | string | Optional | A brief description of your platform to help identify its purpose. (Example: E-commerce platform for custom 3D printed products) |

### Get Platform
Grab one of your created platforms by its id.

**GET** `https://slant3dapi.com/v2/api/platforms/${platformId}`

```javascript
// Get Platform
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";
const platformId = "555555-5555-5555-5555-5555555555";

async function getPlatform(platformId) {
    try {
        const response = await fetch(`${baseURL}/platforms/${platformId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Platform retrieved:", data);
        return data;
    } catch (error) {
        console.error("Error retrieving platform:", error);
        throw error;
    }
}

getPlatform(platformId);
```

### Get All Platforms

**GET** `https://slant3dapi.com/v2/api/platforms`

```javascript
// Get All Platforms
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

async function getAllPlatforms() {
    try {
        const response = await fetch(`${baseURL}/platforms`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("All platforms retrieved:", data);
        return data;
    } catch (error) {
        console.error("Error retrieving platforms:", error);
        throw error;
    }
}

getAllPlatforms();
```

### Update Platform

**PATCH** `https://slant3dapi.com/v2/api/platforms/${platformId}`

```javascript
// Update Platform
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";
const platformId = "555555-5555-5555-5555-5555555555";

const updateData = {
  webhookURL: "https://theupdatedwebhookurl.com/api/slant/webhook",
  description: "Testing an update description for my platform"
};

async function updatePlatform(platformId, updateData) {
    try {
        const response = await fetch(`${baseURL}/platforms/${platformId}`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Platform updated:", data);
        return data;
    } catch (error) {
        console.error("Error updating platform:", error);
        throw error;
    }
}

updatePlatform(platformId, updateData);
```

#### Request Body Fields (Partial Update)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Optional | Update the name of your platform. Must be unique among your platforms. (Example: Updated Store Name) |
| url | string | Optional | Update the main URL of your platform. Must be a valid HTTPS URL. (Example: https://newdomain.com) |
| webhookURL | string | Optional | Update the webhook endpoint. Set to empty string to remove webhook notifications. (Example: https://newdomain.com/webhooks/slant3d) |
| description | string | Optional | Update the description of your platform. (Example: Updated platform description) |

### Refresh Webhook Secret

**PATCH** `https://slant3dapi.com/v2/api/platform/${platformId}/webhook-secret`

```javascript
// Code here
```

### Delete Platform

**DELETE** `https://slant3dapi.com/v2/api/platforms/${platformId}`

```javascript
// Delete Platform
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";
const platformId = "555555-5555-5555-5555-5555555555";

async function deletePlatform(platformId) {
    try {
        const response = await fetch(`${baseURL}/platforms/${platformId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Platform deleted:", data);
        return data;
    } catch (error) {
        console.error("Error deleting platform:", error);
        throw error;
    }
}

deletePlatform(platformId);
```

---

## Files

### File Management System
Store and manage all of your user files within the API. Upload STLs to the API giving Slant 3D instant access to your STL before you even send your first print. Files can be stored and retrieved via your own internally set user ID for your application under the ownerId field. Using our direct upload storage system. Allowing light-weight application use.

File Restrictions
Dimensions
220mmx220mmx220mm

File Size
250mb maximum

STL Format
STL is the only currently supported format

File Structure
Field
Type
Required
Description
publicFileServiceId
string
Auto-Generated
Reference id for all file requests.
ownerId
string
Optional
Optional metadata field for your internal application user id. Help determine platform user ownership
Example:
55-55-55-55
type
string
Predefined
Defaults to STL. Currently all files must be STL
platformId
string
Required
Provided Platform that the file originated from
name
string
Required
File name that was provided at creation
Example:
OfficialTestFile.stl
fileURL
string
Predefined
Presigned File download URL. Lifespan of 1 hr for download. Only the STL file can be downloaded. Refreshed on GET request for file
STLMetrics
object
Auto-Generated
File Metrics object that includes file dimensions. Includes preview png image of STL at imageURL
notes
string
Predefined
File notes from our production team. Immutable and used for file feedback. The notes field is not printing instructions
Upload File
Maximum daily file uploads per platform is currently set to 100
File Upload requests use internal tokens per Platform which reset every 24 hours.
Our file management system enables you to manage user files all within the API. Upload files directly into Slant 3D's file records. Upload requests add the file into our storage, generate file metadata which includes an OpenSCAD preview image of your file, and allows you to reference the file record with the publicFileServiceId when submitting orders, estimating print costs, or downloading the file.

Uploads use server resources to analyze STLs, and should be done with that in mind.
Uploading a file can be done two different ways. Either by passing a valid download URL for your STL, or by directly uploading the file to our file storage system via presigned upload URLs.

We strongly suggest uploading and confirming files in batches of 2 to avoid issues with file analysis.
1. Presigned Upload URL (Recommended Approach)
Recommended approach for uploading files if you want to use the API to manage your files. Using this method you do not need to store files in your own bucket. Presigned Upload URLs allow you to use the browser to upload user files directly from your client to Slant 3D's file system. Making them accessible to our internal production system immediately, and without having to create a download URL for your files. Files can be uploaded via the browser or if necessary by your server. Manage file records for your application all within the API instead of passing URLs which need to be downloaded every time.

Generate URL
Request presigned upload URL

Client Uploads File
Upload STL to the URL

Confirm Upload
Send confirmation that file has completed its upload.

File Processed
File metrics are internally processed and preview is generated

Confirmation after upload is required for the upload to work.
2. File Upload
Server Upload
A simple call to create a publicFileServiceId for you file. Server side upload for STL files. Just pass a valid downloadable URL from your storage that the API can retrieve a file from. API downloads the file, processes, then passes back a publicFileServiceId which you can then use on your order requests.

Pass File Download URL in Body
Accessible download URL of file

API downloads the file, validates, and uploads to storage
Client uploads the file at the generated key

File Processed
File metrics are internally processed and preview is generated

Success Response
File metadata is returned

### Request Presigned Upload URL

Send a request to create a slot in our bucket for direct upload. Returns a file placeholder, as well as a URL that your client can directly upload to. With this method you can use the browser resources to upload the file and remove the processing from your server. A confirmation post request is required on completion of upload for file analysis.

**POST** `https://slant3dapi.com/v2/api/files/direct-upload`

```javascript
// Request Presigned Upload URL
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

const fileData = {
    name: "ducky.stl",
    ownerId: "101",
    platformId: "555555-5555-5555-5555-5555555555"
};

async function requestPresignedUploadURL(fileData) {
    try {
        const response = await fetch(`${baseURL}/files/direct-upload`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(fileData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Presigned URL generated:", data);
        return data;
    } catch (error) {
        console.error("Error requesting presigned URL:", error);
        throw error;
    }
}

requestPresignedUploadURL(fileData);
```

#### Request Presigned Upload URL Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Required | File name. Sanitized before storing. Unique to ownerId |
| platformId | string | Required | Attach the uuid generated when you created your platform. You must have a registered Platform to upload a file. (Example: 555555-5555-5555-5555-5555555555) |
| ownerId | string | Optional | Metadata field where you can store your application user's ID for managing files through the API. Can be used to make file requests by ownerId |

#### Sample STL upload to Presigned URL
Here is a sample of a function for uploading the raw file data to the S3 bucket using the generated presigned URL from the request.

```javascript
async uploadFileToPresignedURL(presignedUrl, file, onProgress, abortSignal = null) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      // Handle abort signal if provided
      if (abortSignal) {
        if (abortSignal.aborted) {
          reject(new Error('Upload cancelled by user'))
          return
        }
        
        // Listen for abort signal
        abortSignal.addEventListener('abort', () => {
          console.log('Aborting S3 upload due to user cancellation')
          xhr.abort()
        })
      }
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          onProgress(percentComplete)
        }
      })
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve(xhr.response)
        } else {
          console.error('S3 upload failed:', xhr.status, xhr.statusText, xhr.responseText)
          let errorMessage = "S3 upload failed"
          
          // Try to parse error response for more details
          try {
            const errorResponse = JSON.parse(xhr.responseText)
            if (errorResponse.message) {
              errorMessage = errorResponse.message
            }
          } catch (e) {
            // If parsing fails, use the status text
            if (xhr.status === 403) {
              errorMessage = 'Upload permission denied - presigned URL may have expired'
            } else if (xhr.status === 404) {
              errorMessage = 'S3 endpoint not found'
            } else if (xhr.status >= 500) {
              errorMessage = 'S3 server error - please try again'
            }
          }
          
          reject(new Error(errorMessage))
        }
      })
      
      xhr.addEventListener('error', () => {
        console.error('Network error during S3 upload')
        reject(new Error('Network error during S3 upload'))
      })
      
      xhr.addEventListener('abort', () => {
        console.log('S3 upload aborted')
        // Create an AbortError to match standard browser behavior
        const abortError = new Error('Upload cancelled by user')
        abortError.name = 'AbortError'
        reject(abortError)
      })
      
      // Open PUT request to presigned URL
      xhr.open('PUT', presignedUrl)
      
      // Set timeout (10 minutes for large files)
      xhr.timeout = 10 * 60 * 1000
      
      xhr.addEventListener('timeout', () => {
        console.error('S3 upload timeout')
        reject(new Error('Upload timeout - please try again with a smaller file or check your connection'))
      })
      
      // Set content type based on file type
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      
      // Send the file
      xhr.send(file)
    })
  }
```

### Confirm Presigned Upload
You will need to call this confirmation endpoint after you have finished uploading the STL from your application's browser or server. Pass the whole filePlaceholder object returned when you generated the presigned upload url at the time that you call this endpoint. File must be done uploading.

POST

https://slant3dapi.com/v2/api/files/confirm-upload
Request
Response
javascript

          
// Confirm Presigned Upload
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

// File metadata returned on presigned upload URL request
const filePlaceholder = {
    "id": 9999,
    "ownerId": "test1UserA",
    "type": "stl",
    "createdAt": "2025-10-25T16:35:00.768Z",
    "updatedAt": "2025-10-25T16:35:00.768Z",
    "name": "test-file-name",
    "notes": null,
    "platformId": "555555-5555-5555-5555-5555555555",
    "publicFileServiceId": "2222222-2222-2222-2222-2222222222"
};

async function confirmPresignedUpload(filePlaceholder) {
    try {
        const response = await fetch(`${baseURL}/files/confirm-upload`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({filePlaceholder})
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Upload confirmed:", data);
        return data;
    } catch (error) {
        console.error("Error confirming upload:", error);
        throw error;
    }
}

confirmPresignedUpload(filePlaceholder);

        
Server Upload
Must pass an accessible URL for upload. Returns publicFileServiceId for use in creating Orders.

POST

https://slant3dapi.com/v2/api/files
Request
Response
javascript

          
// Upload File with URL
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";
const signedFileDownloadURL = 'https://firebasestorage.googleapis.com/v0/b/myAwesomeAppStorage.com/o/files%2FSlant%203D%20Offical%20Appoved%20Test%20File.stl?alt=media&token=8be0ce83-126c-4fd9-8f2b-f3e2f253be70';

const fileUploadBody = {
    URL: signedFileDownloadURL,
    name: 'ducky',
    platformId: '555555-5555-5555-5555-5555555555',
    ownerId: "test1UserA",
    type: 'stl'
};

async function uploadFile(fileUploadBody) {
    try {
        const response = await fetch(`${baseURL}/files`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(fileUploadBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("File uploaded:", data);
        return data;
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
}

uploadFile(fileUploadBody);

        
Upload File Body
Field
Type
Required
Description
URL
string
Required
Downloadable link for you STL, the API sends a download request here. Must be accessible by the API
name
string
Required
Name of the file that you are uploading. Does not need to include .stl
ownerId
string
Optional
This field can be used for your internal user association on your application
platformId
string
Required
This is the platform that you are uploading the file for
type
string
Required
File Type. Only available option is STL currently.
Get File by Public File Service ID
Get files from Slant 3D filing system by their publicFileServiceId. File record includes metadata about the file, as well as a fileURL to download the STL.

GET

https://slant3dapi.com/v2/api/files/${publicFileServiceId}
Request
Response
javascript

          
// Get File By publicFileServiceId
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";
const publicFileServiceId = "2222222-2222-2222-2222-2222222222";

async function getFileByPublicFileServiceId(publicFileServiceId) {
    try {
        const response = await fetch(`${baseURL}/files/${publicFileServiceId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("File retrieved:", data);
        return data;
    } catch (error) {
        console.error("Error retrieving file:", error);
        throw error;
    }
}

getFileByPublicFileServiceId(publicFileServiceId);

        
Get Files by Public File Service IDs (Batch)
Get files from Slant 3D filing system by their publicFileServiceId. File record includes metadata about the file, as well as a fileURL to download the STL.

POST

https://slant3dapi.com/v2/api/files/batch
Request
Response
javascript

          
// Get Files by Public File Service IDs
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

const publicFileServiceIds = [
    '2222222-2222-2222-2222-2222222222',
    '2222222-2222-2222-2222-2222222223',
    '2222222-2222-2222-2222-2222222224',
    '2222222-2222-2222-2222-2222222225',
    '2222222-2222-2222-2222-2222222226'
];

async function getFilesByPublicFileServiceIds(publicFileServiceIds) {
    try {
        const response = await fetch(`${baseURL}/files/batch`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(publicFileServiceIds)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Files retrieved:", data);
        return data;
    } catch (error) {
        console.error("Error retrieving files:", error);
        throw error;
    }
}

getFilesByPublicFileServiceIds(publicFileServiceIds);

        
Get Files by Owner ID
Grab files based on your internal application's user ID. This will return all files across all of your platforms with the associated owner ID.

GET

https://slant3dapi.com/v2/api/files/owner/${ownerId}
Request
Response
javascript

          
// Get Files By Owner ID
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";
const ownerId = "1a2b3c4d5e6f";

async function getFilesByOwnerId(ownerId) {
    try {
        // Make sure your ownerId is in string format
        // Will return all files across your platforms with the same ownerId
        const response = await fetch(`${baseURL}/files/owner/${ownerId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Files by owner retrieved:", data);
        return data;
    } catch (error) {
        console.error("Error retrieving files by owner:", error);
        throw error;
    }
}

getFilesByOwnerId(ownerId);

        
Get Files by Platform ID
Get files from Slant 3D filing system by their publicFileServiceId. File record includes metadata about the file, as well as a fileURL to download the STL.

GET

https://slant3dapi.com/v2/api/files/platform/${platformId}
Request
Response
javascript

          
// Get Files by Platform ID
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";
const platformId = '555555-5555-5555-5555-5555555555';

async function getFilesByPlatformId(platformId) {
    try {
        const response = await fetch(`${baseURL}/files/platform/${platformId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Files by platform retrieved:", data);
        return data;
    } catch (error) {
        console.error("Error retrieving files by platform:", error);
        throw error;
    }
}

getFilesByPlatformId(platformId);

        
Get Files with Options
Get files from your account with filtering, pagination, and sorting options. Returns files associated with your authenticated account.

GET

https://slant3dapi.com/v2/api/files
Request
Response
javascript

          
// Get Files with Options
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

// Example with filtering, pagination, and sorting
const queryParams = new URLSearchParams({
    platformId: "555555-5555-5555-5555-5555555555",
    ownerId: "user123",
    page: "1",
    limit: "25",
    sortBy: "created_at",
    sortOrder: "desc",
    startDate: "2025-01-01",
    endDate: "2025-12-31"
});

async function getFiles() {
    try {
        const response = await fetch(`${baseURL}/files?${queryParams.toString()}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Files with options retrieved:", data);
        return data;
    } catch (error) {
        console.error("Error retrieving files with options:", error);
        throw error;
    }
}

getFiles();

        
Get Files Query Parameters
Field
Type
Required
Description
platformId
string
Optional
Filter files by platform ID
Example:
6bea8923-5a25-4297-b27b-12aa0f19d14c
ownerId
string
Optional
Filter files by owner ID (your application user ID)
Example:
user123
publicId
string
Optional
Filter by specific public file service ID
Example:
75f2ea04-21de-4859-b326-819c05cbcbdb
startDate
string
Optional
Filter files created after this date (ISO 8601 format)
Example:
2025-01-01
endDate
string
Optional
Filter files created before this date (ISO 8601 format)
Example:
2025-12-31
page
number
Optional
Page number for pagination (default: 1)
Example:
1
limit
number
Optional
Number of files per page (default: 50, max: 100)
Example:
25
sortBy
string
Optional
Field to sort by (default: created_at)
Example:
created_at
sortOrder
string
Optional
Sort order: asc or desc (default: desc)
Example:
desc
Estimate File Price to Print
Estimate the cost to print of a single file without the need to draft an order or collect customer information. If no filament is provided the cost is estimated against PLA BLACK.

POST

https://slant3dapi.com/v2/api/files/${publicFileServiceId}
Request
Response
javascript

          
// Get Price to Print of a File
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";
const publicFileServiceId = '2222222-2222-2222-2222-2222222222';

const estimateOptions = {
    "options": {
        "filamentId": "76fe1f79-3f1e-43e4-b8f4-61159de5b93c",
        "quantity": 5,
        "slicer": {
            "support_enabled": false
        }
    }
};

async function estimateFilePrice(publicFileServiceId, estimateOptions) {
    try {
        const response = await fetch(`${baseURL}/files/${publicFileServiceId}/estimate`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(estimateOptions)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("File price estimated:", data);
        return data;
    } catch (error) {
        console.error("Error estimating file price:", error);
        throw error;
    }
}

estimateFilePrice(publicFileServiceId, estimateOptions);

        
Estimate File Price Fields
Field
Type
Required
Description
publicFileServiceId
string
Required
Public File Service ID assigned at Upload uuid format
options
object
Optional
Options are passed in the request body.
Options Fields
Field
Type
Required
Description
filamentId
string
Optional
Must be a valid Filament that exists on the get Filaments request
quantity
number
Optional
Default to 1. Pass the amount of prints that you want to estimate the price of
slicer
object
Optional
Optional Slicer Options that can be passed as true/false. Can change the price per unit of a print.
Slicer Fields
Field
Type
Required
Description
support_enabled
boolean
Optional
Should supports be included on this print? Default to on if not provided.
Generate STL From OpenSCAD
Generate an STL Model file from OpenSCAD code. Provide the full OpenSCAD code as a string to convert and be returned an STL Buffer ready to download.

POST

https://slant3dapi.com/v2/api/files/openScad
Request
Response
javascript

          
// Generate STL from OpenSCAD
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";
const publicFileServiceId = '2222222-2222-2222-2222-2222222222';

async function generateSTLFromCode(scadCode) {
    try {
        const response = await fetch(`${baseURL}/files/openScad`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: { scadCode: scadCode }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error generating STL from code:", error);
        throw error;
    }
}

generateSTLFromCode(scadCode);

        
Generate STL From OpenSCAD Fields
Field
Type
Required
Description
scadCode
string
Required
The complete OpenSCAD code



Filaments
Filaments
List all available printing materials at Slant 3D. Directly connected to our print farm. You can retrieve availability metrics as well.

PLA & PETG are the only available filament types currently. Filaments are removed or added on a per demand basis. If you require a specific filament in order to make your application work, please reach out to Slant 3D support with the requested filament and current volume of orders per month.

If you are still using V1 API Not all filaments listed here are available on V1

Filament Structure
Field
Type
Required
Description
publicId
string
Predefined
Pass the filament public ID of the filament in your items array on an order for specific filament.
name
string
Predefined
Public name of the filament.
Example:
PLA MATTE BLACK
type
string
Predefined
All files are STL type for now. Always STL.
provider
string
Predefined
Provider or brand that created the filament.
color
string
Predefined
space seperated color definition field for the filament
Example:
matte black
hexValue
string
Predefined
Hex value used to represent the actual filament color.
profile
string
Predefined
Material type of the filament.
public
boolean
Predefined
Only publicly available filaments are listed on the API for now.
available
boolean
Predefined
Filament availability. Filaments can go out of stock temporarily or indefinitely. Check the filament availability before placing the order.
Get Available Filaments
Filament are stored as a local cache on the API and updated every 30 minutes with changes from our production system availability. To order a print in a specific filament, filamentId is used in combination with your publicFileServiceId on a constructed order.

GET

https://slant3dapi.com/v2/api/filaments
Request
Response
javascript

          
// Get Available Filaments
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

async function getAvailableFilaments() {
    try {
        const response = await fetch(`${baseURL}/filaments`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Available filaments:", data);
        return data;
    } catch (error) {
        console.error("Error fetching filaments:", error);
        throw error;
    }
}

getAvailableFilaments();

        


Components
Components
List all available 3rd-parts components at Slant 3D. 3rd party components are things like magnets, mounts, chargers, and screws that can all help make your 3D Print a fully realized product. We are adding components to our inventory based on our users needs.

Requests are fulfilled based on your order volume. Send your estimated orders/month amount as well as a link to the requested item to support@slant3d.com
Here is more component information

Component Structure
Field
Type
Required
Description
publicId
string
Auto-Generated
Pass the component public Id in your items array on the an order to include it in the order
name
string
Predefined
Example:
Adhesive Feet (4 pack)
description
string
Predefined
price
number
Predefined
Components are priced in USD only
Example:
0.50
weight
number
Predefined
Weight of item in grams
imageUrl
string
Auto-Generated
Image URL used to display the Component
dimensions
string
Auto-Generated
Formatted string with XxYxZ dimensions in mm
Example:
5mm x 5mm x 10mm
createdAt
string
Auto-Generated
ISO timestamp of when component was added
Example:
2025-03-10T15:45:33.617Z
Get Available Components
Filament are stored as a local cache on the API and updated every 30 minutes with changes from our production system availability. To order a print in a specific filament, filamentId is used in combination with your publicFileServiceId on a constructed order.

GET

https://slant3dapi.com/v2/api/components
Request
Response
javascript

          
// Get Available Components
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

async function getAvailableComponents() {
    try {
        const response = await fetch(`${baseURL}/components`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Available components:", data);
        return data;
    } catch (error) {
        console.error("Error fetching components:", error);
        throw error;
    }
}

getAvailableComponents();

        
If you want to include components in your orders, check out the Orders section.



Stationery
Stationery are packing inclusions that are attached to your order at shipment. This will be printed out and shipped with your order. More options will be coming for Stationery eventually.

Grab the available list of stationery options. Currently there is only a 4x6 card label that is printed out with your order. Can be customized how you would like, upload as a 4in x 6in png or jpeg.

Get All Stationery Options
Request
Response
javascript

          

// Get All Stationery
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

async function getAvailableStationery() {
    try {
        const response = await fetch(`${baseURL}/stationery`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Available stationery:", data);
        return data;
    } catch (error) {
        console.error("Error fetching stationery:", error);
        throw error;
    }
}

getAvailableStationery();

        
To Include stationary with your order, please visit Draft Order. Stationery is a type of item that is included in the items array on an order. And can be included free of charge.



Orders
Create an order through the API by making a simple request. Orders are structured for the API as an object with an array of items.
Items are sorted by type, you can pass a file ID as well as a filament ID to create a print job in our production system. We internally generate the labels for you order at time of shipment.

Orders are billed at time of processing with the associated publicPaymentServiceId on the customer
Order Lifecycle
Your Application
Receives or generates an order

Construct Order Object
Gather customer information and items to include on the order

Draft Order
Call the API to estimate the order costs.

Save Generated Public ID
Order returns a public ID used for processing. Order not paid yet

Process Order
Once order is confirmed, you call the API to process the order

Production System
Order is sent to production system queue.

File Review
Files are hand checked & approved before being sent to a printer

Send to Printer
Once approved or resliced, your file is sent to a printer

Print Completed
Print completed and approved or rejected

Quality Review
Print post processed and checked for quality or reprint

Packing & Shipping
Order gets packed and Components are added

Label Creation
Label gets created box is prepped for shipment

Provider pickup
Shipping provider picks up the order

Customer Delivery
Customer receives the product

Drafting your first Order
Drafting your first order requires you to create an order object. The constructed object structure is represented here and includes customer with shipping details, and an items array of objects which are identified by type on the api, and must all be sent together to properly draft an order.

Order Object
javascript

          

{
  "customer": {
    "details": {
        "email": "email@test.com",
        "address": {
            "name": "Your Customer",
            "line1": "123 Apple Tree St.",
            "line2": "",
            "city": "Washington",
            "state": "DC",
            "zip": "20001",
            "country": "US"
        }
    }
  },
  // Items included on the order object are used to calculate your order total 
  "items": [
    {
      "type": "PRINT",
      "publicFileServiceId": "2222222-2222-2222-2222-2222222222",
      "filamentId": "92b84110-6e43-4fc9-88aa-8f63967bb2d5",
      "quantity": 1,
      "name": "The Absolute Best Magical 3D Fidget Spinning Hinged Toy",
      "SKU": "the-best-123",
    },
    {
      "type": "COMPONENT",
      componentId: "644ff334-794e-4a57-86a8-0205264fe5a5",
      quantity: 5
    },
    {
      "type": "STATIONERY",
      "stationeryId": "8a45287e-0a07-47f4-8aca-aef216805ebc",
      "imageURL": "https://myawesomeapp.s3.us-west-2.amazonaws.com/card-images/1/stationery-image.png",
      "quantity": 1
    }
  ],
  // Sample Metadata: Include useful information that you might want attached to this order
  "metadata": {
    "userId": "MyAppsUserId123",
    "MyInternalOrderId": 1234567890,
    "source": "EXPLORE.PAGE",
    "productImage": "https://myapp.com/image"
  }
}

        
Customer Object
This is where your product will be delivered to. You may do some address validation internally before submitting. We do a light validation check on the address with Shippo. If you are creating a direct customer order use the publicPaymentServiceId field which is returned in Create Customer call. If no publicPaymentServiceId is provided it will default to the card associated with this account.

publicPaymentServiceId will default to your card if not provided
Items Array
Must be included as an array of items on the order. At least 1 item is required to submit an order. Type field is required to submit the order.

Available types: "PRINT", "STATIONERY", or "COMPONENT"
Metadata Object
This field is for you to include useful information associated with your order. Maximum 10 fields, and 3 depth on objects. There are some reserved fields. Do not store any credentials or authorization on the metadata fields. We recommend submitting your metadata with camel casing. Any snake case is converted to camel.

Metadata fields are converted to Camel Casing and returned as a camel case field in responses.
Options Object
The options object for orders currently only has one supported field. Shippo is the default and recommended option. Shipstation is much slower for estimating shipping costs.

shippingProvider: "SHIPPO" or "SHIPSTATION"
Drafting an Order
Drafting an order will not charge your account for the order. Although you do need a connected payment method on your account for a valid payment method to get connected with the order. Customer details are necessary for estimating shipping costs on an order. Orders can only be drafted once a valid platform exists for your account. Current item types are PRINT, STATIONERY, COMPONENT. Must provide at least 1 valid item for the item to estimate the costs. To simply estimate the cost to print a file view the Estimate File Price function in File section.

Draft Order
POST

https://slant3dapi.com/v2/api/orders
Request
Response
javascript

          
// Draft Order
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

const orderData = {
    "customer": {
        "platformId": "555555-5555-5555-5555-5555555555",
        "details": {
            "email": "email@test.com",
            "address": {
                "name": "Your Customer",
                "line1": "123 Apple Tree St.",
                "line2": "",
                "city": "Washington",
                "state": "DC",
                "zip": "20001",
                "country": "US"
            }
        }
    },
    "items": [
        {
            "type": "PRINT",
            "publicFileServiceId": "2222222-2222-2222-2222-2222222222",
            "filamentId": "92b84110-6e43-4fc9-88aa-8f63967bb2d5",
            "quantity": 1
        },
        // Component is optional
        {
            "type": "COMPONENT",
            "componentId": "644ff334-794e-4a57-86a8-0205264fe5a5",
            "quantity": 2
        },
        // Stationery is optional
        {
            "type": "STATIONERY",
            "stationeryId": "8a45287e-0a07-47f4-8aca-aef216805ebc",
            "imageURL": "https://your-bucket.com/images/1/image-name.png",
            "quantity": 1
        }
    ]
};

async function draftOrder(orderData) {
    try {
        const response = await fetch(`${baseURL}/orders`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Order drafted:", data);
        return data;
    } catch (error) {
        console.error("Error drafting order:", error);
        throw error;
    }
}

draftOrder(orderData);

        
Draft Order
Field
Type
Required
Description
customer
object
Auto-Generated
Contains shipping information. Where the order gets shipped
items
array
Required
Items array is how print items and component items are created on the order. Use type field for processing.
options
object
Optional
Order options that can be passed. Modify the price of the order.
metadata
object
Optional
Order metadata can be passed for internal usage. See metadata restrictions.
If passing metadata, make sure that you do not exceed 10 fields or 3 maximum depth. Some fields are reserved for internal processing.

Customer Object
Field
Type
Required
Description
publicPaymentServiceId
string
Optional
Optional field for the customer being charged. If not provided it will default use your account's associated card. For guest checkouts see Customers Section: Generate Checkout Session
Example:
uuid
details
object
Required
Here is where address information is passed. Check details object for more information.
Details Object
Field
Type
Required
Description
address
object
Required
Address object used by shipping providers to validate address and calculate shipping costs.
email
string
Required
Your user email or your customer email.
Address Object
Field
Type
Required
Description
name
string
Required
Name that will appear on the shipping label
line1
string
Required
Primary address field
line2
string
Optional
Apartment or building number
city
string
Required
state
string
Optional
Can be included for US orders / International region. Not required on orders
zip
string
Required
ZIP code
country
string
Required
2 character country ISO 3166 country codes
Print Item Object
Field
Type
Required
Description
type
string
Required
Must be "PRINT" for print items
Example:
PRINT
publicFileServiceId
string
Required
Public ID of the uploaded file to be printed
Example:
2222222-2222-2222-2222-2222222222
filamentId
string
Required
Public ID of the filament to use for printing
Example:
92b84110-6e43-4fc9-88aa-8f63967bb2d5
quantity
number
Required
Number of copies to print
Example:
1
name
string
Optional
Optional item title, can be used for identifying items on your orders more easily
SKU
string
Optional
Optional item SKU, should be unique
Component Item Object
Field
Type
Required
Description
type
string
Required
Must be "COMPONENT" for component items
Example:
COMPONENT
componentId
string
Required
Public ID of the component to include in the order
Example:
644ff334-794e-4a57-86a8-0205264fe5a5
quantity
number
Required
Number of components to include
Example:
5
Stationery Item Object
Field
Type
Required
Description
type
string
Required
Required Item Type field. All capital letters
stationeryId
string
Required
Returned ID when you get all stationery. See Stationery
imageURL
string
Required
4in. x 6in. Black & White image downloadable URL. Can be JPEG or PNG.
quantity
number
Optional
Amount of image prints to be included. Defaults to 1 when not provided.
Processing an Order
Before you can Process an Order you need to create a Draft. Use the public_id on your draft to process the order. Which will send the order through to be printed and shipped.

This function will trigger payment with the associated customer
You can process any valid drafted order. As soon as you process the order it gets sent into our production system queue for printing. To learn more about the order lifecycle visit here.

Process Order
POST

https://slant3dapi.com/v2/api/orders/${publicOrderId}
Request
Response
javascript

          
// Process Order
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";
const orderId = "SLANT_1234567890";

async function processOrder(orderId) {
    try {
        const response = await fetch(`${baseURL}/orders/${orderId}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Order processed:", data);
        return data;
    } catch (error) {
        console.error("Error processing order:", error);
        throw error;
    }
}

processOrder(orderId);

        
Getting an Order
Get Order
GET

https://slant3dapi.com/v2/api/orders/${publicOrderId}
Request
Response
javascript

          
// Get Order
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";
const orderId = "SLANT_1234567890";

async function getOrder(orderId) {
    try {
        const response = await fetch(`${baseURL}/orders/${orderId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Order retrieved:", data);
        return data;
    } catch (error) {
        console.error("Error retrieving order:", error);
        throw error;
    }
}

getOrder(orderId);

        
Getting Orders
Get Orders
Request
Response
javascript

          
// Get All Orders
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

async function getOrders() {
    try {
        const response = await fetch(`${baseURL}/orders`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Orders retrieved:", data);
        return data;
    } catch (error) {
        console.error("Error retrieving orders:", error);
        throw error;
    }
}

getOrders();

        
Getting Orders by Public IDs (Batch)
Retrieve multiple orders by providing an array of public IDs. This is useful for batch operations when you need specific orders.

Batch Request Body
Field
Type
Required
Description
publicIds
array
Required
Array of order public IDs to retrieve
Example:
["SLANT_1234567890", "SLANT_0987654321"]
Get Orders Batch
POST

https://slant3dapi.com/v2/api/orders/batch
Request
Response
javascript

          

// Get Multiple Orders by Public IDs
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

async function getOrdersBatch(orderIds) {
    try {
        const requestBody = {
            public_ids: orderIds
        };

        const response = await fetch(`${baseURL}/orders/batch`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Orders retrieved:", data);
        return data;
    } catch (error) {
        console.error("Error retrieving orders:", error);
        throw error;
    }
}

const orderIds = ["SLANT_1234567890", "SLANT_0987654321", "SLANT_1122334455"];
getOrdersBatch(orderIds);

        
Search Orders
Search through your orders by passing query parameters with your call. If you would like to get orders by IDs see Get Batch Orders. Or if you would like a specific order by its ID use Get Order function.

Search Query Parameters
Field
Type
Required
Description
status
string
Optional
Filter orders by status
publicId
string
Optional
Filter by specific order public ID
orderId
string
Optional
Alternative field name for publicId filter
startDate
string
Optional
Filter orders created after this date (ISO format)
endDate
string
Optional
Filter orders created before this date (ISO format)
page
number
Optional
Page number for pagination (default: 1)
Example:
1
limit
number
Optional
Number of orders per page (default: 50)
Example:
50
sortBy
string
Optional
Field to sort by (default: updated_at)
Example:
updated_at
sortOrder
string
Optional
Sort direction: asc or desc (default: desc)
Example:
desc
Search Orders (Get Orders with Options)
GET

https://slant3dapi.com/v2/api/orders
Request
Response
javascript

          
// Search Orders with Filters
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";

async function searchOrders() {
    try {
        const queryParams = new URLSearchParams({
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2025-10-28T12:00:00Z',
            page: '1',
            limit: '2'
        });

        const response = await fetch(`${baseURL}/orders?${queryParams}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Orders searched:", data);
        return data;
    } catch (error) {
        console.error("Error searching orders:", error);
        throw error;
    }
}

searchOrders();

        
Cancel & Refund an Order
Currently cancelling an order will also refund it as well as cancel associated fulfillment. If already shipped then the order will only refund since it has already left the warehouse.

Cancel Order
DELETE

https://slant3dapi.com/v2/api/orders/${publicOrderId}
javascript

          
// Cancel Order
const apiKey = "sl-api_key_here"; // Never store your API key in plain text
const baseURL = "https://slant3dapi.com/v2/api";
const orderId = "SLANT_1234567890";

async function cancelOrder(orderId) {
    try {
        const response = await fetch(`${baseURL}/orders/${orderId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Order cancelled:", data);
        return data;
    } catch (error) {
        console.error("Error cancelling order:", error);
        throw error;
    }
}

cancelOrder(orderId);

        
Refund an Order
Not Integrated yet. Use Cancel Order


Webhooks
Webhook URL Setup
Webhook URL for your platform is setup in the Platforms section.

List of event types coming from Slant webhooks

"order.shipped" is the only current webhook event
Structure and integration for existing webhooks may change

Sample Slant Webhook
javascript

          

{
  event_type: 'order.shipped',
  service: 'order-service',
  platform_id: '555555-5555-5555-5555-5555555555',
  timestamp: '1761933541285',
  data: {
    order: {
      public_id: 'SLANT_0123456789',
      status: 'SHIPPED',
      tracking_number: '900000000000000000000',
      shipment_status: 'SHIPPED'
    }
  },
  signature: 'HMAC-PAYLOAD-SIGNATURE'
}

        
Field
Type
Required
Description
event_type
string
Auto-Generated
The type of webhook that is being passed. Is an enumerated list of types.
service
string
Auto-Generated
Indicator of where the error occured
Example:
payment-service, order-service, print-service
platform_id
string
Auto-Generated
Your platform ID, if you are handling webhooks for multiple platforms at the same endpoint
Example:
555555-5555-5555-5555-5555555555
timestamp
string
Auto-Generated
When the webhook was created in ISO format
data
object
Auto-Generated
Passed information in the webhook. Usually contains order information.
signature
string
Auto-Generated
Format of the signature on the webhook
Field
Type
Required
Description
order
object
Auto-Generated
Typically order data is passed here under the order field
Webhook Signature Verification
All webhooks are signed with HMAC-SHA256 using a combination of your platform's webhook secret and the timestamp and the body of the request. Timestamp is stored in the X-Webhook-Timestamp header. You should verify this signature to ensure the webhook came from Slant3D.

Headers Included
Field
Type
Required
Description
Content-Type
string
Auto-Generated
Always application/json
Example:
application/json
X-Webhook-Timestamp
string
Auto-Generated
Unix timestamp when the webhook was sent
Example:
1698876543000
X-Webhook-Signature-256
string
Auto-Generated
HMAC-SHA256 signature of the webhook payload
Example:
sha256=a1b2c3d4e5f6...
User-Agent
string
Auto-Generated
Slant3D webhook user agent
Example:
Slant3D-Webhook/1.0
Webhook Verification Example
How to verify that the webhook came from Slant 3D using the signature on the webhook

javascript

          

const crypto = require('crypto');

// Run this function when a webhook hits your Platform webhook URL
function verifyWebhookSignature(payload, timestamp, signature, secret) {
  const expectedSignature = signature.replace('sha256=', '');
  
  // Reconstruct the signed payload (timestamp + body)
  const signedPayload = `${timestamp}.${payload}`;
  
  // Generate signature using your webhook secret
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  
  // Compare signatures securely
  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(computedSignature, 'hex')
  );
  
  // Check timestamp freshness (reject if older than 5 minutes)
  const age = Date.now() - parseInt(timestamp);
  const isFresh = age < 5 * 60 * 1000;
  
  return isValid && isFresh;
}

// Usage in Express
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const payload = req.body.toString();
  const timestamp = req.headers['X-Webhook-Timestamp'];
  const signature = req.headers['X-Webhook-Signature-256'];
  const userAgent = req.headers['User-Agent'];
  // Slant3D-Webhook/1.0
  
  if (!verifyWebhookSignature(payload, timestamp, signature, YOUR_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = JSON.parse(payload);
  // Process event...
});

        
Security Note: Always verify the webhook signature before processing webhook data to prevent unauthorized requests.



Access
Accessing Documentation Programmatically
The complete API specification is available as an OpenAPI 3.0 JSON document. This enables programmatic access for AI agents, code generators, and automated tooling.

For AI Agents: Claude Code and other AI tools can fetch this specification to understand the complete API structure, available endpoints, request/response schemas, and authentication requirements.
Get OpenAPI Specification
Retrieve the complete API documentation in OpenAPI 3.0 format. No authentication required for accessing the specification.

GET

https://slant3dapi.com/v2/api/openapi.json
Request
Response
javascript

          
# Get OpenAPI Specification with curl
curl -X GET "https://slant3dapi.com/v2/api/openapi.json" \
  -H "Accept: application/json"

# Save to file for offline use
curl -X GET "https://slant3dapi.com/v2/api/openapi.json" \
  -H "Accept: application/json" \
  -o slant3d-openapi.json

# For AI Agents - pipe directly to analysis tools
curl -s "https://slant3dapi.com/v2/api/openapi.json" | jq '.'

# Generate client SDK (example with openapi-generator)
curl -s "https://slant3dapi.com/v2/api/openapi.json" \
  -o spec.json && \
  openapi-generator-cli generate \
    -i spec.json \
    -g python \
    -o ./slant3d-python-sdk

        
Usage Examples
AI Agents: Use this endpoint to understand API capabilities before making requests
SDK Generation: Generate client libraries using OpenAPI generators
API Testing: Import into Postman, Insomnia, or other API testing tools
Documentation: Generate interactive docs with Swagger UI or Redoc




**Documentation prepared for:** ShapeMint Integration  
**Date:** 2025-01-27
