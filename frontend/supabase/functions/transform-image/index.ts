import { corsHeaders } from '../_shared/cors.ts'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const FAL_EDIT_MODEL = 'fal-ai/nano-banana-pro/edit';   // Image editing (requires input image)
const FAL_TEXT_MODEL = 'fal-ai/nano-banana-pro';         // Text-to-image (no input image needed)

const SYSTEM_PROMPT = `You are an expert image-generation engine. You must ALWAYS produce an image. Produce NO TEXT. Just an Image.

The image will be used for the creation of a full-color 3D printed model. Follow these principles:
- Show the FULL object from a clear 3/4 perspective angle — no cropping, no partial views
- Place the object on a plain neutral background with no distractions
- CRITICAL: Preserve ALL original colors from the reference image. The model must be FULLY COLORED — skin tones, clothing colors, hair color, accessories, etc. Do NOT render in grayscale, white, clay, or monochrome. Match the colors as closely as possible to the reference image.
- Ensure the object has a SOLID, STABLE BASE that can sit flat on a surface
- Avoid thin protruding parts, delicate overhangs, or floating elements
- Make surfaces smooth and well-defined with clear edges; Use bold, solid forms over intricate filigree or fine detail`;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const falApiKey = Deno.env.get('FAL_API_KEY');
  if (!falApiKey) {
    return new Response(
      JSON.stringify({ error: 'FAL_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { image, images, prompt, systemPrompt, numImages, resolution, aspectRatio, outputFormat } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Support single image (string) or multiple images (string[])
    const imageUrls: string[] = images && Array.isArray(images) ? images : image ? [image] : [];
    const hasImage = imageUrls.length > 0;
    const modelId = hasImage ? FAL_EDIT_MODEL : FAL_TEXT_MODEL;
    console.log(`Starting ${hasImage ? `image editing (${imageUrls.length} images)` : 'text-to-image'} via fal.ai (${modelId})`);

    // Use custom system prompt if provided, otherwise use default
    const effectiveSystemPrompt = systemPrompt || SYSTEM_PROMPT;
    const combinedPrompt = `${effectiveSystemPrompt}\n\nUser request: ${prompt}`;

    // Build request body — image editing vs text-to-image have different schemas
    // Allow overrides for testing; defaults match production values
    const falBody: Record<string, any> = {
      prompt: combinedPrompt,
      num_images: numImages || 4,
      output_format: outputFormat || 'png',
      resolution: resolution || '1K',
      aspect_ratio: aspectRatio || '1:1',
    };

    if (hasImage) {
      // Image editing: pass all source images (up to 14 supported by Nano Banana Pro)
      falBody.image_urls = imageUrls;
    }

    const falResponse = await fetch(`https://fal.run/${modelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(falBody),
    });

    if (!falResponse.ok) {
      const errorBody = await falResponse.text();
      console.error('fal.ai error:', falResponse.status, errorBody);
      return new Response(
        JSON.stringify({ error: `fal.ai API error: ${falResponse.statusText}`, details: errorBody }),
        { status: falResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await falResponse.json();
    const images = result.images?.map((img: any) => img.url) || [];
    console.log(`fal.ai returned ${images.length} images`);

    return new Response(
      JSON.stringify({ success: true, images }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Transform image error:', error.message || error);
    return new Response(
      JSON.stringify({ error: error.message || 'Image transformation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
