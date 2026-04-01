/**
 * Service for managing print reference images stored in Supabase.
 * These are photos of real 3D prints used as context for the
 * Print Preview generator (fal.ai Nano Banana Pro).
 */
import { supabase } from '../supabaseClient';

const BUCKET = 'print-references';

export interface PrintReference {
  name: string;
  url: string;
  createdAt: string;
}

class PrintReferenceService {
  /** List all stored reference images */
  async list(): Promise<PrintReference[]> {
    const { data, error } = await supabase.storage.from(BUCKET).list('', {
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
      console.error('Failed to list print references:', error);
      throw new Error(error.message);
    }

    if (!data?.length) return [];

    return data
      .filter((f) => !f.name.startsWith('.'))
      .map((f) => {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(f.name);
        return {
          name: f.name,
          url: urlData.publicUrl,
          createdAt: f.created_at || '',
        };
      });
  }

  /** Upload a reference image */
  async upload(file: File): Promise<PrintReference> {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `ref_${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error('Failed to upload print reference:', error);
      throw new Error(error.message);
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

    return {
      name: fileName,
      url: urlData.publicUrl,
      createdAt: new Date().toISOString(),
    };
  }

  /** Delete a reference image */
  async remove(name: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([name]);
    if (error) {
      console.error('Failed to delete print reference:', error);
      throw new Error(error.message);
    }
  }
}

export const printReferenceService = new PrintReferenceService();
