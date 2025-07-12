export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

export interface Design {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  modelUrl: string;
  price: number;
  category: string;
  tags: string[];
  userId: string;
  userName: string;
  downloads: number;
  likes: number;
  createdAt: string;
  featured?: boolean;
}

export interface GenerationRequest {
  id: string;
  prompt?: string;
  imageUrl?: string;
  settings: {
    size: 'small' | 'medium' | 'large';
    style: 'realistic' | 'stylized' | 'minimalist';
    quality: 'draft' | 'standard' | 'high';
  };
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  resultUrl?: string;
  createdAt: string;
}

export interface ManufacturingQuote {
  id: string;
  designId: string;
  vendor: string;
  material: string;
  quantity: number;
  price: number;
  deliveryTime: string;
  specifications: Record<string, any>;
}

export interface Order {
  id: string;
  designId: string;
  quoteId: string;
  status: 'pending' | 'confirmed' | 'manufacturing' | 'shipped' | 'delivered';
  trackingNumber?: string;
  createdAt: string;
}