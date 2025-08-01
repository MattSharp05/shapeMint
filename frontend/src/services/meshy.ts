import axios from 'axios';
import { modelService } from './model';
import { MeshyResponse, CreateModelInput } from '../types/model';
import { supabase } from '../lib/supabase';

const MESHY_API_BASE = '/api/meshy';

interface MeshyGenerationParams {
  prompt: string;
  style?: string;
  negative_prompt?: string;
  seed?: number;
}

interface ImageGenerationParams {
  imageFile: File;
  style?: string;
  enable_pbr?: boolean;
}

// Extended MeshyResponse to include model_urls for compatibility
interface ExtendedMeshyResponse extends MeshyResponse {
  model_urls?: {
    glb?: string;
    obj?: string;
    stl?: string;
  };
}

export class MeshyService {
  // Text-to-3D task status checking
  private async checkTextTaskStatus(taskId: string): Promise<{ data: MeshyResponse }> {
    return axios.get(`${MESHY_API_BASE}/text-to-3d/${taskId}`, { headers: this.headers });
  }

  // Image-to-3D task status checking
  private async checkImageTaskStatus(taskId: string): Promise<{ data: MeshyResponse }> {
    return axios.get(`${MESHY_API_BASE}/image-to-3d/${taskId}`, { headers: this.headers });
  }

  // Generic task status checking (backwards compatibility)
  private async checkTaskStatus(taskId: string, mode: 'text' | 'image' = 'text'): Promise<{ data: MeshyResponse }> {
    return mode === 'image' 
      ? this.checkImageTaskStatus(taskId)
      : this.checkTextTaskStatus(taskId);
  }

