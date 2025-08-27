import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const MESHY_API_KEY = process.env.VITE_MESHY_API_KEY;
const MESHY_IMAGE_TO_3D_BASE = 'https://api.meshy.ai/openapi/v1';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!MESHY_API_KEY) {
    console.error('❌ VITE_MESHY_API_KEY environment variable is required');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { taskId } = req.query;
    console.log('🔄 Checking image-to-3D task status:', taskId);
    const response = await axios.get(`${MESHY_IMAGE_TO_3D_BASE}/image-to-3d/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`
      }
    });
    console.log('✅ Image-to-3D status response:', response.data);
    res.json(response.data);
  } catch (error: any) {
    console.error('❌ Image-to-3D status error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: 'Failed to check image-to-3D status' }
    });
  }
} 