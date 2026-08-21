import { supabase } from '../supabaseClient';

export interface DownloadableFile {
  name: string;
  url: string;
  type: 'stl' | 'obj' | 'glb';
  size?: string;
}

export class DownloadService {
  private static instance: DownloadService;

  private constructor() {}

  public static getInstance(): DownloadService {
    if (!this.instance) {
      this.instance = new DownloadService();
    }
    return this.instance;
  }

  /**
   * Download a file from a URL
   */
  async downloadFile(url: string, filename: string): Promise<void> {
    try {
      console.log(`Downloading file: ${filename} from ${url}`);
      
      // Check if this is a Meshy URL that needs to go through our proxy
      let downloadUrl = url;
      
      if (url.includes('assets.meshy.ai') || url.includes('meshy.ai')) {
        // Use our proxy for Meshy URLs to avoid CORS issues in both dev and production
        // In production, this will be handled by Vercel's API routes
        downloadUrl = `/api/meshy/glb?url=${encodeURIComponent(url)}`;
        console.log(`Using proxy for Meshy URL: ${downloadUrl}`);
      }
      
      // Create a temporary anchor element
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.target = '_blank';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`✅ File download initiated: ${filename}`);
    } catch (error) {
      console.error(`❌ Download failed for ${filename}:`, error);
      throw new Error(`Failed to download ${filename}`);
    }
  }

  /**
   * Download an image by fetching it as a blob, so the browser saves it
   * instead of navigating to it. Falls back to opening the URL in a new
   * tab if the fetch fails (CORS, network, etc.).
   */
  async downloadImage(url: string, filename: string): Promise<void> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn(`Blob download failed for ${filename}, opening in new tab:`, err);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Download multiple files for a model
   */
  async downloadModelFiles(modelData: {
    modelUrl?: string;
    stlUrl?: string;
    objUrl?: string;
    glbUrl?: string;
    designTitle?: string;
  }): Promise<void> {
    const { modelUrl, stlUrl, objUrl, glbUrl, designTitle } = modelData;
    const baseName = designTitle || '3d-model';
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    
    const files: DownloadableFile[] = [];
    
    // Add available files
    if (stlUrl) {
      files.push({ name: `${sanitizedName}.stl`, url: stlUrl, type: 'stl' });
    }
    if (objUrl) {
      files.push({ name: `${sanitizedName}.obj`, url: objUrl, type: 'obj' });
    }
    if (glbUrl) {
      files.push({ name: `${sanitizedName}.glb`, url: glbUrl, type: 'glb' });
    }
    if (modelUrl && !stlUrl && !objUrl && !glbUrl) {
      // Fallback to modelUrl if no specific format URLs
      const extension = this.getFileExtension(modelUrl);
      files.push({ name: `${sanitizedName}.${extension}`, url: modelUrl, type: extension as any });
    }

    if (files.length === 0) {
      throw new Error('No downloadable files found for this model');
    }

    console.log(`📦 Downloading ${files.length} files for model: ${sanitizedName}`);
    
    // Download each file
    for (const file of files) {
      try {
        await this.downloadFile(file.url, file.name);
        // Small delay between downloads to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to download ${file.name}:`, error);
        // Continue with other files even if one fails
      }
    }
    
    console.log(`✅ All files downloaded for model: ${sanitizedName}`);
  }

  /**
   * Get file extension from URL
   */
  private getFileExtension(url: string): string {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
    return match ? match[1].toLowerCase() : 'glb';
  }

  /**
   * Check if a URL is accessible
   */
  async checkFileAccessibility(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error(`File accessibility check failed for ${url}:`, error);
      return false;
    }
  }
}

export const downloadService = DownloadService.getInstance(); 