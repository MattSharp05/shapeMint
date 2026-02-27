import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const decodeUrl = (url) => {
  try {
    // First decode the URL parameter
    let decodedUrl = decodeURIComponent(url);
    console.log(' Decoding URL:', {
      original: url,
      decoded: decodedUrl
    });
    
    // For CloudFront signed URLs, we need to preserve the URL exactly as is
    if (decodedUrl.includes('meshy.ai')) {
      console.log(' Meshy URL detected, preserving original URL');
      return decodedUrl;
    }
    
    // For other URLs, parse and reconstruct to ensure valid format
    const parsedUrl = new URL(decodedUrl);
    const finalUrl = parsedUrl.toString();
    console.log(' Regular URL, using parsed string:', finalUrl);
    return finalUrl;
  } catch (error) {
    console.error(' Error decoding URL:', {
      url,
      error: error.message,
      stack: error.stack
    });
    return url;
  }
};

const handleRequest = async (req, res) => {
  const { url } = req.query;
  const method = req.method.toLowerCase();
  
  console.log(`🔄 [${method.toUpperCase()}] Proxying request for:`, url);

  if (!url) {
    console.error('❌ Missing URL parameter');
    return res.status(400).send('Missing URL parameter');
  }

  try {
    // Properly decode and handle the URL
    const decodedUrl = decodeUrl(url);
    console.log('📡 Making request to:', {
      originalUrl: url,
      decodedUrl: decodedUrl,
      method: method
    });
    
    // Forward relevant headers from the original request
    // Forward relevant headers from the original request, and add a standard User-Agent
    const headers = { 
      ...req.headers, 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
    delete headers.host; // Let axios handle the host based on the target URL
    console.log('Forwarding headers:', headers);

    // For HEAD requests, we need to handle them specially
    if (method === 'head') {
      console.log('🔍 Making HEAD request to check file availability');
      const headResponse = await axios.head(decodedUrl, { headers });
      console.log('✅ HEAD request successful:', {
        status: headResponse.status,
        headers: headResponse.headers
      });
      
      // Forward headers and status
      Object.entries(headResponse.headers).forEach(([key, value]) => {
        if (value) {
          res.setHeader(key, String(value));
        }
      });
      return res.sendStatus(headResponse.status);
    }

    console.log(' Making GET request to fetch file');
    const response = await axios({
      method: 'get',
      url: decodedUrl,
      responseType: 'stream', // Request the data as a stream
      headers
    });

    console.log(`✅ Stream response received - Status: ${response.status}`);

    // Forward all headers from the Meshy response to the client
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value) {
        res.setHeader(key, String(value));
      }
    });

    // Set status and pipe the model data stream directly to the response
    res.status(response.status);
    response.data.pipe(res);
  } catch (error) {
    console.error('❌ Error handling request:', {
      url,
      method,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.statusText || error.message;
      console.error(`❌ Axios error (${status}):`, message);
      return res.status(status).send(message);
    }

    console.error('❌ Unexpected error:', error);
    return res.status(500).send('An unexpected error occurred');
  }
};

app.head('/api/download', handleRequest);
app.get('/api/download', handleRequest);

const server = app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal');
  server.close(() => {
    console.log('Server closed gracefully');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
