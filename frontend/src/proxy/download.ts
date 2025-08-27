import express, { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

const router = express.Router();

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception in download router:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection in download router:', reason);
});

const handleRequest = async (req: Request, res: Response) => {
  console.log(`Handling ${req.method} request for URL:`, req.query.url);
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).send('Missing or invalid URL');
  }

  try {
    const method = req.method.toLowerCase();
    const response = await axios({
      method,
      url,
      responseType: method === 'head' ? 'stream' : 'arraybuffer',
      validateStatus: (status) => status >= 200 && status < 300,
    });

    // Forward all relevant headers
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value) {
        res.setHeader(key, String(value));
      }
    });

    // For HEAD requests, just send the status code
    if (method === 'head') {
      return res.sendStatus(response.status);
    } else {
      return res.send(response.data);
    }
  } catch (error) {
    console.error('Error handling request for URL:', url, error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status || 500;
      const message = axiosError.response?.statusText || 'Error processing request';
      return res.status(status).send(message);
    }
    return res.status(500).send('An unexpected error occurred');
  }
};

// Handle both HEAD and GET requests at the root of this router
router.head('/', handleRequest);
router.get('/', handleRequest);

export default router;
