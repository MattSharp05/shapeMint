// Sculpteo product-code mapping keyed by our internal PrintType.
//
// Sculpteo's price_by_uuid endpoint accepts a `productname` param. These
// product codes are their public material identifiers (e.g. color_plastic for
// full-color sandstone/MJF, white_plastic for mono PLA, nylon_pa12 for SLS).
// Verify the exact codes against the live Sculpteo API response before
// enabling in production — Sculpteo occasionally renames products.
import type { PrintType } from './craftcloudConfigs';

export const SCULPTEO_PRODUCT_CODES: Record<PrintType, string> = {
  color: 'color_plastic',
  mono:  'white_plastic',
  sls:   'nylon_pa12',
};

// Human-readable names rendered in the UI tag / vendor modal.
export const SCULPTEO_VENDOR_LABEL = 'Sculpteo';

// Client-side feature flag. When false, the Sculpteo edge function returns []
// and the quote list behaves exactly as before. Flip to true once the edge
// function env (SCULPTEO_ENABLED + optional SCULPTEO_API_KEY) is configured.
export const SCULPTEO_FRONTEND_ENABLED =
  import.meta.env.VITE_SCULPTEO_ENABLED === 'true';
