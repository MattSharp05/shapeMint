import { supabase } from '../supabaseClient';
import type { CartItemWithModel } from './cartService';

interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  address1: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export interface SculpteoOrderResponse {
  orderId: string;
  orderNumber: string;
  totalPrice: number;
  currency: string;
  status: string;
  stripeCheckoutUrl: string;
}

export interface CreateSculpteoOrderParams {
  modelId: string;
  sculpteoDesignUuid: string;
  sculpteoProductCode: string;
  sculpteoShippingCode?: string;
  quantity: number;
  shippingAddress: ShippingAddress;
  priorQuote: { itemTotal: number; shippingTotal: number; total: number };
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createSculpteoOrder(params: CreateSculpteoOrderParams): Promise<SculpteoOrderResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vendor-sculpteo-create-order`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };

  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(params) });
  const data = await resp.json().catch(() => ({ error: 'invalid_json' }));
  if (!resp.ok || data?.error) {
    throw new Error(data?.message || data?.error || `HTTP ${resp.status}`);
  }
  console.log('📦 Sculpteo Order Response:', data);
  return data as SculpteoOrderResponse;
}

export interface CreateSculpteoCartOrderParams {
  items: CartItemWithModel[];
  shippingAddress: ShippingAddress;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Submit a batch of Sculpteo cart items to the cart-order edge function.
 * The UI splits mixed-source carts by source before calling this — each call
 * here goes to one Stripe session scoped to its source.
 */
export async function createSculpteoCartOrder(params: CreateSculpteoCartOrderParams): Promise<SculpteoOrderResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vendor-sculpteo-create-cart-order`;

  const items = params.items
    .map(i => {
      const vendors = i.quote_snapshot?.vendors || [];
      // Pick the cheapest Sculpteo vendor on this item (should match what we
      // displayed as the item's line total).
      const sculpteoVendors = vendors.filter(v => v.source === 'sculpteo');
      const picked = [...sculpteoVendors].sort((a, b) => a.totalPrice - b.totalPrice)[0];
      if (!picked || !picked.sculpteoDesignUuid || !picked.sculpteoProductCode) return null;
      return {
        cartItemId: i.id,
        modelId: i.model_id,
        sculpteoDesignUuid: picked.sculpteoDesignUuid,
        sculpteoProductCode: picked.sculpteoProductCode,
        sculpteoShippingCode: picked.sculpteoShippingCode,
        quantity: i.quantity,
        itemPrice: picked.itemPrice,
        shippingPrice: picked.shippingPrice,
        totalPrice: picked.totalPrice,
      };
    })
    .filter(Boolean);

  if (items.length === 0) throw new Error('No Sculpteo items in cart.');

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      items,
      shippingAddress: params.shippingAddress,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    }),
  });
  const data = await resp.json().catch(() => ({ error: 'invalid_json' }));
  if (!resp.ok || data?.error) {
    throw new Error(data?.message || data?.error || `HTTP ${resp.status}`);
  }
  return data as SculpteoOrderResponse;
}
