# ShapeMint AI Coding Agent Instructions

## Project Overview
ShapeMint is an AI-powered 3D model generation and manufacturing platform. Users transform text prompts or images into 3D models via the Meshy API, then either download files or order physical prints through manufacturing partners like Slant3D.

**Core Flow**: Text/Image → Meshy API → 3D Model (GLB/OBJ/STL) → Supabase Storage → Download or Manufacturing Order

## Architecture & Key Components

### Dual-Server Development Setup
- **Proxy Server** (`localhost:3001`): Handles CORS for Meshy asset loading and API requests
- **Dev Server** (`localhost:5175`): React app with Vite
- **Critical**: Both servers must run together (`npm start` in `/frontend`)

### Core Services
- **Meshy Service** (`src/services/meshy.ts`): Text/image-to-3D generation with polling and progress tracking
- **Model Service** (`src/services/model.ts`): Supabase CRUD for `generated_models` table
- **Stripe Service** (`src/services/stripe.ts`): Payment processing for downloads and manufacturing

### Database Schema (Supabase)
Key tables in `schema.sql`:
- `generated_models`: User's AI-generated 3D models with URLs and metadata
- `generation_tasks`: Tracks Meshy API tasks and status
- `orders`: Manufacturing orders with Slant3D integration
- `profiles`: User profiles linked to auth.users

### Supabase Edge Functions
Located in `frontend/supabase/functions/`:
- `generate-3d-model/`: Main model generation orchestrator
- `create-checkout-session/`: Stripe payment session creation
- `slant3d-*`: Manufacturing partner integrations (quote, order, slicer)
- `generate-thumbnail/`: 3D model thumbnail generation

## Development Patterns

### 3D Model Rendering
- **React Three Fiber** for WebGL rendering in `components/3D/ModelViewer.tsx`
- Models load via proxy: `/api/meshy/glb?url=${encodeURIComponent(meshyUrl)}`
- Always use proxied URLs to avoid CORS issues

### State Management Flow
1. Generate page: Text prompt → Meshy API → Polling → Model URLs
2. Model URLs stored in Supabase with user association
3. Navigation state passes `modelData`, `modelUrl`, `stlUrl` between pages
4. Order page auto-populates from navigation state

### API Integration Patterns
- **Meshy API**: Text-to-3D via proxy server (`proxy-server.js`)
- **Supabase**: Direct client calls for CRUD, Edge Functions for external APIs
- **Stripe**: Edge Function creates sessions, client redirects to checkout

### Error Handling
- Extensive logging with emoji prefixes for easy scanning (🔄, ✅, ❌)
- Task polling with progress tracking and stuck detection
- Graceful fallbacks for missing navigation state

## Essential Development Commands

```bash
# Start both servers (essential for development)
cd frontend && npm start

# Individual servers (if needed)
npm run proxy  # Port 3001
npm run dev    # Port 5175

# Supabase functions
cd frontend/supabase && supabase functions serve
```

## Critical Integration Points

### Proxy Configuration (`proxy-server.js`)
- Handles Meshy API requests and asset loading
- Required environment variables: `VITE_MESHY_API_KEY`
- CORS headers essential for 3D model loading

### Navigation State Pattern
Pages pass complex state via `useNavigate`:
```tsx
navigate('/order', { 
  state: { modelData, modelUrl, stlUrl } 
});
```

### Stripe Checkout Flow
1. `stripeService.redirectToCheckout()` → Edge Function
2. Stripe processes payment → redirect with `session_id`
3. Success pages verify payment and create orders via Edge Functions

## File Organization Conventions
- **Pages**: Main route components in `src/pages/`
- **Components**: Organized by domain (`3D/`, `Generation/`, `Payment/`)
- **Services**: External API wrappers in `src/services/`
- **Types**: TypeScript definitions in `src/types/`

## Environment Requirements
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_MESHY_API_KEY=your_meshy_key
STRIPE_SECRET_KEY=your_stripe_key (Edge Functions)
```

## Common Debugging
- Check both servers are running if 3D models won't load
- Verify proxy logs for Meshy API issues
- Use browser network tab for CORS or 404 errors
- Check Supabase logs for Edge Function errors
