import { supabase } from '../supabaseClient';
import { ThumbnailGenerator, DEFAULT_CAMERA_ANGLES } from './thumbnailGenerator';

interface ModelNeedingThumbnail {
  id: string;
  glb_url: string;
  name: string;
  thumbnail_status: string | null;
  thumbnail_url: string | null;
}

interface AutoThumbnailProgress {
  total: number;
  processed: number;
  current: string | null;
  isGenerating: boolean;
  error: string | null;
}

export class AutoThumbnailService {
  private isProcessing = false;
  private progressCallback?: (progress: AutoThumbnailProgress) => void;
  private abortController?: AbortController;

  /**
   * Find models that need thumbnail generation
   */
  async findModelsNeedingThumbnails(userId: string): Promise<ModelNeedingThumbnail[]> {
    console.log('🔍 Scanning for models needing thumbnails for user:', userId);
    
    const { data: models, error } = await supabase
      .from('generated_models')
      .select('id, glb_url, name, thumbnail_status, thumbnail_url')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('glb_url', 'is', null);

    if (error) {
      console.error('❌ Error fetching models:', error);
      throw new Error(`Failed to fetch models: ${error.message}`);
    }

    console.log(`📊 Found ${models?.length || 0} completed models with GLB URLs`);
    
    if (models) {
      models.forEach(model => {
        console.log(`🔍 Model ${model.id}:`, {
          name: model.name,
          thumbnail_status: model.thumbnail_status,
          thumbnail_url: model.thumbnail_url ? model.thumbnail_url.substring(0, 50) + '...' : null,
          has_glb: !!model.glb_url
        });
      });
    }

    // Filter out models that have actual thumbnails (not placeholder SVGs or generic images)
    const modelsNeedingThumbnails = (models || []).filter(model => {
      if (!model.thumbnail_url) {
        console.log(`✅ Model ${model.id} needs thumbnail: no thumbnail_url`);
        return true;
      }
      
      // Check if it's a placeholder SVG, generic image, or needs regeneration
      const isPlaceholder = model.thumbnail_url.includes('data:image/svg+xml') || 
                           model.thumbnail_url.includes('placeholder') ||
                           model.thumbnail_url.includes('Model model') ||
                           model.thumbnail_status === 'pending' ||
                           model.thumbnail_status === null ||
                           model.thumbnail_status === 'failed';
      
      if (isPlaceholder) {
        console.log(`✅ Model ${model.id} needs thumbnail: is placeholder/failed`);
      } else {
        console.log(`❌ Model ${model.id} already has thumbnail`);
      }
      
      return isPlaceholder;
    });

    console.log(`📋 Found ${modelsNeedingThumbnails.length} models needing thumbnails`);
    return modelsNeedingThumbnails;
  }

  /**
   * Generate thumbnail for a single model using isometric view
   */
  async generateThumbnailForModel(model: ModelNeedingThumbnail): Promise<string> {
    console.log(`🎨 Generating thumbnail for model: ${model.name || model.id}`);
    
    try {
      // Create thumbnail generator
      const generator = new ThumbnailGenerator({
        width: 400,
        height: 300
      });

      // Find isometric angle from defaults
      const isometricAngle = DEFAULT_CAMERA_ANGLES.find(angle => angle.name === 'isometric');
      if (!isometricAngle) {
        throw new Error('Isometric camera angle not found');
      }

      // Generate thumbnails (we only need isometric, but the generator expects an array)
      const thumbnails = await generator.generateAllThumbnails(
        model.glb_url,
        [isometricAngle]
      );

      const thumbnailDataUrl = thumbnails.isometric;
      if (!thumbnailDataUrl) {
        throw new Error('Failed to generate isometric thumbnail');
      }

      // Update model in database
      const { error: updateError } = await supabase
        .from('generated_models')
        .update({
          thumbnail_url: thumbnailDataUrl,
          thumbnail_angles: { isometric: thumbnailDataUrl },
          thumbnail_selected: 'isometric',
          thumbnail_status: 'completed',
          thumbnail_custom: false
        })
        .eq('id', model.id);

      if (updateError) {
        throw new Error(`Failed to update model: ${updateError.message}`);
      }

      console.log(`✅ Thumbnail generated and saved for model: ${model.id}`);
      return thumbnailDataUrl;

    } catch (error) {
      console.error(`❌ Error generating thumbnail for model ${model.id}:`, error);
      
      // Update model with error status
      await supabase
        .from('generated_models')
        .update({
          thumbnail_status: 'failed',
          thumbnail_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', model.id);

      throw error;
    }
  }

  /**
   * Process all models needing thumbnails for a user
   */
  async autoGenerateThumbnails(
    userId: string,
    onProgress?: (progress: AutoThumbnailProgress) => void
  ): Promise<void> {
    // Temporarily disabled to prevent proxy server errors
    console.log('ℹ️ Auto thumbnail generation temporarily disabled');
    return;

    if (this.isProcessing) {
      console.log('⏳ Auto-thumbnail generation already in progress');
      return;
    }

    this.isProcessing = true;
    this.progressCallback = onProgress;
    this.abortController = new AbortController();

    try {
      const models = await this.findModelsNeedingThumbnails(userId);
      
      if (models.length === 0) {
        console.log('✅ No models need thumbnail generation');
        this.notifyProgress({
          total: 0,
          processed: 0,
          current: null,
          isGenerating: false,
          error: null
        });
        return;
      }

      console.log(`🚀 Starting auto-thumbnail generation for ${models.length} models`);
      
      let processed = 0;
      const total = models.length;

      for (const model of models) {
        // Check if operation was aborted
        if (this.abortController.signal.aborted) {
          console.log('🛑 Auto-thumbnail generation aborted');
          break;
        }

        this.notifyProgress({
          total,
          processed,
          current: model.name || model.id,
          isGenerating: true,
          error: null
        });

        try {
          await this.generateThumbnailForModel(model);
          processed++;
          
          console.log(`📈 Progress: ${processed}/${total} thumbnails generated`);
          
          // Small delay to prevent overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ Failed to generate thumbnail for model ${model.id}:`, error);
          // Continue processing other models even if one fails
        }
      }

      this.notifyProgress({
        total,
        processed,
        current: null,
        isGenerating: false,
        error: null
      });

      console.log(`🎉 Auto-thumbnail generation completed: ${processed}/${total} successful`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('💥 Auto-thumbnail generation failed:', errorMessage);
      
      this.notifyProgress({
        total: 0,
        processed: 0,
        current: null,
        isGenerating: false,
        error: errorMessage
      });
    } finally {
      this.isProcessing = false;
      this.progressCallback = undefined;
      this.abortController = undefined;
    }
  }

  /**
   * Stop the auto-generation process
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Check if auto-generation is currently running
   */
  get isRunning(): boolean {
    return this.isProcessing;
  }

  private notifyProgress(progress: AutoThumbnailProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }
}

// Export singleton instance
export const autoThumbnailService = new AutoThumbnailService();
