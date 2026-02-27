/**
 * Service for transforming images via fal.ai Nano Banana Pro.
 * Calls the Supabase edge function `transform-image`, which injects
 * a 3D-print-optimized system prompt and returns 4 variations.
 */
import { supabase } from '../supabaseClient';

export interface TransformResult {
  images: string[];
}

class FalImageService {
  async transformImage(image: string, prompt: string): Promise<TransformResult> {
    const { data, error } = await supabase.functions.invoke('transform-image', {
      body: { image, prompt },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Image transformation failed');
    }

    if (!data?.images || data.images.length === 0) {
      throw new Error(data?.error || 'No images were generated. Please try again.');
    }

    return { images: data.images };
  }
}

export const falImageService = new FalImageService();
