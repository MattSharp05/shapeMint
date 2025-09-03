import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const MESHY_API_KEY = process.env.MESHY_API_KEY || process.env.VITE_MESHY_API_KEY;
const MESHY_IMAGE_TO_3D_BASE = 'https://api.meshy.ai/openapi/v1';

async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!MESHY_API_KEY) {
    console.error('❌ VITE_MESHY_API_KEY environment variable is required');
    return res.status(500).json({ error: 'API key not configured' });
  }

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
  } catch (error: any) {
    console.error('❌ Image-to-3D proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: 'Image-to-3D request failed' }
    });
  }
}

export { handler as default };