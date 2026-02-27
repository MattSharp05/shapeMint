/**
 * Service to ensure model GLB URLs are always accessible.
 *
 * Old models have Meshy CDN URLs that expire. This service checks if a
 * model's GLB URL is a Meshy URL and, if so, re-fetches the GLB through
 * a Supabase edge function that stores it in Supabase storage.
 */
import { supabase } from '../supabaseClient';

/** Returns true if the URL is a Meshy/CloudFront CDN URL that may expire. */
function isMeshyCdnUrl(url: string): boolean {
  return (
    url.includes('assets.meshy.ai') ||
    url.includes('meshy.ai') ||
    url.includes('cloudfront.net')
  );
}

/** Returns true if the URL is already in Supabase storage. */
function isSupabaseUrl(url: string): boolean {
  return url.includes('supabase.co/storage');
}

/**
 * Ensure a model's GLB URL is a stable Supabase storage URL.
 * If the stored URL is a Meshy CDN URL, triggers a re-check that
 * downloads and stores the GLB in Supabase.
 *
 * Returns the best available URL (Supabase if possible, original otherwise).
 */
export async function ensureStableModelUrl(
  modelId: string,
  currentGlbUrl: string | null | undefined,
  modelType: 'text-to-3d' | 'image-to-3d' = 'text-to-3d'
): Promise<string | null> {
  if (!currentGlbUrl) return null;

  // Already in Supabase storage — good to go
  if (isSupabaseUrl(currentGlbUrl)) {
    return currentGlbUrl;
  }

  // Meshy CDN URL — trigger a status re-check to migrate it
  if (isMeshyCdnUrl(currentGlbUrl)) {
    try {
      console.log('Migrating model to Supabase storage:', modelId);
      const { data, error } = await supabase.functions.invoke('check-model-status', {
        body: { taskId: modelId, type: modelType },
      });

      if (!error && data?.data?.model_urls?.glb) {
        const newUrl = data.data.model_urls.glb;
        if (isSupabaseUrl(newUrl)) {
          console.log('Model migrated successfully:', newUrl);
          return newUrl;
        }
      }
    } catch (err) {
      console.warn('Model migration failed, using original URL:', err);
    }
  }

  // Return original URL as fallback
  return currentGlbUrl;
}
