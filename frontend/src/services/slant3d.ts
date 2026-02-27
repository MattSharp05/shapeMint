import { supabase } from '../supabaseClient';

interface GetQuoteParams {
  modelUrl: string;
  filamentId: string;
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
    phone: string;
  };
}

export interface QuoteResponse {
  quoteId: string;
  priceTotal: number;
  currency: string;
  expiresAt?: string;
  itemTotal?: number;
  shippingTotal?: number;
  publicFileServiceId?: string;
}

export async function getQuote(params: GetQuoteParams): Promise<QuoteResponse> {
  const { data, error } = await supabase.functions.invoke('vendor-slant3d-get-quote', {
    body: {
      model: { url: params.modelUrl },
      filamentId: params.filamentId,
      quantity: params.quantity,
      shippingAddress: params.shippingAddress
    }
  });
  if (error) throw error;
  if (data?.error) {
    const errMsg = data.message || data.error;
    const custom = new Error(errMsg);
    (custom as any).code = data.error;
    (custom as any).details = data.details;
    throw custom;
  }
  return data as QuoteResponse;
}

export async function getAvailableFilaments() {
  const { data, error } = await supabase.functions.invoke('vendor-slant3d-get-filaments');
  if (error) throw error;
  if (data?.error) throw new Error(data.message || data.error);
  return data as Array<{
    publicId: string;
    name: string;
    type: string;
    provider: string;
    color: string;
    hexValue: string;
    profile: string;
    public: boolean;
    available: boolean;
  }>;
}
