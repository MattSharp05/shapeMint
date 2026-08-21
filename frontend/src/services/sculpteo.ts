import { supabase } from '../supabaseClient';
import type { CraftcloudVendorOption } from './craftcloud';
import { type PrintType } from '../constants/craftcloudConfigs';
import { SCULPTEO_FRONTEND_ENABLED } from '../constants/sculpteoConfigs';

interface SculpteoQuoteParams {
  modelUrl: string;
  printType: PrintType;
  quantity: number;
  countryCode?: string;
  // Optional: when we have a prebuilt color bundle (OBJ+MTL+textures+GLB zip),
  // pass it through so the edge function can upload the color-ready archive.
  colorBundleUrl?: string;
}

export interface SculpteoQuoteResponse {
  currency: string;
  quotedCountry?: string;
  vendorOptions: CraftcloudVendorOption[];
}

/**
 * Fetch a Sculpteo quote, normalized into the same CraftcloudVendorOption
 * shape as craftcloud.getQuote so both sources can share one sorted list.
 * Returns an empty vendorOptions array (never throws) when the feature flag
 * is off or Sculpteo itself is unreachable — keeps the primary CraftCloud
 * quote flow completely unaffected.
 */
export async function getSculpteoQuote(params: SculpteoQuoteParams): Promise<SculpteoQuoteResponse> {
  if (!SCULPTEO_FRONTEND_ENABLED) {
    return { currency: 'USD', vendorOptions: [] };
  }

  const { data: { session } } = await supabase.auth.getSession();
  const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vendor-sculpteo-get-quote`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        modelUrl: params.modelUrl,
        printType: params.printType,
        quantity: params.quantity,
        ...(params.countryCode && { countryCode: params.countryCode }),
        ...(params.colorBundleUrl && { colorBundleUrl: params.colorBundleUrl }),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.warn('⚠️ Sculpteo quote failed:', errorData?.message || errorData?.error || `HTTP ${response.status}`);
      return { currency: 'USD', vendorOptions: [] };
    }

    const data = await response.json();
    console.log('📦 Sculpteo Quote Response:', data);
    if (data?.error) {
      console.warn('⚠️ Sculpteo quote returned error:', data.message || data.error);
      return { currency: 'USD', vendorOptions: [] };
    }
    return data as SculpteoQuoteResponse;
  } catch (err) {
    console.warn('⚠️ Sculpteo quote request threw:', err);
    return { currency: 'USD', vendorOptions: [] };
  }
}
