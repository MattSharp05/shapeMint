import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

// Simple logger for Node.js (server-side)
const isDev = process.env.NODE_ENV !== 'production';
const logger = {
  log: (...args) => isDev && console.log(...args),
  error: (...args) => console.error(...args),
  warn: (...args) => isDev && console.warn(...args),
  debug: (...args) => isDev && console.log('[DEBUG]', ...args),
};

// Load environment variables from .env file
dotenv.config();

const app = express();
// Configure CORS
app.use(cors({
  origin: ['http://localhost:5175', 'http://localhost:5176'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight requests
app.options('*', cors());
app.use(express.json({ limit: '50mb' })); // Support large image uploads

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Meshy API proxy endpoints
const MESHY_API_KEY = process.env.VITE_MESHY_API_KEY;
const MESHY_TEXT_TO_3D_BASE = 'https://api.meshy.ai/v2';
const MESHY_IMAGE_TO_3D_BASE = 'https://api.meshy.ai/openapi/v1';

if (!MESHY_API_KEY) {
  logger.error('❌ VITE_MESHY_API_KEY environment variable is required');
  process.exit(1);
}

// Text-to-3D endpoints
app.post('/api/meshy/text-to-3d', async (req, res) => {
  try {
    logger.debug('🔄 Proxying text-to-3D request:', req.body);
    const response = await axios.post(`${MESHY_TEXT_TO_3D_BASE}/text-to-3d`, req.body, {
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    logger.debug('✅ Text-to-3D response:', response.data);
    res.json(response.data);
  } catch (error) {
    logger.error('❌ Text-to-3D proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: 'Text-to-3D request failed' }
    });
  }
});

app.get('/api/meshy/text-to-3d/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    logger.debug('🔄 Checking text-to-3D task status:', taskId);
    const response = await axios.get(`${MESHY_TEXT_TO_3D_BASE}/text-to-3d/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`
      }
    });
    logger.debug('✅ Text-to-3D status response:', response.data);
    res.json(response.data);
  } catch (error) {
    logger.error('❌ Text-to-3D status error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: 'Failed to check text-to-3D status' }
    });
  }
});

// Image-to-3D endpoints
app.post('/api/meshy/image-to-3d', async (req, res) => {
  try {
    logger.debug('🔄 Proxying image-to-3D request');
    const response = await axios.post(`${MESHY_IMAGE_TO_3D_BASE}/image-to-3d`, req.body, {
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    logger.debug('✅ Image-to-3D response:', response.data);
    res.json(response.data);
  } catch (error) {
    logger.error('❌ Image-to-3D proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: 'Image-to-3D request failed' }
    });
  }
});

app.get('/api/meshy/image-to-3d/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    logger.debug('🔄 Checking image-to-3D task status:', taskId);
    const response = await axios.get(`${MESHY_IMAGE_TO_3D_BASE}/image-to-3d/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`
      }
    });
    logger.debug('✅ Image-to-3D status response:', response.data);
    res.json(response.data);
  } catch (error) {
    logger.error('❌ Image-to-3D status error:', error.response?.data || error.message);
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

    // Decode URL once to handle any URL-encoded characters
    const decodedUrl = decodeURIComponent(url);
    logger.debug('Proxying GLB request for:', decodedUrl);

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
    logger.debug('Making request with:', {
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
    logger.error('GLB proxy error:', error.message);
    res.status(500).json({ error: 'Failed to load GLB file' });
  }
});

// ========== fal.ai Image Transform Endpoint ==========
const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_MODEL_ID = 'fal-ai/nano-banana-pro/edit';

