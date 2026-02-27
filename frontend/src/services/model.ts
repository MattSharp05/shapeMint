import { supabase } from '../supabaseClient';
import type { GeneratedModel, CreateModelInput } from '../types/model';

const MODELS_TABLE = 'generated_models';
const MODELS_BUCKET = 'model-files';

export class ModelService {
  // Create a new model entry
  async createModel(input: CreateModelInput): Promise<GeneratedModel> {
    // Log to verify RLS match
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    // User ID verification logging removed for security

    const { data, error } = await supabase
      .from(MODELS_TABLE)
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Error creating model:', error);
      throw error;
    }

    return data;
  }

  // Get models for a user
  async getUserModels(userId: string): Promise<GeneratedModel[]> {
    const { data, error } = await supabase
      .from(MODELS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user models:', error);
      throw error;
    }

    return data || [];
  }

  // Get a single model by ID
  async getModel(modelId: string): Promise<GeneratedModel | null> {
    const { data, error } = await supabase
      .from(MODELS_TABLE)
      .select('*')
      .eq('id', modelId)
      .single();

    if (error) {
      console.error('Error fetching model:', error);
      throw error;
    }

    return data;
  }

  // Update model status
  async updateModelStatus(modelId: string, status: GeneratedModel['status']): Promise<void> {
    const { error } = await supabase
      .from(MODELS_TABLE)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', modelId);

    if (error) {
      console.error('Error updating model status:', error);
      throw error;
    }
  }

  // Upload model file
  async uploadModelFile(modelId: string, fileType: 'obj' | 'stl' | 'glb', file: File): Promise<string> {
    const filePath = `${modelId}/${fileType}`;
    const { error } = await supabase.storage
      .from(MODELS_BUCKET)
      .upload(filePath, file);

    if (error) {
      console.error(`Error uploading ${fileType} file:`, error);
      throw error;
    }

    // Get public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from(MODELS_BUCKET)
      .getPublicUrl(filePath);

    return publicUrl;
  }

  // Delete model and its files
  async deleteModel(modelId: string): Promise<void> {
    // First delete files from storage
    const { error: storageError } = await supabase.storage
      .from(MODELS_BUCKET)
      .remove([
        `${modelId}/obj`,
        `${modelId}/stl`,
        `${modelId}/glb`
      ]);

    if (storageError) {
      console.error('Error deleting model files:', storageError);
      throw storageError;
    }

    // Then delete database entry
    const { error: dbError } = await supabase
      .from(MODELS_TABLE)
      .delete()
      .eq('id', modelId);

    if (dbError) {
      console.error('Error deleting model record:', dbError);
      throw dbError;
    }
  }
}

export const modelService = new ModelService();
