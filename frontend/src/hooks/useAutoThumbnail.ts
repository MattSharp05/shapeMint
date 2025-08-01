import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { autoThumbnailService } from '../services/autoThumbnailService';

interface AutoThumbnailProgress {
  total: number;
  processed: number;
  current: string | null;
  isGenerating: boolean;
  error: string | null;
}

interface UseAutoThumbnailOptions {
  triggerOnMount?: boolean;
  triggerOnUserChange?: boolean;
}

export function useAutoThumbnail(options: UseAutoThumbnailOptions = {}) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<AutoThumbnailProgress>({
    total: 0,
    processed: 0,
    current: null,
    isGenerating: false,
    error: null
  });

  const triggerAutoGeneration = useCallback(async () => {
    if (!user?.id) {
      console.log('👤 No user logged in, skipping auto-thumbnail generation');
      return;
    }

    console.log('🎯 Triggering auto-thumbnail generation for user:', user.id);
    console.log('🎯 User email:', user.email);
    
    try {
      await autoThumbnailService.autoGenerateThumbnails(user.id, setProgress);
      console.log('✅ Auto-thumbnail generation completed successfully');
    } catch (error) {
      console.error('💥 Auto-thumbnail generation failed:', error);
      setProgress(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Generation failed'
      }));
    }
  }, [user?.id]);

  const stopGeneration = useCallback(() => {
    console.log('🛑 Stopping auto-thumbnail generation');
    autoThumbnailService.abort();
    setProgress(prev => ({
      ...prev,
      isGenerating: false,
      current: null
    }));
  }, []);

  // Trigger on mount if enabled
  useEffect(() => {
    if (options.triggerOnMount && user?.id) {
      console.log('🔄 Auto-triggering thumbnail generation on mount for user:', user.id);
      triggerAutoGeneration();
    }
  }, [options.triggerOnMount, user?.id, triggerAutoGeneration]);

  // Trigger on user change if enabled
  useEffect(() => {
    if (options.triggerOnUserChange && user?.id) {
      console.log('👤 Auto-triggering thumbnail generation on user change for user:', user.id);
      triggerAutoGeneration();
    }
  }, [options.triggerOnUserChange, user?.id, triggerAutoGeneration]);

  return {
    progress,
    isGenerating: progress.isGenerating,
    triggerAutoGeneration,
    stopGeneration,
    hasModelsToProcess: progress.total > 0,
    completionPercentage: progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0
  };
}
