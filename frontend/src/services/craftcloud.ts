import { supabase } from '../supabaseClient';

interface CraftcloudQuoteParams {
  modelUrl: string;
  materialConfigId: string;
  quantity: number;
  // Phase 6: full shipping address is no longer required at quote time.
  // Pass countryCode (preferred) or a partial shippingAddress. The edge
  // function falls back to the IP header and finally 'US'.
  countryCode?: string;
  shippingAddress?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    address1?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
  };
  // For multicolor materials: OBJ+MTL are zipped server-side (legacy fallback)
  objUrl?: string;
  mtlUrl?: string;
  textureUrls?: string[];
  // Preferred color-print path: prebuilt ZIP from scale pipeline (OBJ+MTL+textures+GLB)
  colorBundleUrl?: string;
}

export interface CraftcloudVendorOption {
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
  minimumFee?: number;   // Minimum order surcharge (if item price is below vendor minimum)
  cartId?: string;       // Pre-created cart ID for faster checkout
}

export interface CraftcloudQuoteResponse {
  craftcloudPriceId: string;
  craftcloudModelId: string;
  currency: string;
  /** Country actually used for the quote (may differ from what caller asked for). */
  quotedCountry?: string;
  vendorOptions: CraftcloudVendorOption[];
}

export async function getQuote(params: CraftcloudQuoteParams): Promise<CraftcloudQuoteResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vendor-craftcloud-get-quote`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else {
    headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
    console.warn('No active session found, using anon key.');
  }

  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      modelUrl: params.modelUrl,
      materialConfigId: params.materialConfigId,
      quantity: params.quantity,
      ...(params.countryCode && { countryCode: params.countryCode }),
      ...(params.shippingAddress && { shippingAddress: params.shippingAddress }),
      ...(params.objUrl && { objUrl: params.objUrl }),
      ...(params.mtlUrl && { mtlUrl: params.mtlUrl }),
      ...(params.textureUrls?.length && { textureUrls: params.textureUrls }),
      ...(params.colorBundleUrl && { colorBundleUrl: params.colorBundleUrl }),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

    const errMsg = errorData.message || errorData.error || `HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  const data = await response.json();

  console.log('📦 Craftcloud Quote Response:', data);

  if (data?.error) {
    throw new Error(data.message || data.error);
  }

  return data as CraftcloudQuoteResponse;
}
