import { corsHeaders } from '../_shared/cors.ts'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

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
    const { image, prompt } = await req.json();

    if (!image || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Both image and prompt are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting image transformation via fal.ai (synchronous)');
    const combinedPrompt = `${SYSTEM_PROMPT}\n\nUser request: ${prompt}`;

    // Use synchronous fal.ai endpoint — blocks until result is ready
    // Data URIs work directly in image_urls (confirmed from queue test)
    const falResponse = await fetch(`https://fal.run/${FAL_MODEL_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: combinedPrompt,
        image_urls: [image],
        num_images: 4,
        output_format: 'png',
        resolution: '1K',
        aspect_ratio: '1:1',
      }),
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
