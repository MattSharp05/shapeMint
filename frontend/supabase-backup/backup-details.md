# ShapeMint Supabase Project Analysis

This document provides a comprehensive analysis of the ShapeMint Supabase project, based on the database schema, roles, and Edge Functions.

*Last Updated: August 8, 2025*

## 1. Project Overview

ShapeMint is an AI-powered platform for generating and manufacturing 3D models. Users can create 3D models from text prompts or images using multiple generation pipelines including the Meshy API and HyperSpace3D (ComfyUI). The platform supports downloading the generated models or ordering physical prints from manufacturing partners including Printify, CraftCloud, JLCPCB, and Xometry. The entire backend is orchestrated using Supabase, including database management, authentication, storage, and serverless functions.

## 2. Database Schema Analysis

The project utilizes several schemas, with the `public` schema containing the core application tables and the `auth` and `storage` schemas providing foundational services.

### Key Tables in the `public` Schema

-   **`users`**: The primary table for user profile information, linked to `auth.users` via a one-to-one relationship.
    -   Stores user-specific data like `full_name`, `avatar_url`, `stripe_customer_id`, and `bio`.
    -   Connected through the `handle_new_user()` trigger function that automatically creates user records upon signup.

-   **`generated_models`**: Central table storing metadata for 3D models generated via the Meshy API.
    -   Links to `auth.users` (`user_id`).
    -   Contains URLs for different model formats (`glb_url`, `obj_url`, `stl_url`).
    -   Tracks the model's `status` (TEXT with constraint: 'processing', 'completed', 'failed') and comprehensive thumbnail management fields.
    -   Includes thumbnail workflow: `thumbnail_status`, `thumbnail_angles`, `thumbnail_selected`, `thumbnail_custom`, `thumbnail_error`.

-   **`generation_tasks`**: Tracks asynchronous tasks for creating 3D models via the Meshy API.
    -   Stores the `task_id` from Meshy, `status`, and the final `model_urls`.
    -   Critical for the polling mechanism that checks for model generation completion.

-   **HyperSpace3D Pipeline Tables**: Alternative generation system using ComfyUI:
    -   **`hy_generation_jobs`**: Manages ComfyUI generation jobs with `prompt_id`, workflow configuration, and execution tracking.
    -   **`hy_generated_jobs`**: Legacy table with similar functionality (appears to be a transition artifact).
    -   **`hy_generated_models`**: Stores models generated through the HyperSpace3D pipeline, linked to jobs via `job_id`.

-   **`orders`**: Manages manufacturing orders placed by users.
    -   Contains details about the order, customer information, and integration with multiple providers.
    -   The `order_data` column (JSONB) stores the complete order payload sent to partners.
    -   Status tracked as TEXT with default 'created' (not using the defined enum).

-   **`manufacturing_quotes`**: Stores quotes received from manufacturing partners.
    -   Linked to `generated_models` and includes pricing, material, and timing information.
    -   The `quote_data` column (JSONB) holds the complete provider response.

-   **`thumbnail_processing_queue`**: Manages a queue for generating thumbnails for 3D models.
    -   Enables asynchronous thumbnail generation with priority and retry logic.
    -   **Security Issue**: RLS is currently disabled, making queue contents publicly accessible.

-   **Error and Session Management Tables**:
    -   **`failed_orders`**: Captures orders that failed processing for manual review.
    -   **`function_errors`**: Logs Edge Function errors for debugging.
    -   **`stripe_sessions`**: Tracks Stripe payment sessions and metadata.

-   **Social Features**:
    -   **`model_likes`**: User likes/favorites for generated models with unique constraints.

### Custom Types (ENUMs) - Status Inconsistencies

The database defines several `ENUM` types, but many are **not actually used** by the table columns, creating inconsistencies:

-   `model_status`: `generating`, `ready`, `failed` - **UNUSED** (tables use TEXT with different constraints)
-   `order_status`: `pending`, `paid`, `manufacturing`, `shipped`, `delivered`, `cancelled` - **UNUSED** (orders.status defaults to 'created')
-   `provider_type`: `printify`, `craftcloud`, `jlcpcb`, `xometry` - **UNUSED** (no columns reference this enum)
-   `source_type`: `text`, `image` - **USED** by generation tables

