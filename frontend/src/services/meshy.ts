import axios from 'axios';
import { storageService } from './storage';
import { MeshyResponse } from '../types/model';

const MESHY_API_URL = 'https://api.meshy.ai/openapi/v2';

interface MeshyGenerationParams {
  prompt: string;
  style?: string;
  negative_prompt?: string;
  seed?: number;
}

export class MeshyService {
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
      const previewResponse = await axios.post('/api/meshy/text-to-3d', {
        mode: 'preview',
        prompt: params.prompt,
        style: params.style || 'base',
        negative_prompt: params.negative_prompt || '',
        seed: params.seed || Math.floor(Math.random() * 1000000),
        enable_pbr: false
      });

      console.log('Preview task creation response:', previewResponse.data);
      const previewTaskId = previewResponse.data.result;
      if (!previewTaskId) {
        console.error('No preview task ID in response:', previewResponse.data);
        throw new Error('No preview task ID returned from API');
      }

      // Step 2: Poll preview task until complete
      let previewStatus;
      let attempts = 0;
      const maxAttempts = 30; // 1 minute timeout (2s * 30)

      do {
        const statusResponse = await axios.get(`/api/meshy/text-to-3d/${previewTaskId}`);
        console.log('Preview status response:', statusResponse.data);

        const { status, progress, task_error } = statusResponse.data;
        previewStatus = status;

        if (status === 'FAILED') {
          const errorMsg = task_error?.message || 'Unknown error';
          console.error('Preview task failed:', errorMsg);
          throw new Error(`Preview failed: ${errorMsg}`);
        }

        if (status === 'SUCCEEDED') {
          console.log('Full preview response:', JSON.stringify(statusResponse.data, null, 2));
          
          // For preview tasks, we need to get the preview image
          const previewImage = statusResponse.data.preview_image || statusResponse.data.result;
          if (!previewImage) {
            console.error('No preview image in response:', statusResponse.data);
            throw new Error('Preview completed but no preview image found');
          }

          console.log('Preview task succeeded:', { taskId: previewTaskId, previewImage });
          return { taskId: previewTaskId, modelUrl: previewImage };
        }

        console.log(`Preview status: ${status}, Progress: ${progress || 0}%, Attempt: ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;

        if (attempts >= maxAttempts) {
          console.error('Preview task timed out after', maxAttempts * 2, 'seconds');
          throw new Error('Preview generation timed out');
        }
      } while (previewStatus === 'PENDING' || previewStatus === 'IN_PROGRESS');

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
      
      const refineResponse = await axios.post('/api/meshy/text-to-3d', {
        mode: 'refine',
        preview_task_id: preview.taskId,
        enable_pbr: false
      });

      const refineTaskId = refineResponse.data.result;
      if (!refineTaskId) {
        throw new Error('No refine task ID returned from API');
      }

      // Poll refine task until complete
      let response: MeshyResponse;
      do {
        const statusResponse = await axios.get(`/api/meshy/text-to-3d/${refineTaskId}`);
        response = statusResponse.data;

        if (response.status === 'FAILED') {
          throw new Error(`Refine failed: ${response.task_error?.message || 'Unknown error'}`);
        }

        if (response.status === 'SUCCEEDED' && response.model_url) {
          return response.model_url;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      } while (response.status === 'PENDING' || response.status === 'IN_PROGRESS');

      throw new Error('Refine task incomplete');
    } catch (error) {
      console.error('Error in generate model:', error);
      throw new Error('Failed to generate model');
    }
  }

  async generateAndStoreModel(params: MeshyGenerationParams, userId: string): Promise<void> {
    console.log('Starting model generation with params:', params);
    try {
      const glbUrl = await this.generateModel(params);
      const objUrl = glbUrl.replace('.glb', '.obj');
      const stlUrl = glbUrl.replace('.glb', '.stl');
      
      const modelId = glbUrl.split('/').pop()?.split('.')[0] || Date.now().toString();
      const objBlob = await this.downloadModel(objUrl);
      const stlBlob = await this.downloadModel(stlUrl);
      const glbBlob = await this.downloadModel(glbUrl);

      const objStorageUrl = await storageService.uploadModelFile(modelId, 'obj', objBlob);
      const stlStorageUrl = await storageService.uploadModelFile(modelId, 'stl', stlBlob);
      const glbStorageUrl = await storageService.uploadModelFile(modelId, 'glb', glbBlob);

      await storageService.saveModelToDatabase(
        userId,
        `Model ${modelId.slice(0, 8)}`,
        params.prompt,
        params.style || 'base',
        { obj: objStorageUrl, stl: stlStorageUrl, glb: glbStorageUrl }
      );
    } catch (error) {
      console.error('Error in generate and store flow:', error);
      throw error;
    }
  }

  private async downloadModel(modelUrl: string): Promise<Blob> {
    try {
      const response = await axios.get(`/api/meshy/download?url=${encodeURIComponent(modelUrl)}`, {
        responseType: 'blob',
        maxRedirects: 5,
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading model:', error);
      throw new Error('Failed to download model');
    }
  }

  async checkGenerationStatus(taskId: string): Promise<MeshyResponse> {
    try {
      const response = await axios.get(`${MESHY_API_URL}/text-to-3d/${taskId}`, { headers: this.headers });
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
