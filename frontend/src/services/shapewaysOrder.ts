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
  
  // Handle Supabase function invocation errors
  // Note: For 409 and other error statuses, Supabase may set error but data might still contain the error message
  if (error) {
    // Try to extract message from error context if available
    let errorMessage = error.message;
    
    // If data exists and has an error, prefer that message
    if (data && (data as any)?.error) {
      const errorData = data as any;
      errorMessage = errorData.message || errorData.error || error.message;
    }
    
    // Check for specific error codes
    if (data && (data as any)?.error === 'price_changed') {
      throw new Error('price_changed');
    }
    
    throw new Error(errorMessage || JSON.stringify(error));
  }
  
  // Check if the response contains an error (even with 200 status)
  if (data && (data as any)?.error) {
    const errorData = data as any;
    // Handle price_changed specially
    if (errorData.error === 'price_changed') {
      throw new Error('price_changed');
    }
    throw new Error(errorData.message || errorData.error || 'Order creation failed');
  }
  
  if (!data) {
    throw new Error('No response data received from order creation');
  }
  
  return data as { orderId: string; orderNumber: string; vendorOrderId: string; totalPrice: number; currency: string; status: string };
}

export async function refreshOrderStatus(orderId: string) {
  const { data, error } = await supabase.functions.invoke('vendor-shapeways-get-order', { body: { orderId } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
  return data as { orderId: string; status: string; vendorStatus: any };
}
