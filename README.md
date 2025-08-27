# 🎨 ShapeMint - AI-Powered 3D Model Generation Platform

ShapeMint is a cutting-edge platform that generates 3D models from text prompts using AI, stores them in Supabase, and displays them in an interactive 3D viewer.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

### 🛠️ Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MattSharp05/shapeMint.git
   cd shapeMint
   ```

2. **Switch to the sandbox branch (latest working version):**
   ```bash
   git checkout sandbox
   ```

3. **Navigate to frontend and install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   **⚠️ IMPORTANT**: Edit the `.env` file and add your actual API credentials.
   
   **Contact your team lead for:**
   - Supabase project URL and anonymous key
   - Meshy AI API key
   
   **Never commit `.env` files or share API keys publicly!**

5. **Start the application (both servers):**
   ```bash
   npm start
   ```
   
   This will automatically start:
   - Proxy server on `http://localhost:3001`
   - Dev server on `http://localhost:5175`

6. **Open your browser:**
   ```
   http://localhost:5175
   ```

## 🎯 How It Works

### 3D Model Generation Pipeline:
1. **User enters text prompt** (e.g., "red coffee mug")
2. **Meshy API generates 3D model** (GLB, OBJ, STL formats)
3. **Model metadata stored in Supabase** with direct URLs
4. **3D model displayed** in interactive viewer with rotation/zoom

### Architecture:
- **Frontend**: React + TypeScript + Vite
- **3D Rendering**: React Three Fiber + Three.js
- **API**: Meshy AI for model generation
- **Database**: Supabase for storage
- **Proxy Server**: Express.js for CORS handling

## 📋 Available Scripts

```bash
# Start both proxy and dev servers (recommended)
npm start

# Start only the dev server
npm run dev

# Start only the proxy server
npm run proxy

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## 🔧 Development Setup

### Why Two Servers?
The application requires **two servers** to run properly:

1. **Proxy Server** (`localhost:3001`): Handles CORS issues when loading 3D model files from Meshy API
2. **Dev Server** (`localhost:5175`): Serves the React application

### Manual Server Startup (if needed):
```bash
# Terminal 1 - Proxy Server
node proxy-server.js

# Terminal 2 - Dev Server  
npm run dev
```

## 🚨 Troubleshooting

### "Can't load GLB model" Error:
- **Cause**: Proxy server not running
- **Solution**: Make sure both servers are running (`npm start`)

### Model generates but doesn't display:
- **Check**: Browser console for CORS errors
- **Solution**: Restart proxy server (`npm run proxy`)

### Build errors:
- **Check**: All environment variables are set
- **Solution**: Copy `.env.example` to `.env` and add your API keys

## 🌟 Features

- ✅ AI-powered 3D model generation from text
- ✅ Interactive 3D model viewer (rotate, zoom, pan)
- ✅ Multiple export formats (GLB, OBJ, STL)
- ✅ Supabase integration for storage
- ✅ CORS-free model loading via proxy
- ✅ Modern React + TypeScript architecture
- ✅ Responsive design

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **3D Graphics**: React Three Fiber, Three.js, @react-three/drei
- **Styling**: Tailwind CSS
- **API Integration**: Meshy AI, Supabase
- **Build Tools**: Vite, ESLint
- **Proxy**: Express.js, http-proxy-middleware

## 📁 Project Structure

```
shapeMint/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── 3D/
│   │   │   │   └── ModelViewer.tsx    # 3D model display
│   │   │   └── Generation/
│   │   │       └── GenerationForm.tsx # Model generation form
│   │   ├── pages/
│   │   │   └── Generate.tsx           # Main generation page
│   │   ├── services/
│   │   │   ├── meshy.ts              # Meshy API integration
│   │   │   └── model.ts              # Supabase model service
│   │   └── lib/
│   │       └── supabase.ts           # Supabase configuration
│   ├── proxy-server.js               # CORS proxy server
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `VITE_MESHY_API_KEY` | Meshy AI API key | ✅ |

## 🎉 Latest Updates (August 2025)

### 🔄 Model Generation & Status Tracking
- Added `meshy_task_id` column to track model generation status
- Improved status polling with non-blocking edge functions
- Fixed model visibility in Dashboard and Marketplace
- Enhanced error handling in model generation process

### 🔒 Security Improvements
- Removed sensitive data logging (session tokens, user IDs)
- Enhanced authentication flow with secure token storage
- Improved RLS policies for model access

### 🎨 UI/UX Enhancements
- Fixed infinite re-render issues in Dashboard
- Improved model loading states and error messages
- Enhanced marketplace filtering to show completed models

### 🗄️ Database Updates
- Added new migrations for model tracking:
  - `20250827032421_create_generated_models_table.sql`
  - `20250827093000_add_progress_column.sql`
  - `20250827094700_add_meshy_task_id.sql`

## 🐛 Known Issues

- GLB model loading requires proxy server to be running
- Three.js version compatibility warnings (cosmetic only)
- Model generation can take up to 3 minutes

## 📄 License

This project is licensed under the MIT License.

---

**🎉 Happy 3D modeling with ShapeMint!**
