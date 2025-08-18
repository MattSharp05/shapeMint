# ShapeMint Development Setup

## 🚨 IMPORTANT: How to Start Development Server

### ✅ Correct Way:
```bash
npm start
```

### ❌ Wrong Way:
```bash
npm run dev  # This will cause 500 errors!
```

## Why This Matters

ShapeMint uses **two servers** that must run together:

1. **Vite Dev Server** (port 5175) - Frontend React app
2. **Proxy Server** (port 3001) - Handles Meshy API calls

## The Error Your Coworkers Are Seeing

If you use `npm run dev`, you'll get:
```
POST http://localhost:5175/api/meshy/text-to-3d 500 (Internal Server Error)
Error generating preview: Request failed with status code 500
```

This happens because the proxy server isn't running to handle `/api/meshy/*` requests.

## Complete Setup Instructions

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Set Up Environment Variables
```bash
# Copy example env file
cp .env.example .env

# Add your API keys:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MESHY_API_KEY=your_meshy_api_key
```

### 3. Start Development (BOTH SERVERS)
```bash
npm start
```

This runs: `concurrently "npm run proxy" "npm run dev"`

### 4. Verify It's Working
- Frontend: http://localhost:5175
- Proxy server should be running on port 3001
- No 500 errors when generating models

## Available Scripts

- `npm start` - **Use this for development** ✅
- `npm run dev` - Only Vite (will cause errors) ❌  
- `npm run proxy` - Only proxy server
- `npm run build` - Production build
- `npm run preview` - Preview production build

## Troubleshooting

### "Port 5175 is already in use"
```bash
# Kill existing processes
pkill -f "vite"
pkill -f "proxy-server"
npm start
```

### "500 Internal Server Error" 
- Make sure you're using `npm start` not `npm run dev`
- Check that proxy-server.js exists
- Verify environment variables are set

### Edge Function Alternative
If proxy server issues persist, the app can also use Supabase Edge functions:
- Make sure Edge functions are deployed
- Check Supabase project settings
- Verify MESHY_API_KEY is set in Edge function environment

## Architecture Notes

ShapeMint supports two model generation approaches:

1. **Proxy Server** (current default)
   - Local Node.js proxy at `/api/meshy/*`
   - Requires both servers running
   - Faster development iteration

2. **Edge Functions** (backup/production)
   - Supabase Edge functions
   - `modelService.generate3DModel()`
   - Better for production deployment

Both approaches are implemented and working. The proxy server approach requires `npm start` to work properly.
