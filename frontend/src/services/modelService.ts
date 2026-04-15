import { supabase } from '../../supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';

// Type for the Blender mesh repair validation report
export interface RepairReport {
  is_manifold: boolean;
  is_watertight: boolean;
  volume_cm3: number;
  bounding_box_mm: { x: number; y: number; z: number };
  min_wall_thickness_mm: number;
  wall_thickness_passed: boolean;
  repair_steps_applied: string[];
  used_voxel_remesh: boolean;
  applied_solidify: boolean;
  warnings: string[];
  print_ready: boolean;
  processing_time_seconds: number;
  input_face_count: number;
  output_face_count: number;
}

// Type for the response from the generate-3d-model function
export interface GenerationResponse {
  success: boolean;
  data?: {
    taskId: string;
    id: string;
    status: string;
    type: string;
  };
  error?: string;
}

// Type for the response from the check-model-status function
export interface StatusResponse {
  status: 'processing' | 'completed' | 'failed';
  model_url?: string;
  thumbnail_url?: string;
  error?: string;
  progress?: number;
}

// Type for marking a model as complete
export interface MarkCompleteParams {
  taskId: string;
  glb_url: string | null;
  obj_url: string | null;
  note?: string;
}

// Type for the parameters sent to generate3DModel
interface Generate3DModelParams {
  prompt: string;
  type: 'text-to-3d' | 'image-to-3d' | 'multi-image-to-3d';
  image?: string | string[] | File;
  mode?: 'preview' | 'refine';
  userId: string;
  dimensions?: { value: number; unit: string; target: string };
  /**
   * If the caller pre-created a draft model row (Phase 2 anon-first flow),
   * pass it here so the edge function updates that row with the Meshy
   * task id instead of inserting a duplicate.
   */
  modelId?: string | null;
}

// Type for the edge function payload
interface GenerateModelPayload {
  prompt: string;
  user_id: string;
  type: 'text-to-3d' | 'image-to-3d' | 'multi-image-to-3d';
  mode: 'preview' | 'refine';
  image?: string | string[];
  dimensions?: { value: number; unit: string; target: string };
  modelId?: string;
}

export interface ModelService {
  generate3DModel(params: Generate3DModelParams): Promise<GenerationResponse>;
  checkModelStatus(taskId: string, type: 'text-to-3d' | 'image-to-3d' | 'multi-image-to-3d'): Promise<StatusResponse>;
  markModelComplete(params: MarkCompleteParams): Promise<GenerationResponse>;
  publishToMarketplace(params: {
    modelId: string;
    title?: string;
    description?: string;
    price?: number;
    category?: string;
    tags?: string;
    notes?: string;
  }): Promise<{ success: boolean; error?: string; data?: any }>;
  fetchMarketplaceModels(): Promise<any[]>;
}

export const modelService: ModelService = {
  // Calls the generate-3d-model edge function
  async generate3DModel(params: Generate3DModelParams): Promise<GenerationResponse> {
    try {
      const payload: GenerateModelPayload = {
        prompt: params.prompt,
        user_id: params.userId || '00000000-0000-0000-0000-000000000000',
        type: params.type,
        mode: params.mode || 'preview'
      };

      // Add dimensions if provided
      if (params.dimensions) {
        payload.dimensions = params.dimensions;
      }

      // Pass through the pre-created draft model id so the edge function
      // updates rather than inserts.
      if (params.modelId) {
        payload.modelId = params.modelId;
      }

      // Add image for image-to-3d or multi-image-to-3d type
      if ((params.type === 'image-to-3d' || params.type === 'multi-image-to-3d') && params.image) {
        if (Array.isArray(params.image)) {
          // Multi-image: pass array of URLs directly
          payload.image = params.image;
        } else if (typeof params.image === 'string') {
          payload.image = params.image;
        } else {
          // Convert File to data URL
          const reader = new FileReader();
          const imageUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(params.image as File);
          });
          payload.image = imageUrl;
        }
      }

      const { data, error } = await supabase.functions.invoke('generate-3d-model', {
        body: payload
      });

      if (error) {
        console.error('Edge function error:', error);
        if (error instanceof FunctionsHttpError) {
          const errorDetails = await error.context.json();
          console.error('Function returned error details:', errorDetails);
          return { success: false, error: errorDetails.error || errorDetails.message || error.message };
        }
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'No response data received from edge function' };
      }

      return data;
    } catch (error: any) {
      console.error('Model generation error:', error);
      return { success: false, error: error?.message || 'Unknown error occurred' };
    }
  },

  // Calls the check-model-status edge function
  async checkModelStatus(taskId: string, type: 'text-to-3d' | 'image-to-3d' | 'multi-image-to-3d'): Promise<StatusResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('check-model-status', {
        body: { taskId, type }
      });

      if (error) {
        console.error('Status check error:', error);
        if (error instanceof FunctionsHttpError) {
          const errorDetails = await error.context.json();
          console.error('Status check returned error details:', errorDetails);
          return {
            status: 'failed',
            error: errorDetails.error || errorDetails.message || error.message
          };
        }
        return {
          status: 'failed',
          error: error.message
        };
      }

      if (!data) {
        return {
          status: 'failed',
          error: 'No response data received from status check'
        };
      }

      // The edge function wraps the actual response in a `data` object.
      const responseData = data.data as any;

      // Return raw Meshy URLs - ModelViewer will handle proxying
      return {
        status: responseData.status === 'SUCCEEDED' ? 'completed' : responseData.status === 'FAILED' ? 'failed' : 'processing',
        model_url: responseData.model_urls?.glb,
        thumbnail_url: responseData.thumbnail_url,
        error: responseData.error_message,
        progress: responseData.progress
      };
    } catch (error: any) {
      console.error('Status check error:', error);
      return {
        status: 'failed',
        error: error?.message || 'Unknown error occurred'
      };
    }
  },

  // Marks a model as complete with provided URLs
  async markModelComplete(params: MarkCompleteParams): Promise<GenerationResponse> {
    try {
      const { data, error } = await supabase
        .from('generated_models')
        .update({
          status: 'completed',
          glb_url: params.glb_url,
          obj_url: params.obj_url,
          notes: params.note || 'Model generation completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', params.taskId)
        .select();

      if (error) {
        return {
          success: false,
          error: `Failed to mark model complete: ${error.message}`
        };
      }

      if (!data || !data[0]) {
        return {
          success: false,
          error: 'No model found with the given taskId'
        };
      }

      return {
        success: true,
        data: {
          taskId: data[0].id,
          id: data[0].id,
          status: data[0].status,
          type: data[0].type
        }
      };
    } catch (error: any) {
      console.error('Failed to mark model complete:', error);
      return {
        success: false,
        error: error?.message || 'Unknown error occurred'
      };
    }
  },

  async publishToMarketplace(params: {
    modelId: string;
    title?: string;
    description?: string;
    price?: number;
    category?: string;
    tags?: string;
    notes?: string;
  }): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const { modelId, title, description, price, category, tags, notes } = params;
      
      // Build update object - only include fields that are provided
      const updateData: any = {
        is_marketplace_listed: true,
        updated_at: new Date().toISOString()
      };

      // Only update status to 'completed' if it's not already completed
      // Don't change status if it's already 'completed' to preserve existing state
      // But ensure it's at least 'completed' for marketplace listing
      updateData.status = 'completed';

      // Add optional fields if provided
      if (title !== undefined) updateData.name = title;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = price;
      if (category !== undefined) updateData.category = category;
      if (tags !== undefined) updateData.tags = tags;
      if (notes !== undefined) updateData.notes = notes;

      const { data, error } = await supabase
        .from('generated_models')
        .update(updateData)
        .eq('id', modelId)
        .select();

      if (error) {
        console.error('Failed to publish to marketplace:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data?.[0] };
    } catch (error: any) {
      console.error('Marketplace publish error:', error);
      return { success: false, error: error?.message || 'Unknown error occurred' };
    }
  },

  async fetchMarketplaceModels(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('generated_models')
        .select('*')
        .eq('status', 'completed')
        .eq('is_marketplace_listed', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch marketplace models:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Marketplace fetch error:', error);
      throw error;
    }
  }
};

