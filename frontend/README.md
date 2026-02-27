# ShapeMint Frontend

This is the frontend application for ShapeMint, a 3D model generation and marketplace platform.

## Features

- 🎨 **3D Model Generation**: Create 3D models from text or images using Meshy AI
- 🛒 **Marketplace**: Browse and purchase 3D models
- 💳 **Payment Processing**: Secure payments with Stripe
- 🔐 **User Authentication**: User accounts and profiles
- 📱 **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **3D Rendering**: Three.js + React Three Fiber
- **Backend**: Vercel API Routes
- **Database**: Supabase
- **Payments**: Stripe
- **3D AI**: Meshy AI

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment variables**:
   Create a `.env` file with:
   ```
   VITE_MESHY_API_KEY=your_meshy_api_key_here
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## Deployment

This app is configured for deployment on Vercel. See `VERCEL_DEPLOYMENT.md` for detailed instructions.

### Quick Deploy

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

## API Routes

The app includes several API routes for 3D model generation:

- `POST /api/meshy/text-to-3d` - Generate 3D model from text
- `GET /api/meshy/text-to-3d/[taskId]` - Check text-to-3D status
- `POST /api/meshy/image-to-3d` - Generate 3D model from image
- `GET /api/meshy/image-to-3d/[taskId]` - Check image-to-3D status
- `GET /api/meshy/glb` - Proxy 3D model files
- `GET /api/health` - Health check

## Project Structure

```
frontend/
├── api/                 # Vercel API routes
├── src/
│   ├── components/      # React components
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── public/             # Static assets
├── vercel.json         # Vercel configuration
└── package.json        # Dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.