// deno-lint-ignore-file no-explicit-any
// Craftcloud Get Quote edge function
// Flow: download STL → upload to Craftcloud → poll parsing → request prices → poll prices → return cheapest
declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CRAFTCLOUD_API = 'https://api.craftcloud3d.com';

interface QuoteInput {
  modelUrl: string;
  materialConfigId: string;
  quantity: number;
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    address1: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  };
  // For multicolor: OBJ+MTL URLs to bundle into a ZIP
  objUrl?: string;
  mtlUrl?: string;
}

async function fetchWithTimeout(
  resource: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 15000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...rest, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${resource}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function validateInput(body: any): QuoteInput {
  if (!body || typeof body !== 'object') throw new Error('invalid_payload');
  const { modelUrl, materialConfigId, quantity, shippingAddress } = body;
  if (!modelUrl || typeof modelUrl !== 'string') throw new Error('missing_modelUrl');
  if (!materialConfigId || typeof materialConfigId !== 'string') throw new Error('missing_materialConfigId');
  if (!quantity || quantity <= 0 || quantity > 100) throw new Error('invalid_quantity');
  const sa = shippingAddress;
  const required = ['firstName', 'lastName', 'email', 'address1', 'city', 'state', 'zipCode', 'country', 'phone'];
  for (const f of required) if (!sa?.[f]) throw new Error(`missing_${f}`);
  return body as QuoteInput;
}

// Minimal ZIP builder for bundling OBJ+MTL files (no external dependencies)
// Creates a valid ZIP with Store (no compression) method
function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);

    // Local file header (30 bytes + name + data)
    const local = new Uint8Array(30 + nameBytes.length + file.data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);   // local file header signature
    lv.setUint16(4, 20, true);            // version needed
    lv.setUint16(6, 0, true);             // flags
    lv.setUint16(8, 0, true);             // compression: Store
    lv.setUint16(10, 0, true);            // mod time
    lv.setUint16(12, 0, true);            // mod date
    lv.setUint32(14, crc, true);          // crc-32
    lv.setUint32(18, file.data.length, true); // compressed size
    lv.setUint32(22, file.data.length, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true); // file name length
    lv.setUint16(28, 0, true);            // extra field length
    local.set(nameBytes, 30);
    local.set(file.data, 30 + nameBytes.length);
    localHeaders.push(local);

    // Central directory header (46 bytes + name)
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);   // central directory signature
    cv.setUint16(4, 20, true);            // version made by
    cv.setUint16(6, 20, true);            // version needed
    cv.setUint16(8, 0, true);             // flags
    cv.setUint16(10, 0, true);            // compression: Store
    cv.setUint16(12, 0, true);            // mod time
    cv.setUint16(14, 0, true);            // mod date
    cv.setUint32(16, crc, true);          // crc-32
    cv.setUint32(20, file.data.length, true); // compressed size
    cv.setUint32(24, file.data.length, true); // uncompressed size
    cv.setUint16(28, nameBytes.length, true); // file name length
    cv.setUint16(30, 0, true);            // extra field length
    cv.setUint16(32, 0, true);            // file comment length
    cv.setUint16(34, 0, true);            // disk number start
    cv.setUint16(36, 0, true);            // internal file attributes
    cv.setUint32(38, 0, true);            // external file attributes
    cv.setUint32(42, offset, true);       // relative offset of local header
    central.set(nameBytes, 46);
    centralHeaders.push(central);

    offset += local.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const c of centralHeaders) centralDirSize += c.length;

  // End of central directory (22 bytes)
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);           // EOCD signature
  ev.setUint16(4, 0, true);                     // disk number
  ev.setUint16(6, 0, true);                     // disk with central dir
  ev.setUint16(8, files.length, true);           // entries on this disk
  ev.setUint16(10, files.length, true);          // total entries
  ev.setUint32(12, centralDirSize, true);        // central dir size
  ev.setUint32(16, centralDirOffset, true);      // central dir offset
  ev.setUint16(20, 0, true);                     // comment length

  const totalSize = offset + centralDirSize + 22;
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const l of localHeaders) { result.set(l, pos); pos += l.length; }
  for (const c of centralHeaders) { result.set(c, pos); pos += c.length; }
  result.set(eocd, pos);
  return result;
}

