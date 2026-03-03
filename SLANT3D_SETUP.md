# Slant3D Integration Setup Guide

This document outlines the Slant3D checkout integration that has been implemented.

## Overview

The Slant3D integration allows users to order 3D prints through Slant3D's API V2. The flow is:
1. User selects Slant3D vendor
2. User selects material (filament)
3. User enters shipping information
4. System gets quote (estimates price and uploads file if needed)
5. User places order (drafts and processes order with Slant3D)

## Files Created

### Frontend Services
- `frontend/src/services/slant3d.ts` - Quote/estimate service
- `frontend/src/services/slant3dOrder.ts` - Order creation service

### Edge Functions
- `frontend/supabase/functions/vendor-slant3d-get-filaments/index.ts` - Get available filaments
- `frontend/supabase/functions/vendor-slant3d-upload-file/index.ts` - Upload file to Slant3D
- `frontend/supabase/functions/vendor-slant3d-get-quote/index.ts` - Get price quote/estimate
- `frontend/supabase/functions/vendor-slant3d-create-order/index.ts` - Draft and process order
- `frontend/supabase/functions/vendor-slant3d-get-order/index.ts` - Get order status
- `frontend/supabase/functions/vendor-slant3d-webhook/index.ts` - Handle webhook events

### Updated Files
- `frontend/src/data/vendors.ts` - Added Slant3D materials
- `frontend/src/pages/Order.tsx` - Added Slant3D support in order flow

## Environment Variables Required

Set these in your Supabase project settings (Edge Functions secrets):

```
SLANT3D_API_KEY=sl-your-api-key-here
SLANT3D_PLATFORM_ID=your-platform-uuid-here (REQUIRED - UUID format like: 555555-5555-5555-5555-5555555555)
SLANT3D_WEBHOOK_SECRET=your-webhook-secret-here (optional, for webhook verification)
```

**Important:** `SLANT3D_PLATFORM_ID` is **REQUIRED**. You must:
1. Log into your Slant3D account
2. Go to the Platforms section
3. Create a Platform (or use an existing one)
4. Copy the Platform ID (UUID format)
5. Set it as the `SLANT3D_PLATFORM_ID` secret in Supabase

Without a Platform ID, file uploads and orders will fail.

## Database Migration Needed

Create a table to cache uploaded files (prevents re-uploading the same file):

```sql
CREATE TABLE IF NOT EXISTS slant3d_files_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_url TEXT NOT NULL,
  public_file_service_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_url)
);

CREATE INDEX IF NOT EXISTS idx_slant3d_files_cache_url ON slant3d_files_cache(model_url);
CREATE INDEX IF NOT EXISTS idx_slant3d_files_cache_service_id ON slant3d_files_cache(public_file_service_id);
```

Also ensure the `orders` table supports Slant3D:
- `vendor` column should accept 'slant3d' (should already work if it's a text field)
- `vendor_order_id` should store the Slant3D `publicId`

## Setup Steps

### 1. Get Slant3D API Credentials
1. Create an account at Slant3D
2. Generate an API key (displayed only once - save it!)
3. Create a Platform (required for file uploads and orders)
4. Note your Platform ID (UUID format)

### 2. Deploy Edge Functions

Deploy all the edge functions to Supabase:

```bash
cd frontend
supabase functions deploy vendor-slant3d-get-filaments
supabase functions deploy vendor-slant3d-upload-file
supabase functions deploy vendor-slant3d-get-quote
supabase functions deploy vendor-slant3d-create-order
supabase functions deploy vendor-slant3d-get-order
supabase functions deploy vendor-slant3d-webhook
```

### 3. Set Environment Variables

In Supabase Dashboard:
1. Go to Project Settings > Edge Functions
2. Add secrets:
   - `SLANT3D_API_KEY`
   - `SLANT3D_PLATFORM_ID`
   - `SLANT3D_WEBHOOK_SECRET` (optional)

### 4. Run Database Migration

Run the SQL migration above to create the cache table.

### 5. Configure Webhook URL

In your Slant3D Platform settings:
1. Set webhook URL to: `https://your-project.supabase.co/functions/v1/vendor-slant3d-webhook`
2. Save the webhook secret (use this for `SLANT3D_WEBHOOK_SECRET`)

## How It Works

### Quote Flow
1. User selects material and enters shipping info
2. Frontend calls `vendor-slant3d-get-quote`
3. Edge function:
   - Checks if file is cached
   - If not, uploads file to Slant3D
   - Gets price estimate
   - Drafts order to get shipping costs
   - Returns quote with `publicFileServiceId`

### Order Flow
1. User confirms order
2. Frontend calls `vendor-slant3d-create-order`
3. Edge function:
   - Uses cached `publicFileServiceId` or uploads file
   - Drafts order with Slant3D
   - Validates price (if prior quote provided)
   - Processes order (charges payment)
   - Saves order to database
   - Returns order details

### Webhook Flow
1. Slant3D sends webhook when order ships
2. `vendor-slant3d-webhook` receives event
3. Updates order status in database
4. Creates order event record

## Testing

1. Test quote generation with a sample model
2. Test order creation (use test mode if available)
3. Verify webhook receives events (use Slant3D webhook testing tool)

## Notes

- Files are cached to avoid re-uploading the same model
- Slant3D requires files to be uploaded before ordering
- The API uses Bearer token authentication
- Orders are charged immediately when processed
- Webhook verification should be implemented for production

## Troubleshooting

- **File upload fails**: Check that `SLANT3D_PLATFORM_ID` is set correctly
- **Quote fails**: Verify API key and platform ID
- **Order fails**: Check that payment method is configured in Slant3D account
- **Webhook not received**: Verify webhook URL is set in Slant3D platform settings
