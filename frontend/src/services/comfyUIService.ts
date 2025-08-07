// services/comfyUIService.ts - Production ComfyUI service
import { supabase } from '../lib/supabase';

interface ComfyUIGenerationParams {
  prompt?: string;
  image: File;
  userId: string;
}

interface ComfyUIResponse {
  success: boolean;
  data?: {
    jobId: string;
    promptId: string;
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
    totalFiles?: number;
    models?: any[];
    previews?: any[];
  };
  error?: string;
}

export class ComfyUIService {
  private static instance: ComfyUIService;

  private constructor() {}

  public static getInstance(): ComfyUIService {
    if (!ComfyUIService.instance) {
      ComfyUIService.instance = new ComfyUIService();
    }
    return ComfyUIService.instance;
  }

  /**
   * Main generation method - handles the complete workflow
   */
  async generate({ prompt, image, userId }: ComfyUIGenerationParams): Promise<ComfyUIResponse> {
    try {
      console.log('🚀 Starting ComfyUI generation...');
      
      // 1. Start the job (quick edge function call)
      const startResult = await this.startGeneration({ prompt, image, userId });
      
      if (!startResult.success || !startResult.data) {
        return {
          success: false,
          error: startResult.error || 'Failed to start ComfyUI generation'
        };
      }

      // 2. Poll for completion (frontend handles the waiting)
      const finalResult = await this.pollUntilComplete(startResult.data.jobId);
      
      return finalResult;
      
    } catch (error: any) {
      console.error('❌ ComfyUI generation error:', error);
      return {
        success: false,
        error: error.message || 'ComfyUI generation failed'
      };
    }
  }

  /**
   * Start the generation job via edge function (returns quickly)
   */
  private async startGeneration({ prompt, image, userId }: ComfyUIGenerationParams): Promise<ComfyUIResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Please log in to start generation'
        };
      }

      // Validate inputs
      if (!image) {
        return {
          success: false,
          error: 'Image file is required for ComfyUI generation'
        };
      }

      if (!image.type.startsWith('image/')) {
        return {
          success: false,
          error: 'Invalid file type. Please upload an image file.'
        };
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (image.size > maxSize) {
        return {
          success: false,
          error: 'Image too large. Please use an image smaller than 10MB.'
        };
      }

      // Prepare form data
      const formData = new FormData();
      if (prompt?.trim()) {
        formData.append('prompt', prompt.trim());
      }
      formData.append('image', image);
      formData.append('user_id', userId);

      console.log('📤 Sending request to start ComfyUI job...');
      
      // Call the start-comfyui-job edge function directly
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-comfyui-job`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to start ComfyUI job:', errorData);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log('✅ ComfyUI job started successfully:', data);
      
      return data;
      
    } catch (error: any) {
      console.error('❌ Start generation service error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Poll for job completion - mirrors the test page polling logic
   */
  private async pollUntilComplete(jobId: string): Promise<ComfyUIResponse> {
    return new Promise((resolve, reject) => {
      console.log(`🔄 Starting polling for job: ${jobId}`);
      
      const pollInterval = setInterval(async () => {
        try {
          const result = await this.checkJobStatus(jobId);
          
          if (result.success && result.data) {
            if (result.data.status === 'completed') {
              console.log('✅ ComfyUI generation completed!');
              clearInterval(pollInterval);
              resolve(result);
            } else if (result.data.status === 'failed') {
              console.error('❌ ComfyUI generation failed');
              clearInterval(pollInterval);
              reject(new Error(result.error || 'ComfyUI generation failed'));
            } else if (result.data.status === 'processing') {
              console.log(`🔄 ComfyUI progress: ${result.data.progress}%`);
              // Continue polling
            }
          } else if (!result.success) {
            console.error('❌ Polling failed:', result.error);
            clearInterval(pollInterval);
            reject(new Error(result.error || 'Polling failed'));
          }
        } catch (error) {
          console.error('❌ Polling error:', error);
          clearInterval(pollInterval);
          reject(new Error('Failed to check job status'));
        }
      }, 5000); // Poll every 5 seconds (same as test page)

      // Stop polling after 30 minutes as fallback (same as test page)
      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error('ComfyUI generation timeout - please try again'));
      }, 30 * 60 * 1000);
    });
  }

  /**
   * Check job status via edge function (quick call)
   */
  private async checkJobStatus(jobId: string): Promise<ComfyUIResponse> {
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
        return {
          success: false,
          error: data.error
        };
      }

      return data;
    } catch (error: any) {
      console.error('❌ Check job status error:', error);
      return {
        success: false,
        error: error.message || 'Failed to check job status'
      };
    }
  }
}

// Export singleton instance
export const comfyUIService = ComfyUIService.getInstance(); 