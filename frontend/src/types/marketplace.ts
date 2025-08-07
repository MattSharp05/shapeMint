// src/types/marketplace.ts
// TypeScript interfaces for marketplace functionality

export interface MarketplaceListing {
  id: string;
  model_id: string;
  user_id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  tags: string[];
  notes: string | null;
  selected_thumbnail_url: string | null;
  selected_thumbnail_angle: string | null;
  is_custom_thumbnail: boolean;
  is_published: boolean;
  published_at: string | null;
  views_count: number;
  downloads_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
  // Joined data from generated_models
  glb_url?: string;
  obj_url?: string;
  stl_url?: string;
  prompt?: string;
  // User data for future multi-user marketplace
  username?: string;
  display_name?: string;
}

export interface MarketplaceListingFormData {
  title: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  notes: string;
  selectedThumbnailUrl: string;
  selectedThumbnailAngle: string;
  isCustomThumbnail: boolean;
}

export interface CreateMarketplaceListingParams {
  modelId: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  tags?: string[];
  notes?: string;
  selectedThumbnailUrl?: string;
  selectedThumbnailAngle?: string;
  isCustomThumbnail?: boolean;
}

export interface UpdateMarketplaceListingParams {
  listingId: string;
  updates: Partial<Omit<MarketplaceListingFormData, 'selectedThumbnailUrl' | 'selectedThumbnailAngle' | 'isCustomThumbnail'>> & {
    selectedThumbnailUrl?: string;
    selectedThumbnailAngle?: string;
    isCustomThumbnail?: boolean;
  };
}

// Categories for marketplace listings
export const MARKETPLACE_CATEGORIES = [
  'Home & Garden',
  'Art & Decor', 
  'Accessories',
  'Lighting',
  'Office',
  'Toys & Games',
  'Jewelry',
  'Tools & Hardware',
  'Fashion',
  'Electronics',
  'Other'
] as const;

export type MarketplaceCategory = typeof MARKETPLACE_CATEGORIES[number];

// Thumbnail angles for 3D model display
export const THUMBNAIL_ANGLES = [
  'front',
  'back', 
  'left',
  'right',
  'top',
  'bottom'
] as const;

export type ThumbnailAngle = typeof THUMBNAIL_ANGLES[number];