// CRC-32 (used by ZIP format)
function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Step 1: Upload model to Craftcloud (multipart form-data)
async function uploadModel(fileBytes: Uint8Array, fileName: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([fileBytes], { type: 'application/octet-stream' }), fileName);
  formData.append('unit', 'mm');

  console.log(JSON.stringify({ evt: 'cc_uploading_model', fileName, sizeBytes: fileBytes.length }));

  const resp = await fetchWithTimeout(`${CRAFTCLOUD_API}/v5/model`, {
    method: 'POST',
    body: formData,
    timeoutMs: 60000,
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    console.error(JSON.stringify({ evt: 'cc_upload_failed', status: resp.status, body: errText }));
    throw new Error(`Craftcloud model upload failed (${resp.status})`);
  }

  const data = await resp.json();
  // Response is an array of models
  const modelId = Array.isArray(data) ? data[0]?.modelId : data?.modelId;
  if (!modelId) {
    console.error(JSON.stringify({ evt: 'cc_upload_no_modelId', data }));
    throw new Error('Craftcloud upload did not return a modelId');
  }

  console.log(JSON.stringify({ evt: 'cc_model_uploaded', modelId }));
  return modelId;
}

// Step 2: Poll model parsing until complete
async function pollModelReady(modelId: string): Promise<void> {
  const maxAttempts = 15;
  const delayMs = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const resp = await fetchWithTimeout(`${CRAFTCLOUD_API}/v5/model/${modelId}`, {
      timeoutMs: 10000,
    });

    if (resp.status === 200) {
      console.log(JSON.stringify({ evt: 'cc_model_ready', modelId, attempt }));
      return;
    }

    if (resp.status === 206) {
      console.log(JSON.stringify({ evt: 'cc_model_parsing', modelId, attempt }));
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

    const errText = await resp.text().catch(() => '');
    console.error(JSON.stringify({ evt: 'cc_model_poll_error', status: resp.status, body: errText }));
    throw new Error(`Craftcloud model poll failed (${resp.status})`);
  }

  throw new Error('Craftcloud model parsing timed out');
}

