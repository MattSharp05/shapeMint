import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;

// Configure CORS
app.use(cors({
  origin: ['http://localhost:5175', 'http://localhost:5176'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight requests
app.options('*', cors());
app.use(express.json({ limit: '50mb' }));

// Environment variables
const MESHY_API_KEY = process.env.VITE_MESHY_API_KEY;

if (!MESHY_API_KEY) {
  console.error('❌ VITE_MESHY_API_KEY environment variable is required');
  process.exit(1);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GLB proxy endpoint for 3D model loading (fixes CORS)
app.get('/api/meshy/glb', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Decode URL once to handle any URL-encoded characters
    const decodedUrl = decodeURIComponent(url);
    console.log('Proxying GLB request for:', decodedUrl);

    // Determine if this is a Supabase storage path or direct URL
    let fetchUrl;
    let headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };

    if (decodedUrl.startsWith('http')) {
      // Direct URL (e.g., from Meshy)
      fetchUrl = decodedUrl;
      headers['Authorization'] = `Bearer ${MESHY_API_KEY}`;
    } else {
      // Supabase storage path - construct full URL
      fetchUrl = `https://xmjynwcvldvacsuhulbc.supabase.co/storage/v1/object/public/3d-models/${decodedUrl}`;
      // No authorization needed for public Supabase storage
    }

    console.log('Fetching from:', fetchUrl);

    // For Meshy/CloudFront URLs, preserve all query parameters as they contain the signature
    if (fetchUrl.includes('cloudfront.net')) {
      const urlObj = new URL(fetchUrl);
      const queryParams = urlObj.searchParams;
      
      // Add CloudFront query parameters as headers
      if (queryParams.has('Expires')) headers['CloudFront-Expires'] = queryParams.get('Expires');
      if (queryParams.has('Signature')) headers['CloudFront-Signature'] = queryParams.get('Signature');
      if (queryParams.has('Key-Pair-Id')) headers['CloudFront-Key-Pair-Id'] = queryParams.get('Key-Pair-Id');
    }

    // Log request details for debugging
    console.log('Making request with:', {
      url: fetchUrl,
      headers: headers
    });

    const response = await axios.get(fetchUrl, {
      headers,
      responseType: 'arraybuffer',
      maxRedirects: 5
    });

    // Set appropriate headers for GLB file
    res.set({
      'Content-Type': 'model/gltf-binary',
      'Content-Length': response.data.length,
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
app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});
