import { useState, useEffect, useRef } from 'react';
import { modelService } from '../services/modelService';

interface GenerationState {
  generating: boolean;
  progress: number;
  status: 'pending' | 'generating' | 'polling' | 'completed' | 'failed';
  type: 'image-to-3d' | 'text-to-3d' | null;
  generatedModelUrl: string | null;
  error: string | null;
}

export function useModelGeneration() {
  const [state, setState] = useState<GenerationState>({
    generating: false,
    progress: 0,
    status: 'pending',
    type: null,
    generatedModelUrl: null,
    error: null,
  });

  const pollingRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = (taskId: string, type: 'image-to-3d' | 'text-to-3d') => {
    stopPolling(); // Ensure no multiple polls are running

    pollingRef.current = window.setInterval(async () => {
      try {
        const response = await modelService.checkModelStatus(taskId, type);

        if (response.status === 'completed') {
          stopPolling();
          setState(prev => ({
            ...prev,
            generating: false,
            status: 'completed',
            progress: 100,
            generatedModelUrl: response.model_url,
          }));
        } else if (response.status === 'failed') {
          stopPolling();
          setState(prev => ({
            ...prev,
            generating: false,
            status: 'failed',
            error: response.error || 'Model generation failed.',
          }));
        } else {
          // Still processing, update progress
          setState(prev => ({
            ...prev,
            status: 'polling',
            progress: response.progress || prev.progress, // Use progress from backend if available
          }));
        }
      } catch (error: any) {
        stopPolling();
        setState(prev => ({
          ...prev,
          generating: false,
          status: 'failed',
          error: error.message || 'Failed to check model status.',
        }));
      }
    }, 5000); // Poll every 5 seconds
  };

  const generateModel = async (data: { prompt: string; image?: File }) => {
    const generationType = data.image ? 'image-to-3d' : 'text-to-3d';
    setState({
      generating: true,
      status: 'generating',
      type: generationType,
      progress: 0,
      error: null,
      generatedModelUrl: null,
    });

    try {
      const response = await modelService.generate3DModel(data);
      
      if (!response.success || !response.taskId) {
        setState(prev => ({
          ...prev,
          generating: false,
          status: 'failed',
          error: response.error || 'Failed to start model generation.',
        }));
        return;
      }

      // Start polling for the task ID
      startPolling(response.taskId, generationType);
      setState(prev => ({
        ...prev,
        status: 'polling',
        progress: 10, // Initial progress after starting
      }));

    } catch (err: any) {
      setState(prev => ({
        ...prev,
        generating: false,
        status: 'failed',
        error: err.message || 'An unexpected error occurred during generation.',
      }));
    }
  };

  const reset = () => {
    stopPolling();
    setState({
      generating: false,
      progress: 0,
      status: 'pending',
      type: null,
      generatedModelUrl: null,
      error: null,
    });
  };

  // Cleanup effect to stop polling when the component unmounts
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    ...state,
    generateModel,
    reset,
  };
}
