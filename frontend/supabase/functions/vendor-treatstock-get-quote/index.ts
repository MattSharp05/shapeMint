// deno-lint-ignore-file no-explicit-any
// Gets a quote from Treatstock for a 3D model
// Flow:
// 1. Validate input (model, material selection, quantity, location)
// 2. Upload model to create printable pack (or use cached pack)
// 3. Get prices for different materials/providers
// 4. Return quote with pricing options

declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface GetQuoteInput {
  model: { url: string } | { storagePath: string };
  selections?: {
    materialGroup?: string;
    color?: string;
  };
  quantity?: number;
  location?: {
    country?: string;
    ip?: string;
  };
}

const TREATSTOCK_API = 'https://www.treatstock.com/api/v2';

async function fetchWithTimeout(resource: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 30000, ...rest } = options;
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

function validateInput(body: any): GetQuoteInput {
  if (!body || typeof body !== 'object') throw new Error('invalid_payload');
  const { model } = body;
  if (!model || typeof model !== 'object' || !('url' in model) && !('storagePath' in model)) {
    throw new Error('invalid_model');
  }
  return body as GetQuoteInput;
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function ensurePrintablePackCreated(
  apiKey: string,
  modelUrl: string,
  country: string,
  client: any
): Promise<{ printablePackId: number; partUid: string }> {
  // Check cache first
  const fileHash = await sha256Hex(await (await fetchWithTimeout(modelUrl, { timeoutMs: 10000 })).arrayBuffer());
  const { data: cacheEntry } = await client
    .from('treatstock_packs_cache')
    .select('printable_pack_id, part_uid')
    .eq('file_hash', fileHash)
    .maybeSingle();

  if (cacheEntry) {
    try { console.log(JSON.stringify({ evt: 'quote_pack_cache_hit', file_hash: fileHash })); } catch {}
    return { printablePackId: cacheEntry.printable_pack_id, partUid: cacheEntry.part_uid };
  }

  // Upload model using files-urls[] parameter (URL upload)
  const formData = new FormData();
  formData.append('files-urls[]', modelUrl);
  formData.append('location[country]', country);

  const uploadResp = await fetchWithTimeout(
    `${TREATSTOCK_API}/printable-packs/?private-key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      body: formData,
      timeoutMs: 60000
    }
  );

  const uploadJson = await uploadResp.json();
  if (!uploadResp.ok || !uploadJson.success) {
    const errorMsg = uploadJson.errors ? JSON.stringify(uploadJson.errors) : uploadJson.message || 'upload_failed';
    throw new Error(`upload_failed: ${errorMsg}`);
  }

  const printablePackId = uploadJson.id;
  if (!printablePackId) throw new Error('upload_failed: no_pack_id');

  // Extract part UID from response
  const parts = uploadJson.parts || {};
  const partUid = Object.keys(parts)[0] || null;

  // Cache the result
  try {
    await client.from('treatstock_packs_cache').insert({
      file_hash: fileHash,
      printable_pack_id: printablePackId,
      part_uid: partUid,
      created_at: new Date().toISOString()
    });
  } catch (cacheErr) {
    console.warn('Failed to cache printable pack (non-critical):', cacheErr);
  }

  return { printablePackId, partUid: partUid || '' };
}

async function getMaterialPrices(
  apiKey: string,
  printablePackId: number,
  country: string,
  materialGroup?: string,
  color?: string
): Promise<Array<{
  providerId: string;
  materialGroup: string;
  color: string;
  price: number;
  printer: string;
  url?: string;
}>> {
  const params = new URLSearchParams({
    printablePackId: printablePackId.toString(),
    'location[country]': country
  });
  if (materialGroup) params.append('printerMaterialGroup', materialGroup);
  if (color) params.append('printerColor', color);

  // Poll for prices (may need to wait for calculation)
  const maxAttempts = 10;
  const delayMs = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const resp = await fetchWithTimeout(
      `${TREATSTOCK_API}/printable-pack-costs/?${params.toString()}&private-key=${encodeURIComponent(apiKey)}`,
      { timeoutMs: 15000 }
    );

    const json = await resp.json();
    
    // Check if prices are ready
    if (Array.isArray(json) && json.length > 0) {
      return json.map((item: any) => ({
        providerId: item.providerId?.toString() || extractProviderIdFromUrl(item.url) || '',
        materialGroup: item.materialGroup || '',
        color: item.color || '',
        price: parseFloat(item.price) || 0,
        printer: item.printer || '',
        url: item.url
      }));
    }

    // Check if still calculating
    if (json.reason === 'not_calculated_yet' || json.success === false) {
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw new Error('prices_not_ready: Prices are still being calculated. Please try again in a few moments.');
    }

    // Other error
    if (!resp.ok) {
      throw new Error(`get_prices_failed: ${json.message || resp.statusText}`);
    }
  }

  throw new Error('prices_unavailable: Unable to get prices for this printable pack.');
}

function extractProviderIdFromUrl(url?: string): string | null {
  if (!url) return null;
  // Try to extract providerId from URL if present
  const match = url.match(/providerId=(\d+)/);
  return match ? match[1] : null;
}

async function getMinimumPrice(
  apiKey: string,
  printablePackId: number
): Promise<{ materialGroup: string; color: string; cost: number } | null> {
  const resp = await fetchWithTimeout(
    `${TREATSTOCK_API}/printable-packs/${printablePackId}?private-key=${encodeURIComponent(apiKey)}`,
    { timeoutMs: 15000 }
  );

  if (!resp.ok) return null;

  const json = await resp.json();
  if (json.calculated_min_cost) {
    return {
      materialGroup: json.calculated_min_cost.materialGroup || '',
      color: json.calculated_min_cost.color || '',
      cost: parseFloat(json.calculated_min_cost.cost) || 0
    };
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const treatstockApiKey = Deno.env.get('TREATSTOCK_API_KEY');
  
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), { status: 500, headers: corsHeaders });
  }
  if (!treatstockApiKey) {
    return new Response(JSON.stringify({ error: 'treatstock_api_key_missing' }), { status: 500, headers: corsHeaders });
  }

  const client = createClient(supabaseUrl, serviceKey);

  let body: GetQuoteInput;
  try {
    body = validateInput(await req.json());
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'validation_failed', message: (e as Error).message }),
      { status: 400, headers: corsHeaders }
    );
  }

  const { model, selections, quantity = 1, location } = body;
  const modelUrl = 'url' in model ? model.url : model.storagePath;

  let userId: string | undefined;
  try {
    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1] || 'e30='));
    userId = payload.sub;
  } catch {}
  if (!userId) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
  }

  try {
    // If storagePath, get signed URL
    let finalModelUrl = modelUrl;
    if ('storagePath' in model) {
      const { data } = await client.storage.from('models').createSignedUrl(model.storagePath, 3600);
      if (!data?.signedUrl) throw new Error('failed_to_create_signed_url');
      finalModelUrl = data.signedUrl;
    }

    const country = location?.country || 'US';
    
    // Step 1: Create or get printable pack
    try { console.log(JSON.stringify({ evt: 'quote_step', step: 'creating_printable_pack' })); } catch {}
    const { printablePackId, partUid } = await ensurePrintablePackCreated(treatstockApiKey, finalModelUrl, country, client);
    try { console.log(JSON.stringify({ evt: 'quote_step', step: 'printable_pack_created', printablePackId })); } catch {}

    // Step 2: Get minimum price info
    const minPrice = await getMinimumPrice(treatstockApiKey, printablePackId);

    // Step 3: Get prices for materials
    try { console.log(JSON.stringify({ evt: 'quote_step', step: 'getting_material_prices' })); } catch {}
    const prices = await getMaterialPrices(
      treatstockApiKey,
      printablePackId,
      country,
      selections?.materialGroup,
      selections?.color
    );
    
    if (prices.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'no_prices_available',
          message: 'No prices found for this model. The model may still be processing.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Group prices by material/color and find cheapest for each
    const priceMap = new Map<string, typeof prices[0]>();
    for (const price of prices) {
      const key = `${price.materialGroup}:${price.color}`;
      const existing = priceMap.get(key);
      if (!existing || price.price < existing.price) {
        priceMap.set(key, price);
      }
    }

    const groupedPrices = Array.from(priceMap.values());
    const cheapest = groupedPrices.reduce((cheapest, current) => 
      current.price < cheapest.price ? current : cheapest
    );

    // Step 5: Calculate totals for requested quantity
    const itemSubtotal = Number((cheapest.price * quantity).toFixed(2));
    const shippingPrice = 0; // Treatstock includes shipping in price or calculates separately
    const totalPrice = Number((itemSubtotal + shippingPrice).toFixed(2));

    const responseData = {
      quoteId: `treatstock-${printablePackId}-${Date.now()}`,
      printablePackId,
      partUid,
      quantity,
      itemSubtotal,
      shippingPrice,
      totalPrice,
      currency: 'USD',
      minimumPrice: minPrice,
      cheapestOption: {
        providerId: cheapest.providerId,
        materialGroup: cheapest.materialGroup,
        color: cheapest.color,
        price: cheapest.price,
        printer: cheapest.printer
      },
      allOptions: groupedPrices.map(p => ({
        providerId: p.providerId,
        materialGroup: p.materialGroup,
        color: p.color,
        price: p.price,
        printer: p.printer
      }))
    };

    try { console.log(JSON.stringify({ evt: 'quote_step', step: 'returning_quote', printablePackId, totalPrice })); } catch {}
    
    return new Response(JSON.stringify(responseData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const err = e as Error;
    try { console.error(JSON.stringify({ evt: 'get_quote_error', message: err.message, name: err.name })); } catch {}
    
    let errorMessage = err.message;
    let errorCode = 'quote_failed';
    
    if (err.name === 'AbortError' || err.message.includes('timeout')) {
      errorMessage = 'The quote request timed out. Please try again.';
      errorCode = 'quote_timeout';
    } else if (err.message.includes('prices_not_ready') || err.message.includes('prices_unavailable')) {
      errorMessage = err.message;
      errorCode = 'prices_unavailable';
    }
    
    return new Response(
      JSON.stringify({ error: errorCode, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
