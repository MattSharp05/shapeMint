// src/services/thumbnailService.ts
import { supabase } from '../../supabaseClient';

interface ThumbnailRequest {
  modelId: string;
  glbUrl: string;
  angles?: (number | string)[];
  quality?: 'fast' | 'high';
}

interface ThumbnailResult {
  modelId: string;
  angles: {
    [key: string]: string; // URL to thumbnail
  };
  selectedAngle: number | string;
  error?: string;
}

export const thumbnailService = {
  async generateThumbnails({ 
    modelId, 
    glbUrl, 
    angles = [0, 45, 90, 135, 'isometric'], 
    quality = 'fast' 
  }: ThumbnailRequest): Promise<ThumbnailResult> {
    try {
      console.log('🎨 Calling generate-thumbnail Edge function:', {
        modelId,
        glbUrl,
        angles,
        quality
      });

      const { data: { session } } = await supabase.auth.getSession();
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-thumbnail`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
      }

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          modelId,
          glbUrl,
          angles,
          quality
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Thumbnail Edge function error:', errorData);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Thumbnails generated successfully:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error generating thumbnails:', error);
      
      // Return fallback thumbnails on error
      const fallbackAngles: { [key: string]: string } = {};
      angles.forEach(angle => {
        fallbackAngles[angle.toString()] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
          <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f3f4f6"/>
            <text x="200" y="150" text-anchor="middle" font-family="Arial" font-size="16" fill="#6b7280">
              Thumbnail Error
            </text>
          </svg>
        `)}`;
      });

      return {
        modelId,
        angles: fallbackAngles,
        selectedAngle: angles[0] || 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};
