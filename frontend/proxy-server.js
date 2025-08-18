import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support large image uploads

// Proxy middleware configuration for Meshy assets
const meshyAssetsProxy = createProxyMiddleware({
  target: 'https://assets.meshy.ai',
  changeOrigin: true,
  secure: true,
  router: {
    '/meshy-assets/*': 'https://assets.meshy.ai/:splat'
  },
  pathRewrite: (path) => {
    // Extract the base path and query parameters
    const [basePath, queryString] = path.split('?');
    // Remove /meshy-assets prefix and ensure leading slash
    const targetPath = basePath.replace(/^\/meshy-assets\/?/, '/');
    // Preserve query parameters if they exist
    return queryString ? `${targetPath}?${queryString}` : targetPath;
  },
  onProxyReq: (proxyReq, req) => {
    // Log detailed request information
    console.log('Meshy asset request:', {
      originalUrl: req.originalUrl,
      url: req.url,
      path: req.path,
      query: req.query,
      headers: req.headers,
      method: req.method,
    });
    console.log('Proxy request URL:', proxyReq.path);

    // Set required headers for Meshy assets
    proxyReq.setHeader('Origin', 'https://assets.meshy.ai');
    proxyReq.setHeader('Referer', 'https://assets.meshy.ai/');
    proxyReq.setHeader('Accept', '*/*');

    // Copy authorization header if present
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      proxyReq.setHeader('Authorization', authHeader);
    }
  },
  onProxyRes: (proxyRes, req) => {
    // Log detailed response information
    console.log('Meshy asset response:', {
      originalUrl: req.originalUrl,
      url: req.url,
      path: req.path,
      status: proxyRes.statusCode,
      statusMessage: proxyRes.statusMessage,
      headers: proxyRes.headers,
      responseUrl: proxyRes.responseUrl
    });
    
    if (proxyRes.statusCode !== 200) {
      console.error('Proxy error:', {
        status: proxyRes.statusCode,
        message: proxyRes.statusMessage,
        headers: proxyRes.headers
      });
    }
  }
});

// Use proxy middleware for /meshy-assets path
app.use('/meshy-assets', meshyAssetsProxy);

// Meshy API proxy endpoints
const MESHY_API_KEY = process.env.VITE_MESHY_API_KEY;
const MESHY_TEXT_TO_3D_BASE = 'https://api.meshy.ai/v2';
const MESHY_IMAGE_TO_3D_BASE = 'https://api.meshy.ai/openapi/v1';

if (!MESHY_API_KEY) {
  console.error('❌ VITE_MESHY_API_KEY environment variable is required');
  process.exit(1);
}

// Text-to-3D endpoints
app.post('/api/meshy/text-to-3d', async (req, res) => {
  try {
    console.log('🔄 Proxying text-to-3D request:', req.body);
    const response = await axios.post(`${MESHY_TEXT_TO_3D_BASE}/text-to-3d`, req.body, {
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Text-to-3D response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Text-to-3D proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: 'Text-to-3D request failed' }
    });
  }
});

app.get('/api/meshy/text-to-3d/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log('🔄 Checking text-to-3D task status:', taskId);
    const response = await axios.get(`${MESHY_TEXT_TO_3D_BASE}/text-to-3d/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`
      }
    });
    console.log('✅ Text-to-3D status response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Text-to-3D status error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: 'Failed to check text-to-3D status' }
    });
  }
});

// Image-to-3D endpoints
app.post('/api/meshy/image-to-3d', async (req, res) => {
  try {
    console.log('🔄 Proxying image-to-3D request');
    const response = await axios.post(`${MESHY_IMAGE_TO_3D_BASE}/image-to-3d`, req.body, {
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Image-to-3D response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Image-to-3D proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: 'Image-to-3D request failed' }
    });
  }
});

app.get('/api/meshy/image-to-3d/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log('🔄 Checking image-to-3D task status:', taskId);
    const response = await axios.get(`${MESHY_IMAGE_TO_3D_BASE}/image-to-3d/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`
      }
    });
    console.log('✅ Image-to-3D status response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Image-to-3D status error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: 'Failed to check image-to-3D status' }
    });
  }
});

// Add GLB proxy endpoint for 3D model loading (fixes CORS)
app.get('/api/meshy/glb', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log('Proxying GLB request for:', url);

    // Determine if this is a Supabase storage path or direct URL
    let fetchUrl;
    let headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };

    if (url.startsWith('http')) {
      // Direct URL (e.g., from Meshy)
      fetchUrl = url;
      headers['Authorization'] = `Bearer ${MESHY_API_KEY}`;
    } else {
      // Supabase storage path - construct full URL
      fetchUrl = `https://xmjynwcvldvacsuhulbc.supabase.co/storage/v1/object/public/3d-models/${url}`;
      // No authorization needed for public Supabase storage
    }

    console.log('Fetching from:', fetchUrl);

    const response = await axios.get(fetchUrl, {
      headers,
      responseType: 'arraybuffer'
    });

    // Set appropriate headers for GLB file
    res.set({
      'Content-Type': 'model/gltf-binary',
      'Content-Length': response.data.length,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    // Send the GLB data
    res.send(Buffer.from(response.data));
    
  } catch (error) {
    console.error('GLB proxy error:', error.message);
    res.status(500).json({ error: 'Failed to load GLB file' });
  }
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
