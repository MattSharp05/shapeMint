import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log('=== GLB Proxy Request ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  console.log('Available env vars:', Object.keys(process.env).filter(key => key.includes('MESHY')));

  // Add CORS headers to all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.query;
    console.log('Requested URL:', url);
    
    if (!url || typeof url !== 'string') {
      console.log('Invalid URL parameter');
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const MESHY_API_KEY = process.env.MESHY_API_KEY || process.env.VITE_MESHY_API_KEY;
    console.log('API Key found:', !!MESHY_API_KEY);
    
    if (!MESHY_API_KEY) {
      console.log('No API key available');
      return res.status(500).json({ error: 'API key not configured' });
    }

    let fetchUrl: string;
    let headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
    };

    if (url.startsWith('http')) {
      fetchUrl = url;
      headers['Authorization'] = `Bearer ${MESHY_API_KEY}`;
    } else {
      fetchUrl = `https://xmjynwcvldvacsuhulbc.supabase.co/storage/v1/object/public/3d-models/${url}`;
    }

    console.log('Fetching from:', fetchUrl);
    console.log('Headers:', Object.keys(headers));

    const response = await axios.get(fetchUrl, {
      headers,
      responseType: 'arraybuffer',
      timeout: 30000 // 30 second timeout
    });

    console.log('Response status:', response.status);
    console.log('Response size:', response.data.length);

    res.set({
      'Content-Type': 'model/gltf-binary',
      'Content-Length': response.data.length,
      'Cache-Control': 'public, max-age=3600'
    });

    res.send(Buffer.from(response.data));
    
  } catch (error: any) {
    console.error('=== GLB Proxy Error ===');
    console.error('Error message:', error.message);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Full error:', error);
    
    res.status(500).json({ 
      error: 'Failed to load GLB file',
      details: error.message,
      status: error.response?.status 
    });
  }
}

module.exports = handler;