**Critical Issue**: Status vocabularies are inconsistent across the system:
- generated_models.status allows: 'processing', 'completed', 'failed'
- model_status enum defines: 'generating', 'ready', 'failed'
- orders.status defaults to 'created' but enum expects: 'pending', 'paid', etc.

### Functions and Triggers

-   **`handle_new_user()` function**: Automatically creates a new record in `public.users` when a user signs up via Supabase Auth.
    -   **Security Issue**: Function is SECURITY DEFINER without a fixed search_path, creating potential privilege escalation risk.
-   **`update_updated_at_column()`**: Generic trigger function to maintain updated_at timestamps.
-   **`update_auth_user_metadata()`**: Syncs display_name changes back to auth.users metadata.

## 3. Edge Functions Analysis

The Edge Functions contain the core business logic and integrations with third-party APIs.

-   **Core Generation Functions**:
    -   **`generate-3d-model`**: Primary function for Meshy API integration. Handles text/image-to-3D generation, polling, file downloads, and storage uploads.
    -   **`obj-to-stl`**: Converts OBJ files to STL format with intelligent scaling for 3D printing compatibility.
    -   **`refine-model`**: Enhances previously generated models with additional detail or texture modifications.

-   **HyperSpace3D/ComfyUI Pipeline**:
    -   **`test-comfyui`**: Integrates with ComfyUI for advanced generative AI workflows using the HyperSpace3D system.
    -   Functions likely interact with the `hy_*` table series for job management and model storage.

-   **Payment and Commerce**:
    -   **`create-checkout-session`**: Stripe integration for secure payment processing.

-   **Manufacturing Integration** (Updated Provider Support):
    -   Functions for multiple providers replacing the Slant3D-only approach:
    -   Quote generation and order submission for Printify, CraftCloud, JLCPCB, and Xometry.
    -   Provider-specific material and capability queries.

-   **Thumbnail Management**:
    -   **`generate-thumbnail`**: Creates thumbnail images for 3D models.
    -   **`process-thumbnail-queue`**: Background processor for the thumbnail queue.
    -   **`cleanup-thumbnails`**: Maintenance function for removing unused thumbnails.

## 4. Key Workflows

### A. Dual Generation Pipeline

**Meshy API Pipeline** (Traditional):
1.  User submits prompt/image → `generate-3d-model` function called
2.  Meshy API integration → task stored in `generation_tasks`
3.  Polling mechanism checks completion status
4.  File download and storage upload to `3d-models` bucket
5.  STL conversion via `obj-to-stl`
6.  Record created in `generated_models` table
7.  Thumbnail generation queued

**HyperSpace3D Pipeline** (Advanced):
1.  User submits prompt → ComfyUI workflow initiated
2.  Job tracked in `hy_generation_jobs` with workflow configuration
3.  ComfyUI server processing with progress updates
4.  Multiple output files stored in `output_files` JSONB
5.  Primary model URLs extracted and stored
6.  Results linked in `hy_generated_models`

### B. Multi-Provider Manufacturing Flow

1.  User selects generated model for manufacturing
2.  Provider selection (Printify/CraftCloud/JLCPCB/Xometry)
3.  Provider-specific quote generation with material options
4.  Quote stored in `manufacturing_quotes` table
5.  User proceeds through Stripe checkout session
6.  Order submission to selected provider
7.  Order tracking in `orders` table with provider-specific data

## 5. Authentication and Storage

-   **Authentication**: The project uses the built-in Supabase Auth. The `auth.users` table is the single source of truth for user identities. The `handle_new_user` trigger correctly populates a `profiles` table with public-facing data.
-   **Storage**: Supabase Storage is used extensively. Based on the function code, the primary bucket is `3d-models`, which stores the GLB, OBJ, and STL files for each generated model. A `thumbnails` bucket is also likely used for storing generated preview images.

## 5. Authentication and Storage

-   **Authentication**: Uses Supabase Auth with `auth.users` as the source of truth. The `handle_new_user` trigger populates the `public.users` table with profile data.
-   **Storage**: Supabase Storage with primary bucket `3d-models` for GLB, OBJ, and STL files, plus a `thumbnails` bucket for generated preview images.

## 6. Enabled PostgreSQL Extensions

