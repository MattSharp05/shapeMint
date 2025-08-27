import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const MESHY_API_KEY = process.env.VITE_MESHY_API_KEY;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log('Proxying GLB request for:', url);

    // Determine if this is a Supabase storage path or direct URL
    let fetchUrl: string;
    let headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };

    if (url.startsWith('http')) {
      // Direct URL (e.g., from Meshy)
      fetchUrl = url;
      if (MESHY_API_KEY) {
        headers['Authorization'] = `Bearer ${MESHY_API_KEY}`;
      }
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
    
  } catch (error: any) {
    console.error('GLB proxy error:', error.message);
    res.status(500).json({ error: 'Failed to load GLB file' });
  }
} 