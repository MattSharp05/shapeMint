import { supabase } from '../supabaseClient';

interface CreateOrderParams {
  modelUrl: string;
  selections: { baseMaterialId: string; colorId?: string; finishId?: string };
  quantity: number;
  shippingAddress: { firstName: string; lastName: string; email: string; address1: string; city: string; state: string; zipCode: string; country: string; phone: string };
  priorQuote?: { itemTotal: number; surcharge: number; total: number };
  quoteId?: string;
}

export async function createOrder(params: CreateOrderParams) {
  const { data, error } = await supabase.functions.invoke('vendor-shapeways-create-order', {
    body: {
      model: { url: params.modelUrl },
      selections: params.selections,
      quantity: params.quantity,
      shippingAddress: params.shippingAddress,
      priorQuote: params.priorQuote ? {
        itemTotal: params.priorQuote.itemTotal,
        surcharge: params.priorQuote.surcharge,
        total: params.priorQuote.total
      } : undefined,
      quoteId: params.quoteId
    }
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
  return data as { orderId: string; orderNumber: string; vendorOrderId: string; totalPrice: number; currency: string; status: string };
}

export async function refreshOrderStatus(orderId: string) {
  const { data, error } = await supabase.functions.invoke('vendor-shapeways-get-order', { body: { orderId } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
  return data as { orderId: string; status: string; vendorStatus: any };
}
