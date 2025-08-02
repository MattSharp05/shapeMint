import { supabase } from "../supabaseClient";

export class StorageService {
  private static instance: StorageService;
  private readonly BUCKET_NAME = 'model-files';

  private constructor() {}

  public static getInstance(): StorageService {
    if (!this.instance) {
      this.instance = new StorageService();
    }
    return this.instance;
  }

  async uploadModelFile(modelId: string, fileType: 'obj' | 'stl' | 'glb', file: Blob): Promise<string> {
    const fileName = `${modelId}/${fileType}`;
    
    // Check auth status
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current auth session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      role: session?.user?.role
    });
    
    // Upload file to storage bucket
    console.log(`Uploading ${fileType} file to ${this.BUCKET_NAME}/${fileName}`);
    const { error: uploadError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(fileName, file);

    if (uploadError) {
      console.error(`Error uploading ${fileType} file:`, uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(fileName);

    return publicUrl;
  }

  async saveModelToDatabase(
    userId: string, 
    name: string, 
    prompt: string, 
    style: string | undefined,
    urls: {
      obj: string;
      stl: string;
      glb: string;
    }
  ): Promise<void> {
    console.log('Saving model metadata to Supabase database...');
    const { error } = await supabase
      .from('generated_models')
      .insert({
        user_id: userId,
        name,
        prompt,
        style,
        obj_url: urls.obj,
        stl_url: urls.stl,
        glb_url: urls.glb,
        status: 'completed'
      });
    console.log('Successfully saved model metadata to Supabase database');

    if (error) {
      console.error('Error saving model to database:', error);
      throw error;
    }
  }

  /**
   * Upload custom thumbnail for marketplace listing
   */
  async uploadCustomThumbnail(listingId: string, file: File): Promise<string> {
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `marketplace_thumbnails/${listingId}/custom.${fileExtension}`;
    
    console.log(`Uploading custom thumbnail to ${this.BUCKET_NAME}/${fileName}`);
    
    const { error: uploadError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading custom thumbnail:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(fileName);

    return publicUrl;
  }
}

export const storageService = StorageService.getInstance();
