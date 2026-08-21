import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

// 2026-04-16: moved off nano-banana-pro ($0.15/img) to reduce cost.
// Briefly tried nano-banana ($0.039) but quality regressed; landed on
// nano-banana-2 ($0.08/img at 1K) — ~47% cheaper than pro and supports
// multi-reference (up to 14 images) and resolution param like pro did.
const FAL_EDIT_MODEL = 'fal-ai/nano-banana-2/edit';   // Image editing (requires input image)
const FAL_TEXT_MODEL = 'fal-ai/nano-banana-2';         // Text-to-image (no input image needed)

const SYSTEM_PROMPT = `You are an expert image-generation engine. You must ALWAYS produce an image. Produce NO TEXT. Just an Image.

The image will be used for the creation of a full-color 3D printed model. Follow these principles:
- Show the FULL object from a clear 3/4 perspective angle — no cropping, no partial views
- Place the object on a plain neutral background with no distractions
- CRITICAL: Preserve ALL original colors from the reference image. The model must be FULLY COLORED — skin tones, clothing colors, hair color, accessories, etc. Do NOT render in grayscale, white, clay, or monochrome. Match the colors as closely as possible to the reference image.
- Ensure the object has a SOLID, STABLE BASE that can sit flat on a surface
- Avoid thin protruding parts, delicate overhangs, or floating elements
- Make surfaces smooth and well-defined with clear edges; Use bold, solid forms over intricate filigree or fine detail`;

// Rate limit caps. Applied as an abuse floor per IP; anon users get an
// additional lifetime cap below. A "batch" is 4 images (either 4 variations
// or 4 angle views), so 80 images/day = 20 batches/day for logged-in users.
const IP_DAILY_MAX   = 80;          // images / IP / day (20 batches of 4)
const IP_DAILY_SECS  = 24 * 3600;
const ANON_LIFE_MAX  = 8;           // images / anon user / "forever"
const ANON_LIFE_SECS = 10 * 365 * 24 * 3600; // effectively unbounded

function firstClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  const first = fwd.split(',')[0]?.trim();
  return first || req.headers.get('x-real-ip') || 'unknown';
}

// Daily-salted SHA-256 hash of the client IP. We never store raw IPs —
// the hash is only useful as a rate-limit key and rotates each day.
async function hashIp(ip: string): Promise<string> {
  const salt = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function countryFromHeaders(req: Request): string | null {
  return (
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('x-country-code') ||
    null
  );
}

interface AuthContext {
  userId: string | null;
  isAnonymous: boolean;
  hasEmail: boolean;
}

function parseAuth(req: Request): AuthContext {
  try {
    const header = req.headers.get('Authorization');
    if (!header) return { userId: null, isAnonymous: false, hasEmail: false };
    const token = header.replace(/^Bearer\s+/i, '');
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return { userId: null, isAnonymous: false, hasEmail: false };
    // Base64URL → base64
    const b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
    return {
      userId: json.sub || null,
      isAnonymous: json.is_anonymous === true,
      hasEmail: !!json.email,
    };
  } catch {
    return { userId: null, isAnonymous: false, hasEmail: false };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const falApiKey = Deno.env.get('FAL_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!falApiKey || !supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'server_misconfigured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { image, images, prompt, systemPrompt, numImages, resolution, aspectRatio, outputFormat, modelId, source } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const auth = parseAuth(req);
    // Require some session. With anon auth enabled, AuthProvider boots
    // an anonymous session on every visitor, so this only blocks callers
    // with no JWT at all (e.g. scrapers).
    if (!auth.userId) {
      return new Response(
        JSON.stringify({ error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cost = Number(numImages || 4);
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Rate limits ────────────────────────────────────────────────
    // Per-IP daily cap applies to everyone (including real accounts) as
    // an abuse floor. Anon users additionally hit a lifetime cap that
    // forces them into the save-account modal.
    const ipHash = await hashIp(firstClientIp(req));

    const { data: ipOk, error: ipErr } = await supabase.rpc(
      'rate_limit_check_and_bump',
      { p_bucket: 'ip_daily', p_key: ipHash, p_max_count: IP_DAILY_MAX, p_window_seconds: IP_DAILY_SECS, p_cost: cost }
    );
    if (ipErr) {
      console.error('rate_limit RPC (ip) failed:', ipErr);
    } else if (ipOk === false) {
      return new Response(
        JSON.stringify({ error: 'rate_limited', scope: 'ip_daily', message: 'Daily image limit reached. Please try again tomorrow.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (auth.isAnonymous) {
      const { data: anonOk, error: anonErr } = await supabase.rpc(
        'rate_limit_check_and_bump',
        { p_bucket: 'anon_user_lifetime', p_key: auth.userId!, p_max_count: ANON_LIFE_MAX, p_window_seconds: ANON_LIFE_SECS, p_cost: cost }
      );
      if (anonErr) {
        console.error('rate_limit RPC (anon) failed:', anonErr);
      } else if (anonOk === false) {
        return new Response(
          JSON.stringify({ error: 'rate_limited', scope: 'anon_user_lifetime', message: 'Create a free account to keep generating.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Stamp IP country on the draft model (best-effort) ──────────
    if (modelId) {
      const country = countryFromHeaders(req);
      const patch: Record<string, any> = { client_ip_hash: ipHash };
      if (country) patch.ip_country = country;
      supabase.from('generated_models').update(patch).eq('id', modelId).then(({ error }) => {
        if (error) console.warn('ip_country stamp failed:', error.message);
      });
    }

    // ── fal.ai call (unchanged from original) ──────────────────────
    const imageUrls: string[] = images && Array.isArray(images) ? images : image ? [image] : [];
    const hasImage = imageUrls.length > 0;
    const falModelId = hasImage ? FAL_EDIT_MODEL : FAL_TEXT_MODEL;
    const sourceTag = source || 'unknown';
    const modelIdTag = modelId ? `modelId=${modelId}` : 'NO_MODEL_ID';
    console.log(`[${sourceTag}] Starting ${hasImage ? `image editing (${imageUrls.length} images)` : 'text-to-image'} via fal.ai (${falModelId}) ${modelIdTag}`);

    const effectiveSystemPrompt = systemPrompt || SYSTEM_PROMPT;
    const combinedPrompt = `${effectiveSystemPrompt}\n\nUser request: ${prompt}`;

    const falBody: Record<string, any> = {
      prompt: combinedPrompt,
      num_images: cost,
      output_format: outputFormat || 'png',
      resolution: resolution || '1K',
      aspect_ratio: aspectRatio || '1:1',
    };
    if (hasImage) falBody.image_urls = imageUrls;

    const falResponse = await fetch(`https://fal.run/${falModelId}`, {
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
    const outputImages = result.images?.map((img: any) => img.url) || [];
    console.log(`[${sourceTag}] fal.ai returned ${outputImages.length} images`);

    return new Response(
      JSON.stringify({ success: true, images: outputImages }),
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
