#!/bin/bash

echo "🚀 Deploying Updated ComfyUI Test Edge Function..."

# Navigate to frontend directory
cd "$(dirname "$0")"

# Deploy the edge function
echo "📦 Deploying updated test-comfyui function..."
echo "⚠️  Please deploy this function via the Supabase Dashboard:"
echo "   1. Go to your Supabase project dashboard"
echo "   2. Navigate to Edge Functions"
echo "   3. Find 'test-comfyui' function"
echo "   4. Click 'Deploy' or 'Redeploy'"
echo ""
echo "📋 Or use CLI (if configured):"
echo "   supabase functions deploy test-comfyui"

echo ""
echo "✅ After deployment, test at:"
echo "   http://localhost:5173/test-comfyui"
echo ""
echo "🔧 Changes made:"
echo "   - Added connection test endpoint"
echo "   - Fixed CORS issues"
echo "   - Better error handling" 