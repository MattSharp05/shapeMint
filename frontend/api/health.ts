import type { VercelRequest, VercelResponse } from '@vercel/node';

function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}

export { handler as default };