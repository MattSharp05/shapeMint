import { supabase } from '../supabaseClient';
import type { CartItemWithModel } from './cartService';

export interface CartOrderShippingAddress {
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

export interface CartOrderResponse {
  orderId: string;
  orderNumber: string;
  vendorOrderId: string;
  totalPrice: number;
  currency: string;
  status: string;
  stripeCheckoutUrl: string;
}

/**
 * Kick off a multi-item cart order + Stripe checkout. Caller should refresh
 * quotes beforehand (AddressPicker + country mismatch re-quote) so the
 * craftcloud_quote_id values here are fresh.
 */
export async function createCartOrder(params: {
  items: CartItemWithModel[];
  shippingAddress: CartOrderShippingAddress;
  successUrl: string;
  cancelUrl: string;
}): Promise<CartOrderResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vendor-craftcloud-create-cart-order`;

  const items = params.items
    .map(i => {
      // Use the cheapest quote from the snapshot (matches UI display).
      const vendors = i.quote_snapshot?.vendors || [];
      const picked = [...vendors].sort((a, b) => a.totalPrice - b.totalPrice)[0];
      if (!picked) return null;
      return {
        cartItemId: i.id,
        craftcloudQuoteId: picked.craftcloudQuoteId,
        craftcloudShippingId: picked.craftcloudShippingId,
        craftcloudPriceId: i.craftcloud_price_id || i.quote_snapshot?.craftcloudPriceId || '',
        quantity: i.quantity,
        modelUrl: i.model?.scaled_stl_url || i.model?.stl_url || i.model?.glb_url || '',
      };
    })
    .filter(Boolean);

  if (items.length === 0) throw new Error('No items with valid quotes to order.');

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      items,
      shippingAddress: params.shippingAddress,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    const msg = data?.message || data?.error || `HTTP ${resp.status}`;
    throw new Error(msg);
  }
  return data as CartOrderResponse;
}
