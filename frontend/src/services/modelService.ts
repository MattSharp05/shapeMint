// src/services/modelService.ts
import { supabase } from '../../supabaseClient';
interface Generate3DModelParams {
  prompt: string;
  image?: File;
}

interface ModelResponse {
  success: boolean;
  data: any;
  error?: string;
  details?: any;
}

export const modelService = {
  async generate3DModel({ prompt, image }: Generate3DModelParams): Promise<ModelResponse> {
    try {
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-3d-model`;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          data: null,
          error: 'Please log in to generate models',
        };
      }

      const userId = session.user.id;

      let body: FormData | string;
      let headers: Record<string, string> = {};

      if (image) {
        // ✅ Validate image file
        if (!image.type.startsWith('image/')) {
          return {
            success: false,
            data: null,
            error: 'Invalid file type. Please upload an image file.',
          };
        }

        // ✅ Check file size (Meshy has limits)
        const maxSize = 10 * 1024 * 1024; // 10MB limit
        if (image.size > maxSize) {
          return {
            success: false,
            data: null,
            error: 'Image file too large. Please use an image smaller than 10MB.',
          };
        }

        console.log('📤 Sending image to Edge Function:', {
          fileName: image.name,
          fileType: image.type,
          fileSize: image.size,
          promptLength: prompt.length
        });

        const formData = new FormData();
        formData.append('prompt', prompt); // This can be empty string for texture prompt
        formData.append('image', image);
        formData.append('mode', 'preview'); // ✅ Add mode parameter
        if (userId) formData.append('user_id', userId);
        body = formData;
        
        // ✅ Don't set Content-Type for FormData - let browser set it with boundary
      } else {
        // Text-to-3D request
        body = JSON.stringify({ 
          prompt, 
          mode: "preview",
          user_id: userId || null
        });
        headers['Content-Type'] = 'application/json';
      }

      // Always set the Authorization header
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
      }

      console.log('📤 Making request to Edge Function:', {
        url: edgeFunctionUrl,
        hasImage: !!image,
        promptLength: prompt.length,
        headers: Object.keys(headers)
      });

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Edge Function error:', errorData);
        
        // ✅ More specific error messages
        let errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        
        if (image && response.status === 400) {
          errorMessage = 'Image processing failed. Please try with a different image or check the image format.';
        }
        
        return {
          success: false,
          data: null,
          error: errorMessage,
          details: errorData,
        };
      }

      const data = await response.json();
      
      console.log('✅ Edge Function response:', {
        success: data.success,
        hasModelUrl: !!data.data?.modelUrl,
        taskId: data.data?.taskId
      });

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error('❌ Error generating 3D model:', error);
      
      // ✅ More specific error handling
      let errorMessage = 'Failed to generate 3D model';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (image && error instanceof Error) {
        errorMessage = `Image processing error: ${error.message}`;
      }
      
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : errorMessage,
      };
    }
  },

  /**
 * Calls the Supabase Edge Function to refine a 3D model using the Meshy API.
 * 
 * - Requires a `preview_task_id` (from the original model generation).
 * - Optionally accepts `texture_prompt`, `enable_pbr`, `ai_model`, and `texture_image_url` for advanced refinement.
 * - Builds the request body using object spread syntax for concise conditional property inclusion.
 * - Handles authentication using the current Supabase session or anon key.
 * - Returns a ModelResponse object with the result or error details.
 * 
 * Example usage:
 *   modelService.refineModel({ preview_task_id: 'abc123', texture_prompt: 'Make it shiny' });
 */
  async refineModel({
    preview_task_id,
    texture_prompt,
    enable_pbr,
    ai_model,
    texture_image_url
  }: {
    preview_task_id: string;
    texture_prompt?: string;
    enable_pbr?: boolean;
    ai_model?: string;
    texture_image_url?: string;
  }): Promise<ModelResponse> {
    try {
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refine-model`;
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
      }
      const body: Record<string, any> = { preview_task_id };
      if (texture_prompt) body.texture_prompt = texture_prompt;
      if (enable_pbr !== undefined) body.enable_pbr = enable_pbr;
      if (ai_model) body.ai_model = ai_model;
      if (texture_image_url) body.texture_image_url = texture_image_url;
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          data: null,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          details: errorData,
        };
      }
      const data = await response.json();
      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to refine 3D model',
      };
    }
  },

  // Note: Marketplace functionality has been moved to marketplaceService.ts
  // This method is deprecated and will be removed in future versions
  async fetchMarketplaceModels(): Promise<any[]> {
    console.warn('⚠️ fetchMarketplaceModels is deprecated. Use marketplaceService.fetchPublishedListings() instead');
    return [];
  },
};