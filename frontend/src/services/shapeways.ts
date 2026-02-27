import { supabase } from '../supabaseClient';

interface GetQuoteParams {
  modelUrl: string;
  selections: { baseMaterialId: string; colorId?: string; finishId?: string };
  quantity: number;
  shippingAddress: { firstName: string; lastName: string; email: string; address1: string; city: string; state: string; zipCode: string; country: string; phone: string };
}

export interface QuoteResponse {
  quoteId: string;
  priceTotal: number;
  currency: string;
  expiresAt?: string;
  reused?: boolean;
  itemTotal?: number;
  surcharge?: number;
  shippingTotal?: number;
}

export async function getQuote(params: GetQuoteParams): Promise<QuoteResponse> {
  // Get session and manually pass Authorization header to ensure it's included
  // supabase.functions.invoke() should do this automatically, but sometimes it doesn't
  const { data: { session } } = await supabase.auth.getSession();
  
  const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vendor-shapeways-get-quote`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
  };
  
  // Add Authorization header if we have a session
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else {
    // If no session, try using the anon key (for public access if needed)
    // But this will likely fail if the edge function requires auth
    headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
    console.warn('No active session found, using anon key. This may fail if auth is required.');
  }
  
  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: { url: params.modelUrl },
      selections: params.selections,
      quantity: params.quantity,
      shippingAddress: params.shippingAddress
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    
    // Provide helpful error message for auth errors
    if (response.status === 401) {
      if (!session) {
        throw new Error('Authentication required. Please log in to get a quote.');
      } else {
        throw new Error('Session expired. Please refresh the page or log in again.');
      }
    }
    
    const errMsg = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    const custom = new Error(errMsg);
    (custom as any).code = errorData.error;
    (custom as any).details = errorData.details;
    throw custom;
  }

  const data = await response.json();
  
  // Debug: Log the raw response to see what we're getting
  console.log('📦 Shapeways Quote Response:', data);
  console.log('📦 Shipping Total in response:', data.shippingTotal);
  console.log('📦 Surcharge in response:', data.surcharge);
  console.log('📦 Item Total in response:', data.itemTotal);
  
  if (data?.error) {
    // Attach server-provided message if present for better UX
    const errMsg = data.message || data.error;
    const custom = new Error(errMsg);
    (custom as any).code = data.error;
    (custom as any).details = data.details;
    throw custom;
  }
  
  return data as QuoteResponse;
}
