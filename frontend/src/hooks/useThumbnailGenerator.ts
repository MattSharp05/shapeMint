import { useState, useCallback, useRef } from 'react';
import { ThumbnailGenerator, DEFAULT_CAMERA_ANGLES, CameraAngle } from '../services/thumbnailGenerator';
import { supabase } from '../lib/supabase';

interface UseThumbnailGeneratorOptions {
  width?: number;
  height?: number;
  quality?: number;
  uploadToStorage?: boolean;
}

interface ThumbnailGenerationState {
  isGenerating: boolean;
  progress: { [angleName: string]: boolean };
  thumbnails: { [angleName: string]: string };
  error: string | null;
  completed: boolean;
}

export function useThumbnailGenerator(options: UseThumbnailGeneratorOptions = {}) {
  const [state, setState] = useState<ThumbnailGenerationState>({
    isGenerating: false,
    progress: {},
    thumbnails: {},
    error: null,
    completed: false
  });

  const generatorRef = useRef<ThumbnailGenerator | null>(null);

  const generateThumbnails = useCallback(async (
    modelUrl: string,
    modelId: string,
    angles: CameraAngle[] = DEFAULT_CAMERA_ANGLES
  ) => {
    try {
      setState(prev => ({
        ...prev,
        isGenerating: true,
        progress: {},
        thumbnails: {},
        error: null,
        completed: false
      }));

      // Create thumbnail generator
      generatorRef.current = new ThumbnailGenerator({
        width: options.width || 400,
        height: options.height || 300
      });

      // Generate thumbnails with progress tracking
      const thumbnails = await generatorRef.current.generateAllThumbnails(
        modelUrl,
        angles,
        (angleName, dataUrl) => {
          setState(prev => ({
            ...prev,
            progress: { ...prev.progress, [angleName]: true },
            thumbnails: { ...prev.thumbnails, [angleName]: dataUrl }
          }));
        }
      );

      let finalThumbnails = thumbnails;

      // Upload to storage if requested
      if (options.uploadToStorage && generatorRef.current) {
        console.log('📤 Uploading thumbnails to Supabase Storage...');
        finalThumbnails = await generatorRef.current.uploadThumbnails(modelId, thumbnails);
        console.log('✅ Thumbnails uploaded successfully');
      }

      // Update database with thumbnail URLs
      const { error: dbError } = await supabase
        .from('generated_models')
        .update({
          thumbnail_url: finalThumbnails[angles[0]?.name] || Object.values(finalThumbnails)[0],
          thumbnail_angles: finalThumbnails,
          thumbnail_selected: angles[0]?.name || Object.keys(finalThumbnails)[0],
          thumbnail_status: 'completed',
          thumbnail_custom: false
        })
        .eq('id', modelId);

      if (dbError) {
        console.error('Failed to update model with thumbnails:', dbError);
      }

      setState(prev => ({
        ...prev,
        isGenerating: false,
        thumbnails: finalThumbnails,
        completed: true
      }));

      return finalThumbnails;

    } catch (error) {
      console.error('Error generating thumbnails:', error);
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to generate thumbnails',
        completed: false
      }));
      throw error;
    } finally {
      // Clean up Three.js resources
      if (generatorRef.current) {
        generatorRef.current.dispose();
        generatorRef.current = null;
      }
    }
  }, [options.width, options.height, options.uploadToStorage]);

  const resetState = useCallback(() => {
    setState({
      isGenerating: false,
      progress: {},
      thumbnails: {},
      error: null,
      completed: false
    });
  }, []);

  return {
    ...state,
    generateThumbnails,
    resetState
  };
}
