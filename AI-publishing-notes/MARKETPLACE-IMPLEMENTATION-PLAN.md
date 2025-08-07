# Marketplace Implementation Plan

## Overview
This document outlines the implementation plan for the marketplace publishing system in ShapeMint, providing clean separation between model generation and marketplace publishing.

## Implementation Status: ✅ PHASE 1 COMPLETE

### Features Implemented
- Dedicated `marketplace_listings` table for published models
- Marketplace upload page with thumbnail selection
- Thumbnail generation with 6 viewing angles
- Form validation and error handling
- User authentication and authorization
- Edge Functions for listing creation and publishing

### Database Schema
```sql
CREATE TABLE IF NOT EXISTS "public"."marketplace_listings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "model_id" "uuid" NOT NULL, -- References generated_models.id
    "user_id" "uuid" NOT NULL,  -- References auth.users.id
    "title" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "category" "text" NOT NULL,
    "tags" "text"[] DEFAULT '{}',
    "notes" "text",
    "selected_thumbnail_url" "text", -- URL of chosen thumbnail
    "selected_thumbnail_angle" "text", -- e.g., 'front', 'back', 'left', etc.
    "is_custom_thumbnail" boolean DEFAULT false,
    "is_published" boolean DEFAULT false,
    "published_at" timestamp with time zone,
    "views_count" integer DEFAULT 0,
    "downloads_count" integer DEFAULT 0,
    "likes_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "marketplace_listings_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."generated_models"("id") ON DELETE CASCADE,
    CONSTRAINT "marketplace_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "marketplace_listings_price_check" CHECK (price >= 0)
);

-- Indexes for performance
CREATE INDEX "idx_marketplace_listings_published" ON "public"."marketplace_listings" USING "btree" ("is_published", "published_at" DESC);
CREATE INDEX "idx_marketplace_listings_category" ON "public"."marketplace_listings" USING "btree" ("category");
CREATE INDEX "idx_marketplace_listings_user_id" ON "public"."marketplace_listings" USING "btree" ("user_id");

-- RLS Policies
CREATE POLICY "Users can manage their own listings" ON "public"."marketplace_listings" 
    USING ("auth"."uid"() = "user_id");
CREATE POLICY "Anyone can view published listings" ON "public"."marketplace_listings" 
    FOR SELECT USING ("is_published" = true);
```

### **Benefits of Separate Table:**
- Clean separation of model generation vs. marketplace publishing
- One model can have multiple marketplace attempts (drafts, revisions)
- Better analytics and marketplace-specific features
- Easier to implement marketplace management tools

---

## **2. Thumbnail Selection Flow Redesign**

### **Current Issue**: Thumbnail selector appears immediately after generation
### **Required Change**: Move to marketplace upload page with full angle selection

**2.1. Remove from Generate Page**
- Remove `ThumbnailSelector` component and related state
- Remove immediate thumbnail generation trigger
- Keep "Publish to Marketplace" button for navigation

**2.2. Add to MarketplaceUpload Page**
- **Design similar to current popup** with all six angles:
  - Front, Back, Left, Right, Top, Bottom views
  - Grid layout showing all generated thumbnails
  - Custom upload option
  - Selected thumbnail highlight
- Generate thumbnails when page loads (if not already generated)
- Show loading state during thumbnail generation
- Allow selection from generated angles OR custom upload
- Preview selected thumbnail in listing preview section

**2.3. Thumbnail Generation Integration**
```typescript
// On MarketplaceUpload page load
useEffect(() => {
  if (modelData?.urls?.glb && !modelData.thumbnail_angles) {
    generateThumbnails(modelData.urls.glb, modelData.id);
  }
}, [modelData]);
```

---

## **3. Marketplace Display Logic Updates**

### **Current Issue**: Shows ALL completed models for the user
### **Required Logic**: 
- **Current Phase**: Show only user's published models
- **Future Phase**: Show all published models across all users

**3.1. Update Marketplace Query**
```sql
-- Current Phase: User's published models only
SELECT ml.*, gm.glb_url, gm.obj_url, gm.stl_url, gm.prompt as original_prompt
FROM marketplace_listings ml
JOIN generated_models gm ON ml.model_id = gm.id
WHERE ml.is_published = true 
AND ml.user_id = $1  -- Current user's ID
ORDER BY ml.published_at DESC;

-- Future Phase: All published models
SELECT ml.*, gm.glb_url, gm.obj_url, gm.stl_url, gm.prompt as original_prompt,
       p.username, p.display_name
FROM marketplace_listings ml
JOIN generated_models gm ON ml.model_id = gm.id
JOIN profiles p ON ml.user_id = p.user_id
WHERE ml.is_published = true
ORDER BY ml.published_at DESC;
```

