// deno-lint-ignore-file no-explicit-any
// Gets available material groups and colors from Treatstock

declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';

const TREATSTOCK_API = 'https://www.treatstock.com/api/v2';

async function fetchWithTimeout(resource: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 15000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...rest, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${resource}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const treatstockApiKey = Deno.env.get('TREATSTOCK_API_KEY');
  
  if (!treatstockApiKey) {
    return new Response(
      JSON.stringify({ error: 'treatstock_api_key_missing' }),
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const resp = await fetchWithTimeout(
      `${TREATSTOCK_API}/material-group-colors/?private-key=${encodeURIComponent(treatstockApiKey)}`,
      { timeoutMs: 15000 }
    );

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Treatstock API error: ${resp.status} ${errorText}`);
    }

    const materials = await resp.json();

    // Transform the response to a more usable format
    const formattedMaterials = Array.isArray(materials) ? materials.map((group: any) => ({
      code: group.code || '',
      description: group.description || '',
      colors: Array.isArray(group.colors) ? group.colors.map((color: any) => ({
        code: color.code || '',
        rgb: color.rgb || ''
      })) : []
    })) : [];

    return new Response(
      JSON.stringify({
        success: true,
        materials: formattedMaterials
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const err = e as Error;
    try { console.error(JSON.stringify({ evt: 'get_materials_error', message: err.message })); } catch {}
    
    return new Response(
      JSON.stringify({ 
        error: 'get_materials_failed', 
        message: err.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
