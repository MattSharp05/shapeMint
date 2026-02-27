import { supabase } from '../supabaseClient';

interface CreateOrderParams {
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
  priorQuote?: {
    itemTotal: number;
    shippingTotal: number;
    total: number;
  };
  quoteId?: string;
  publicFileServiceId?: string;
}

export async function createOrder(params: CreateOrderParams) {
  const { data, error } = await supabase.functions.invoke('vendor-slant3d-create-order', {
    body: {
      model: { url: params.modelUrl },
      filamentId: params.filamentId,
      quantity: params.quantity,
      shippingAddress: params.shippingAddress,
      priorQuote: params.priorQuote ? {
        itemTotal: params.priorQuote.itemTotal,
        shippingTotal: params.priorQuote.shippingTotal,
        total: params.priorQuote.total
      } : undefined,
      quoteId: params.quoteId,
      publicFileServiceId: params.publicFileServiceId
    }
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
  return data as {
    orderId: string;
    orderNumber: string;
    vendorOrderId: string;
    totalPrice: number;
    currency: string;
    status: string;
  };
}

export async function refreshOrderStatus(orderId: string) {
  const { data, error } = await supabase.functions.invoke('vendor-slant3d-get-order', {
    body: { orderId }
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
  return data as { orderId: string; status: string; vendorStatus: any };
}
