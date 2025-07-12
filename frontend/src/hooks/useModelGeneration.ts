import { useState } from 'react';
import { modelService } from '../services/modelService';

interface GenerationState {
  generating: boolean;
  progress: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  generatedModel: string | null;
  generationData: any;
  error: string | null;
}

export function useModelGeneration() {
  const [state, setState] = useState<GenerationState>({
    generating: false,
    progress: 0,
    status: 'pending',
    generatedModel: null,
    generationData: null,
    error: null,
  });

  const generateModel = async (data: { prompt: string; image?: File }) => {
    setState(prev => ({
      ...prev,
      generating: true,
      status: 'generating',
      progress: 0,
      error: null,
    }));

    try {
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: prev.progress < 90 ? prev.progress + 5 : prev.progress,
        }));
      }, 1000);

      const response = await modelService.generate3DModel(data);
      clearInterval(progressInterval);

      if (!response.success) {
        setState(prev => ({
          ...prev,
          status: 'failed',
          error: response.error || 'Failed to generate model',
          progress: 0,
          generating: false,
        }));
        return;
      }

      const modelUrl = response.data.result?.task_id || response.data.task_id || response.data.url;
      
      if (!modelUrl) {
        setState(prev => ({
          ...prev,
          status: 'failed',
          error: 'No model URL received from generation service',
          progress: 0,
          generating: false,
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        generatedModel: modelUrl,
        generationData: {
          ...data,
          modelDetails: response.data,
          taskId: response.data.task_id,
          format: response.data.format || 'GLB',
          polygons: response.data.polygons || 'Unknown',
          fileSize: response.data.file_size || 'Unknown',
        },
        generating: false,
      }));
    } catch (err) {
      console.error('Error during model generation:', err);
      setState(prev => ({
        ...prev,
        status: 'failed',
        error: 'An unexpected error occurred',
        progress: 0,
        generating: false,
      }));
    }
  };

  const reset = () => {
    setState({
      generating: false,
      progress: 0,
      status: 'pending',
      generatedModel: null,
      generationData: null,
      error: null,
    });
  };

  return {
    ...state,
    generateModel,
    reset,
  };
}
