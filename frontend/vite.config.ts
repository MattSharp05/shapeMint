import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'http';

// Load environment variables
const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
    cors: true,
    open: true, // Auto-open in default browser
    proxy: {
      '/api/meshy/download': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/api/meshy/glb': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/api/meshy': {
        target: 'https://api.meshy.ai',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/meshy/, '/openapi/v2'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq: any, req: IncomingMessage) => {
            // Always set the Meshy API key from environment
            if (env.VITE_MESHY_API_KEY) {
              proxyReq.setHeader('Authorization', `Bearer ${env.VITE_MESHY_API_KEY}`);
            }
          });
        },
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/meshy-assets': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
