export interface ModelUrls {
  glb?: string;
  obj?: string;
  stl?: string;
  mtl?: string;
}

export interface ModelOutput {
  type: string;
  urls: ModelUrls;
}

export interface MeshyResponse {
  id: string;
  status: string;
  progress?: number;
  model_url?: string;
  preview_image?: string;
  result?: string;
  task_error?: {
    message: string;
  };
}

export interface GeneratedModel {
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  style?: string;
  obj_url: string;
  stl_url: string;
  glb_url: string;
  mtl_url?: string;
  thumbnail_url?: string;
  thumbnail_angles?: any[];
  thumbnail_selected?: number;
  thumbnail_custom?: boolean;
  thumbnail_status?: 'pending' | 'processing' | 'completed' | 'failed';
  thumbnail_error?: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  mono_quotes?: { vendors: { totalPrice: number; itemPrice: number; shippingPrice: number }[]; currency?: string } | null;
  sls_quotes?: { vendors: { totalPrice: number; itemPrice: number; shippingPrice: number }[]; currency?: string } | null;
  color_quotes?: { vendors: { totalPrice: number; itemPrice: number; shippingPrice: number }[]; currency?: string } | null;
}

export type CreateModelInput = Omit<GeneratedModel, 'id' | 'created_at' | 'updated_at'>;
