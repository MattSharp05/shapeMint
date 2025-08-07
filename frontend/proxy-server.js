import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());

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

// Add GLB proxy endpoint for 3D model loading (fixes CORS)
app.get('/api/meshy/glb', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log('Proxying GLB request for:', url);

    // Determine if this is a Supabase storage URL or Meshy URL
    const isSupabaseUrl = url.includes('supabase.co');
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };

    // Only add Meshy API key if it's a Meshy URL
    if (!isSupabaseUrl && process.env.VITE_MESHY_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.VITE_MESHY_API_KEY}`;
    }

    console.log('Making request with headers:', Object.keys(headers));
    console.log('Is Supabase URL:', isSupabaseUrl);

    const response = await axios.get(url, {
      headers,
      responseType: 'arraybuffer',
      timeout: 30000 // 30 second timeout
    });

    console.log('GLB response status:', response.status);
    console.log('GLB response size:', response.data.length, 'bytes');
    console.log('GLB response headers:', response.headers);

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
    console.error('GLB proxy error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data
    });
    
    res.status(500).json({ 
      error: 'Failed to load GLB file',
      details: error.message,
      status: error.response?.status
    });
  }
});

// Add dedicated Supabase storage proxy endpoint
app.get('/api/supabase/storage', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log('Proxying Supabase storage request for:', url);

    // Validate that this is a Supabase storage URL
    if (!url.includes('supabase.co')) {
      return res.status(400).json({ error: 'Invalid Supabase storage URL' });
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };

    console.log('Making Supabase storage request with headers:', Object.keys(headers));

    const response = await axios.get(url, {
      headers,
      responseType: 'arraybuffer',
      timeout: 30000 // 30 second timeout
    });

    console.log('Supabase storage response status:', response.status);
    console.log('Supabase storage response size:', response.data.length, 'bytes');
    console.log('Supabase storage response headers:', response.headers);

    // Set appropriate headers for the file
    res.set({
      'Content-Type': response.headers['content-type'] || 'application/octet-stream',
      'Content-Length': response.data.length,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    // Send the file data
    res.send(Buffer.from(response.data));
    
  } catch (error) {
    console.error('Supabase storage proxy error:', error.message);
    console.error('Supabase storage proxy error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data
    });
    
    res.status(500).json({ 
      error: 'Failed to load file from Supabase storage',
      details: error.message,
      status: error.response?.status
    });
  }
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