  private async waitForTaskCompletion(taskId: string, maxAttempts = 200): Promise<MeshyResponse> {
    let attempts = 0;
    let lastProgress = 0;
    let stuckCount = 0;
    let lastProgressTime = Date.now();

    while (attempts < maxAttempts) {
      try {
        const { data: response } = await this.checkTaskStatus(taskId);
        const { status, progress } = response;
        const currentProgress = progress || 0;
        const now = Date.now();

        if (status === 'FAILED') {
          console.error('❌ Task failed:', response);
          throw new Error('Task failed: ' + (response.task_error || 'Unknown error'));
        }

        if (status === 'SUCCEEDED') {
          console.log('✅ Task completed successfully!');
          return response;
        }

        // Check if progress is stuck
        if (currentProgress === lastProgress) {
          stuckCount++;
          const timeSinceProgress = now - lastProgressTime;
          
          if (stuckCount > 10 && timeSinceProgress > 120000) { // 2 minutes stuck
            console.warn(`⚠️ Progress stuck at ${currentProgress}% for ${Math.round(timeSinceProgress/1000)}s`);
          }
        } else {
          // Progress changed, reset stuck counter
          stuckCount = 0;
          lastProgressTime = now;
          console.log(`📈 Progress increased: ${lastProgress}% → ${currentProgress}%`);
          lastProgress = currentProgress;
        }

        // Adaptive wait times based on progress and stuck status
        let waitTime;
        if (currentProgress >= 99) {
          waitTime = 8000; // 8 seconds for final processing
        } else if (currentProgress >= 90) {
          waitTime = 5000; // 5 seconds for high progress
        } else if (stuckCount > 5) {
          waitTime = 6000; // 6 seconds if stuck
        } else {
          waitTime = 3000; // 3 seconds normal
        }
        
        console.log(`🔄 Task status: ${status}, Progress: ${currentProgress}%, Attempt: ${attempts + 1}/${maxAttempts}, Wait: ${waitTime/1000}s`);
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error checking task status (attempt ${attempts + 1}):`, errorMessage);
        attempts++;
        
        // If it's a network error, wait longer before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Don't throw on network errors, just continue trying
        if (attempts >= maxAttempts) {
          throw new Error(`Task polling failed after ${maxAttempts} attempts. Last error: ${errorMessage}`);
        }
      }
    }

    throw new Error(`Task timed out after ${maxAttempts} attempts (${Math.round(maxAttempts * 4 / 60)} minutes). Last progress: ${lastProgress}%`);
  }
  private static instance: MeshyService;
  private headers: { Authorization: string };

  private constructor() {
    const apiKey = import.meta.env.VITE_MESHY_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_MESHY_API_KEY is not set');
    }
    this.headers = { Authorization: `Bearer ${apiKey}` };
  }

  public static getInstance(): MeshyService {
    if (!MeshyService.instance) {
      MeshyService.instance = new MeshyService();
    }
    return MeshyService.instance;
  }

  private async generatePreview(params: MeshyGenerationParams): Promise<{ taskId: string; modelUrl: string }> {
    try {
      // Step 1: Create preview task
      console.log('Creating preview task with params:', params);
      console.log('Sending preview request to Meshy API...');
      console.log('Using headers:', this.headers);
      const previewResponse = await axios.post(`${MESHY_API_BASE}/text-to-3d`, {
        mode: 'preview',
        prompt: params.prompt,
        style: params.style || 'base',
        negative_prompt: params.negative_prompt || '',
        seed: params.seed || Math.floor(Math.random() * 1000000),
        enable_pbr: false
      }, { headers: this.headers });

      console.log('Preview task creation response:', previewResponse.data);
      console.log('Full preview response:', previewResponse.data);
      const previewTaskId = previewResponse.data.result;
      if (!previewTaskId) {
        console.error('No preview task ID in response:', previewResponse.data);
        throw new Error('No preview task ID returned from API');
      }

      // Step 2: Poll preview task until complete using improved polling logic
      const response = await this.waitForTaskCompletion(previewTaskId);
      
      if (response.status === 'SUCCEEDED') {
        console.log('✅ Preview generation completed successfully!');
        
        // For preview tasks, we need to get the preview image or result URL
        // Cast to any to access properties that might not be in the type definition
        const responseData = response as any;
        const hasPreviewImage = response.preview_image;
        const hasModelUrls = responseData.model_urls;
        const hasThumbnail = responseData.thumbnail_url;
        const hasModelUrl = response.model_url;
        
        if (!hasPreviewImage && !hasModelUrls && !hasThumbnail && !hasModelUrl) {
          console.error('❌ No preview image, model URLs, thumbnail URL, or model URL in response:', response);
          throw new Error('Preview completed but no preview URL found');
        }

        // Use the first available preview URL
        const previewUrl = response.preview_image || 
                          (hasModelUrls && responseData.model_urls.glb) ||
                          responseData.thumbnail_url ||
                          response.model_url;

        console.log('🎉 Preview task succeeded:', { taskId: previewTaskId, previewImage: previewUrl });
        return { taskId: previewTaskId, modelUrl: previewUrl };
      }

      console.error('Preview task exited loop without success or failure');
      throw new Error('Preview generation incomplete');
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error generating preview:', error.message);
        throw error;
      } else {
        console.error('Unknown error generating preview:', error);
        throw new Error('Failed to generate preview');
      }
    }
  }

  async generateModel(params: MeshyGenerationParams): Promise<string> {
    try {
      const preview = await this.generatePreview(params);
      
      // Check if we already have model URLs from the preview
      const statusResponse = await this.checkTaskStatus(preview.taskId);
      const previewData = statusResponse.data as ExtendedMeshyResponse;
      if (previewData.model_urls?.glb) {
        console.log('Model URLs found in preview response, skipping refine step');
        return previewData.model_urls.glb;
      }

      console.log('Sending refine request to Meshy API...');
      console.log('Using headers for refine:', this.headers);
      const refineResponse = await axios.post(`${MESHY_API_BASE}/text-to-3d`, {
        mode: 'refine',
        preview_task_id: preview.taskId,
        enable_pbr: false
      }, { headers: this.headers });

      console.log('Full refine response:', refineResponse.data);
      const refineTaskId = refineResponse.data.result;
      if (!refineTaskId) {
        throw new Error('No refine task ID returned from API');
      }

      const response = await this.waitForTaskCompletion(refineTaskId);
      if (response.status === 'SUCCEEDED' && response.model_url) {
        return response.model_url;
      }

      throw new Error('Refine task incomplete');
    } catch (error) {
      console.error('Error in generate model:', error);
      throw new Error('Failed to generate model');
    }
  }

  async generateAndStoreModel(params: MeshyGenerationParams, userId: string): Promise<any> {
    console.log('Starting model generation with params:', params);
    try {
      const glbUrl = await this.generateModel(params);
      
      // Generate other format URLs based on GLB URL pattern
      const objUrl = glbUrl.replace('.glb', '.obj');
      const stlUrl = glbUrl.replace('.glb', '.stl');
      
      const modelId = glbUrl.split('/').pop()?.split('.')[0] || Date.now().toString();
      
      // Store the direct Meshy URLs instead of downloading and re-uploading
      // This avoids the 403 authentication issues with asset downloads
      const modelInput: CreateModelInput = {
        user_id: userId,
        name: `Model ${modelId.slice(0, 8)}`,
        prompt: params.prompt,
        style: params.style || 'base',
        obj_url: objUrl,
        stl_url: stlUrl,
        glb_url: glbUrl,
        status: 'completed',
        thumbnail_status: 'pending'
      };

      console.log('Storing model with direct URLs:', modelInput);
      const createdModel = await modelService.createModel(modelInput);
      console.log('Model stored successfully in Supabase');
      
      // Call Edge Function to download GLB and convert to STL
      if (glbUrl && createdModel.id) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-stl-to-bucket`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              glbUrl: glbUrl,
              modelId: createdModel.id
            })
          });
          const result = await res.json();
          console.log('Edge Function save-stl-to-bucket result:', result);
        } catch (err) {
          console.error('Error calling save-stl-to-bucket Edge Function:', err);
        }
      }
      
      // Queue thumbnail generation and immediately invoke processing
      await this.queueThumbnailGeneration(createdModel.id);
      
      // Return the model data with URLs for UI display
      return {
        ...createdModel,
        urls: {
          glb: glbUrl,
          obj: objUrl,
          stl: stlUrl
        }
      };
      
    } catch (error) {
      console.error('Error in generate and store flow:', error);
      throw error;
    }
  }

  private async queueThumbnailGeneration(modelId: string) {
    try {
      const { error } = await supabase
        .from('thumbnail_processing_queue')
        .insert({
          model_id: modelId,
          priority: 1 // High priority for new models
        });
      
            if (error) {
          console.error('Failed to queue thumbnail generation:', error);
        } else {
          console.log('✅ Thumbnail generation queued for model:', modelId);

          // Immediately invoke the processing function to generate thumbnails
          try {
            const { data, error: invokeError } = await supabase.functions.invoke('process-thumbnail-queue', {
              body: {},
            }) as { data: any; error: any };
            if (invokeError) {
              console.error('Error invoking process-thumbnail-queue:', invokeError);
            } else {
              console.log('process-thumbnail-queue invoked successfully:', data);
            }
          } catch (invokeErr) {
            console.error('Failed to invoke process-thumbnail-queue:', invokeErr);
          }
        }
      } catch (error) {
        console.error('Error queuing thumbnail generation:', error);
      }
    }



  // Image-to-3D helper methods
  private convertImageToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }

  private async createImageTo3DTask(imageDataUri: string, options: Partial<ImageGenerationParams> = {}): Promise<string> {
    const payload = {
      image_url: imageDataUri,
      ai_model: 'meshy-4', // Required for enable_pbr=true
      enable_pbr: options.enable_pbr || false,
      should_remesh: true,
      should_texture: true,
      topology: 'triangle',
      target_polycount: 30000
    };

    console.log('📤 Sending image-to-3D request to Meshy API...');
    const response = await axios.post(`${MESHY_API_BASE}/image-to-3d`, payload, {
      headers: this.headers
    });

    console.log('✅ Image-to-3D task created:', response.data);
    return response.data.result;
  }

  // Image-to-3D generation methods
  async generateModelFromImage(imageFile: File, options: Partial<ImageGenerationParams> = {}): Promise<string> {
    console.log('🖼️ Starting image-to-3D generation with file:', imageFile.name);
    try {
      // Convert image to data URI
      const imageDataUri = await this.convertImageToDataUri(imageFile);
      console.log('✅ Image converted to data URI');
      
      // Create image-to-3D task
      const taskId = await this.createImageTo3DTask(imageDataUri, options);
      console.log('✅ Image-to-3D task created:', taskId);
      
      // Poll for completion using image-specific polling
      const response = await this.waitForImageTaskCompletion(taskId);
      console.log('✅ Image-to-3D generation completed:', response);
      
      if (response.status === 'SUCCEEDED' && response.model_url) {
        return response.model_url;
      }
      
      throw new Error('Image-to-3D generation failed: No model URL returned');
    } catch (error) {
      console.error('❌ Error in image-to-3D generation:', error);
      throw new Error('Failed to generate model from image');
    }
  }

  async generateAndStoreModelFromImage(imageFile: File, userId: string, options: Partial<ImageGenerationParams> = {}): Promise<any> {
    console.log('Starting image-to-3D model generation with file:', imageFile.name);
    try {
      const glbUrl = await this.generateModelFromImage(imageFile, options);
      
      // Generate other format URLs based on GLB URL pattern
      const objUrl = glbUrl.replace('.glb', '.obj');
      const stlUrl = glbUrl.replace('.glb', '.stl');
      
      // Store in Supabase with correct schema
      const modelData = {
        name: `Image: ${imageFile.name}`,
        prompt: `Image: ${imageFile.name}`,
        style: 'image-to-3d',
        obj_url: objUrl,
        stl_url: stlUrl,
        glb_url: glbUrl,
        thumbnail_url: '',
        user_id: userId,
        status: 'completed' as const
      };
      
      console.log('Storing image-to-3D model in Supabase:', modelData);
      const createdModel = await modelService.createModel(modelData);
      console.log('✅ Image-to-3D model stored successfully:', createdModel);
      
      // Return the model data with URLs for UI display
      return {
        ...createdModel,
        urls: {
          glb: glbUrl,
          obj: objUrl,
          stl: stlUrl
        }
      };
      
    } catch (error) {
      console.error('Error in image-to-3D generate and store flow:', error);
      throw error;
    }
  }

  // Image-specific polling method
  private async waitForImageTaskCompletion(taskId: string, maxAttempts = 200): Promise<MeshyResponse> {
    let attempts = 0;
    let lastProgress = 0;
    let stuckCount = 0;
    let lastProgressTime = Date.now();

    while (attempts < maxAttempts) {
      try {
        const { data: response } = await this.checkImageTaskStatus(taskId);
        const { status, progress } = response;
        const currentProgress = progress || 0;
        const now = Date.now();

        if (status === 'FAILED') {
          console.error('❌ Image task failed:', response);
          throw new Error('Image task failed: ' + (response.task_error || 'Unknown error'));
        }

        if (status === 'SUCCEEDED') {
          console.log('✅ Image task completed successfully!');
          return response;
        }

        // Check if progress is stuck
        if (currentProgress === lastProgress) {
          stuckCount++;
          const timeSinceProgress = now - lastProgressTime;
          
          if (stuckCount > 10 && timeSinceProgress > 120000) { // 2 minutes stuck
            console.warn(`⚠️ Progress stuck at ${currentProgress}% for ${Math.round(timeSinceProgress/1000)}s`);
          }
        } else {
          // Progress changed, reset stuck counter
          stuckCount = 0;
          lastProgressTime = now;
          console.log(`📈 Progress increased: ${lastProgress}% → ${currentProgress}%`);
          lastProgress = currentProgress;
        }

        // Adaptive wait times based on progress and stuck status
        let waitTime;
        if (currentProgress >= 99) {
          waitTime = 8000; // 8 seconds for final processing
        } else if (currentProgress >= 90) {
          waitTime = 5000; // 5 seconds for high progress
        } else if (stuckCount > 5) {
          waitTime = 6000; // 6 seconds if stuck
        } else {
          waitTime = 3000; // 3 seconds normal
        }
        
        console.log(`🔄 Image task status: ${status}, Progress: ${currentProgress}%, Attempt: ${attempts + 1}/${maxAttempts}, Wait: ${waitTime/1000}s`);
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error checking image task status (attempt ${attempts + 1}):`, errorMessage);
        attempts++;
        
        // If it's a network error, wait longer before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Don't throw on network errors, just continue trying
        if (attempts >= maxAttempts) {
          throw new Error(`Image task polling failed after ${maxAttempts} attempts. Last error: ${errorMessage}`);
        }
      }
    }

    throw new Error(`Image task timed out after ${maxAttempts} attempts (${Math.round(maxAttempts * 4 / 60)} minutes). Last progress: ${lastProgress}%`);
  }

  async checkGenerationStatus(taskId: string): Promise<MeshyResponse> {
    try {
      const proxyUrl = `${MESHY_API_BASE}/text-to-3d/${taskId}`;
      const response = await axios.get(proxyUrl, { headers: this.headers });
      console.log('Generation status response:', {
        status: response.data.status,
        modelUrl: response.data.model_url,
        rawResponse: JSON.stringify(response.data, null, 2)
      });
      
      if (response.data.status === 'SUCCEEDED') {
        if (response.data.model_url) {
          console.log('Model URL found:', response.data.model_url);
        }
        return response.data;
      }
      
      const status = response.data.status;
      if (status === 'FAILED') {
        throw new Error(`Generation failed: ${response.data.task_error?.message || 'Unknown error'}`);
      }
      return response.data;
    } catch (error) {
      console.error('Error checking generation status:', error);
      throw new Error('Failed to check generation status');
    }
  }
}

export const meshyService = MeshyService.getInstance();
