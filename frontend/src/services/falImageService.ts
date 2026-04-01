/**
 * Service for generating/transforming images via fal.ai Nano Banana Pro.
 * Calls the Supabase edge function `transform-image`, which injects
 * a 3D-print-optimized system prompt and returns 4 variations.
 *
 * Supports two modes:
 * - Text-only: prompt only, no image → text-to-image generation
 * - Image editing: prompt + image → image transformation
 */
import { supabase } from '../supabaseClient';

export interface TransformResult {
  images: string[];
}

export interface TransformOptions {
  systemPrompt?: string;
  numImages?: number;
  resolution?: string;
  aspectRatio?: string;
  outputFormat?: string;
}

class FalImageService {
  /**
   * Generate/transform images via fal.ai Nano Banana Pro.
   * @param prompt - User prompt
   * @param image - Single image URL or data URI (for backwards compat)
   * @param options - Generation options
   * @param additionalImages - Extra reference image URLs (combined with `image` into image_urls array)
   */
  async transformImage(
    prompt: string,
    image?: string | null,
    options?: TransformOptions,
    additionalImages?: string[],
  ): Promise<TransformResult> {
    const body: Record<string, any> = { prompt };

    // Build images array: primary image + any additional references
    const allImages: string[] = [];
    if (image) allImages.push(image);
    if (additionalImages?.length) allImages.push(...additionalImages);

    if (allImages.length === 1) {
      body.image = allImages[0];
    } else if (allImages.length > 1) {
      body.images = allImages;
    }

    if (options?.systemPrompt) body.systemPrompt = options.systemPrompt;
    if (options?.numImages) body.numImages = options.numImages;
    if (options?.resolution) body.resolution = options.resolution;
    if (options?.aspectRatio) body.aspectRatio = options.aspectRatio;
    if (options?.outputFormat) body.outputFormat = options.outputFormat;

    const { data, error } = await supabase.functions.invoke('transform-image', {
      body,
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
