import { supabase } from '../supabaseClient';

interface GetQuoteParams {
  modelUrl: string;
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

export interface TreatstockQuoteResponse {
  quoteId: string;
  priceTotal: number;
  currency: string;
  expiresAt?: string;
  reused?: boolean;
  itemTotal?: number;
  surcharge?: number;
  shippingTotal?: number;
  // Treatstock-specific fields
  printablePackId: number;
  partUid?: string;
  minimumPrice?: {
    materialGroup: string;
    color: string;
    cost: number;
  } | null;
  cheapestOption: {
    providerId: string;
    materialGroup: string;
    color: string;
    price: number;
    printer: string;
  };
  allOptions: Array<{
    providerId: string;
    materialGroup: string;
    color: string;
    price: number;
    printer: string;
  }>;
}

// For the UI we keep the same shape as other vendors' QuoteResponse
export type QuoteResponse = {
  quoteId: string;
  priceTotal: number;
  currency: string;
  expiresAt?: string;
  reused?: boolean;
  itemTotal?: number;
  surcharge?: number;
  shippingTotal?: number;
} & {
  treatstockRaw: TreatstockQuoteResponse;
};

export async function getQuote(params: GetQuoteParams): Promise<QuoteResponse> {
  const { data, error } = await supabase.functions.invoke('vendor-treatstock-get-quote', {
    body: {
      model: { url: params.modelUrl },
      quantity: params.quantity,
      // Treatstock only really needs location; we always use US for now
      location: {
        country: params.shippingAddress.country || 'US'
      }
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

  const raw = data as any;

  const response: QuoteResponse = {
    quoteId: raw.quoteId,
    priceTotal: raw.totalPrice,
    currency: raw.currency || 'USD',
    // Map generic fields expected by the UI
    itemTotal: raw.itemSubtotal,
    shippingTotal: raw.shippingPrice ?? 0,
    surcharge: 0,
    treatstockRaw: raw as TreatstockQuoteResponse
  };

  return response;
}

