#!/bin/bash

echo "🚀 Deploying ComfyUI Test Edge Function..."

# Navigate to frontend directory
cd "$(dirname "$0")"

# Deploy the edge function
echo "📦 Deploying test-comfyui function..."
supabase functions deploy test-comfyui

echo "✅ Deployment complete!"
echo ""
echo "🔗 Test your ComfyUI integration at:"
echo "   http://localhost:5173/test-comfyui"
echo ""
echo "📋 Next steps:"
echo "   1. Start your frontend: npm run dev"
echo "   2. Navigate to /test-comfyui"
echo "   3. Test the connection to your ComfyUI server"
echo "   4. Upload an image and run a test generation" 