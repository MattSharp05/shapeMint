// deno-lint-ignore-file no-explicit-any
// Creates a Treatstock order after uploading model and getting pricing
// Flow:
// 1. Validate input (model, material selection, quantity, shipping address)
// 2. Upload model to create printable pack (or use cached pack)
// 3. Get prices for materials and find matching provider
// 4. Recompute pricing and validate against priorQuote if provided
// 5. Insert pending order row
// 6. Call Treatstock place order endpoint
// 7. Update order with vendor_order_id, status=submitted, timestamps, store raw vendor payload
// 8. Return order summary to client

declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CreateOrderInput {
  model: { url: string } | { storagePath: string };
  selections: { 
    materialGroup: string; 
    color: string; 
    providerId?: string; // Optional - if not provided, will find cheapest
  };
  quantity: number;
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
  };
  priorQuote?: {
    itemTotal: number;
    shippingTotal: number;
    total: number;
  };
  quoteId?: string;
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

function validateInput(body: any): CreateOrderInput {
  if (!body || typeof body !== 'object') throw new Error('invalid_payload');
  const { model, selections, quantity, shippingAddress } = body;
  if (!model || typeof model !== 'object' || !('url' in model) && !('storagePath' in model)) throw new Error('invalid_model');
  if (!selections?.materialGroup || !selections?.color) throw new Error('missing_material_selection');
  if (!quantity || quantity <= 0 || quantity > 100) throw new Error('invalid_quantity');
  const sa = shippingAddress;
  const required = ['firstName', 'lastName', 'email', 'address1', 'city', 'state', 'zipCode', 'country'];
  for (const f of required) if (!sa?.[f]) throw new Error(`missing_${f}`);
  return body as CreateOrderInput;
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
    try { console.log(JSON.stringify({ evt: 'order_pack_cache_hit', file_hash: fileHash })); } catch {}
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
): Promise<Array<{ providerId: string; materialGroup: string; color: string; price: number; printer: string }>> {
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
        printer: item.printer || ''
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

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

  let body: CreateOrderInput;
  try {
    body = validateInput(await req.json());
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'validation_failed', message: (e as Error).message }),
      { status: 400, headers: corsHeaders }
    );
  }

  const { model, selections, quantity, shippingAddress, priorQuote } = body;
  const modelUrl = 'url' in model ? model.url : model.storagePath;

  let userId: string | undefined;
  try {
    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1] || 'e30='));
    userId = payload.sub;
  } catch {}
  if (!userId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

  try {
    // If storagePath, get signed URL
    let finalModelUrl = modelUrl;
    if ('storagePath' in model) {
      const { data } = await client.storage.from('models').createSignedUrl(model.storagePath, 3600);
      if (!data?.signedUrl) throw new Error('failed_to_create_signed_url');
      finalModelUrl = data.signedUrl;
    }

    const country = shippingAddress.country || 'US';
    
    // Step 1: Create or get printable pack
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'creating_printable_pack' })); } catch {}
    const { printablePackId, partUid } = await ensurePrintablePackCreated(treatstockApiKey, finalModelUrl, country, client);
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'printable_pack_created', printablePackId })); } catch {}

    // Step 2: Get prices for materials
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'getting_material_prices' })); } catch {}
    const prices = await getMaterialPrices(
      treatstockApiKey,
      printablePackId,
      country,
      selections.materialGroup,
      selections.color
    );
    
    if (prices.length === 0) {
      throw new Error('no_prices_available: No prices found for the selected material and color.');
    }

    // Step 3: Find matching provider
    // Note: Treatstock costs API doesn't return providerId directly
    // We need to extract it from the URL or use the first/cheapest option
    let selectedProvider: typeof prices[0] | null = null;
    
    if (selections.providerId) {
      // Use specified provider - try to find by providerId
      selectedProvider = prices.find(p => p.providerId === selections.providerId) || null;
      if (!selectedProvider) {
        // If not found by providerId, just use cheapest (providerId might not be in response)
        selectedProvider = prices.reduce((cheapest, current) => 
          current.price < cheapest.price ? current : cheapest
        );
        try { console.log(JSON.stringify({ evt: 'provider_id_not_found_using_cheapest', requestedId: selections.providerId })); } catch {}
      }
    } else {
      // Find cheapest provider
      selectedProvider = prices.reduce((cheapest, current) => 
        current.price < cheapest.price ? current : cheapest
      );
    }
    
    // If providerId is still empty, we need to get it from the order placement
    // Treatstock API requires providerId, so we'll need to extract it from URL or make a best guess
    if (!selectedProvider.providerId && selectedProvider.url) {
      const extractedId = extractProviderIdFromUrl(selectedProvider.url);
      if (extractedId) {
        selectedProvider.providerId = extractedId;
      }
    }
    
    // If still no providerId, we'll need to get it from the costs response differently
    // For now, we'll try to use the printer name or make a request to get provider details
    if (!selectedProvider.providerId) {
      // Try to extract from printer name (format: "US PS: Ditto-pro" might contain provider info)
      // This is a fallback - ideally the API should return providerId
      try { console.warn(JSON.stringify({ evt: 'provider_id_missing', printer: selectedProvider.printer, url: selectedProvider.url })); } catch {}
      // We'll proceed and let the API error if providerId is truly required
    }

    try { console.log(JSON.stringify({ evt: 'order_step', step: 'provider_selected', providerId: selectedProvider.providerId, price: selectedProvider.price })); } catch {}

    // Step 4: Calculate pricing
    const itemSubtotal = Number((selectedProvider.price * quantity).toFixed(2));
    const shippingPrice = 0; // Treatstock includes shipping in the price or calculates separately
    const totalPrice = Number((itemSubtotal + shippingPrice).toFixed(2));

    // Step 5: Validate against priorQuote if provided
    if (priorQuote) {
      const TOLERANCE_CENTS = 5;
      const TOLERANCE_PERCENT = 0.01;
      
      const totalDiff = Math.abs(priorQuote.total - totalPrice);
      const itemDiff = Math.abs(priorQuote.itemTotal - itemSubtotal);
      
      const totalTolerance = Math.max(TOLERANCE_CENTS / 100, priorQuote.total * TOLERANCE_PERCENT);
      const itemTolerance = Math.max(TOLERANCE_CENTS / 100, priorQuote.itemTotal * TOLERANCE_PERCENT);
      
      if (totalDiff > totalTolerance || itemDiff > itemTolerance) {
        try { console.log(JSON.stringify({ 
          evt: 'price_drift_detected', 
          priorQuote, 
          current: { itemSubtotal, shippingPrice, totalPrice },
          differences: { total: totalDiff, itemTotal: itemDiff }
        })); } catch {}
        return new Response(
          JSON.stringify({ 
            error: 'price_changed', 
            message: 'Price changed significantly since quote. Please Get Quote again to confirm updated price.',
            current: { itemSubtotal, shippingPrice, totalPrice }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Step 6: Update quantity if needed
    if (partUid && quantity > 1) {
      const updateFormData = new FormData();
      updateFormData.append(`qty[${partUid}]`, quantity.toString());
      
      await fetchWithTimeout(
        `${TREATSTOCK_API}/printable-packs/${printablePackId}?private-key=${encodeURIComponent(treatstockApiKey)}`,
        {
          method: 'PUT',
          body: updateFormData,
          timeoutMs: 10000
        }
      );
    }

    // Step 7: Insert pending order
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'inserting_order', itemSubtotal, shippingPrice, totalPrice })); } catch {}
    const originalFileName = finalModelUrl.split('/').pop()?.split('?')[0] || 'model.stl';
    const { data: inserted, error: insErr } = await client.from('orders').insert({
      user_id: userId,
      vendor: 'treatstock',
      quote_id: body.quoteId || null,
      model_url: finalModelUrl,
      file_url: finalModelUrl,
      filename: originalFileName,
      selections: selections,
      quantity,
      shipping_address: shippingAddress,
      shipping_zip: shippingAddress.zipCode,
      item_subtotal: itemSubtotal,
      surcharge_amount: 0,
      shipping_price: shippingPrice,
      total_price: totalPrice,
      currency: 'USD',
      status: 'pending'
    }).select().maybeSingle();

    if (insErr) throw new Error(`db_insert_failed:${insErr.message}`);
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'order_inserted', orderId: inserted.id })); } catch {}
    try {
      await client.from('order_events').insert({
        order_id: inserted.id,
        user_id: userId,
        evt_type: 'order_created',
        evt_data: { totalPrice, itemSubtotal, shippingPrice }
      });
    } catch {}

    // Step 8: Place order with Treatstock
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'calling_treatstock_api', providerId: selectedProvider.providerId })); } catch {}
    
    // Validate providerId is available
    if (!selectedProvider.providerId) {
      throw new Error('provider_id_required: Could not determine provider ID. Please select a specific provider from the quote options.');
    }
    
    const orderPayload = {
      printablePackId: printablePackId.toString(),
      providerId: selectedProvider.providerId,
      comment: 'Order placed via ShapeMint',
      location: {
        email: shippingAddress.email,
        company: shippingAddress.email.split('@')[1] || ''
      },
      shippingAddress: {
        country: shippingAddress.country,
        zip: shippingAddress.zipCode,
        city: shippingAddress.city,
        state: shippingAddress.state,
        street: shippingAddress.address1,
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName
      },
      modelTextureInfo: {
        isOneMaterialForKit: '1',
        modelTexture: {
          color: selections.color,
          materialGroup: selections.materialGroup
        }
      }
    };

    const vendorResp = await fetchWithTimeout(
      `${TREATSTOCK_API}/place-order/create?private-key=${encodeURIComponent(treatstockApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
        timeoutMs: 30000
      }
    );

    const vendorJson = await vendorResp.json();

    if (!vendorResp.ok || vendorJson.errors || (vendorJson.success === false)) {
      try { console.error(JSON.stringify({ evt: 'vendor_order_failed', status: vendorResp.status, vendorJson, orderPayload })); } catch {}
      await client.from('orders').update({ status: 'failed', last_vendor_status: vendorJson }).eq('id', inserted.id);

      let errorMessage = vendorJson.message || JSON.stringify(vendorJson.errors) || 'Order creation failed';
      let errorCode = 'vendor_order_failed';

      // Handle specific error cases
      if (vendorJson.errors) {
        const errorKeys = Object.keys(vendorJson.errors);
        if (errorKeys.some(k => k.includes('delivery') || k.includes('address'))) {
          errorMessage = 'Invalid shipping address. Please check your address and try again.';
          errorCode = 'invalid_address';
        } else if (vendorJson.message?.includes('provider cannot print')) {
          errorMessage = 'The selected provider cannot print with the specified material and color. Please try a different option.';
          errorCode = 'provider_cannot_print';
        }
      }

      return new Response(
        JSON.stringify({ error: errorCode, message: errorMessage, vendorStatus: vendorJson }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle validated address suggestion
    if (vendorJson.validatedAddress) {
      try { console.log(JSON.stringify({ evt: 'address_validated', validatedAddress: vendorJson.validatedAddress })); } catch {}
      // Continue with order - address was validated
    }

    const vendorOrderId = vendorJson.orderId?.toString();
    if (!vendorOrderId) {
      throw new Error('vendor_order_failed: No order ID returned from Treatstock');
    }

    try { console.log(JSON.stringify({ evt: 'order_step', step: 'treatstock_order_created', vendorOrderId })); } catch {}

    // Step 9: Update order with vendor details
    const { error: updErr } = await client.from('orders').update({
      vendor_order_id: vendorOrderId,
      vendor_order_raw: vendorJson,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    }).eq('id', inserted.id);

    if (updErr) throw new Error(`db_update_failed:${updErr.message}`);
    try {
      await client.from('order_events').insert({
        order_id: inserted.id,
        user_id: userId,
        evt_type: 'order_submitted',
        evt_data: { vendorOrderId, total: vendorJson.total }
      });
    } catch {}

    const responseData = {
      orderId: inserted.id,
      orderNumber: inserted.order_number,
      vendorOrderId,
      totalPrice: vendorJson.total || totalPrice,
      currency: 'USD',
      status: 'submitted'
    };

    try { console.log(JSON.stringify({ evt: 'order_step', step: 'returning_success', responseData })); } catch {}
    
    return new Response(JSON.stringify(responseData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const err = e as Error;
    try { console.error(JSON.stringify({ evt: 'create_order_error', message: err.message, name: err.name, stack: err.stack })); } catch {}
    
    let errorMessage = err.message;
    let errorCode = 'order_creation_failed';
    
    if (err.name === 'AbortError' || err.message.includes('timeout') || err.message.includes('aborted')) {
      errorMessage = 'The order request timed out. Please try again.';
      errorCode = 'order_timeout';
    } else if (err.message.includes('prices_not_ready') || err.message.includes('prices_unavailable')) {
      errorMessage = err.message;
      errorCode = 'prices_unavailable';
    } else if (err.message.includes('no_prices_available')) {
      errorMessage = err.message;
      errorCode = 'no_prices';
    }
    
    return new Response(
      JSON.stringify({ error: errorCode, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
