import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/download', async (req, res) => {
  const { url } = req.query;
  
  if (!url || typeof url !== 'string') {
    res.status(400).send('Missing or invalid URL');
    return;
  }

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    });

    // Forward the content type and other relevant headers
    res.setHeader('Content-Type', response.headers['content-type']);
    res.setHeader('Content-Length', response.headers['content-length']);
    res.send(response.data);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).send('Error downloading file');
  }
});

export default router;
