import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
      // Route ALL /api/meshy requests to our local proxy server
      '/api/meshy': {
        target: 'http://localhost:3001',
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
