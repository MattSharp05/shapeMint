-- Create marketplace_listings table for Phase 1 implementation
-- This table provides separation between model generation and marketplace publishing

CREATE TABLE IF NOT EXISTS "public"."marketplace_listings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "model_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "category" "text" NOT NULL,
    "tags" "text"[] DEFAULT '{}',
    "notes" "text",
    "selected_thumbnail_url" "text",
    "selected_thumbnail_angle" "text",
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

-- Create indexes for performance
CREATE INDEX "idx_marketplace_listings_published" ON "public"."marketplace_listings" USING "btree" ("is_published", "published_at" DESC);
CREATE INDEX "idx_marketplace_listings_category" ON "public"."marketplace_listings" USING "btree" ("category");
CREATE INDEX "idx_marketplace_listings_user_id" ON "public"."marketplace_listings" USING "btree" ("user_id");
CREATE INDEX "idx_marketplace_listings_model_id" ON "public"."marketplace_listings" USING "btree" ("model_id");

-- Enable RLS
ALTER TABLE "public"."marketplace_listings" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own listings" ON "public"."marketplace_listings" 
    USING ("auth"."uid"() = "user_id");

CREATE POLICY "Anyone can view published listings" ON "public"."marketplace_listings" 
    FOR SELECT USING ("is_published" = true);

-- Add comments for documentation
COMMENT ON TABLE "public"."marketplace_listings" IS 'Marketplace listings for published 3D models with pricing and metadata';
COMMENT ON COLUMN "public"."marketplace_listings"."model_id" IS 'References the generated_models table';
COMMENT ON COLUMN "public"."marketplace_listings"."selected_thumbnail_url" IS 'URL of the chosen thumbnail for marketplace display';
COMMENT ON COLUMN "public"."marketplace_listings"."selected_thumbnail_angle" IS 'Angle/view of the selected thumbnail (front, back, isometric, side, top, diagonal, or custom)';
COMMENT ON COLUMN "public"."marketplace_listings"."is_custom_thumbnail" IS 'Whether the user uploaded a custom thumbnail';
COMMENT ON COLUMN "public"."marketplace_listings"."is_published" IS 'Whether the listing is published and visible in marketplace';