// ── Draft model helpers ────────────────────────────────────────────────
// Phase 2 of the anon-first flow: a model row is created as soon as the
// user starts generating 2D variations, not only when the 3D job starts.
// This gives anonymous users a resumable entry in their dashboard and
// lets us attribute 2D gens to a user_id.
//
// All writes rely on RLS: user_id is set from auth.uid() via the calling
// session, not passed explicitly.

export type ModelStage =
  | 'uploaded'
  | 'variations_ready'
  | 'reference_selected'
  | 'angles_ready'
  | 'generating_3d'
  | 'model_ready'
  | 'ordered'
  | 'failed';

export const draftModel = {
  /**
   * Create an empty draft row owned by the current auth user. Returns the
   * new row id or null on failure. Callers should check `user` is present
   * (real or anon) before calling.
   */
  async create(userId: string, sourceImageUrl?: string | null): Promise<string | null> {
    const payload: Record<string, any> = {
      user_id: userId,
      stage: 'uploaded',
      status: 'processing',
      type: 'image-to-3d',
      mode: 'preview',
    };
    if (sourceImageUrl) payload.source_image_url = sourceImageUrl;

    const { data, error } = await supabase
      .from('generated_models')
      .insert(payload)
      .select('id')
      .single();
    if (error) {
      console.error('draftModel.create failed:', error);
      return null;
    }
    return data?.id ?? null;
  },

  async patch(modelId: string, patch: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('generated_models')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', modelId);
    if (error) console.error('draftModel.patch failed:', error);
  },

  async recordVariation(modelId: string, index: number, url: string, totalSlots = 4): Promise<void> {
    // Read-modify-write is fine here — writes are infrequent and per-user.
    const { data: row } = await supabase
      .from('generated_models')
      .select('variation_urls, thumbnail_url')
      .eq('id', modelId)
      .single();
    const existing: (string | null)[] = Array.isArray(row?.variation_urls)
      ? (row!.variation_urls as (string | null)[])
      : new Array(totalSlots).fill(null);
    existing[index] = url;

    const patch: Record<string, any> = { variation_urls: existing };
    // First completed variation becomes the dashboard thumbnail.
    if (!row?.thumbnail_url) patch.thumbnail_url = url;

    const filledCount = existing.filter(Boolean).length;
    if (filledCount >= totalSlots) patch.stage = 'variations_ready';

    await draftModel.patch(modelId, patch);
  },

  async recordSelectedVariation(modelId: string, url: string): Promise<void> {
    await draftModel.patch(modelId, {
      thumbnail_url: url,
      stage: 'reference_selected',
    });
  },

  async recordAngle(modelId: string, index: number, url: string, totalSlots = 4): Promise<void> {
    const { data: row } = await supabase
      .from('generated_models')
      .select('angle_urls')
      .eq('id', modelId)
      .single();
    const existing: (string | null)[] = Array.isArray(row?.angle_urls)
      ? (row!.angle_urls as (string | null)[])
      : new Array(totalSlots).fill(null);
    existing[index] = url;

    const patch: Record<string, any> = { angle_urls: existing };
    const filledCount = existing.filter(Boolean).length;
    if (filledCount >= totalSlots) patch.stage = 'angles_ready';

    await draftModel.patch(modelId, patch);
  },
};