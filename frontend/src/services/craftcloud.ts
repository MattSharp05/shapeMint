import { supabase } from '../supabaseClient';

interface CraftcloudQuoteParams {
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
  // For multicolor materials: OBJ+MTL are zipped server-side
  objUrl?: string;
  mtlUrl?: string;
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
      shippingAddress: params.shippingAddress,
      ...(params.objUrl && { objUrl: params.objUrl }),
      ...(params.mtlUrl && { mtlUrl: params.mtlUrl }),
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