// Step 3: Request prices
async function requestPrices(
  modelId: string,
  materialConfigId: string,
  quantity: number,
  countryCode: string
): Promise<string> {
  const body = {
    currency: 'USD',
    countryCode,
    models: [{ modelId, quantity, scale: 1 }],
    materialConfigIds: [materialConfigId],
  };

  console.log(JSON.stringify({ evt: 'cc_requesting_prices', modelId, materialConfigId, quantity }));

  const resp = await fetchWithTimeout(`${CRAFTCLOUD_API}/v5/price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs: 15000,
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    console.error(JSON.stringify({ evt: 'cc_price_request_failed', status: resp.status, body: errText }));
    throw new Error(`Craftcloud price request failed (${resp.status})`);
  }

  const data = await resp.json();
  const priceId = data?.priceId;
  if (!priceId) {
    console.error(JSON.stringify({ evt: 'cc_no_priceId', data }));
    throw new Error('Craftcloud price request did not return a priceId');
  }

  console.log(JSON.stringify({ evt: 'cc_price_requested', priceId }));
  return priceId;
}

// Step 4: Poll for price results
interface CraftcloudQuote {
  quoteId: string;
  vendorId: string;
  price: number;
  priceInclVat: number;
  productionTimeFast: number;
  productionTimeSlow: number;
  currency: string;
  materialConfigId: string;
}

interface CraftcloudShipping {
  shippingId: string;
  name: string;
  price: number;
  priceInclVat: number;
  deliveryTime: string;
  type: string;
  vendorId: string;
  currency: string;
}

interface PriceResults {
  quotes: CraftcloudQuote[];
  shippings: CraftcloudShipping[];
  complete: boolean;
}

async function pollPrices(priceId: string): Promise<PriceResults> {
  const maxAttempts = 40;
  const delayMs = 3000;
  let lastResults: PriceResults | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const resp = await fetchWithTimeout(`${CRAFTCLOUD_API}/v5/price/${priceId}`, {
      timeoutMs: 15000,
    });

    if (!resp.ok) {
      console.error(JSON.stringify({ evt: 'cc_price_poll_error', status: resp.status, attempt }));
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw new Error(`Craftcloud price poll failed (${resp.status})`);
    }

    const data = await resp.json();
    const quotes = data?.quotes || [];
    const shippings = data?.shippings || [];
    const complete = data?.complete === true || data?.isComplete === true;

    console.log(JSON.stringify({
      evt: 'cc_price_poll',
      attempt,
      quotesCount: quotes.length,
      shippingsCount: shippings.length,
      complete,
    }));

    lastResults = { quotes, shippings, complete };

    // If complete or we have quotes, we can proceed
    if (complete || quotes.length > 0) {
      // Wait one more poll to collect stragglers if not complete yet
      if (!complete && attempt < 5) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      return lastResults;
    }

    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, delayMs));
  }

  if (lastResults && lastResults.quotes.length > 0) {
    return lastResults;
  }

  throw new Error('Craftcloud price polling timed out with no quotes');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'unauthorized', message: 'Missing Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'server_misconfigured' }),
      { status: 500, headers: corsHeaders }
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: QuoteInput;
  try {
    body = validateInput(await req.json());
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'validation_failed', message: (e as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Extract user ID from JWT (optional — allow anonymous users)
  let userId: string | null = null;
  try {
    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1] || 'e30='));
    if (payload.sub) userId = payload.sub;
  } catch { /* ignore */ }

  const { modelUrl, materialConfigId, quantity, shippingAddress, objUrl, mtlUrl } = body;

  try {
    let fileBytes: Uint8Array;
    let fileName: string;

    if (objUrl) {
      // Multicolor: download OBJ + MTL (+ textures referenced in MTL), bundle into ZIP
      console.log(JSON.stringify({ evt: 'cc_downloading_multicolor', objUrl, mtlUrl }));

      const objResp = await fetchWithTimeout(objUrl, { timeoutMs: 30000 });
      if (!objResp.ok) throw new Error(`Failed to download OBJ (${objResp.status})`);
      const objBytes = new Uint8Array(await objResp.arrayBuffer());
      const objName = objUrl.split('/').pop()?.split('?')[0] || 'model.obj';

      const zipFiles: { name: string; data: Uint8Array }[] = [
        { name: objName, data: objBytes },
      ];

      if (mtlUrl) {
        const mtlResp = await fetchWithTimeout(mtlUrl, { timeoutMs: 30000 });
        if (mtlResp.ok) {
          const mtlBytes = new Uint8Array(await mtlResp.arrayBuffer());
          const mtlName = mtlUrl.split('/').pop()?.split('?')[0] || 'model.mtl';
          zipFiles.push({ name: mtlName, data: mtlBytes });

          // Parse MTL to find texture map files (map_Kd, map_Ka, map_Ks, etc.)
          const mtlText = new TextDecoder().decode(mtlBytes);
          const texturePattern = /\bmap_\w+\s+(.+)/g;
          const baseUrl = mtlUrl.substring(0, mtlUrl.lastIndexOf('/') + 1);
          let match;
          while ((match = texturePattern.exec(mtlText)) !== null) {
            const texFile = match[1].trim();
            if (!texFile) continue;
            const texUrl = texFile.startsWith('http') ? texFile : baseUrl + texFile;
            try {
              console.log(JSON.stringify({ evt: 'cc_downloading_texture', texFile }));
              const texResp = await fetchWithTimeout(texUrl, { timeoutMs: 30000 });
              if (texResp.ok) {
                const texBytes = new Uint8Array(await texResp.arrayBuffer());
                zipFiles.push({ name: texFile, data: texBytes });
              }
            } catch (texErr: any) {
              console.warn(JSON.stringify({ evt: 'cc_texture_download_failed', texFile, error: texErr.message }));
            }
          }
        }
      }

      console.log(JSON.stringify({ evt: 'cc_building_zip', fileCount: zipFiles.length, files: zipFiles.map(f => f.name) }));
      fileBytes = buildZip(zipFiles);
      fileName = objName.replace('.obj', '.zip');
    } else {
      // Standard single-color: download STL/GLB as before
      console.log(JSON.stringify({ evt: 'cc_downloading_model', modelUrl }));
      const fileResp = await fetchWithTimeout(modelUrl, { timeoutMs: 30000 });
      if (!fileResp.ok) throw new Error(`Failed to download model (${fileResp.status})`);
      fileBytes = new Uint8Array(await fileResp.arrayBuffer());
      fileName = modelUrl.split('/').pop()?.split('?')[0] || 'model.stl';
    }

    // 2. Upload to Craftcloud
    const modelId = await uploadModel(fileBytes, fileName);

    // 3. Poll until model is parsed
    await pollModelReady(modelId);

    // 4. Request prices
    const countryCode = shippingAddress.country === 'US' ? 'US' : shippingAddress.country;
    const priceId = await requestPrices(modelId, materialConfigId, quantity, countryCode);

    // 5. Poll for price results
    const { quotes, shippings } = await pollPrices(priceId);

    if (quotes.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'no_quotes',
          message: 'No print vendors returned quotes for this material and model combination.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Build vendor options — pair each quote with its cheapest shipping, sort by total
    const vendorOptions = quotes.map((q) => {
      const vendorShips = shippings.filter((s) => s.vendorId === q.vendorId);
      const cheapestShip = vendorShips.length > 0
        ? vendorShips.reduce((best, s) => (s.price < best.price ? s : best))
        : null;
      const shippingPrice = cheapestShip?.price ?? 0;
      return {
        vendorId: q.vendorId,
        itemPrice: q.price,
        shippingPrice,
        totalPrice: Number((q.price + shippingPrice).toFixed(2)),
        productionTimeFast: q.productionTimeFast,
        productionTimeSlow: q.productionTimeSlow,
        craftcloudQuoteId: q.quoteId,
        craftcloudShippingId: cheapestShip?.shippingId ?? '',
        shippingName: cheapestShip?.name ?? '',
        shippingDeliveryTime: cheapestShip?.deliveryTime ?? '',
      };
    });

    // Sort by total price ascending
    vendorOptions.sort((a, b) => a.totalPrice - b.totalPrice);

    // 7. Verify real totals via cart creation (catches minimum order fees)
    //    Create carts in parallel for top vendors to keep it fast
    const topVendors = vendorOptions.slice(0, 8);
    console.log(JSON.stringify({ evt: 'cc_verifying_prices', count: topVendors.length }));

    const cartResults = await Promise.allSettled(
      topVendors.map(async (v) => {
        const cartPayload: any = {
          quotes: [{ id: v.craftcloudQuoteId }],
          currency: 'USD',
        };
        if (v.craftcloudShippingId) {
          cartPayload.shippingIds = [v.craftcloudShippingId];
        }
        const resp = await fetchWithTimeout(`${CRAFTCLOUD_API}/v5/cart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cartPayload),
          timeoutMs: 10000,
        });
        if (!resp.ok) return null;
        return resp.json();
      })
    );

    // Merge cart-verified pricing back into vendor options
    for (let i = 0; i < topVendors.length; i++) {
      const result = cartResults[i];
      if (result.status !== 'fulfilled' || !result.value) continue;
      const cartData = result.value;

      // Log full cart response once so we can see the shape
      if (i === 0) {
        console.log(JSON.stringify({ evt: 'cc_cart_sample', keys: Object.keys(cartData), amounts: cartData?.amounts, minimumProductionPrice: cartData?.minimumProductionPrice }));
      }

      // Extract real total from cart (includes minimum production fees)
      const amounts = cartData?.amounts?.total;
      const minProd = cartData?.minimumProductionPrice;

      // Get cart-verified total
      const cartQuote = cartData?.quotes?.[0];
      const cartShipping = cartData?.shippings?.[0];
      const cartTotal = amounts?.totalNetPrice
        ?? Number(((cartQuote?.price ?? 0) + (cartShipping?.price ?? 0)).toFixed(2));

      // Keep the ORIGINAL raw item/shipping prices for the breakdown
      // The minimum fee is the difference between the cart total and raw prices
      const rawItemPrice = topVendors[i].itemPrice;
      const rawShippingPrice = topVendors[i].shippingPrice;
      const rawTotal = topVendors[i].totalPrice;

      // Calculate minimum fee: explicit from API, or derived from price difference
      let minimumFee = minProd?.productionFee ?? 0;
      if (minimumFee === 0 && cartTotal > rawTotal + 0.01) {
        // API didn't give explicit productionFee, but total went up → that's the minimum order surcharge
        minimumFee = Number((cartTotal - rawTotal).toFixed(2));
      }

      if (minimumFee > 0 || cartTotal !== rawTotal) {
        console.log(JSON.stringify({
          evt: 'cc_price_adjusted',
          vendor: topVendors[i].vendorId,
          rawItem: rawItemPrice,
          rawShipping: rawShippingPrice,
          rawTotal,
          cartTotal,
          minimumFee,
        }));
      }

      // Keep raw item/shipping prices for display breakdown, update total
      topVendors[i].totalPrice = Number(cartTotal.toFixed(2));
      (topVendors[i] as any).minimumFee = minimumFee > 0 ? Number(minimumFee.toFixed(2)) : undefined;
      (topVendors[i] as any).cartId = cartData.cartId;
    }

    // Re-sort after price adjustments
    vendorOptions.sort((a, b) => a.totalPrice - b.totalPrice);

    console.log(JSON.stringify({
      evt: 'cc_quotes_ready',
      count: vendorOptions.length,
      cheapest: vendorOptions[0]?.vendorId,
      cheapestTotal: vendorOptions[0]?.totalPrice,
    }));

    // 8. Return all vendor options — the user picks one in the frontend
    const response = {
      craftcloudPriceId: priceId,
      craftcloudModelId: modelId,
      currency: 'USD',
      vendorOptions,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const err = e as Error;
    console.error(JSON.stringify({ evt: 'cc_quote_error', message: err.message, name: err.name }));

    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    return new Response(
      JSON.stringify({
        error: isTimeout ? 'request_timeout' : 'quote_failed',
        message: isTimeout
          ? 'The request timed out. Please try again.'
          : err.message || 'Quote failed',
      }),
      {
        status: isTimeout ? 504 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