-   **`uuid-ossp`**: UUID generation for primary keys across most tables.
-   **`plpgsql`**: Standard procedural language for functions and triggers.
-   **`pg_graphql`**: Auto-generated GraphQL API for efficient frontend data fetching.
-   **`pg_stat_statements`**: Performance monitoring and query optimization.
-   **`pgcrypto`**: Cryptographic functions for data encryption capabilities.
-   **`supabase_vault`**: Secure key-value store for API keys and secrets.

## 7. Critical Security Issues

### Immediate Action Required

1.  **Public Table Access via GRANT ALL**
    -   **Risk**: **CRITICAL**. All tables have `GRANT ALL` to `anon` and `authenticated` roles, creating excessive permissions.
    -   **Impact**: If RLS policies are misconfigured, anonymous users could access all data.
    -   **Remediation**: Revoke broad grants and rely on explicit RLS policies:
        ```sql
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
        ```

2.  **RLS Disabled on thumbnail_processing_queue**
    -   **Risk**: **CRITICAL**. Queue contents are publicly readable, exposing model IDs and processing states.
    -   **Remediation**:
        ```sql
        ALTER TABLE public.thumbnail_processing_queue ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Service role access only" ON public.thumbnail_processing_queue
        FOR ALL USING (auth.role() = 'service_role');
        ```

3.  **SECURITY DEFINER without search_path**
    -   **Risk**: **HIGH**. `handle_new_user()` function vulnerable to search path hijacking.
    -   **Remediation**:
        ```sql
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER SET search_path = public
        AS $$
        BEGIN
          INSERT INTO public.users (id, email, full_name)
          VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
          );
          RETURN NEW;
        END;
        $$;
        ```

### Medium Priority Issues

4.  **Enum/Column Type Mismatches**
    -   **Risk**: **MEDIUM**. Unused enums and inconsistent status vocabularies could cause runtime errors.
    -   **Decision Required**: Either align columns to use enums OR drop unused enums entirely.

5.  **Policy Optimization Needed**
    -   **Risk**: **LOW-MEDIUM**. Multiple policies per table and direct `auth.uid()` calls impact performance.
    -   **Remediation Pattern**:
        ```sql
        -- Instead of: auth.uid() = user_id
        -- Use: (SELECT auth.uid()) = user_id
        ```

## 8. Performance Issues

### Index Optimization

1.  **Duplicate Index**: Both `idx_orders_tracking` and `idx_orders_tracking_numbers` exist on the same column.
    ```sql
    DROP INDEX IF EXISTS public.idx_orders_tracking_numbers;
    ```

2.  **Missing Foreign Key Indexes**:
    ```sql
    CREATE INDEX IF NOT EXISTS idx_manufacturing_quotes_model_id ON public.manufacturing_quotes(model_id);
    CREATE INDEX IF NOT EXISTS idx_model_likes_model_id ON public.model_likes(model_id);
    CREATE INDEX IF NOT EXISTS idx_thumbnail_processing_queue_model_id ON public.thumbnail_processing_queue(model_id);
    ```

### Policy Consolidation

Multiple overlapping policies should be consolidated:
```sql
-- Example: Consolidate generated_models SELECT policies
DROP POLICY IF EXISTS "Allow read of completed models for all" ON public.generated_models;
DROP POLICY IF EXISTS "Users can view their own models" ON public.generated_models;

CREATE POLICY "consolidated_select_generated_models" ON public.generated_models
FOR SELECT USING (
  (status = 'completed') OR ((SELECT auth.uid()) = user_id)
);
## 9. Data Model Standardization

### Status Vocabulary Alignment

**Current Inconsistencies:**
- `generated_models.status`: 'processing', 'completed', 'failed'
- `model_status` enum: 'generating', 'ready', 'failed'
- `orders.status`: defaults to 'created' (not in `order_status` enum)

**Recommended Actions:**

**Option A - Adopt Enums (Preferred):**
```sql
-- Align generated_models to use enum
ALTER TABLE public.generated_models 
ALTER COLUMN status TYPE public.model_status 
USING CASE status 
  WHEN 'processing' THEN 'generating'::public.model_status
  WHEN 'completed' THEN 'ready'::public.model_status
  ELSE 'failed'::public.model_status
END;

-- Fix orders default and enum alignment
ALTER TABLE public.orders 
ALTER COLUMN status TYPE public.order_status 
USING CASE status 
  WHEN 'created' THEN 'pending'::public.order_status
  ELSE status::public.order_status
