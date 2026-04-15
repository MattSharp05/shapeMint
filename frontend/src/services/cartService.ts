import { supabase } from '../supabaseClient';
import { getQuote as getCraftcloudQuote, type CraftcloudVendorOption } from './craftcloud';
import { CRAFTCLOUD_CONFIG_IDS, type PrintType } from '../constants/craftcloudConfigs';

export interface QuoteSnapshot {
  vendors: CraftcloudVendorOption[];
  currency: string;
  craftcloudPriceId?: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  model_id: string;
  print_type: PrintType;
  quantity: number;
  craftcloud_price_id: string | null;
  quote_snapshot: QuoteSnapshot | null;
  quoted_country: string | null;
  quoted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItemModel {
  id: string;
  name: string | null;
  thumbnail_url: string | null;
  stl_url: string | null;
  glb_url: string | null;
  scaled_stl_url: string | null;
  scaled_color_bundle_url: string | null;
  ip_country: string | null;
}

export interface CartItemWithModel extends CartItem {
  model: CartItemModel | null;
}

const TABLE = 'cart_items';
const STALE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function isStale(quoted_at: string | null): boolean {
  if (!quoted_at) return true;
  return Date.now() - new Date(quoted_at).getTime() > STALE_MS;
}

function modelUrlFor(model: CartItemModel, printType: PrintType): { modelUrl: string; colorBundleUrl?: string } | null {
  if (printType === 'color') {
    const colorBundleUrl = model.scaled_color_bundle_url || undefined;
    const modelUrl = model.scaled_stl_url || model.stl_url || model.glb_url || '';
    if (!modelUrl && !colorBundleUrl) return null;
    return { modelUrl: modelUrl || colorBundleUrl!, colorBundleUrl };
  }
  const modelUrl = model.scaled_stl_url || model.stl_url || model.glb_url || '';
  return modelUrl ? { modelUrl } : null;
}

export const cartService = {
  /**
   * Fetch cart items joined with the generated_models row for thumbnails + file URLs.
   */
  async list(userId: string): Promise<CartItemWithModel[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(`
        *,
        model:generated_models (
          id, name, thumbnail_url, stl_url, glb_url,
          scaled_stl_url, scaled_color_bundle_url, ip_country
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as CartItemWithModel[];
  },

  async count(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) return 0;
    return count || 0;
  },

  /**
   * Add an item to the cart, or increment quantity if the (model_id, print_type) pair exists.
   * Stores the caller-supplied quote snapshot so the drawer can render totals without refetching.
   */
  async add(params: {
    userId: string;
    modelId: string;
    printType: PrintType;
    quantity?: number;
    quote: QuoteSnapshot | null;
    quotedCountry?: string | null;
  }): Promise<CartItem> {
    const { userId, modelId, printType, quote, quotedCountry } = params;
    const quantity = params.quantity ?? 1;

    // Check if existing row exists (unique constraint enforces one).
    const { data: existing } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('model_id', modelId)
      .eq('print_type', printType)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from(TABLE)
        .update({
          quantity: existing.quantity + quantity,
          quote_snapshot: quote,
          craftcloud_price_id: quote?.craftcloudPriceId || null,
          quoted_country: quotedCountry || existing.quoted_country,
          quoted_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: userId,
        model_id: modelId,
        print_type: printType,
        quantity,
        quote_snapshot: quote,
        craftcloud_price_id: quote?.craftcloudPriceId || null,
        quoted_country: quotedCountry || null,
        quoted_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateQuantity(id: string, quantity: number): Promise<void> {
    if (quantity < 1) throw new Error('Quantity must be >= 1');
    const { error } = await supabase.from(TABLE).update({ quantity }).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  async clear(userId: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('user_id', userId);
    if (error) throw error;
  },

  isStale,

  /**
   * Re-quote a single cart item from craftcloud using the latest model files.
   * Updates the row with fresh snapshot + quoted_at. Silently no-ops if the
   * model row is missing required URLs (e.g. processing incomplete).
   */
  async refreshQuote(item: CartItemWithModel, countryOverride?: string): Promise<CartItemWithModel> {
    if (!item.model) return item;
    const urls = modelUrlFor(item.model, item.print_type);
    if (!urls) return item;

    const country = countryOverride || item.quoted_country || item.model.ip_country || 'US';
    const materialConfigId = CRAFTCLOUD_CONFIG_IDS[item.print_type];

    try {
      const resp = await getCraftcloudQuote({
        modelUrl: urls.modelUrl,
        materialConfigId,
        quantity: item.quantity,
        countryCode: country,
        ...(urls.colorBundleUrl ? { colorBundleUrl: urls.colorBundleUrl } : {}),
      });

      const snapshot: QuoteSnapshot = {
        vendors: resp.vendorOptions,
        currency: resp.currency,
        craftcloudPriceId: resp.craftcloudPriceId,
      };

      const { data, error } = await supabase
        .from(TABLE)
        .update({
          quote_snapshot: snapshot,
          craftcloud_price_id: resp.craftcloudPriceId,
          quoted_country: resp.quotedCountry || country,
          quoted_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .select()
        .single();
      if (error) throw error;
      return { ...item, ...data };
    } catch (err) {
      console.warn('[cart] refreshQuote failed for', item.id, err);
      return item;
    }
  },

  /**
   * Refresh any cart items whose quote is older than STALE_MS. Returns the
   * updated list. Called by CartDrawer on open.
   */
  async refreshStaleQuotes(items: CartItemWithModel[], countryOverride?: string): Promise<CartItemWithModel[]> {
    const stale = items.filter(i => isStale(i.quoted_at));
    if (stale.length === 0) return items;
    const refreshed = await Promise.all(stale.map(i => cartService.refreshQuote(i, countryOverride)));
    const byId = new Map(refreshed.map(r => [r.id, r]));
    return items.map(i => byId.get(i.id) || i);
  },
};

export { STALE_MS as CART_QUOTE_STALE_MS };
