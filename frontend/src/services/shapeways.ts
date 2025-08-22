import { supabase } from '../lib/supabase';

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
<<<<<<< HEAD
  itemTotal?: number;
  surcharge?: number;
=======
>>>>>>> fb964decc43c1d79fe7e6b50fcf9db09099b422d
}

export async function getQuote(params: GetQuoteParams): Promise<QuoteResponse> {
  const { data, error } = await supabase.functions.invoke('vendor-shapeways-get-quote', {
    body: {
      model: { url: params.modelUrl },
      selections: params.selections,
      quantity: params.quantity,
      shippingAddress: params.shippingAddress
    }
  });
  if (error) throw error;
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
