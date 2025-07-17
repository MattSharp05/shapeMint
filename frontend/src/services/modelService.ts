// src/services/modelService.ts
import { supabase } from '../../supabaseClient';
import { MarketplaceModel } from '../types';
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

      let body: FormData | string;
      let headers: Record<string, string> = {};

      if (image) {
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('image', image);
        body = formData;
      } else {
        body = JSON.stringify({ 
          prompt, 
          mode: "preview"
        });
        headers['Content-Type'] = 'application/json';
      }

      // Always set the Authorization header!
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
      }

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
      console.error('Error generating 3D model:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to generate 3D model',
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