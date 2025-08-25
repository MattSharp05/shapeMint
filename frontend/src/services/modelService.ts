// src/services/modelService.ts
import { supabase } from '../../supabaseClient';
import { MarketplaceModel } from '../types';
import { optimizeImageForMeshy, validateImageForMeshy, getImageDimensions } from '../utils/imageOptimization';
interface Generate3DModelParams {
  prompt: string;
  image?: string | File; // Can be data URI or File
  type?: 'text-to-3d' | 'image-to-3d';
  mode?: 'preview' | 'refine';
  enable_pbr?: boolean;
  topology?: 'quad' | 'tri';
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
        let imageDataUri: string;
        
        if (image instanceof File) {
          // Handle File input
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

          // Convert optimized image to base64
          const reader = new FileReader();
          const imageBase64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                resolve(reader.result);
              } else {
                reject(new Error('Failed to convert image to base64'));
              }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(optimizedImage);
          });

          imageDataUri = await imageBase64Promise;
        } else {
          // Handle data URI input
          imageDataUri = image;
          
          // Validate data URI format
          if (!imageDataUri.startsWith('data:image/')) {
            return {
              success: false,
              data: null,
              error: 'Invalid image format. Must be a valid image data URI.',
            };
          }
        }
        
        // Send as JSON for consistent handling
        body = JSON.stringify({
          prompt,
          image: imageDataUri, // Use data URI from either File or direct input
          type: 'image-to-3d', // Explicitly identify as image-to-3D
          mode: 'preview',
          enable_pbr: true,
          topology: 'quad',
          user_id: userId,
          texture_resolution: 2048, // Higher resolution textures
          should_remesh: true // Better topology
        });
        headers['Content-Type'] = 'application/json';
        
        // ✅ Don't set Content-Type for FormData - let browser set it with boundary
      } else {
        // Text-to-3D request
        body = JSON.stringify({ 
          prompt,
          type: 'text-to-3d', // Explicitly identify as text-to-3D
          mode: 'preview',
          enable_pbr: true, // Enable high quality materials
          topology: 'quad', // Use quad topology for better quality
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
      console.log('Body type:', typeof body === 'string' ? 'JSON' : 'unknown');
      console.log('User ID:', userId);
      console.log('Timestamp:', callTimestamp);
      
      console.log(` EDGE FUNCTION CALL: generate-3d-model at ${callTimestamp}`);

      let responseData: any;

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
        const data = await response.json();
        console.log(' Parsed response data:', data);

        // Ensure the 'type' from the body is passed through if the backend doesn't provide it
        const requestBody = JSON.parse(body as string);
        responseData = {
          ...data.data,
          type: data.data?.type || requestBody.type,
        };

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
        success: !!responseData,
        hasData: !!responseData,
        dataStatus: responseData?.status,
        taskId: responseData?.taskId,
        responseKeys: responseData ? Object.keys(responseData) : []
      });

      // The backend now returns a consistent { success: true, data: { taskId, type, ... } } object.
      // We pass our newly constructed responseData which includes the correct type.
      return {
        success: true,
        data: responseData, // Pass the whole data object from the backend response
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

  async checkModelStatus(taskId: string, type: 'text-to-3d' | 'image-to-3d'): Promise<ModelResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, data: null, error: 'Authentication required' };
      }

      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-model-status`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ taskId, type }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ Failed to check model status:', responseData.error);
        return {
          success: false,
          data: null,
          error: responseData.error || 'Failed to check model status.',
        };
      }

      return {
        success: true,
        data: responseData.data,
      };
    } catch (error) {
      console.error('❌ Error checking model status:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error checking status',
      };
    }
  },

  // Mark a generated model as completed via Edge Function (service role)
  async markModelComplete({
    taskId,
    glb_url,
    obj_url,
    note
  }: {
    taskId: string;
    glb_url?: string | null;
    obj_url?: string | null;
    note?: string | null;
  }): Promise<ModelResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
      }

      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mark-model-complete`;
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ taskId, glb_url: glb_url ?? null, obj_url: obj_url ?? null, note }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          data: null,
          error: (errorData as any).error || `HTTP ${response.status}: ${response.statusText}`,
          details: errorData,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to mark model complete',
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
    console.log('🔍 Fetching marketplace models...');
    
    // Fetch completed models that are published to marketplace
    const { data, error } = await supabase
      .from('generated_models')
      .select('*')
      .eq('status', 'completed')
      .eq('is_marketplace_listed', true)
      .not('glb_url', 'is', null)
      .neq('glb_url', '')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('❌ Error fetching marketplace models:', error);
      return [];
    }
    
    // Filter out models that don't have any valid model URLs
    const validModels = (data || []).filter(model => {
      const hasValidGlb = model.glb_url && model.glb_url.trim() !== '';
      const hasValidObj = model.obj_url && model.obj_url.trim() !== '';
      const hasValidStl = model.stl_url && model.stl_url.trim() !== '';
      
      return hasValidGlb || hasValidObj || hasValidStl;
    });
    
    console.log(`✅ Found ${data?.length || 0} completed models, ${validModels.length} with valid URLs`);
    
    return validModels as MarketplaceModel[];
  },

  async publishToMarketplace({
    modelId,
    title,
    description,
    price,
    category,
    tags,
    notes
  }: {
    modelId: string;
    title: string;
    description: string;
    price: number;
    category: string;
    tags: string;
    notes?: string;
  }): Promise<ModelResponse> {
    try {
      console.log('🚀 Publishing model to marketplace via Edge Function...', { modelId, price });
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, data: null, error: 'Authentication required' };
      }

      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-model`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          model_id: modelId,
          price,
          title,
          description,
          category,
          tags,
          notes,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ Failed to publish to marketplace:', responseData.error);
        return {
          success: false,
          data: null,
          error: responseData.error || 'Failed to publish model.',
        };
      }

      console.log('✅ Successfully published to marketplace:', responseData.data);
      return {
        success: true,
        data: responseData.data,
      };

    } catch (error) {
      console.error('❌ Error publishing to marketplace:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to publish to marketplace',
      };
    }
  },
};