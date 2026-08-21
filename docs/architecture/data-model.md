# Data Model

> Last updated: 2025-01-20 | Source of truth: `docs/supabase-backup/schema.sql`

This document describes the Supabase Postgres database schema for ShapeMint, including all tables, custom enums, foreign key relationships, Row Level Security policies, triggers, views, and an entity relationship summary.

---

## Table of Contents

- [Custom Enums](#custom-enums)
- [Tables](#tables)
- [Foreign Key Relationships](#foreign-key-relationships)
- [Row Level Security Policies](#row-level-security-policies)
- [Database Triggers](#database-triggers)
- [Database Views](#database-views)
- [Entity Relationship Summary](#entity-relationship-summary)

---

## Custom Enums

### `model_status`

Status of a 3D model in the generation pipeline.

| Value | Description |
|-------|-------------|
| `generating` | Model is currently being generated |
| `ready` | Model generation completed successfully |
| `failed` | Model generation failed |

### `order_status`

Lifecycle state of a manufacturing order.

| Value | Description |
|-------|-------------|
| `pending` | Order created, awaiting payment |
| `paid` | Payment confirmed |
| `manufacturing` | Order sent to vendor for production |
| `shipped` | Order shipped by vendor |
| `delivered` | Order delivered to customer |
| `cancelled` | Order cancelled |

### `provider_type`

Supported manufacturing provider identifiers.

| Value | Description |
|-------|-------------|
| `printify` | Printify printing service |
| `craftcloud` | CraftCloud printing aggregator |
| `jlcpcb` | JLCPCB manufacturing service |
| `xometry` | Xometry manufacturing service |

### `source_type`

Input source type for model generation.

| Value | Description |
|-------|-------------|
| `text` | Generated from a text prompt |
| `image` | Generated from an image input |

---

## Tables

The public schema contains 15 tables:

1. [users](#users)
2. [generated_models](#generated_models)
3. [generation_tasks](#generation_tasks)
4. [orders](#orders)
5. [quotes](#quotes)
6. [manufacturing_quotes](#manufacturing_quotes)
7. [model_likes](#model_likes)
8. [stripe_sessions](#stripe_sessions)
9. [failed_orders](#failed_orders)
10. [function_errors](#function_errors)
11. [sw_models_cache](#sw_models_cache)
12. [thumbnail_processing_queue](#thumbnail_processing_queue)
13. [hy_generated_jobs](#hy_generated_jobs)
14. [hy_generated_models](#hy_generated_models)
15. [hy_generation_jobs](#hy_generation_jobs)

---

### users

User profiles synced from Supabase Auth. Created automatically via the `handle_new_user` trigger when a user signs up.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | — | PRIMARY KEY, FOREIGN KEY → auth.users(id) |
| `email` | text | — | NOT NULL |
| `full_name` | text | — | NOT NULL |
| `avatar_url` | text | — | — |
| `stripe_customer_id` | text | — | — |
| `created_at` | timestamptz | `timezone('utc', now())` | NOT NULL |
| `updated_at` | timestamptz | `timezone('utc', now())` | NOT NULL |
| `bio` | text | — | — |

---

### generated_models

Stores AI-generated 3D models with their file URLs, metadata, and marketplace listing status.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | `uuid_generate_v4()` | PRIMARY KEY |
| `user_id` | uuid | — | NOT NULL, FK → auth.users(id) ON DELETE CASCADE |
| `name` | text | — | — |
| `prompt` | text | — | — |
| `style` | text | — | — |
| `obj_url` | text | — | — |
| `stl_url` | text | — | — |
| `glb_url` | text | — | — |
| `thumbnail_url` | text | — | — |
| `status` | text | — | CHECK: `processing`, `completed`, `failed` |
| `created_at` | timestamptz | `timezone('utc', now())` | NOT NULL |
| `updated_at` | timestamptz | `timezone('utc', now())` | NOT NULL |
| `task_id` | text | `''` | — |
| `thumbnail_status` | text | — | — |
| `thumbnail_angles` | jsonb | — | — |
| `thumbnail_selected` | text | `'isometric'` | — |
| `thumbnail_custom` | boolean | `false` | — |
| `thumbnail_error` | text | — | — |
| `type` | varchar(50) | — | — |
| `mode` | text | `'preview'` | — |
| `category` | text | — | — |
| `price` | numeric(10,2) | — | — |
| `tags` | text | — | — |
| `notes` | text | — | — |
| `is_marketplace_listed` | boolean | `false` | — |

**CHECK constraint:** `generated_models_status_check` — status must be one of `'processing'`, `'completed'`, `'failed'`

---

### generation_tasks

Tracks async AI generation tasks (Meshy polling). Each row represents one generation request.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | `gen_random_uuid()` | PRIMARY KEY |
| `task_id` | text | — | NOT NULL, UNIQUE |
| `user_id` | uuid | — | FK → auth.users(id) |
| `status` | text | `'PENDING'` | NOT NULL |
| `type` | text | — | NOT NULL |
| `prompt` | text | — | — |
| `image_url` | text | — | — |
| `model_urls` | jsonb | — | — |
| `error_message` | text | — | — |
| `created_at` | timestamptz | `now()` | — |
| `updated_at` | timestamptz | `now()` | — |
| `completed_at` | timestamptz | — | — |

---

### orders

Manufacturing orders placed through vendor APIs. Contains shipping, payment, and tracking data.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | `gen_random_uuid()` | PRIMARY KEY |
| `slant_order_id` | text | — | UNIQUE |
| `order_number` | text | — | NOT NULL |
| `customer_name` | text | — | NOT NULL |
| `customer_email` | text | — | NOT NULL |
| `customer_phone` | text | — | — |
| `file_url` | text | — | NOT NULL |
| `filename` | text | — | NOT NULL |
| `quantity` | integer | `1` | NOT NULL |
| `color` | text | — | NOT NULL |
| `profile` | text | `'PLA'` | — |
| `status` | text | `'created'` | — |
| `stripe_session_id` | text | — | — |
| `amount_paid` | integer | — | — |
| `payment_status` | text | `'pending'` | — |
| `tracking_numbers` | text[] | — | — |
| `shipping_status` | text | — | — |
| `label_download_url` | text | — | — |
| `billing_address` | jsonb | — | — |
| `shipping_address` | jsonb | — | — |
| `created_at` | timestamptz | `now()` | — |
| `updated_at` | timestamptz | `now()` | — |
| `shipped_at` | timestamptz | — | — |
| `delivered_at` | timestamptz | — | — |
| `order_data` | jsonb | — | — |
| `user_id` | uuid | — | FK → auth.users(id) |
| `slant_response` | jsonb | — | — |

---

### quotes

Shapeways quote requests with pricing, material selections, and shipping details.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | uuid | — | FK → auth.users(id) ON DELETE SET NULL |
| `vendor` | text | — | NOT NULL, CHECK: must be `'shapeways'` |
| `model_url` | text | — | NOT NULL |
| `file_hash` | text | — | NOT NULL |
| `shapeways_model_id` | text | — | — |
| `material_id` | text | — | NOT NULL |
| `selections` | jsonb | — | NOT NULL |
| `quantity` | integer | `1` | NOT NULL, CHECK: > 0 AND <= 100 |
| `shipping_address` | jsonb | — | NOT NULL |
| `shipping_zip` | text | — | — |
| `shapeways` | jsonb | — | — |
| `price_total` | numeric(12,2) | — | — |
| `currency` | text | `'USD'` | NOT NULL |
| `status` | text | `'pending'` | NOT NULL, CHECK: `'quoted'`, `'failed'`, `'pending'` |
| `expires_at` | timestamptz | — | — |
| `created_at` | timestamptz | `now()` | — |
| `updated_at` | timestamptz | `now()` | — |

**CHECK constraints:**
- `quotes_quantity_check` — quantity must be > 0 and <= 100
- `quotes_status_check` — status must be one of `'quoted'`, `'failed'`, `'pending'`
- `quotes_vendor_check` — vendor must be `'shapeways'`

---

### manufacturing_quotes

Cached manufacturing quotes from vendors (primarily Slant3D) with pricing and delivery estimates.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | `uuid_generate_v4()` | PRIMARY KEY |
| `model_id` | uuid | — | NOT NULL |
| `material` | text | — | NOT NULL |
| `quantity` | integer | — | NOT NULL |
| `price` | numeric(10,2) | — | NOT NULL |
| `shipping_price` | numeric(10,2) | — | NOT NULL |
| `estimated_days` | integer | — | NOT NULL |
| `quote_data` | jsonb | — | NOT NULL |
| `created_at` | timestamptz | `timezone('utc', now())` | NOT NULL |
| `expires_at` | timestamptz | — | NOT NULL |
| `manufacturer` | varchar(50) | `'slant3d'` | — |
| `vendor_model_id` | varchar(255) | — | — |

---

### model_likes

Tracks user likes on marketplace-listed models. Enforces one like per user per model.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | `uuid_generate_v4()` | PRIMARY KEY |
| `user_id` | uuid | — | NOT NULL |
| `model_id` | uuid | — | NOT NULL |
| `created_at` | timestamptz | `timezone('utc', now())` | NOT NULL |

**UNIQUE constraint:** `model_likes_user_id_model_id_key` — (user_id, model_id) must be unique

---

### stripe_sessions

Records of Stripe checkout sessions for payment tracking and reconciliation.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | `gen_random_uuid()` | PRIMARY KEY |
| `session_id` | text | — | NOT NULL, UNIQUE |
| `payment_status` | text | — | NOT NULL |
| `amount_total` | integer | — | — |
| `customer_email` | text | — | — |
| `metadata` | jsonb | — | — |
| `created_at` | timestamptz | `now()` | — |

---

### failed_orders

Stores orders that failed during vendor API submission for later reprocessing.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | `gen_random_uuid()` | PRIMARY KEY |
| `order_data` | jsonb | — | NOT NULL |
| `payment_info` | jsonb | — | — |
| `error_message` | text | — | — |
| `api_status` | integer | — | — |
| `processed` | boolean | `false` | — |
| `created_at` | timestamptz | `now()` | — |

**Index:** `idx_failed_orders_processed` — partial index on `processed` WHERE `processed = false`

---

### function_errors

Error log for Edge Function failures, capturing function name, message, and stack trace.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | `gen_random_uuid()` | PRIMARY KEY |
| `function_name` | text | — | NOT NULL |
| `error_message` | text | — | — |
| `error_stack` | text | — | — |
| `created_at` | timestamptz | `now()` | — |

---

### sw_models_cache

Cache mapping file hashes to Shapeways model IDs to avoid re-uploading the same model.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | `gen_random_uuid()` | PRIMARY KEY |
| `file_hash` | text | — | NOT NULL, UNIQUE |
| `shapeways_model_id` | text | — | NOT NULL |
| `created_at` | timestamptz | `now()` | — |

---

### thumbnail_processing_queue

Queue for async thumbnail generation jobs with retry logic.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | `gen_random_uuid()` | PRIMARY KEY |
| `model_id` | uuid | — | FK → generated_models(id) ON DELETE CASCADE |
| `status` | text | `'pending'` | — |
| `priority` | integer | `0` | — |
| `attempts` | integer | `0` | — |
| `max_attempts` | integer | `3` | — |
| `created_at` | timestamptz | `now()` | — |
| `updated_at` | timestamptz | `now()` | — |
| `error_message` | text | — | — |
| `processing_started_at` | timestamptz | — | — |

---

### hy_generated_jobs

Tracks HY3D generation jobs (ComfyUI-based pipeline). Stores workflow execution state and output files.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | uuid | — | NOT NULL, FK → auth.users(id) ON DELETE CASCADE |
| `prompt_id` | text | — | NOT NULL |
| `status` | text | `'pending'` | NOT NULL |
| `progress` | integer | `0` | — |
| `prompt` | text | — | — |
| `image_filename` | text | — | — |
| `workflow_type` | text | `'hy3d'` | — |
| `workflow_nodes` | integer | — | — |
| `comfyui_server` | text | — | — |
| `output_files` | jsonb | — | — |
| `primary_model_url` | text | — | — |
| `primary_preview_url` | text | — | — |
| `execution_time` | text | — | — |
| `error_message` | text | — | — |
| `created_at` | timestamptz | `now()` | — |
| `updated_at` | timestamptz | `now()` | — |

---

### hy_generated_models

Stores completed HY3D models with their file URLs and metadata.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | uuid | — | NOT NULL, FK → auth.users(id) ON DELETE CASCADE |
| `name` | text | — | NOT NULL |
| `prompt` | text | — | NOT NULL |
| `style` | text | — | — |
| `obj_url` | text | — | NOT NULL |
| `stl_url` | text | — | NOT NULL |
| `glb_url` | text | — | NOT NULL |
| `thumbnail_url` | text | — | — |
| `status` | text | `'processing'` | NOT NULL |
| `created_at` | timestamptz | `now()` | — |
| `updated_at` | timestamptz | `now()` | — |
| `job_id` | uuid | — | FK → hy_generated_jobs(id) ON DELETE SET NULL |

---

### hy_generation_jobs

Alternative HY3D generation job tracker with ComfyUI server configuration.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | uuid | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | uuid | — | NOT NULL, FK → auth.users(id) ON DELETE CASCADE |
| `prompt_id` | text | — | NOT NULL |
| `status` | text | `'queued'` | NOT NULL |
| `progress` | integer | `0` | — |
| `prompt` | text | — | — |
| `image_filename` | text | — | — |
| `workflow_type` | text | `'hy3d'` | — |
| `output_files` | jsonb | `'[]'::jsonb` | — |
| `primary_model_url` | text | — | — |
| `primary_preview_url` | text | — | — |
| `error_message` | text | — | — |
| `execution_time` | text | — | — |
| `workflow_nodes` | integer | — | — |
| `comfyui_server` | text | `'http://comfy.tunell.live'` | — |
| `created_at` | timestamptz | `now()` | — |
| `updated_at` | timestamptz | `now()` | — |

---

## Foreign Key Relationships

| Referencing Table | Referencing Column | Referenced Table | Referenced Column | ON DELETE |
|---|---|---|---|---|
| `users` | `id` | `auth.users` | `id` | *(no action specified)* |
| `generated_models` | `user_id` | `auth.users` | `id` | CASCADE |
| `generation_tasks` | `user_id` | `auth.users` | `id` | *(no action specified)* |
| `orders` | `user_id` | `auth.users` | `id` | *(no action specified)* |
| `quotes` | `user_id` | `auth.users` | `id` | SET NULL |
| `hy_generated_jobs` | `user_id` | `auth.users` | `id` | CASCADE |
| `hy_generated_models` | `user_id` | `auth.users` | `id` | CASCADE |
| `hy_generated_models` | `job_id` | `hy_generated_jobs` | `id` | SET NULL |
| `hy_generation_jobs` | `user_id` | `auth.users` | `id` | CASCADE |
| `thumbnail_processing_queue` | `model_id` | `generated_models` | `id` | CASCADE |

---

## Row Level Security Policies

RLS is enabled on all 15 tables. Below are the policies defined per table.

### users

| Policy Name | Role | Operation | Condition |
|---|---|---|---|
| Users can view their own data | — | SELECT | `auth.uid() = id` |
| Users can update their own data | — | UPDATE | `auth.uid() = id` |

### generated_models

| Policy Name | Role | Operation | Condition |
|---|---|---|---|
| Allow read of completed models for all | — | SELECT | `status = 'completed'` |
| Users can access their own models | — | SELECT/ALL | `auth.uid() = user_id` |
| Users can create their own models | — | INSERT | `auth.uid() = user_id` |
| Users can read their own generated models | authenticated | SELECT | `auth.uid() = user_id` |
| Users can insert their own generated models | authenticated | INSERT | `auth.uid() = user_id` |
| Users can update their own generated models | authenticated | UPDATE | `auth.uid() = user_id` |
| Users can view their own models | — | SELECT | `auth.uid() = user_id` |
| Service role can insert generated models | service_role | INSERT | `true` |
| Service role can read generated models | service_role | SELECT | `true` |
| Service role can update generated models | service_role | UPDATE | `true` |

### generation_tasks

| Policy Name | Role | Operation | Condition |
|---|---|---|---|
| Users can insert their own tasks | — | INSERT | `auth.uid() = user_id` |
| Users can view their own tasks | — | SELECT | `auth.uid() = user_id` |
| Service role can manage all tasks | — | ALL | `auth.role() = 'service_role'` |

### orders

| Policy Name | Role | Operation | Condition |
|---|---|---|---|
| Users can view their own orders | — | SELECT | `customer_email = (auth.jwt() ->> 'email')` |
| Service role can manage all orders | — | ALL | `auth.role() = 'service_role'` |

### quotes

| Policy Name | Role | Operation | Condition |
|---|---|---|---|
| quotes_select_own | — | SELECT | `auth.uid() = user_id` |
| quotes_insert_own | — | INSERT | `auth.uid() = user_id` |
| quotes_service_all | — | ALL | `auth.role() = 'service_role'` |

### manufacturing_quotes

RLS enabled. No explicit policies defined in schema — access controlled at service level.

### model_likes

| Policy Name | Role | Operation | Condition |
|---|---|---|---|
| Users can manage their own likes | — | ALL | `user_id = auth.uid()` |

### stripe_sessions

| Policy Name | Role | Operation | Condition |
|---|---|---|---|
| Allow authenticated users to read stripe sessions | authenticated | SELECT | `true` |
| Service role can insert stripe sessions | service_role | INSERT | `true` |
| Service role can read stripe sessions | service_role | SELECT | `true` |
| Service role can manage stripe sessions | — | ALL | `auth.role() = 'service_role'` |

### failed_orders

| Policy Name | Role | Operation | Condition |
|---|---|---|---|
| Service role can manage failed orders | — | ALL | `auth.role() = 'service_role'` |

### function_errors

| Policy Name | Role | Operation | Condition |
|---|---|---|---|
| Service role can manage function errors | — | ALL | `auth.role() = 'service_role'` |

### sw_models_cache

| Policy Name | Role | Operation | Condition |
|---|---|---|---|
| sw_models_cache_service_all | — | ALL | `auth.role() = 'service_role'` |

### thumbnail_processing_queue

RLS enabled. No explicit policies defined in schema — access controlled at service level.

### hy_generated_jobs

| Policy Name | Role | Operation | Condition |
|---|---|---|---|
| Users can insert their own jobs | — | INSERT | `auth.uid() = user_id` |
| Users can update their own jobs | — | UPDATE | `auth.uid() = user_id` |
| Users can view their own jobs | — | SELECT | `auth.uid() = user_id` |

### hy_generated_models

| Policy Name | Role | Operation | Condition |
|---|---|---|---|
| Users can insert own models | — | INSERT | `auth.uid() = user_id` |
| Users can view own models | — | SELECT | `auth.uid() = user_id` |

### hy_generation_jobs

| Policy Name | Role | Operation | Condition |
|---|---|---|---|
| Users can insert own generation jobs | — | INSERT | `auth.uid() = user_id` |
| Users can update own generation jobs | — | UPDATE | `auth.uid() = user_id` |
| Users can view own generation jobs | — | SELECT | `auth.uid() = user_id` |

---

## Database Triggers

| Trigger Name | Table | Timing | Event | Invoked Function |
|---|---|---|---|---|
| `trg_update_quotes_updated_at` | `quotes` | BEFORE | UPDATE | `update_quotes_updated_at()` |
| `update_generation_tasks_updated_at` | `generation_tasks` | BEFORE | UPDATE | `update_updated_at_column()` |
| `update_orders_updated_at` | `orders` | BEFORE | UPDATE | `update_updated_at_column()` |
| *(on auth.users)* | `auth.users` | AFTER | INSERT | `handle_new_user()` |

> **Note:** The `handle_new_user` trigger fires on `auth.users` (managed by Supabase Auth) and inserts a corresponding row into `public.users`. The trigger definition lives in the auth schema and is not included in the public schema dump.

### Trigger Functions

| Function | Purpose |
|---|---|
| `update_updated_at_column()` | Sets `updated_at = NOW()` on the modified row |
| `update_quotes_updated_at()` | Sets `updated_at = now()` on the modified quotes row |
| `handle_new_user()` | Inserts a new `public.users` row with id, email, and full_name extracted from the auth user |
| `update_auth_user_metadata()` | Syncs `display_name` changes back to `auth.users.raw_user_meta_data` |

---

## Database Views

### `order_summary`

A read-friendly view of orders with flattened shipping address fields.

**Source table:** `orders`

| Column | Source |
|---|---|
| `id` | `orders.id` |
| `slant_order_id` | `orders.slant_order_id` |
| `order_number` | `orders.order_number` |
| `customer_name` | `orders.customer_name` |
| `customer_email` | `orders.customer_email` |
| `filename` | `orders.filename` |
| `quantity` | `orders.quantity` |
| `color` | `orders.color` |
| `profile` | `orders.profile` |
| `status` | `orders.status` |
| `tracking_numbers` | `orders.tracking_numbers` |
| `shipping_status` | `orders.shipping_status` |
| `label_download_url` | `orders.label_download_url` |
| `ship_to_name` | `orders.shipping_address ->> 'name'` |
| `ship_to_city` | `orders.shipping_address ->> 'city'` |
| `ship_to_state` | `orders.shipping_address ->> 'state'` |
| `created_at` | `orders.created_at` |
| `updated_at` | `orders.updated_at` |

**Ordering:** `created_at DESC`

---

### `quote_summary`

A read-friendly view of quotes with flattened shipping address contact fields.

**Source table:** `quotes`

| Column | Source |
|---|---|
| `id` | `quotes.id` |
| `user_id` | `quotes.user_id` |
| `vendor` | `quotes.vendor` |
| `model_url` | `quotes.model_url` |
| `material_id` | `quotes.material_id` |
| `quantity` | `quotes.quantity` |
| `price_total` | `quotes.price_total` |
| `currency` | `quotes.currency` |
| `status` | `quotes.status` |
| `shipping_zip` | `quotes.shipping_zip` |
| `first_name` | `quotes.shipping_address ->> 'firstName'` |
| `last_name` | `quotes.shipping_address ->> 'lastName'` |
| `phone` | `quotes.shipping_address ->> 'phone'` |
| `created_at` | `quotes.created_at` |
| `expires_at` | `quotes.expires_at` |

**Ordering:** `created_at DESC`

---

## Entity Relationship Summary

The following describes tables as nodes and foreign keys as labeled edges with cardinality, suitable for recreating as an Excalidraw diagram.

```
┌──────────────┐
│  auth.users  │
└──────┬───────┘
       │
       │ 1
       │
       ├────────────────── 1:1 ──────────────────┐
       │                                          ▼
       │                                   ┌────────────┐
       │                                   │   users    │
       │                                   └────────────┘
       │
       ├────────────────── 1:N ──────────────────┐
       │                                          ▼
       │                                   ┌─────────────────────┐
       │                                   │  generated_models   │
       │                                   └──────────┬──────────┘
       │                                              │ 1
       │                                              │
       │                                              ├── 1:N ──▶ ┌─────────────────────────────┐
       │                                              │            │ thumbnail_processing_queue  │
       │                                              │            └─────────────────────────────┘
       │
       ├────────────────── 1:N ──────────────────┐
       │                                          ▼
       │                                   ┌──────────────────┐
       │                                   │ generation_tasks  │
       │                                   └──────────────────┘
       │
       ├────────────────── 1:N ──────────────────┐
       │                                          ▼
       │                                   ┌────────────┐
       │                                   │   orders   │
       │                                   └────────────┘
       │
       ├────────────────── 1:N ──────────────────┐
       │                                          ▼
       │                                   ┌────────────┐
       │                                   │   quotes   │
       │                                   └────────────┘
       │
       ├────────────────── 1:N ──────────────────┐
       │                                          ▼
       │                                   ┌─────────────────────┐
       │                                   │  hy_generated_jobs  │
       │                                   └──────────┬──────────┘
       │                                              │ 1
       │                                              │
       │                                              ├── 1:N ──▶ ┌───────────────────────┐
       │                                                           │  hy_generated_models  │
       │                                                           └───────────────────────┘
       │
       ├────────────────── 1:N ──────────────────┐
       │                                          ▼
       │                                   ┌───────────────────────┐
       │                                   │  hy_generated_models  │
       │                                   └───────────────────────┘
       │
       └────────────────── 1:N ──────────────────┐
                                                  ▼
                                           ┌─────────────────────┐
                                           │  hy_generation_jobs  │
                                           └─────────────────────┘


Standalone tables (no foreign keys):
┌─────────────────────┐  ┌──────────────────┐  ┌────────────────┐
│  manufacturing_quotes│  │  stripe_sessions │  │  failed_orders │
└─────────────────────┘  └──────────────────┘  └────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐
│  function_errors │  │  sw_models_cache │  │ model_likes  │
└──────────────────┘  └──────────────────┘  └─────────────┘
```

### Edge Summary Table

| From | To | FK Column | Cardinality | ON DELETE |
|---|---|---|---|---|
| `auth.users` | `users` | `users.id` | 1:1 | — |
| `auth.users` | `generated_models` | `generated_models.user_id` | 1:N | CASCADE |
| `auth.users` | `generation_tasks` | `generation_tasks.user_id` | 1:N | — |
| `auth.users` | `orders` | `orders.user_id` | 1:N | — |
| `auth.users` | `quotes` | `quotes.user_id` | 1:N | SET NULL |
| `auth.users` | `hy_generated_jobs` | `hy_generated_jobs.user_id` | 1:N | CASCADE |
| `auth.users` | `hy_generated_models` | `hy_generated_models.user_id` | 1:N | CASCADE |
| `auth.users` | `hy_generation_jobs` | `hy_generation_jobs.user_id` | 1:N | CASCADE |
| `generated_models` | `thumbnail_processing_queue` | `thumbnail_processing_queue.model_id` | 1:N | CASCADE |
| `hy_generated_jobs` | `hy_generated_models` | `hy_generated_models.job_id` | 1:N | SET NULL |
