// src/services/modelService.ts
import { supabase } from '../supabaseClient';
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
      // Get the Edge Function URL from environment variables
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-3d-model`;
      
      // Get user's auth token for authentication (if needed)
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      let body: FormData | string;
      let headers: Record<string, string> = {};

      if (image) {
        // Handle image-to-3D generation
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('image', image);
        body = formData;
        // Don't set Content-Type for FormData, browser will set it with boundary
      } else {
        // Handle text-to-3D generation
        body = JSON.stringify({ 
          prompt, 
          mode: "preview" // Add this line
        });
        headers['Content-Type'] = 'application/json';
      }

      // Add auth header if user is authenticated
      // if (authToken) {
      //   headers['Authorization'] = `Bearer ${authToken}`;
      // }

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: errorData,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data, // Extract the data from the Edge Function response
      };
    } catch (error) {
      console.error('Error generating 3D model:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to generate 3D model',
      };
    }
  },
};