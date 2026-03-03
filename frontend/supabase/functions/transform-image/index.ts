import { corsHeaders } from '../_shared/cors.ts'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const FAL_EDIT_MODEL = 'fal-ai/nano-banana-pro/edit';   // Image editing (requires input image)
const FAL_TEXT_MODEL = 'fal-ai/nano-banana-pro';         // Text-to-image (no input image needed)

const SYSTEM_PROMPT = `You are an expert 3D modeling assistant. Generate or transform the image according to the user's prompt, producing an output image that is optimized for conversion into a 3D-printable model.

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
    const { image, prompt, systemPrompt, numImages, resolution, aspectRatio, outputFormat } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasImage = !!image;
    const modelId = hasImage ? FAL_EDIT_MODEL : FAL_TEXT_MODEL;
    console.log(`Starting ${hasImage ? 'image editing' : 'text-to-image'} via fal.ai (${modelId})`);

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
      // Image editing: pass the source image
      falBody.image_urls = [image];
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
