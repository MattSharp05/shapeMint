# Vercel Deployment Guide for ShapeMint

This guide will help you deploy your ShapeMint application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub/GitLab/Bitbucket**: Your code should be in a Git repository
3. **Node.js**: Version 18+ (Vercel requirement)

## Step 1: Prepare Your Repository

Your repository is already configured with:
- ✅ Vercel configuration (`vercel.json`)
- ✅ API routes in `/api` directory
- ✅ Proper build scripts
- ✅ TypeScript configuration

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Connect Repository**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Git repository
   - Select the `frontend` directory as the root directory

2. **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Environment Variables**:
   Add these environment variables in the Vercel dashboard:
   ```
   VITE_MESHY_API_KEY=your_meshy_api_key_here
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key_here
   ```

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   cd frontend
   vercel
   ```

## Step 3: Post-Deployment Configuration

### 1. Update CORS Settings
If you encounter CORS issues, you may need to update your Supabase CORS settings to include your Vercel domain.

### 2. Test API Endpoints
Verify these endpoints work:
- `/api/meshy/text-to-3d` (POST)
- `/api/meshy/text-to-3d/[taskId]` (GET)
- `/api/meshy/image-to-3d` (POST)
- `/api/meshy/image-to-3d/[taskId]` (GET)
- `/api/meshy/glb` (GET)

### 3. Update Frontend URLs
If you were using localhost URLs in development, update them to use your Vercel domain.

## Step 4: Custom Domain (Optional)

1. **Add Custom Domain**:
   - Go to your project settings in Vercel
   - Navigate to "Domains"
   - Add your custom domain
   - Follow DNS configuration instructions

2. **SSL Certificate**:
   - Vercel automatically provides SSL certificates
   - No additional configuration needed

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check that all dependencies are in `package.json`
   - Verify TypeScript compilation
   - Check for syntax errors

2. **API Route Errors**:
   - Verify environment variables are set
   - Check Vercel function logs
   - Ensure proper TypeScript types

3. **CORS Issues**:
   - Update Supabase CORS settings
   - Check API route headers

### Environment Variables

Make sure these are set in Vercel:
- `VITE_MESHY_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

### Build Optimization

Your app is already optimized with:
- Vite for fast builds
- Tailwind CSS for styling
- TypeScript for type safety
- Proper API route structure

## Monitoring & Analytics

1. **Vercel Analytics**:
   - Enable in project settings
   - Monitor performance metrics

2. **Function Logs**:
   - View API route logs in Vercel dashboard
   - Monitor for errors and performance

## Next Steps

After successful deployment:
1. Test all functionality
2. Set up monitoring
3. Configure custom domain (if desired)
4. Set up CI/CD for automatic deployments

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Vite Documentation](https://vitejs.dev/) 