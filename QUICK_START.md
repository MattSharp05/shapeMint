# 🚀 Quick Start Guide

## Running the Development Server

The project structure has the main application in the `frontend/` directory. You need to run commands from there.

### Step 1: Navigate to Frontend Directory
```bash
cd frontend
```

### Step 2: Install Dependencies (if not already installed)
```bash
npm install
```

### Step 3: Start Development Server
```bash
npm run dev
```

This will start:
- **Dev server** on `http://localhost:5175` (or next available port)
- The proxy server should also be running (check `package.json` scripts)

### Alternative: Start Both Servers
If you need both the proxy and dev server:
```bash
npm start
```

---

## ⚠️ Common Issues

### "vite: command not found"
- **Solution**: Make sure you're in the `frontend/` directory
- **Solution**: Run `npm install` to install dependencies

### Node.js Version Issues
- **Required**: Node.js 18+ (check with `node --version`)
- **If using conda**: You may need to install Node.js separately or use a Node.js environment

### Port Already in Use
- Vite will automatically try the next available port
- Or specify a port: `npm run dev -- --port 3000`

---

## 📁 Project Structure

```
shapeMint/
├── frontend/          ← Run commands from here
│   ├── src/
│   ├── package.json
│   └── ...
└── package.json       ← Root package.json (minimal)
```

---

## 🔧 Environment Setup

Make sure you have a `.env` file in the `frontend/` directory with:
```
VITE_MESHY_API_KEY=your_key_here
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here
```
