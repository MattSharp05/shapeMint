import { supabase } from '../supabaseClient';
import type { TreatstockQuoteResponse } from './treatstock';

interface CreateOrderParams {
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
  priorQuote: {
    itemTotal: number;
    shippingTotal: number;
    total: number;
  };
  quoteId: string;
  quoteRaw: TreatstockQuoteResponse;
}

export async function createOrder(params: CreateOrderParams) {
  const cheapest = params.quoteRaw.cheapestOption;

  const { data, error } = await supabase.functions.invoke('vendor-treatstock-create-order', {
    body: {
      model: { url: params.modelUrl },
      selections: {
        materialGroup: cheapest.materialGroup,
        color: cheapest.color,
        providerId: cheapest.providerId
      },
      quantity: params.quantity,
      shippingAddress: {
        firstName: params.shippingAddress.firstName,
        lastName: params.shippingAddress.lastName,
        email: params.shippingAddress.email,
        address1: params.shippingAddress.address1,
        address2: params.shippingAddress.address2,
        city: params.shippingAddress.city,
        state: params.shippingAddress.state,
        zipCode: params.shippingAddress.zipCode,
        country: params.shippingAddress.country,
        phone: params.shippingAddress.phone
      },
      priorQuote: {
        itemTotal: params.priorQuote.itemTotal,
        shippingTotal: params.priorQuote.shippingTotal,
        total: params.priorQuote.total
      },
      quoteId: params.quoteId
    }
  });

  if (error) throw error;
  if ((data as any)?.error) {
    const err = data as any;
    const custom = new Error(err.message || err.error);
    (custom as any).code = err.error;
    (custom as any).details = err.vendorStatus || err.details;
    throw custom;
  }

  return data as {
    orderId: string;
    orderNumber: string;
    vendorOrderId: string;
    totalPrice: number;
    currency: string;
    status: string;
  };
}

