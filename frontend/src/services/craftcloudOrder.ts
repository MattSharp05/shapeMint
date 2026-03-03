import { supabase } from '../supabaseClient';

interface CraftcloudOrderParams {
  craftcloudQuoteId: string;
  craftcloudShippingId: string;
  craftcloudPriceId: string;
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
  successUrl: string;
  cancelUrl: string;
  priorQuote?: {
    itemTotal: number;
    shippingTotal: number;
    total: number;
  };
  quoteId?: string;
  modelUrl?: string;
}

export interface CraftcloudOrderResponse {
  orderId: string;
  orderNumber: string;
  vendorOrderId: string;
  totalPrice: number;
  currency: string;
  status: string;
  stripeCheckoutUrl: string;
}

export async function createOrder(params: CraftcloudOrderParams): Promise<CraftcloudOrderResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vendor-craftcloud-create-order`;

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
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

    const errMsg = errorData.message || errorData.error || `HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  const data = await response.json();

  console.log('📦 Craftcloud Order Response:', data);

  if (data?.error) {
    throw new Error(data.message || data.error);
  }

  return data as CraftcloudOrderResponse;
}
