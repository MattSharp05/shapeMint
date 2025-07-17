export interface GenerationFormData {
  prompt: string;
  style?: string;
  negativePrompt?: string;
  seed?: number;
  size?: 'small' | 'medium' | 'large';
  format?: 'obj' | 'glb' | 'fbx';
}

export interface GenerationResult {
  modelUrl: string;
  format: string;
  size: string;
  polygons: number;
  fileSize: number;
}