const FAL_SYSTEM_PROMPT = `You are an expert 3D modeling assistant. Transform the provided image according to the user's prompt, producing an output image that is optimized for conversion into a 3D-printable model.

Follow these rules strictly:
- Show the FULL object from a clear 3/4 perspective angle — no cropping, no partial views
- Place the object on a plain white or light gray background with no distractions
- Ensure the object has a SOLID, STABLE BASE that can sit flat on a surface
- Avoid thin protruding parts, delicate overhangs, or floating elements that would break when 3D printed
- Make surfaces smooth and well-defined with clear edges — avoid fuzzy or ambiguous geometry
- Use bold, solid forms over intricate filigree or fine detail
- Ensure the design is a single connected piece (no separate floating parts)
- Lighting should be even and diffuse — no harsh shadows or reflections
- The object should look like a real physical item that could exist as a solid sculpture or figurine
- Do NOT add text, watermarks, or UI elements to the image`;

async function uploadToFalStorage(dataUri) {
  const matches = dataUri.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid data URI format');

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  const uploadResponse = await fetch('https://fal.run/fal-ai/file-upload', {
    method: 'PUT',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': mimeType,
    },
    body: buffer,
  });

  if (!uploadResponse.ok) {
    logger.warn('fal.ai file upload failed, attempting data URI directly');
    return dataUri;
  }

  const uploadResult = await uploadResponse.json();
  return uploadResult.url || dataUri;
}

async function pollFalResult(requestId, maxAttempts = 60, intervalMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    const statusResponse = await fetch(
      `https://queue.fal.run/${FAL_MODEL_ID}/requests/${requestId}/status`,
      { headers: { 'Authorization': `Key ${FAL_API_KEY}` } }
    );

    if (!statusResponse.ok) {
      logger.error('fal.ai status check failed:', statusResponse.status);
      await new Promise(r => setTimeout(r, intervalMs));
      continue;
    }

    const statusData = await statusResponse.json();

    if (statusData.status === 'COMPLETED') {
      const resultResponse = await fetch(
        `https://queue.fal.run/${FAL_MODEL_ID}/requests/${requestId}`,
        { headers: { 'Authorization': `Key ${FAL_API_KEY}` } }
      );
      if (resultResponse.ok) return await resultResponse.json();
      return null;
    }

    if (statusData.status === 'FAILED') {
      logger.error('fal.ai job failed:', statusData);
      return null;
    }

    await new Promise(r => setTimeout(r, intervalMs));
  }
  return null;
}

app.post('/api/fal/transform-image', async (req, res) => {
  if (!FAL_API_KEY) {
    return res.status(500).json({ error: 'FAL_API_KEY not configured' });
  }

  const { image, prompt } = req.body;
  if (!image || !prompt) {
    return res.status(400).json({ error: 'Both image and prompt are required' });
  }

  try {
    logger.log('Proxying image transform request to fal.ai');

    const combinedPrompt = `${FAL_SYSTEM_PROMPT}\n\nUser request: ${prompt}`;

    let imageUrl = image;
    if (image.startsWith('data:')) {
      imageUrl = await uploadToFalStorage(image);
    }

    const response = await fetch(`https://queue.fal.run/${FAL_MODEL_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: combinedPrompt,
        image_urls: [imageUrl],
        num_images: 4,
        output_format: 'png',
        resolution: '1K',
        aspect_ratio: '1:1',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('fal.ai queue submission error:', response.status, errorBody);
      return res.status(response.status).json({ error: `fal.ai API error: ${response.statusText}` });
    }

    const queueData = await response.json();
    const requestId = queueData.request_id;

    if (!requestId) {
      return res.status(500).json({ error: 'Failed to queue image transformation' });
    }

    logger.log('fal.ai job queued, polling for completion:', requestId);
    const result = await pollFalResult(requestId);

    if (!result) {
      return res.status(504).json({ error: 'Image transformation timed out' });
    }

    const images = result.images?.map(img => img.url) || [];
    logger.log(`fal.ai returned ${images.length} images`);
    res.json({ images });
  } catch (error) {
    logger.error('Image transform proxy error:', error.message || error);
    res.status(500).json({ error: 'Image transformation failed. Please try again.' });
  }
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  logger.log(`✅ Proxy server running on http://localhost:${PORT}`);
});
