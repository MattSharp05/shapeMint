import type { VercelRequest, VercelResponse } from '@vercel/node';

const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_MODEL_ID = 'fal-ai/nano-banana-pro/edit';

const SYSTEM_PROMPT = `You are an expert 3D modeling assistant. Transform the provided image according to the user's prompt, producing an output image that is optimized for conversion into a 3D-printable model.

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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!FAL_API_KEY) {
    console.error('FAL_API_KEY environment variable is required');
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { image, prompt } = req.body;

  if (!image || !prompt) {
    return res.status(400).json({ error: 'Both image and prompt are required' });
  }

  try {
    console.log('Proxying image transform request to fal.ai');

    const combinedPrompt = `${SYSTEM_PROMPT}\n\nUser request: ${prompt}`;

    // Upload image to fal storage if it's a data URI
    let imageUrl = image;
    if (image.startsWith('data:')) {
      imageUrl = await uploadToFalStorage(image);
    }

    // Call fal.ai with num_images=4 to get 4 variations in one request
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
      console.error('fal.ai queue submission error:', response.status, errorBody);
      return res.status(response.status).json({
        error: `fal.ai API error: ${response.statusText}`
      });
    }

    const queueData = await response.json();
    const requestId = queueData.request_id;

    if (!requestId) {
      console.error('No request_id returned from fal.ai');
      return res.status(500).json({ error: 'Failed to queue image transformation' });
    }

    console.log('fal.ai job queued, polling for completion:', requestId);

    // Poll for completion
    const result = await pollForResult(requestId);

    if (!result) {
      return res.status(504).json({ error: 'Image transformation timed out' });
    }

    // Extract image URLs from the response
    const images = result.images?.map((img: any) => img.url) || [];

    console.log(`fal.ai returned ${images.length} images`);
    res.json({ images });
  } catch (error: any) {
    console.error('Image transform proxy error:', error.message || error);
    res.status(500).json({
      error: 'Image transformation failed. Please try again.',
    });
  }
}

async function uploadToFalStorage(dataUri: string): Promise<string> {
  // Extract mime type and base64 data
  const matches = dataUri.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URI format');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const filename = `upload-${Date.now()}.${ext}`;

  // Upload to fal.ai storage
  const uploadResponse = await fetch(`https://fal.run/fal-ai/file-upload`, {
    method: 'PUT',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': mimeType,
    },
    body: buffer,
  });

  if (!uploadResponse.ok) {
    // Fallback: try passing the data URI directly
    console.warn('fal.ai file upload failed, attempting data URI directly');
    return dataUri;
  }

  const uploadResult = await uploadResponse.json();
  return uploadResult.url || dataUri;
}

async function pollForResult(requestId: string, maxAttempts = 60, intervalMs = 2000): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const statusResponse = await fetch(
      `https://queue.fal.run/${FAL_MODEL_ID}/requests/${requestId}/status`,
      {
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
        },
      }
    );

    if (!statusResponse.ok) {
      console.error('fal.ai status check failed:', statusResponse.status);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      continue;
    }

    const statusData = await statusResponse.json();

    if (statusData.status === 'COMPLETED') {
      // Fetch the actual result
      const resultResponse = await fetch(
        `https://queue.fal.run/${FAL_MODEL_ID}/requests/${requestId}`,
        {
          headers: {
            'Authorization': `Key ${FAL_API_KEY}`,
          },
        }
      );

      if (resultResponse.ok) {
        return await resultResponse.json();
      }
      return null;
    }

    if (statusData.status === 'FAILED') {
      console.error('fal.ai job failed:', statusData);
      return null;
    }

    // Still processing, wait and retry
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return null; // Timeout
}
