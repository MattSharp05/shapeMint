import axios from 'axios';

const MESHY_API_KEY = import.meta.env.VITE_MESHY_API_KEY;
const MESHY_API_URL = 'https://api.meshy.ai/v1';

interface MeshyGenerateRequest {
  prompt: string;
  style?: 'realistic' | 'stylized' | 'low-poly';
  negative_prompt?: string;
  format?: 'obj' | 'glb' | 'fbx';
}

interface MeshyGenerateResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  model_url?: string;
  error?: string;
}

export class MeshyAPI {
  private headers: { Authorization: string };

  constructor() {
    if (!MESHY_API_KEY) {
      throw new Error('Meshy API key is not set in environment variables');
    }

    this.headers = {
      Authorization: `Bearer ${MESHY_API_KEY}`
    };
  }

  // Generate a 3D model from text prompt
  async generateFromText(params: MeshyGenerateRequest): Promise<string> {
    try {
      console.log('Generating 3D model with params:', params);
      const response = await axios.post<MeshyGenerateResponse>(
        `${MESHY_API_URL}/text-to-3d`,
        params,
        { headers: this.headers }
      );
      console.log('Generation response:', response.data);
      return response.data.id;
    } catch (error) {
      console.error('Error generating 3D model:', error);
      throw error;
    }
  }

  // Check the status of a generation
  async checkStatus(generationId: string): Promise<MeshyGenerateResponse> {
    try {
      console.log('Checking status for generation:', generationId);
      const response = await axios.get<MeshyGenerateResponse>(
        `${MESHY_API_URL}/generations/${generationId}`,
        { headers: this.headers }
      );
      console.log('Status response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error checking generation status:', error);
      throw error;
    }
  }

  // Download the generated model
  async downloadModel(modelUrl: string): Promise<Blob> {
    try {
      console.log('Downloading model from:', modelUrl);
      const response = await axios.get(modelUrl, {
        headers: this.headers,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading model:', error);
      throw error;
    }
  }
}

export const meshyAPI = new MeshyAPI();
