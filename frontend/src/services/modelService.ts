// src/services/modelService.ts
import { supabase } from '../../supabaseClient';
import { MarketplaceModel } from '../types';
import { comfyUIService } from './comfyUIService';
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          data: null,
          error: 'Please log in to generate models',
        };
      }

      const userId = session.user.id;

      // ROUTING LOGIC: Route based on input type
      if (image) {
        console.log('🔀 Routing to ComfyUI (Image-to-3D)');
        return await this.generateWithComfyUI({ prompt, image, userId });
      } else {
        console.log('🔀 Routing to MeshyAI (Text-to-3D)');
        return await this.generateWithMeshy({ prompt, userId, session });
      }
    } catch (error) {
      console.error('❌ Error in generate3DModel routing:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to generate 3D model',
      };
    }
  },

  /**
   * Generate using ComfyUI (Image-to-3D)
   */
  async generateWithComfyUI({ prompt, image, userId }: { prompt: string; image: File; userId: string }): Promise<ModelResponse> {
    try {
      console.log('🖼️ Starting ComfyUI Image-to-3D generation');

      // Use the ComfyUI service for image-to-3D
      const comfyResult = await comfyUIService.generate({ prompt, image, userId });

      if (!comfyResult.success) {
        return {
          success: false,
          data: null,
          error: comfyResult.error || 'ComfyUI generation failed'
        };
      }

      console.log('📦 ComfyUI result data:', comfyResult.data);
      console.log('📁 ComfyUI allFiles:', comfyResult.data?.allFiles);

      // Find the GLB URL from allFiles
      let glbUrl = comfyResult.data?.primaryModelUrl;
      
      if (comfyResult.data?.allFiles && comfyResult.data.allFiles.length > 0) {
        // Look for GLB files in allFiles
        const glbFiles = comfyResult.data.allFiles.filter(file => 
          file.fileExtension === 'glb' && file.publicUrl
        );
        
        console.log('🔍 Found GLB files:', glbFiles);
        
        if (glbFiles.length > 0) {
          // Use the first GLB file's public URL
          glbUrl = glbFiles[0].publicUrl;
          console.log('✅ Using GLB URL from allFiles:', glbUrl);
        } else {
          console.log('⚠️ No GLB files found in allFiles, using primaryModelUrl:', glbUrl);
        }
      } else {
        console.log('⚠️ No allFiles array, using primaryModelUrl:', glbUrl);
      }

      if (!glbUrl) {
        console.error('❌ No GLB URL found in ComfyUI response');
        return {
          success: false,
          data: null,
          error: 'No GLB model URL found in ComfyUI response'
        };
      }

      console.log('🎯 Final GLB URL for ModelViewer:', glbUrl);

      return {
        success: true,
        data: {
          taskId: comfyResult.data?.jobId || comfyResult.data?.promptId,
          modelUrl: glbUrl, // Use the extracted GLB URL
          downloadUrl: glbUrl,
          status: comfyResult.data?.status || 'completed',
          progress: comfyResult.data?.progress || 100,
          type: 'comfyui',
          allFiles: comfyResult.data?.allFiles || [],
          primaryModelUrl: glbUrl,
          executionTime: comfyResult.data?.executionTime,
          workflowNodes: comfyResult.data?.workflowNodes,
          comfyuiServer: comfyResult.data?.comfyuiServer,
          message: comfyResult.data?.message,
          totalFiles: comfyResult.data?.totalFiles
        }
      };
    } catch (error) {
      console.error('❌ Error in generateWithComfyUI:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'ComfyUI generation failed'
      };
    }
  },

  /**
   * Generate using MeshyAI (Text-to-3D) - existing logic
   */
  async generateWithMeshy({ prompt, userId, session }: { prompt: string; userId: string; session: any }): Promise<ModelResponse> {
    try {
      console.log('📝 Starting MeshyAI Text-to-3D generation');
      
      // Use the v2 edge function (which will route to MeshyAI for text-only)
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-3d-model-v2`;

      // Text-to-3D request (no image)
      const body = JSON.stringify({ 
        prompt, 
        mode: "preview",
        user_id: userId || null
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Always set the Authorization header
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
      }

      console.log('📤 Making MeshyAI request to Edge Function:', {
        url: edgeFunctionUrl,
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
        console.error('❌ MeshyAI Edge Function error:', errorData);
        
        let errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        
        return {
          success: false,
          data: null,
          error: errorMessage,
          details: errorData,
        };
      }

      const data = await response.json();
      
      console.log('✅ MeshyAI Edge Function response:', {
        success: data.success,
        hasModelUrl: !!data.data?.modelUrl,
        taskId: data.data?.taskId
      });

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error('❌ Error in MeshyAI generation:', error);
      
      let errorMessage = 'Failed to generate 3D model with MeshyAI';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
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