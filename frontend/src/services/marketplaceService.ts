// src/services/marketplaceService.ts
// Service for handling marketplace listing operations

import { supabase } from '../supabaseClient';
import { 
  MarketplaceListing, 
  CreateMarketplaceListingParams, 
  UpdateMarketplaceListingParams 
} from '../types/marketplace';

interface ServiceResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

export const marketplaceService = {
  /**
   * Create a new marketplace listing (unpublished draft)
   */
  async createListing(params: CreateMarketplaceListingParams): Promise<ServiceResponse<MarketplaceListing>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          data: null,
          error: 'Please log in to create marketplace listings',
        };
      }

      const listingData = {
        model_id: params.modelId,
        user_id: session.user.id,
        title: params.title,
        description: params.description || null,
        price: params.price,
        category: params.category,
        tags: params.tags || [],
        notes: params.notes || null,
        selected_thumbnail_url: params.selectedThumbnailUrl || null,
        selected_thumbnail_angle: params.selectedThumbnailAngle || null,
        is_custom_thumbnail: params.isCustomThumbnail || false,
        is_published: false, // Always start as draft
      };

      const { data, error } = await supabase
        .from('marketplace_listings')
        .insert(listingData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating marketplace listing:', error);
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      console.log('✅ Created marketplace listing:', data.id);
      return {
        success: true,
        data: data as MarketplaceListing,
      };
    } catch (err) {
      console.error('❌ Marketplace listing creation error:', err);
      return {
        success: false,
        data: null,
        error: 'Failed to create marketplace listing',
      };
    }
  },

  /**
   * Update an existing marketplace listing
   */
  async updateListing(params: UpdateMarketplaceListingParams): Promise<ServiceResponse<MarketplaceListing>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          data: null,
          error: 'Please log in to update listings',
        };
      }

      const updateData = {
        // Convert camelCase to snake_case for database
        ...(params.updates.title && { title: params.updates.title }),
        ...(params.updates.description !== undefined && { description: params.updates.description }),
        ...(params.updates.price && { price: params.updates.price }),
        ...(params.updates.category && { category: params.updates.category }),
        ...(params.updates.tags && { tags: params.updates.tags }),
        ...(params.updates.notes !== undefined && { notes: params.updates.notes }),
        ...(params.updates.selectedThumbnailUrl !== undefined && { selected_thumbnail_url: params.updates.selectedThumbnailUrl }),
        ...(params.updates.selectedThumbnailAngle !== undefined && { selected_thumbnail_angle: params.updates.selectedThumbnailAngle }),
        ...(params.updates.isCustomThumbnail !== undefined && { is_custom_thumbnail: params.updates.isCustomThumbnail }),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('marketplace_listings')
        .update(updateData)
        .eq('id', params.listingId)
        .eq('user_id', session.user.id) // Ensure user owns the listing
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating marketplace listing:', error);
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as MarketplaceListing,
      };
    } catch (err) {
      console.error('❌ Marketplace listing update error:', err);
      return {
        success: false,
        data: null,
        error: 'Failed to update marketplace listing',
      };
    }
  },

  /**
   * Publish a marketplace listing
   */
  async publishListing(listingId: string): Promise<ServiceResponse<MarketplaceListing>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          data: null,
          error: 'Please log in to publish listings',
        };
      }

      const updateData = {
        is_published: true,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('marketplace_listings')
        .update(updateData)
        .eq('id', listingId)
        .eq('user_id', session.user.id) // Ensure user owns the listing
        .select()
        .single();

      if (error) {
        console.error('❌ Error publishing marketplace listing:', error);
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      console.log('✅ Published marketplace listing:', data.id);
      return {
        success: true,
        data: data as MarketplaceListing,
      };
    } catch (err) {
      console.error('❌ Marketplace listing publish error:', err);
      return {
        success: false,
        data: null,
        error: 'Failed to publish marketplace listing',
      };
    }
  },

  /**
   * Unpublish a marketplace listing
   */
  async unpublishListing(listingId: string): Promise<ServiceResponse<MarketplaceListing>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          data: null,
          error: 'Please log in to unpublish listings',
        };
      }

      const updateData = {
        is_published: false,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('marketplace_listings')
        .update(updateData)
        .eq('id', listingId)
        .eq('user_id', session.user.id) // Ensure user owns the listing
        .select()
        .single();

      if (error) {
        console.error('❌ Error unpublishing marketplace listing:', error);
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      console.log('✅ Unpublished marketplace listing:', data.id);
      return {
        success: true,
        data: data as MarketplaceListing,
      };
    } catch (err) {
      console.error('❌ Marketplace listing unpublish error:', err);
      return {
        success: false,
        data: null,
        error: 'Failed to unpublish marketplace listing',
      };
    }
  },

  /**
   * Delete a marketplace listing
   */
  async deleteListing(listingId: string): Promise<ServiceResponse<boolean>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          data: null,
          error: 'Please log in to delete listings',
        };
      }

      const { error } = await supabase
        .from('marketplace_listings')
        .delete()
        .eq('id', listingId)
        .eq('user_id', session.user.id); // Ensure user owns the listing

      if (error) {
        console.error('❌ Error deleting marketplace listing:', error);
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      console.log('✅ Deleted marketplace listing:', listingId);
      return {
        success: true,
        data: true,
      };
    } catch (err) {
      console.error('❌ Marketplace listing delete error:', err);
      return {
        success: false,
        data: null,
        error: 'Failed to delete marketplace listing',
      };
    }
  },

  /**
   * Fetch user's marketplace listings (both published and unpublished)
   */
  async fetchUserListings(userId?: string): Promise<ServiceResponse<MarketplaceListing[]>> {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          return {
            success: false,
            data: null,
            error: 'Please log in to view your listings',
          };
        }
        targetUserId = session.user.id;
      }

      const { data, error } = await supabase
        .from('marketplace_listings')
        .select(`
          *,
          generated_models!inner(
            glb_url,
            obj_url,
            stl_url,
            prompt
          )
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching user marketplace listings:', error);
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      // Transform the joined data structure
      const transformedData = data.map(item => ({
        ...item,
        glb_url: item.generated_models?.glb_url,
        obj_url: item.generated_models?.obj_url,
        stl_url: item.generated_models?.stl_url,
        original_prompt: item.generated_models?.prompt,
        // Remove the nested object
        generated_models: undefined,
      })) as MarketplaceListing[];

      console.log(`✅ Fetched ${transformedData.length} user marketplace listings`);
      return {
        success: true,
        data: transformedData,
      };
    } catch (err) {
      console.error('❌ User marketplace listings fetch error:', err);
      return {
        success: false,
        data: null,
        error: 'Failed to fetch marketplace listings',
      };
    }
  },

  /**
   * Fetch published marketplace listings (Phase 1: current user only, Phase 3: all users)
   */
  async fetchPublishedListings(): Promise<ServiceResponse<MarketplaceListing[]>> {
    try {
      // Phase 1: Only show current user's published listings
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        // If not logged in, return empty array for now
        return {
          success: true,
          data: [],
        };
      }

      const { data, error } = await supabase
        .from('marketplace_listings')
        .select(`
          *,
          generated_models!inner(
            glb_url,
            obj_url,
            stl_url,
            prompt
          )
        `)
        .eq('is_published', true)
        .eq('user_id', session.user.id) // Phase 1: Current user only
        .order('published_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching published marketplace listings:', error);
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      // Transform the joined data structure
      const transformedData = data.map(item => ({
        ...item,
        glb_url: item.generated_models?.glb_url,
        obj_url: item.generated_models?.obj_url,
        stl_url: item.generated_models?.stl_url,
        original_prompt: item.generated_models?.prompt,
        // Remove the nested object
        generated_models: undefined,
      })) as MarketplaceListing[];

      console.log(`✅ Fetched ${transformedData.length} published marketplace listings`);
      return {
        success: true,
        data: transformedData,
      };
    } catch (err) {
      console.error('❌ Published marketplace listings fetch error:', err);
      return {
        success: false,
        data: null,
        error: 'Failed to fetch published listings',
      };
    }
  },

  /**
   * Fetch a single marketplace listing by ID
   */
  async fetchListingById(listingId: string): Promise<ServiceResponse<MarketplaceListing>> {
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select(`
          *,
          generated_models!inner(
            glb_url,
            obj_url,
            stl_url,
            prompt
          )
        `)
        .eq('id', listingId)
        .single();

      if (error) {
        console.error('❌ Error fetching marketplace listing by ID:', error);
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      // Transform the joined data structure
      const transformedData = {
        ...data,
        glb_url: data.generated_models?.glb_url,
        obj_url: data.generated_models?.obj_url,
        stl_url: data.generated_models?.stl_url,
        original_prompt: data.generated_models?.prompt,
        // Remove the nested object
        generated_models: undefined,
      } as MarketplaceListing;

      console.log('✅ Fetched marketplace listing:', listingId);
      return {
        success: true,
        data: transformedData,
      };
    } catch (err) {
      console.error('❌ Marketplace listing fetch error:', err);
      return {
        success: false,
        data: null,
        error: 'Failed to fetch marketplace listing',
      };
    }
  },

  /**
   * Check if a model already has a marketplace listing
   * Used to prevent duplicate listings and enable edit mode
   */
  async getListingByModelId(modelId: string): Promise<ServiceResponse<MarketplaceListing>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          data: null,
          error: 'Please log in to check listings',
        };
      }

      const { data, error } = await supabase
        .from('marketplace_listings')
        .select(`
          *,
          generated_models (
            glb_url,
            obj_url,
            stl_url,
            prompt
          )
        `)
        .eq('model_id', modelId)
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        // If no listing found, that's not an error
        if (error.code === 'PGRST116') {
          return {
            success: true,
            data: null,
          };
        }
        
        console.error('❌ Error checking existing listing:', error);
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as MarketplaceListing,
      };
    } catch (err) {
      console.error('❌ Listing check error:', err);
      return {
        success: false,
        data: null,
        error: 'Failed to check existing listing',
      };
    }
  },
};
