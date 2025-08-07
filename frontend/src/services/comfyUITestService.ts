// services/comfyUITestService.ts
import { supabase } from '../lib/supabase';

interface ComfyUITestParams {
  prompt?: string;
  image?: File;
}

interface StartGenerationResponse {
  success: boolean;
  data?: {
    jobId: string;
    promptId: string;
    status: string;
    progress: number;
    workflowNodes: number;
    comfyuiServer: string;
    message: string;
    estimatedTime: string;
  };
  error?: string;
}

interface PollJobResponse {
  success: boolean;
  data?: {
    jobId: string;
    status: 'processing' | 'completed' | 'failed';
    progress: number;
    primaryModelUrl?: string;
    primaryPreviewUrl?: string;
    allFiles?: Array<{
      originalFilename: string;
      storageFilename: string;
      publicUrl: string;
      fileExtension: string;
      size: number;
      nodeId: string;
      type: string;
      isModel: boolean;
      isPreview: boolean;
    }>;
    executionTime?: string;
    workflowNodes?: number;
    comfyuiServer?: string;
    message?: string;
    estimatedTimeRemaining?: string;
    totalFiles?: number;
    models?: any[];
    previews?: any[];
  };
  error?: string;
}

export const comfyUITestService = {
  async startGeneration({ prompt, image }: ComfyUITestParams): Promise<StartGenerationResponse> {
    try {
      console.log('🚀 Starting ComfyUI generation job...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Please log in to start generation',
        };
      }

      // Validate that we have either text prompt or image
      if (!prompt?.trim() && !image) {
        return {
          success: false,
          error: 'Either text prompt or image file is required.',
        };
      }

      // Validate image if provided
      if (image) {
        if (!image.type.startsWith('image/')) {
          return {
            success: false,
            error: 'Invalid file type. Please upload an image file.',
          };
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (image.size > maxSize) {
          return {
            success: false,
            error: 'Image too large. Please use an image smaller than 10MB.',
          };
        }
      }

      const formData = new FormData();
      if (prompt?.trim()) {
        formData.append('prompt', prompt.trim());
      }
      if (image) {
        formData.append('image', image);
      }
      formData.append('user_id', session.user.id);

      console.log('📤 Sending request to start ComfyUI job...');
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-comfyui-job`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to start job:', errorData);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log('✅ Job started successfully:', data);
      
      return data;
      
    } catch (error: any) {
      console.error('❌ Start generation service error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  },

  async pollJobStatus(jobId: string): Promise<PollJobResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Please log in to check job status'
        };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/poll-comfyui-job?jobId=${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      );

      const data = await response.json();
      
      if (!response.ok && data.error) {
        console.error('❌ Poll job failed:', data.error);
        return {
          success: false,
          error: data.error
        };
      }

      return data;
    } catch (error: any) {
      console.error('❌ Poll job service error:', error);
      return {
        success: false,
        error: error.message || 'Failed to check job status'
      };
    }
  },

  // Test connectivity to ComfyUI server through edge function
  async testConnection(): Promise<{ success: boolean; error?: string; info?: any }> {
    try {
      console.log('🔍 Testing ComfyUI server connection through edge function...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Please log in to test ComfyUI connection'
        };
      }

      // Test through our edge function to avoid CORS issues
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-comfyui`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'test_connection',
          user_id: session.user.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          info: {
            server: 'http://comfy.tunell.live',
            message: 'ComfyUI server is accessible through edge function',
            timestamp: new Date().toISOString(),
            details: data.data
          }
        };
      } else {
        return {
          success: false,
          error: data.error || 'Connection test failed'
        };
      }
      
    } catch (error: any) {
      return {
        success: false,
        error: `Connection test failed: ${error.message}`
      };
    }
  }
}; 