END;
```

**Option B - Drop Unused Enums:**
```sql
DROP TYPE IF EXISTS public.model_status CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.provider_type CASCADE;
-- Keep source_type as it's actually used
```

## 10. Migration Priority & Roadmap

### Phase 1 - Critical Security (Immediate)
1. Enable RLS on `thumbnail_processing_queue`
2. Revoke excessive GRANT ALL permissions
3. Fix `handle_new_user()` search_path vulnerability
4. Add service role policies where needed

### Phase 2 - Data Consistency (This Week)
1. Decide on enum vs TEXT approach for status fields
2. Implement chosen status vocabulary
3. Update application code to match new statuses
4. Remove duplicate indexes

### Phase 3 - Performance Optimization (Next Sprint)
1. Consolidate overlapping RLS policies
2. Optimize auth.uid() calls in policies
3. Add missing foreign key indexes
4. Review and remove unused indexes

### Phase 4 - Maintenance (Ongoing)
1. Implement automated schema drift detection
2. Set up regular security audits
3. Monitor policy performance via pg_stat_statements
4. Document API status contracts

## 11. Monitoring & Maintenance

### Recommended Tooling
- **Schema Drift Detection**: Automated `pg_dump --schema-only` comparison in CI/CD
- **Security Scanning**: Regular Supabase advisor runs
- **Performance Monitoring**: pg_stat_statements analysis for slow policies

### Key Metrics to Track
- Policy evaluation time (especially auth.uid() calls)
- Table scan ratios for large tables
- RLS policy hit rates
- Index usage statistics

## 12. Summary

The ShapeMint database has evolved significantly beyond its original design, incorporating dual generation pipelines, multi-provider manufacturing, and enhanced thumbnail management. However, this evolution has introduced security vulnerabilities, performance bottlenecks, and data model inconsistencies that require immediate attention.

**Critical Actions Required:**
1. **Security**: Fix RLS gaps and excessive permissions
2. **Consistency**: Align status vocabularies across tables
3. **Performance**: Optimize policies and add missing indexes

The database architecture is fundamentally sound but requires focused remediation to ensure security, consistency, and optimal performance as the platform scales.
        -- Policy A: USING (status = 'completed')
        -- Policy B: USING (auth.uid() = user_id)
        -- Policy C: USING (is_public = true)

        -- Combine them into one:
        CREATE POLICY "Consolidated Select Policy" ON public.generated_models
        FOR SELECT USING (
            (status = 'completed') OR
            ((SELECT auth.uid()) = user_id) OR
            (is_public = true)
        );
        ```

### Informational Recommendations

3.  **Unindexed Foreign Keys**
    -   **Issue**: The foreign key columns on `manufacturing_quotes(model_id)`, `model_likes(model_id)`, and `thumbnail_processing_queue(model_id)` are not indexed. This can lead to slow `JOIN` operations when querying related data.
    -   **Remediation**: Create an index on each of these foreign key columns.
    -   **Remediation Commands**:
        ```sql
        CREATE INDEX idx_manufacturing_quotes_model_id ON public.manufacturing_quotes(model_id);
        CREATE INDEX idx_model_likes_model_id ON public.model_likes(model_id);
        CREATE INDEX idx_thumbnail_processing_queue_model_id ON public.thumbnail_processing_queue(model_id);
        ```

4.  **Unused and Duplicate Indexes**
    -   **Issue**: The advisor has identified numerous indexes that appear to be unused, as well as a duplicate index on the `orders` table (`idx_orders_tracking` and `idx_orders_tracking_numbers`). Unused indexes consume storage and add overhead to write operations (INSERT, UPDATE, DELETE).
    -   **Remediation**:
        -   **Duplicate**: Drop one of the redundant indexes on the `orders` table.
        -   **Unused**: Carefully review the list of unused indexes. Before dropping them, confirm they are not used by any infrequent but important queries (e.g., annual reports, data backfills). If an index is truly unused, drop it to reclaim space and improve write performance.
    -   **Remediation Commands**:
        ```sql
        -- Drop duplicate index
        DROP INDEX IF EXISTS public.idx_orders_tracking_numbers;

        -- Example of dropping an unused index
        DROP INDEX IF EXISTS public.idx_generated_models_status;
        ```
