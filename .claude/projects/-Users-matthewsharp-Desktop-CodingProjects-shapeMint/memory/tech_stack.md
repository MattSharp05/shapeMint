---
name: Tech Stack
description: Core technologies — React 18/TS/Vite frontend, Supabase (Postgres + Edge Functions), Meshy AI, multi-vendor 3D printing
type: reference
---

- **Frontend**: React 18 + TypeScript + Vite (port 5175), Tailwind CSS, Three.js/R3F for 3D, Framer Motion
- **Backend**: Supabase (Postgres, Auth, Edge Functions), Express proxy on port 3001 for CORS
- **AI**: Meshy AI v2 — text-to-3D and image-to-3D with preview→refine pipeline
- **Vendors**: Slant3D (FDM), Shapeways (multi-material), Treatstock, CraftCloud
- **Payments**: Stripe (currently disabled)
- **Deployment**: Vercel (frontend + API routes), Supabase (hosted), Modal (blender-service)
- **Dev**: `npm run dev` in frontend/, proxy-server.js for model loading CORS
