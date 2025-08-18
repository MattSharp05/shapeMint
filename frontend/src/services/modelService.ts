// src/services/modelService.ts
import { supabase } from '../../supabaseClient';
import { MarketplaceModel } from '../types';
import { optimizeImageForMeshy, validateImageForMeshy, getImageDimensions } from '../utils/imageOptimization';
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
        // ✅ Enhanced image validation
        const validation = validateImageForMeshy(image);
        if (!validation.isValid) {
          return {
            success: false,
            data: null,
            error: validation.error || 'Invalid image file',
          };
        }

        // ✅ Get original image dimensions for logging
        try {
          const dimensions = await getImageDimensions(image);
          console.log('📐 Original image dimensions:', dimensions);
        } catch (error) {
          console.warn('Could not get image dimensions:', error);
        }

        // ✅ Optimize image for better Meshy results
        let optimizedImage: Blob;
        try {
          optimizedImage = await optimizeImageForMeshy(image, {
            maxWidth: 1024,
            maxHeight: 1024,
            quality: 0.9,
            format: 'jpeg'
          });
          console.log('🎨 Image optimized:', {
            originalSize: image.size,
            optimizedSize: optimizedImage.size,
            compression: `${Math.round((1 - optimizedImage.size / image.size) * 100)}%`
          });
        } catch (error) {
          console.warn('Image optimization failed, using original:', error);
          optimizedImage = image;
        }

        console.log('📤 Sending image to Edge Function:', {
          fileName: image.name,
          fileType: image.type,
          fileSize: image.size,
          promptLength: prompt.length
        });

        const formData = new FormData();
        formData.append('prompt', prompt); // This can be empty string for texture prompt
        formData.append('image', optimizedImage, 'optimized_image.jpg'); // Use optimized image
        formData.append('mode', 'preview'); // ✅ Add mode parameter
        
        // ✅ Add quality parameters for Meshy API
        formData.append('enable_pbr', 'true'); // Enable physically-based rendering
        formData.append('topology', 'quad'); // Better topology for 3D printing
        
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

      const callTimestamp = new Date().toISOString();
      
      // ENHANCED DEBUGGING
      console.log(' ABOUT TO CALL EDGE FUNCTION ');
      console.log('URL:', edgeFunctionUrl);
      console.log('Method: POST');
      console.log('Headers:', headers);
      console.log('Body type:', body instanceof FormData ? 'FormData' : typeof body);
      console.log('User ID:', userId);
      console.log('Timestamp:', callTimestamp);
      
      console.log(` EDGE FUNCTION CALL: generate-3d-model at ${callTimestamp}`);

      let data: any;
      
      try {
        console.log(' Making fetch request NOW...');
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers,
          body,
        });
        
        console.log(' Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          console.log(' Response not OK, reading error...');
          const errorText = await response.text();
          console.log(' Raw error response:', errorText);
          
          let errorData = {};
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            console.log(' Could not parse error as JSON');
            errorData = { rawError: errorText };
          }
          
          console.error(' Edge Function error:', errorData);
        
        // More specific error messages
        let errorMessage = (errorData as any).error || `HTTP ${response.status}: ${response.statusText}`;
        
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

        console.log(' Response OK, parsing JSON...');
        data = await response.json();
        console.log(' Parsed response data:', data);
        
      } catch (fetchError: any) {
        console.error(' FETCH ERROR:', fetchError);
        console.error(' Error details:', {
          message: fetchError?.message,
          stack: fetchError?.stack,
          name: fetchError?.name
        });
        
        return {
          success: false,
          data: null,
          error: `Network error: ${fetchError?.message || 'Unknown error'}`,
          details: { fetchError: fetchError?.toString() }
        };
      }
      
      console.log('✅ Edge Function response:', {
        success: data.success,
        hasData: !!data.data,
        dataStatus: data.data?.status,
        taskId: data.data?.taskId,
        responseKeys: data.data ? Object.keys(data.data) : []
      });

      // Handle new Edge function response format
      // Edge function now returns: { success: true, data: { taskId, status, type, ... } }
      if (data.data) {
        // This is the new hybrid approach response
        return {
          success: true,
          data: {
            taskId: data.data.taskId,
            status: data.data.status,
            type: data.data.type,
            mode: data.data.mode,
            message: data.data.message,
            estimated_time: data.data.estimated_time,
            poll_url: data.data.poll_url,
            generation_info: data.data.generation_info,
            // If it's a completed model, include URLs
            modelUrl: data.data.modelUrl,
            downloadUrl: data.data.downloadUrl,
            stlUrl: data.data.stlUrl,
            objUrl: data.data.objUrl
          }
        };
      }

      // Legacy fallback for old response format (if any)
      const modelData = data.model ? {
        taskId: data.model.id,
        modelUrl: data.model.glb_url, // Use GLB for 3D viewer
        downloadUrl: data.model.stl_url, // Use STL for download
        objUrl: data.model.obj_url,
        type: data.model.type,
        status: data.model.status
      } : null;

      return {
        success: true,
        data: modelData,
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

  async fetchMarketplaceModels(): Promise<MarketplaceModel[]> {
    // Fetch all models with status 'completed' from Supabase table 
    //...'generated_models'
    const { data, error } = await supabase
      .from('generated_models')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching marketplace models:', error);
      return [];
    }
    return data as MarketplaceModel[];
  },
};