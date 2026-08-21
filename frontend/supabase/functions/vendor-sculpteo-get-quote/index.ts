// deno-lint-ignore-file no-explicit-any
// Sculpteo quote edge function.
//
// Flow:
//   1. Download the user's model (STL or color-bundle zip) from Supabase storage.
//   2. Upload it to Sculpteo's design endpoint → returns a design uuid.
//   3. Call price_by_uuid?uuid=...&productname=... → returns material price.
//   4. Normalize the response into the same CraftcloudVendorOption shape
//      the rest of the app uses, so callers can merge it into the existing
//      sorted vendor list without any type surgery.
//
// Env:
//   SCULPTEO_ENABLED         — "true" to make this function return real quotes.
//                              When unset/false, returns { vendorOptions: [] }.
//   SCULPTEO_API_KEY         — (optional) API key / token for authenticated
//                              endpoints. Current Sculpteo price endpoint is
//                              believed to work unauthenticated; the upload
//                              endpoint may require credentials. Attached as
//                              `Authorization: Token <key>` when present.
//   SCULPTEO_API_BASE        — defaults to https://www.sculpteo.com
//
// This function deliberately never throws to the caller on Sculpteo-side
// failures — it logs and returns an empty list so the CraftCloud quote path
// is not degraded by any Sculpteo outage.

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Same PrintType → Sculpteo productname map as the client-side constant.
// Duplicated here so the edge function is self-contained (Deno can't easily
// import Vite/TS module paths).
const SCULPTEO_PRODUCT_CODES: Record<string, string> = {
  color: 'color_plastic',
  mono:  'white_plastic',
  sls:   'nylon_pa12',
};

const VENDOR_LABEL = 'Sculpteo';
const DEFAULT_CURRENCY = 'USD';

interface QuoteInput {
  modelUrl: string;
  printType: 'color' | 'mono' | 'sls';
  quantity: number;
  countryCode?: string;
  colorBundleUrl?: string;
}

interface NormalizedVendorOption {
  vendorId: string;
  itemPrice: number;
  shippingPrice: number;
  totalPrice: number;
  productionTimeFast: number;
  productionTimeSlow: number;
  craftcloudQuoteId: string;
  craftcloudShippingId: string;
  shippingName: string;
  shippingDeliveryTime: string;
  source: 'sculpteo';
  sculpteoDesignUuid: string;
  sculpteoProductCode: string;
  sculpteoShippingCode?: string;
}

