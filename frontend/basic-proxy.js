import http from 'http';
import https from 'https';
import { URL } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = 3001;
const MESHY_API_KEY = process.env.VITE_MESHY_API_KEY;

if (!MESHY_API_KEY) {
  console.error('❌ VITE_MESHY_API_KEY environment variable is required');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Health check endpoint
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // GLB proxy endpoint
  if (url.pathname === '/api/meshy/glb') {
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'URL parameter is required' }));
      return;
    }

    try {
      // Decode URL
      const decodedUrl = decodeURIComponent(targetUrl);
      console.log('Proxying GLB request for:', decodedUrl);

      const targetUrlObj = new URL(decodedUrl);
      const isHttps = targetUrlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: targetUrlObj.hostname,
        port: targetUrlObj.port || (isHttps ? 443 : 80),
        path: targetUrlObj.pathname + targetUrlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
          'Authorization': `Bearer ${MESHY_API_KEY}`
        }
      };

      console.log('Making request to:', options.hostname + options.path);

      const proxyReq = httpModule.request(options, (proxyRes) => {
        console.log('Response status:', proxyRes.statusCode);
        
        // Set response headers
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': 'model/gltf-binary',
          'Cache-Control': 'public, max-age=3600'
        });

        // Pipe the response
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (error) => {
        console.error('Proxy request error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to load GLB file' }));
      });

      proxyReq.end();

    } catch (error) {
      console.error('GLB proxy error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to load GLB file' }));
    }
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Basic proxy server running at http://localhost:${PORT}`);
});