**3.2. Display Marketplace-Specific Data**
- Use `marketplace_listings.title` (not `generated_models.prompt`)
- Show `marketplace_listings.description`
- Display `marketplace_listings.price`
- Show `marketplace_listings.category` and `marketplace_listings.tags`
- Use `selected_thumbnail_url` for display

---

## **4. Services & API Updates**

### **4.1. New MarketplaceService**
```typescript
// src/services/marketplaceService.ts
export const marketplaceService = {
  async createListing(modelId: string, listingData: MarketplaceListingData): Promise<string>,
  async updateListing(listingId: string, listingData: Partial<MarketplaceListingData>): Promise<boolean>,
  async publishListing(listingId: string): Promise<boolean>,
  async unpublishListing(listingId: string): Promise<boolean>,
  async deleteListing(listingId: string): Promise<boolean>,
  async fetchUserListings(userId: string): Promise<MarketplaceListing[]>,
  async fetchPublishedListings(): Promise<MarketplaceListing[]>, // Future: all users
  async fetchListingById(listingId: string): Promise<MarketplaceListing | null>
};
```

### **4.2. Updated Edge Functions**
- **New**: `create-marketplace-listing`
- **New**: `publish-marketplace-listing`
- **New**: `update-marketplace-listing`

---

## **5. TypeScript Interface Updates**

```typescript
// src/types/marketplace.ts
export interface MarketplaceListing {
  id: string;
  model_id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  notes: string;
  selected_thumbnail_url: string;
  selected_thumbnail_angle: string;
  is_custom_thumbnail: boolean;
  is_published: boolean;
  published_at: string | null;
  views_count: number;
  downloads_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  glb_url?: string;
  obj_url?: string;
  stl_url?: string;
  original_prompt?: string;
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
```

---

## **6. Implementation Priority**

### **Phase 1: Core Functionality** 
**Goal**: Working marketplace publishing with proper data separation

1. **Database Schema**
   - Create `marketplace_listings` table
   - Set up RLS policies and indexes
   - Run migration

2. **Backend Services**
   - Create `marketplaceService.ts`
   - Implement Edge Functions (`create-marketplace-listing`, `publish-marketplace-listing`)
   - Update TypeScript interfaces

3. **MarketplaceUpload Page Redesign**
   - Remove thumbnail selector from Generate page
   - Add thumbnail selection section (similar to current popup design)
   - Implement form submission to create marketplace listing
   - Add publish functionality

4. **Marketplace Display Update**
   - Update query to use `marketplace_listings` table
   - Show only published listings for current user
   - Display marketplace-specific metadata (title, description, price)

### **Phase 2: Enhanced UX**
**Goal**: Polished user experience with validation and preview

1. **Form Validation & Error Handling**
   - Real-time form validation
   - Error states for thumbnail generation failures
   - Success/error feedback for publishing

2. **Improved Thumbnail Flow**
   - Better loading states during thumbnail generation
   - Thumbnail caching and optimization
   - Error handling for failed thumbnail generation

3. **Listing Preview**
   - Real-time preview of how listing will appear in marketplace
   - Better thumbnail selection UI with zoom/preview
   - Form auto-save drafts (optional)

4. **Navigation & State Management**
   - Proper error handling for missing model data
   - Better routing and state persistence
   - Loading states throughout the flow

### **Phase 3: Advanced Features**
**Goal**: Full marketplace management and multi-user support

1. **Draft System**
   - Save unpublished listings as drafts
   - Edit published listings
   - Version history for listings

2. **User Dashboard**
   - "My Listings" management page
   - Analytics (views, downloads, earnings)
   - Bulk operations (publish/unpublish multiple)

3. **Multi-User Marketplace**
   - Update query to show all users' published listings
   - User profiles and creator pages
   - Search and filtering improvements

4. **Advanced Marketplace Features**
   - Featured listings system
   - Reporting and moderation tools
   - Advanced analytics and insights

---

## **Key Changes from Original Plan:**

1. **Database**: Using separate `marketplace_listings` table for better long-term management
2. **Thumbnail Flow**: Explicit requirement to replicate current popup design with all six angles
3. **Marketplace Display**: Clarified progression from user-only to multi-user display
4. **Structure**: Maintained implementation priority phases as requested

This revised plan provides a clear roadmap for building a robust, scalable marketplace system with proper data separation and user experience.