async function fetchWithTimeout(resource: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 25000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function emptyResponse(reason: string): Response {
  console.log(`ℹ️ Sculpteo quote returning empty: ${reason}`);
  return new Response(
    JSON.stringify({ currency: DEFAULT_CURRENCY, vendorOptions: [] }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

/**
 * Upload the user's model file to Sculpteo and return the design uuid.
 * This is best-effort: the exact payload Sculpteo expects may evolve, so we
 * log the raw response and fail soft if anything looks off.
 */
async function uploadDesign(apiBase: string, apiKey: string | undefined, modelUrl: string): Promise<string | null> {
  // Pull the binary from wherever Supabase/Meshy stored it.
  const fileResp = await fetchWithTimeout(modelUrl, { timeoutMs: 20000 });
  if (!fileResp.ok) {
    console.warn('❌ Failed to download model for Sculpteo upload:', fileResp.status, modelUrl);
    return null;
  }
  const blob = await fileResp.blob();
  const filename = modelUrl.split('?')[0].split('/').pop() || 'model.stl';

  const form = new FormData();
  form.append('file', blob, filename);
  form.append('name', filename);

  const uploadUrl = `${apiBase}/api/design/`;
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (apiKey) headers['Authorization'] = `Token ${apiKey}`;

  try {
    const resp = await fetchWithTimeout(uploadUrl, {
      method: 'POST',
      headers,
      body: form,
      timeoutMs: 30000,
    });
    const text = await resp.text();
    if (!resp.ok) {
      console.warn('❌ Sculpteo upload failed:', resp.status, text.slice(0, 300));
      return null;
    }
    // Sculpteo historically returns { uuid: '...' } or { design: { uuid: '...' } }.
    const data = JSON.parse(text);
    const uuid = data?.uuid || data?.design?.uuid || data?.id || null;
    if (!uuid) {
      console.warn('❌ Sculpteo upload succeeded but no uuid found in response:', text.slice(0, 300));
      return null;
    }
    return String(uuid);
  } catch (err) {
    console.warn('❌ Sculpteo upload threw:', err);
    return null;
  }
}

async function fetchPrice(apiBase: string, uuid: string, productCode: string, quantity: number, currency: string): Promise<any | null> {
  const url = new URL(`${apiBase}/en/api/design/3D/price_by_uuid/`);
  url.searchParams.set('uuid', uuid);
  url.searchParams.set('productname', productCode);
  url.searchParams.set('quantity', String(quantity));
  url.searchParams.set('currency', currency);
  try {
    const resp = await fetchWithTimeout(url.toString(), { timeoutMs: 20000 });
    const text = await resp.text();
    if (!resp.ok) {
      console.warn('❌ Sculpteo price fetch failed:', resp.status, text.slice(0, 300));
      return null;
    }
    return JSON.parse(text);
  } catch (err) {
    console.warn('❌ Sculpteo price threw:', err);
    return null;
  }
}

/**
 * Normalize Sculpteo's raw price payload into the shared CraftcloudVendorOption shape.
 * Sculpteo's response fields have varied historically; this handles the common
 * fields and logs anything unexpected so we can tune.
 */
function normalize(raw: any, productCode: string, uuid: string, currency: string): NormalizedVendorOption | null {
  if (!raw || typeof raw !== 'object') return null;

  // Sculpteo typically returns something like { price: number, shipping: number, total: number }
  // or a per-product nested object keyed by productname. Handle both.
  const node = raw?.[productCode] || raw?.prices?.[productCode] || raw;
  const itemPriceRaw = node?.price ?? node?.unit_price ?? node?.amount;
  const shippingPriceRaw = node?.shipping ?? node?.shipping_price ?? 0;
  const totalPriceRaw = node?.total ?? node?.total_price ?? (itemPriceRaw != null ? Number(itemPriceRaw) + Number(shippingPriceRaw || 0) : null);

  const itemPrice = Number(itemPriceRaw);
  const shippingPrice = Number(shippingPriceRaw) || 0;
  const totalPrice = Number(totalPriceRaw);

  if (!Number.isFinite(itemPrice) || !Number.isFinite(totalPrice)) {
    console.warn('⚠️ Sculpteo normalize: could not extract price from payload:', JSON.stringify(raw).slice(0, 300));
    return null;
  }

  // Sculpteo ships in ~7-10 business days for most materials.
  // These are sensible defaults; refine once the real response shape is verified.
  const productionTimeFast = Number(node?.production_time_fast) || 5;
  const productionTimeSlow = Number(node?.production_time_slow) || 10;
  const shippingName = String(node?.shipping_name || 'Standard');
  const shippingDelivery = String(node?.shipping_delivery_time || '7-10');
  const shippingCode = node?.shipping_code || node?.shipping_id;

  return {
    vendorId: VENDOR_LABEL,
    itemPrice,
    shippingPrice,
    totalPrice,
    productionTimeFast,
    productionTimeSlow,
    // Reuse the craftcloudQuoteId slot to carry the Sculpteo uuid so the
    // shared cart code (which treats this field as the opaque quote handle)
    // keeps working. Real routing still uses `source` + sculpteoDesignUuid.
    craftcloudQuoteId: `sculpteo:${uuid}:${productCode}`,
    craftcloudShippingId: shippingCode ? `sculpteo:${shippingCode}` : `sculpteo:default`,
    shippingName,
    shippingDeliveryTime: shippingDelivery,
    source: 'sculpteo',
    sculpteoDesignUuid: uuid,
    sculpteoProductCode: productCode,
    sculpteoShippingCode: shippingCode ? String(shippingCode) : undefined,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const enabled = (Deno.env.get('SCULPTEO_ENABLED') || '').toLowerCase() === 'true';
    if (!enabled) return emptyResponse('SCULPTEO_ENABLED=false');

    const apiBase = Deno.env.get('SCULPTEO_API_BASE') || 'https://www.sculpteo.com';
    const apiKey = Deno.env.get('SCULPTEO_API_KEY') || undefined;

    const body = await req.json() as QuoteInput;
    const { modelUrl, printType, quantity } = body;
    if (!modelUrl || !printType || !quantity) {
      return new Response(
        JSON.stringify({ error: 'missing_params', message: 'modelUrl, printType, and quantity are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const productCode = SCULPTEO_PRODUCT_CODES[printType];
    if (!productCode) return emptyResponse(`unsupported printType ${printType}`);

    // Prefer the color bundle when this is a color print — Sculpteo needs the
    // OBJ+MTL+textures archive to render full color, same as CraftCloud.
    const uploadSource = (printType === 'color' && body.colorBundleUrl) ? body.colorBundleUrl : modelUrl;

    const uuid = await uploadDesign(apiBase, apiKey, uploadSource);
    if (!uuid) return emptyResponse('upload failed');

    const currency = DEFAULT_CURRENCY; // TODO: map from body.countryCode once we support multi-currency display
    const raw = await fetchPrice(apiBase, uuid, productCode, quantity, currency);
    if (!raw) return emptyResponse('price fetch failed');

    const normalized = normalize(raw, productCode, uuid, currency);
    if (!normalized) return emptyResponse('normalization failed');

    return new Response(
      JSON.stringify({
        currency,
        quotedCountry: body.countryCode || null,
        vendorOptions: [normalized],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('❌ vendor-sculpteo-get-quote threw:', err);
    // Never surface a 500 to the caller — degrade gracefully.
    return new Response(
      JSON.stringify({ currency: DEFAULT_CURRENCY, vendorOptions: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
