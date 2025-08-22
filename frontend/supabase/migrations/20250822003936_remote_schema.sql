drop extension if exists "pg_net";

create type "public"."model_status" as enum ('generating', 'ready', 'failed');

create type "public"."order_status" as enum ('pending', 'paid', 'manufacturing', 'shipped', 'delivered', 'cancelled');

create type "public"."provider_type" as enum ('printify', 'craftcloud', 'jlcpcb', 'xometry');

create type "public"."source_type" as enum ('text', 'image');

drop trigger if exists "trg_update_quotes_updated_at" on "public"."quotes";

drop policy "quotes_insert_own" on "public"."quotes";

drop policy "quotes_select_own" on "public"."quotes";

drop policy "quotes_service_all" on "public"."quotes";

drop policy "sw_models_cache_service_all" on "public"."sw_models_cache";

revoke delete on table "public"."quotes" from "anon";

revoke insert on table "public"."quotes" from "anon";

revoke references on table "public"."quotes" from "anon";

revoke select on table "public"."quotes" from "anon";

revoke trigger on table "public"."quotes" from "anon";

revoke truncate on table "public"."quotes" from "anon";

revoke update on table "public"."quotes" from "anon";

revoke delete on table "public"."quotes" from "authenticated";

revoke insert on table "public"."quotes" from "authenticated";

revoke references on table "public"."quotes" from "authenticated";

revoke select on table "public"."quotes" from "authenticated";

revoke trigger on table "public"."quotes" from "authenticated";

revoke truncate on table "public"."quotes" from "authenticated";

revoke update on table "public"."quotes" from "authenticated";

revoke delete on table "public"."quotes" from "service_role";

revoke insert on table "public"."quotes" from "service_role";

revoke references on table "public"."quotes" from "service_role";

revoke select on table "public"."quotes" from "service_role";

revoke trigger on table "public"."quotes" from "service_role";

revoke truncate on table "public"."quotes" from "service_role";

revoke update on table "public"."quotes" from "service_role";

revoke delete on table "public"."sw_models_cache" from "anon";

revoke insert on table "public"."sw_models_cache" from "anon";

revoke references on table "public"."sw_models_cache" from "anon";

revoke select on table "public"."sw_models_cache" from "anon";

revoke trigger on table "public"."sw_models_cache" from "anon";

revoke truncate on table "public"."sw_models_cache" from "anon";

revoke update on table "public"."sw_models_cache" from "anon";

revoke delete on table "public"."sw_models_cache" from "authenticated";

revoke insert on table "public"."sw_models_cache" from "authenticated";

revoke references on table "public"."sw_models_cache" from "authenticated";

revoke select on table "public"."sw_models_cache" from "authenticated";

revoke trigger on table "public"."sw_models_cache" from "authenticated";

revoke truncate on table "public"."sw_models_cache" from "authenticated";

revoke update on table "public"."sw_models_cache" from "authenticated";

revoke delete on table "public"."sw_models_cache" from "service_role";

revoke insert on table "public"."sw_models_cache" from "service_role";

revoke references on table "public"."sw_models_cache" from "service_role";

revoke select on table "public"."sw_models_cache" from "service_role";

revoke trigger on table "public"."sw_models_cache" from "service_role";

revoke truncate on table "public"."sw_models_cache" from "service_role";

revoke update on table "public"."sw_models_cache" from "service_role";

alter table "public"."quotes" drop constraint "quotes_quantity_check";

alter table "public"."quotes" drop constraint "quotes_status_check";

alter table "public"."quotes" drop constraint "quotes_user_id_fkey";

alter table "public"."quotes" drop constraint "quotes_vendor_check";

alter table "public"."sw_models_cache" drop constraint "sw_models_cache_file_hash_key";

drop view if exists "public"."quote_summary";

drop function if exists "public"."update_quotes_updated_at"();

alter table "public"."quotes" drop constraint "quotes_pkey";

alter table "public"."sw_models_cache" drop constraint "sw_models_cache_pkey";

drop index if exists "public"."quotes_expires_idx";

drop index if exists "public"."quotes_file_hash_idx";

drop index if exists "public"."quotes_material_idx";

drop index if exists "public"."quotes_pkey";

drop index if exists "public"."quotes_shipping_zip_idx";

drop index if exists "public"."quotes_status_idx";

drop index if exists "public"."quotes_user_created_idx";

drop index if exists "public"."sw_models_cache_file_hash_key";

drop index if exists "public"."sw_models_cache_pkey";

drop table "public"."quotes";

drop table "public"."sw_models_cache";


  create table "public"."failed_orders" (
    "id" uuid not null default gen_random_uuid(),
    "order_data" jsonb not null,
    "payment_info" jsonb,
    "error_message" text,
    "api_status" integer,
    "processed" boolean default false,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."failed_orders" enable row level security;


  create table "public"."function_errors" (
    "id" uuid not null default gen_random_uuid(),
    "function_name" text not null,
    "error_message" text,
    "error_stack" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."function_errors" enable row level security;


  create table "public"."generated_models" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "name" text,
    "prompt" text,
    "style" text,
    "obj_url" text,
    "stl_url" text,
    "glb_url" text,
    "thumbnail_url" text,
    "status" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "task_id" text default ''::text,
    "thumbnail_status" text,
    "thumbnail_angles" jsonb,
    "thumbnail_selected" text default 'isometric'::text,
    "thumbnail_custom" boolean default false,
    "thumbnail_error" text,
    "type" character varying(50),
    "mode" text default 'preview'::text
      );


alter table "public"."generated_models" enable row level security;


  create table "public"."generation_tasks" (
    "id" uuid not null default gen_random_uuid(),
    "task_id" text not null,
    "user_id" uuid,
    "status" text not null default 'PENDING'::text,
    "type" text not null,
    "prompt" text,
    "image_url" text,
    "model_urls" jsonb,
    "error_message" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone
      );


alter table "public"."generation_tasks" enable row level security;


  create table "public"."hy_generated_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "prompt_id" text not null,
    "status" text not null default 'pending'::text,
    "progress" integer default 0,
    "prompt" text,
    "image_filename" text,
    "workflow_type" text default 'hy3d'::text,
    "workflow_nodes" integer,
    "comfyui_server" text,
    "output_files" jsonb,
    "primary_model_url" text,
    "primary_preview_url" text,
    "execution_time" text,
    "error_message" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."hy_generated_jobs" enable row level security;


  create table "public"."hy_generated_models" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "prompt" text not null,
    "style" text,
    "obj_url" text not null,
    "stl_url" text not null,
    "glb_url" text not null,
    "thumbnail_url" text,
    "status" text not null default 'processing'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "job_id" uuid
      );


alter table "public"."hy_generated_models" enable row level security;


  create table "public"."hy_generation_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "prompt_id" text not null,
    "status" text not null default 'queued'::text,
    "progress" integer default 0,
    "prompt" text,
    "image_filename" text,
    "workflow_type" text default 'hy3d'::text,
    "output_files" jsonb default '[]'::jsonb,
    "primary_model_url" text,
    "primary_preview_url" text,
    "error_message" text,
    "execution_time" text,
    "workflow_nodes" integer,
    "comfyui_server" text default 'http://comfy.tunell.live'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."hy_generation_jobs" enable row level security;


  create table "public"."manufacturing_quotes" (
    "id" uuid not null default uuid_generate_v4(),
    "model_id" uuid not null,
    "material" text not null,
    "quantity" integer not null,
    "price" numeric(10,2) not null,
    "shipping_price" numeric(10,2) not null,
    "estimated_days" integer not null,
    "quote_data" jsonb not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "expires_at" timestamp with time zone not null,
    "manufacturer" character varying(50) default 'slant3d'::character varying,
    "vendor_model_id" character varying(255)
      );


alter table "public"."manufacturing_quotes" enable row level security;


  create table "public"."model_likes" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "model_id" uuid not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."model_likes" enable row level security;


  create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "slant_order_id" text,
    "order_number" text not null,
    "customer_name" text not null,
    "customer_email" text not null,
    "customer_phone" text,
    "file_url" text not null,
    "filename" text not null,
    "quantity" integer not null default 1,
    "color" text not null,
    "profile" text default 'PLA'::text,
    "status" text default 'created'::text,
    "stripe_session_id" text,
    "amount_paid" integer,
    "payment_status" text default 'pending'::text,
    "tracking_numbers" text[],
    "shipping_status" text,
    "label_download_url" text,
    "billing_address" jsonb,
    "shipping_address" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "shipped_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "order_data" jsonb,
    "user_id" uuid,
    "slant_response" jsonb
      );


alter table "public"."orders" enable row level security;


  create table "public"."stripe_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "session_id" text not null,
    "payment_status" text not null,
    "amount_total" integer,
    "customer_email" text,
    "metadata" jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."stripe_sessions" enable row level security;


  create table "public"."thumbnail_processing_queue" (
    "id" uuid not null default gen_random_uuid(),
    "model_id" uuid,
    "status" text default 'pending'::text,
    "priority" integer default 0,
    "attempts" integer default 0,
    "max_attempts" integer default 3,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "error_message" text,
    "processing_started_at" timestamp with time zone
      );



  create table "public"."users" (
    "id" uuid not null,
    "email" text not null,
    "full_name" text not null,
    "avatar_url" text,
    "stripe_customer_id" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "bio" text
      );


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX failed_orders_pkey ON public.failed_orders USING btree (id);

CREATE UNIQUE INDEX function_errors_pkey ON public.function_errors USING btree (id);

CREATE UNIQUE INDEX generated_models_pkey ON public.generated_models USING btree (id);

CREATE UNIQUE INDEX generation_tasks_pkey ON public.generation_tasks USING btree (id);

CREATE UNIQUE INDEX generation_tasks_task_id_key ON public.generation_tasks USING btree (task_id);

CREATE UNIQUE INDEX hy_generated_jobs_pkey ON public.hy_generated_jobs USING btree (id);

CREATE UNIQUE INDEX hy_generated_models_pkey ON public.hy_generated_models USING btree (id);

CREATE UNIQUE INDEX hy_generation_jobs_pkey ON public.hy_generation_jobs USING btree (id);

CREATE INDEX idx_failed_orders_processed ON public.failed_orders USING btree (processed) WHERE (processed = false);

CREATE INDEX idx_generated_models_created_at ON public.generated_models USING btree (created_at DESC);

CREATE INDEX idx_generated_models_status ON public.generated_models USING btree (status);

CREATE INDEX idx_generated_models_user_id ON public.generated_models USING btree (user_id);

CREATE INDEX idx_generation_jobs_prompt_id ON public.hy_generation_jobs USING btree (prompt_id);

CREATE INDEX idx_generation_jobs_status ON public.hy_generation_jobs USING btree (status);

CREATE INDEX idx_generation_jobs_user_id ON public.hy_generation_jobs USING btree (user_id);

CREATE INDEX idx_generation_tasks_created_at ON public.generation_tasks USING btree (created_at);

CREATE INDEX idx_generation_tasks_status ON public.generation_tasks USING btree (status);

CREATE INDEX idx_generation_tasks_task_id ON public.generation_tasks USING btree (task_id);

CREATE INDEX idx_generation_tasks_user_id ON public.generation_tasks USING btree (user_id);

CREATE INDEX idx_hy_generated_jobs_created_at ON public.hy_generated_jobs USING btree (created_at);

CREATE INDEX idx_hy_generated_jobs_prompt_id ON public.hy_generated_jobs USING btree (prompt_id);

CREATE INDEX idx_hy_generated_jobs_status ON public.hy_generated_jobs USING btree (status);

CREATE INDEX idx_hy_generated_jobs_user_id ON public.hy_generated_jobs USING btree (user_id);

CREATE INDEX idx_model_likes_user_model ON public.model_likes USING btree (user_id, model_id);

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);

CREATE INDEX idx_orders_customer_email ON public.orders USING btree (customer_email);

CREATE INDEX idx_orders_slant_order_id ON public.orders USING btree (slant_order_id);

CREATE INDEX idx_orders_status ON public.orders USING btree (status);

CREATE INDEX idx_orders_tracking ON public.orders USING gin (tracking_numbers);

CREATE INDEX idx_orders_tracking_numbers ON public.orders USING gin (tracking_numbers);

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);

CREATE INDEX idx_stripe_sessions_session_id ON public.stripe_sessions USING btree (session_id);

CREATE INDEX idx_thumbnail_queue_status_priority ON public.thumbnail_processing_queue USING btree (status, priority DESC, created_at);

CREATE UNIQUE INDEX manufacturing_quotes_pkey ON public.manufacturing_quotes USING btree (id);

CREATE UNIQUE INDEX model_likes_pkey ON public.model_likes USING btree (id);

CREATE UNIQUE INDEX model_likes_user_id_model_id_key ON public.model_likes USING btree (user_id, model_id);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE UNIQUE INDEX orders_slant_order_id_key ON public.orders USING btree (slant_order_id);

CREATE UNIQUE INDEX stripe_sessions_pkey ON public.stripe_sessions USING btree (id);

CREATE UNIQUE INDEX stripe_sessions_session_id_key ON public.stripe_sessions USING btree (session_id);

CREATE UNIQUE INDEX thumbnail_processing_queue_pkey ON public.thumbnail_processing_queue USING btree (id);

CREATE UNIQUE INDEX users_pkey1 ON public.users USING btree (id);

alter table "public"."failed_orders" add constraint "failed_orders_pkey" PRIMARY KEY using index "failed_orders_pkey";

alter table "public"."function_errors" add constraint "function_errors_pkey" PRIMARY KEY using index "function_errors_pkey";

alter table "public"."generated_models" add constraint "generated_models_pkey" PRIMARY KEY using index "generated_models_pkey";

alter table "public"."generation_tasks" add constraint "generation_tasks_pkey" PRIMARY KEY using index "generation_tasks_pkey";

alter table "public"."hy_generated_jobs" add constraint "hy_generated_jobs_pkey" PRIMARY KEY using index "hy_generated_jobs_pkey";

alter table "public"."hy_generated_models" add constraint "hy_generated_models_pkey" PRIMARY KEY using index "hy_generated_models_pkey";

alter table "public"."hy_generation_jobs" add constraint "hy_generation_jobs_pkey" PRIMARY KEY using index "hy_generation_jobs_pkey";

alter table "public"."manufacturing_quotes" add constraint "manufacturing_quotes_pkey" PRIMARY KEY using index "manufacturing_quotes_pkey";

alter table "public"."model_likes" add constraint "model_likes_pkey" PRIMARY KEY using index "model_likes_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."stripe_sessions" add constraint "stripe_sessions_pkey" PRIMARY KEY using index "stripe_sessions_pkey";

alter table "public"."thumbnail_processing_queue" add constraint "thumbnail_processing_queue_pkey" PRIMARY KEY using index "thumbnail_processing_queue_pkey";

alter table "public"."users" add constraint "users_pkey1" PRIMARY KEY using index "users_pkey1";

alter table "public"."generated_models" add constraint "generated_models_status_check" CHECK ((status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text]))) not valid;

alter table "public"."generated_models" validate constraint "generated_models_status_check";

alter table "public"."generated_models" add constraint "generated_models_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."generated_models" validate constraint "generated_models_user_id_fkey";

alter table "public"."generation_tasks" add constraint "generation_tasks_task_id_key" UNIQUE using index "generation_tasks_task_id_key";

alter table "public"."generation_tasks" add constraint "generation_tasks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."generation_tasks" validate constraint "generation_tasks_user_id_fkey";

alter table "public"."hy_generated_jobs" add constraint "hy_generated_jobs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."hy_generated_jobs" validate constraint "hy_generated_jobs_user_id_fkey";

alter table "public"."hy_generated_models" add constraint "hy_generated_models_job_id_fkey" FOREIGN KEY (job_id) REFERENCES hy_generated_jobs(id) ON DELETE SET NULL not valid;

alter table "public"."hy_generated_models" validate constraint "hy_generated_models_job_id_fkey";

alter table "public"."hy_generated_models" add constraint "hy_generated_models_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."hy_generated_models" validate constraint "hy_generated_models_user_id_fkey";

alter table "public"."hy_generation_jobs" add constraint "hy_generation_jobs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."hy_generation_jobs" validate constraint "hy_generation_jobs_user_id_fkey";

alter table "public"."model_likes" add constraint "model_likes_user_id_model_id_key" UNIQUE using index "model_likes_user_id_model_id_key";

alter table "public"."orders" add constraint "orders_slant_order_id_key" UNIQUE using index "orders_slant_order_id_key";

alter table "public"."orders" add constraint "orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."orders" validate constraint "orders_user_id_fkey";

alter table "public"."stripe_sessions" add constraint "stripe_sessions_session_id_key" UNIQUE using index "stripe_sessions_session_id_key";

alter table "public"."thumbnail_processing_queue" add constraint "thumbnail_processing_queue_model_id_fkey" FOREIGN KEY (model_id) REFERENCES generated_models(id) ON DELETE CASCADE not valid;

alter table "public"."thumbnail_processing_queue" validate constraint "thumbnail_processing_queue_model_id_fkey";

alter table "public"."users" add constraint "users_id_fkey1" FOREIGN KEY (id) REFERENCES auth.users(id) not valid;

alter table "public"."users" validate constraint "users_id_fkey1";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$function$
;

create or replace view "public"."order_summary" as  SELECT id,
    slant_order_id,
    order_number,
    customer_name,
    customer_email,
    filename,
    quantity,
    color,
    profile,
    status,
    tracking_numbers,
    shipping_status,
    label_download_url,
    (shipping_address ->> 'name'::text) AS ship_to_name,
    (shipping_address ->> 'city'::text) AS ship_to_city,
    (shipping_address ->> 'state'::text) AS ship_to_state,
    created_at,
    updated_at
   FROM orders
  ORDER BY created_at DESC;


CREATE OR REPLACE FUNCTION public.update_auth_user_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object('full_name', NEW.display_name)
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."failed_orders" to "anon";

grant insert on table "public"."failed_orders" to "anon";

grant references on table "public"."failed_orders" to "anon";

grant select on table "public"."failed_orders" to "anon";

grant trigger on table "public"."failed_orders" to "anon";

grant truncate on table "public"."failed_orders" to "anon";

grant update on table "public"."failed_orders" to "anon";

grant delete on table "public"."failed_orders" to "authenticated";

grant insert on table "public"."failed_orders" to "authenticated";

grant references on table "public"."failed_orders" to "authenticated";

grant select on table "public"."failed_orders" to "authenticated";

grant trigger on table "public"."failed_orders" to "authenticated";

grant truncate on table "public"."failed_orders" to "authenticated";

grant update on table "public"."failed_orders" to "authenticated";

grant delete on table "public"."failed_orders" to "service_role";

grant insert on table "public"."failed_orders" to "service_role";

grant references on table "public"."failed_orders" to "service_role";

grant select on table "public"."failed_orders" to "service_role";

grant trigger on table "public"."failed_orders" to "service_role";

grant truncate on table "public"."failed_orders" to "service_role";

grant update on table "public"."failed_orders" to "service_role";

grant delete on table "public"."function_errors" to "anon";

grant insert on table "public"."function_errors" to "anon";

grant references on table "public"."function_errors" to "anon";

grant select on table "public"."function_errors" to "anon";

grant trigger on table "public"."function_errors" to "anon";

grant truncate on table "public"."function_errors" to "anon";

grant update on table "public"."function_errors" to "anon";

grant delete on table "public"."function_errors" to "authenticated";

grant insert on table "public"."function_errors" to "authenticated";

grant references on table "public"."function_errors" to "authenticated";

grant select on table "public"."function_errors" to "authenticated";

grant trigger on table "public"."function_errors" to "authenticated";

grant truncate on table "public"."function_errors" to "authenticated";

grant update on table "public"."function_errors" to "authenticated";

grant delete on table "public"."function_errors" to "service_role";

grant insert on table "public"."function_errors" to "service_role";

grant references on table "public"."function_errors" to "service_role";

grant select on table "public"."function_errors" to "service_role";

grant trigger on table "public"."function_errors" to "service_role";

grant truncate on table "public"."function_errors" to "service_role";

grant update on table "public"."function_errors" to "service_role";

grant delete on table "public"."generated_models" to "anon";

grant insert on table "public"."generated_models" to "anon";

grant references on table "public"."generated_models" to "anon";

grant select on table "public"."generated_models" to "anon";

grant trigger on table "public"."generated_models" to "anon";

grant truncate on table "public"."generated_models" to "anon";

grant update on table "public"."generated_models" to "anon";

grant delete on table "public"."generated_models" to "authenticated";

grant insert on table "public"."generated_models" to "authenticated";

grant references on table "public"."generated_models" to "authenticated";

grant select on table "public"."generated_models" to "authenticated";

grant trigger on table "public"."generated_models" to "authenticated";

grant truncate on table "public"."generated_models" to "authenticated";

grant update on table "public"."generated_models" to "authenticated";

grant delete on table "public"."generated_models" to "service_role";

grant insert on table "public"."generated_models" to "service_role";

grant references on table "public"."generated_models" to "service_role";

grant select on table "public"."generated_models" to "service_role";

grant trigger on table "public"."generated_models" to "service_role";

grant truncate on table "public"."generated_models" to "service_role";

grant update on table "public"."generated_models" to "service_role";

grant delete on table "public"."generation_tasks" to "anon";

grant insert on table "public"."generation_tasks" to "anon";

grant references on table "public"."generation_tasks" to "anon";

grant select on table "public"."generation_tasks" to "anon";

grant trigger on table "public"."generation_tasks" to "anon";

grant truncate on table "public"."generation_tasks" to "anon";

grant update on table "public"."generation_tasks" to "anon";

grant delete on table "public"."generation_tasks" to "authenticated";

grant insert on table "public"."generation_tasks" to "authenticated";

grant references on table "public"."generation_tasks" to "authenticated";

grant select on table "public"."generation_tasks" to "authenticated";

grant trigger on table "public"."generation_tasks" to "authenticated";

grant truncate on table "public"."generation_tasks" to "authenticated";

grant update on table "public"."generation_tasks" to "authenticated";

grant delete on table "public"."generation_tasks" to "service_role";

grant insert on table "public"."generation_tasks" to "service_role";

grant references on table "public"."generation_tasks" to "service_role";

grant select on table "public"."generation_tasks" to "service_role";

grant trigger on table "public"."generation_tasks" to "service_role";

grant truncate on table "public"."generation_tasks" to "service_role";

grant update on table "public"."generation_tasks" to "service_role";

grant delete on table "public"."hy_generated_jobs" to "anon";

grant insert on table "public"."hy_generated_jobs" to "anon";

grant references on table "public"."hy_generated_jobs" to "anon";

grant select on table "public"."hy_generated_jobs" to "anon";

grant trigger on table "public"."hy_generated_jobs" to "anon";

grant truncate on table "public"."hy_generated_jobs" to "anon";

grant update on table "public"."hy_generated_jobs" to "anon";

grant delete on table "public"."hy_generated_jobs" to "authenticated";

grant insert on table "public"."hy_generated_jobs" to "authenticated";

grant references on table "public"."hy_generated_jobs" to "authenticated";

grant select on table "public"."hy_generated_jobs" to "authenticated";

grant trigger on table "public"."hy_generated_jobs" to "authenticated";

grant truncate on table "public"."hy_generated_jobs" to "authenticated";

grant update on table "public"."hy_generated_jobs" to "authenticated";

grant delete on table "public"."hy_generated_jobs" to "service_role";

grant insert on table "public"."hy_generated_jobs" to "service_role";

grant references on table "public"."hy_generated_jobs" to "service_role";

grant select on table "public"."hy_generated_jobs" to "service_role";

grant trigger on table "public"."hy_generated_jobs" to "service_role";

grant truncate on table "public"."hy_generated_jobs" to "service_role";

grant update on table "public"."hy_generated_jobs" to "service_role";

grant delete on table "public"."hy_generated_models" to "anon";

grant insert on table "public"."hy_generated_models" to "anon";

grant references on table "public"."hy_generated_models" to "anon";

grant select on table "public"."hy_generated_models" to "anon";

grant trigger on table "public"."hy_generated_models" to "anon";

grant truncate on table "public"."hy_generated_models" to "anon";

grant update on table "public"."hy_generated_models" to "anon";

grant delete on table "public"."hy_generated_models" to "authenticated";

grant insert on table "public"."hy_generated_models" to "authenticated";

grant references on table "public"."hy_generated_models" to "authenticated";

grant select on table "public"."hy_generated_models" to "authenticated";

grant trigger on table "public"."hy_generated_models" to "authenticated";

grant truncate on table "public"."hy_generated_models" to "authenticated";

grant update on table "public"."hy_generated_models" to "authenticated";

grant delete on table "public"."hy_generated_models" to "service_role";

grant insert on table "public"."hy_generated_models" to "service_role";

grant references on table "public"."hy_generated_models" to "service_role";

grant select on table "public"."hy_generated_models" to "service_role";

grant trigger on table "public"."hy_generated_models" to "service_role";

grant truncate on table "public"."hy_generated_models" to "service_role";

grant update on table "public"."hy_generated_models" to "service_role";

grant delete on table "public"."hy_generation_jobs" to "anon";

grant insert on table "public"."hy_generation_jobs" to "anon";

grant references on table "public"."hy_generation_jobs" to "anon";

grant select on table "public"."hy_generation_jobs" to "anon";

grant trigger on table "public"."hy_generation_jobs" to "anon";

grant truncate on table "public"."hy_generation_jobs" to "anon";

grant update on table "public"."hy_generation_jobs" to "anon";

grant delete on table "public"."hy_generation_jobs" to "authenticated";

grant insert on table "public"."hy_generation_jobs" to "authenticated";

grant references on table "public"."hy_generation_jobs" to "authenticated";

grant select on table "public"."hy_generation_jobs" to "authenticated";

grant trigger on table "public"."hy_generation_jobs" to "authenticated";

grant truncate on table "public"."hy_generation_jobs" to "authenticated";

grant update on table "public"."hy_generation_jobs" to "authenticated";

grant delete on table "public"."hy_generation_jobs" to "service_role";

grant insert on table "public"."hy_generation_jobs" to "service_role";

grant references on table "public"."hy_generation_jobs" to "service_role";

grant select on table "public"."hy_generation_jobs" to "service_role";

grant trigger on table "public"."hy_generation_jobs" to "service_role";

grant truncate on table "public"."hy_generation_jobs" to "service_role";

grant update on table "public"."hy_generation_jobs" to "service_role";

grant delete on table "public"."manufacturing_quotes" to "anon";

grant insert on table "public"."manufacturing_quotes" to "anon";

grant references on table "public"."manufacturing_quotes" to "anon";

grant select on table "public"."manufacturing_quotes" to "anon";

grant trigger on table "public"."manufacturing_quotes" to "anon";

grant truncate on table "public"."manufacturing_quotes" to "anon";

grant update on table "public"."manufacturing_quotes" to "anon";

grant delete on table "public"."manufacturing_quotes" to "authenticated";

grant insert on table "public"."manufacturing_quotes" to "authenticated";

grant references on table "public"."manufacturing_quotes" to "authenticated";

grant select on table "public"."manufacturing_quotes" to "authenticated";

grant trigger on table "public"."manufacturing_quotes" to "authenticated";

grant truncate on table "public"."manufacturing_quotes" to "authenticated";

grant update on table "public"."manufacturing_quotes" to "authenticated";

grant delete on table "public"."manufacturing_quotes" to "service_role";

grant insert on table "public"."manufacturing_quotes" to "service_role";

grant references on table "public"."manufacturing_quotes" to "service_role";

grant select on table "public"."manufacturing_quotes" to "service_role";

grant trigger on table "public"."manufacturing_quotes" to "service_role";

grant truncate on table "public"."manufacturing_quotes" to "service_role";

grant update on table "public"."manufacturing_quotes" to "service_role";

grant delete on table "public"."model_likes" to "anon";

grant insert on table "public"."model_likes" to "anon";

grant references on table "public"."model_likes" to "anon";

grant select on table "public"."model_likes" to "anon";

grant trigger on table "public"."model_likes" to "anon";

grant truncate on table "public"."model_likes" to "anon";

grant update on table "public"."model_likes" to "anon";

grant delete on table "public"."model_likes" to "authenticated";

grant insert on table "public"."model_likes" to "authenticated";

grant references on table "public"."model_likes" to "authenticated";

grant select on table "public"."model_likes" to "authenticated";

grant trigger on table "public"."model_likes" to "authenticated";

grant truncate on table "public"."model_likes" to "authenticated";

grant update on table "public"."model_likes" to "authenticated";

grant delete on table "public"."model_likes" to "service_role";

grant insert on table "public"."model_likes" to "service_role";

grant references on table "public"."model_likes" to "service_role";

grant select on table "public"."model_likes" to "service_role";

grant trigger on table "public"."model_likes" to "service_role";

grant truncate on table "public"."model_likes" to "service_role";

grant update on table "public"."model_likes" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."stripe_sessions" to "anon";

grant insert on table "public"."stripe_sessions" to "anon";

grant references on table "public"."stripe_sessions" to "anon";

grant select on table "public"."stripe_sessions" to "anon";

grant trigger on table "public"."stripe_sessions" to "anon";

grant truncate on table "public"."stripe_sessions" to "anon";

grant update on table "public"."stripe_sessions" to "anon";

grant delete on table "public"."stripe_sessions" to "authenticated";

grant insert on table "public"."stripe_sessions" to "authenticated";

grant references on table "public"."stripe_sessions" to "authenticated";

grant select on table "public"."stripe_sessions" to "authenticated";

grant trigger on table "public"."stripe_sessions" to "authenticated";

grant truncate on table "public"."stripe_sessions" to "authenticated";

grant update on table "public"."stripe_sessions" to "authenticated";

grant delete on table "public"."stripe_sessions" to "service_role";

grant insert on table "public"."stripe_sessions" to "service_role";

grant references on table "public"."stripe_sessions" to "service_role";

grant select on table "public"."stripe_sessions" to "service_role";

grant trigger on table "public"."stripe_sessions" to "service_role";

grant truncate on table "public"."stripe_sessions" to "service_role";

grant update on table "public"."stripe_sessions" to "service_role";

grant delete on table "public"."thumbnail_processing_queue" to "anon";

grant insert on table "public"."thumbnail_processing_queue" to "anon";

grant references on table "public"."thumbnail_processing_queue" to "anon";

grant select on table "public"."thumbnail_processing_queue" to "anon";

grant trigger on table "public"."thumbnail_processing_queue" to "anon";

grant truncate on table "public"."thumbnail_processing_queue" to "anon";

grant update on table "public"."thumbnail_processing_queue" to "anon";

grant delete on table "public"."thumbnail_processing_queue" to "authenticated";

grant insert on table "public"."thumbnail_processing_queue" to "authenticated";

grant references on table "public"."thumbnail_processing_queue" to "authenticated";

grant select on table "public"."thumbnail_processing_queue" to "authenticated";

grant trigger on table "public"."thumbnail_processing_queue" to "authenticated";

grant truncate on table "public"."thumbnail_processing_queue" to "authenticated";

grant update on table "public"."thumbnail_processing_queue" to "authenticated";

grant delete on table "public"."thumbnail_processing_queue" to "service_role";

grant insert on table "public"."thumbnail_processing_queue" to "service_role";

grant references on table "public"."thumbnail_processing_queue" to "service_role";

grant select on table "public"."thumbnail_processing_queue" to "service_role";

grant trigger on table "public"."thumbnail_processing_queue" to "service_role";

grant truncate on table "public"."thumbnail_processing_queue" to "service_role";

grant update on table "public"."thumbnail_processing_queue" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "Service role can manage failed orders"
  on "public"."failed_orders"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Service role can manage function errors"
  on "public"."function_errors"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Allow read of completed models for all"
  on "public"."generated_models"
  as permissive
  for select
  to public
using ((status = 'completed'::text));



  create policy "Service role can insert generated models"
  on "public"."generated_models"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "Service role can read generated models"
  on "public"."generated_models"
  as permissive
  for select
  to service_role
using (true);



  create policy "Service role can update generated models"
  on "public"."generated_models"
  as permissive
  for update
  to service_role
using (true);



  create policy "Users can access their own models"
  on "public"."generated_models"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Users can create their own models"
  on "public"."generated_models"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can insert their own generated models"
  on "public"."generated_models"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can read their own generated models"
  on "public"."generated_models"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can update their own generated models"
  on "public"."generated_models"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can view their own models"
  on "public"."generated_models"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Service role can manage all tasks"
  on "public"."generation_tasks"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Users can insert their own tasks"
  on "public"."generation_tasks"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view their own tasks"
  on "public"."generation_tasks"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own jobs"
  on "public"."hy_generated_jobs"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own jobs"
  on "public"."hy_generated_jobs"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own jobs"
  on "public"."hy_generated_jobs"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert own models"
  on "public"."hy_generated_models"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view own models"
  on "public"."hy_generated_models"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert own generation jobs"
  on "public"."hy_generation_jobs"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update own generation jobs"
  on "public"."hy_generation_jobs"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view own generation jobs"
  on "public"."hy_generation_jobs"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can manage their own likes"
  on "public"."model_likes"
  as permissive
  for all
  to public
using ((user_id = auth.uid()));



  create policy "Service role can manage all orders"
  on "public"."orders"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Users can view their own orders"
  on "public"."orders"
  as permissive
  for select
  to public
using ((customer_email = (auth.jwt() ->> 'email'::text)));



  create policy "Allow authenticated users to read stripe sessions"
  on "public"."stripe_sessions"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Service role can insert stripe sessions"
  on "public"."stripe_sessions"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "Service role can manage stripe sessions"
  on "public"."stripe_sessions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Service role can read stripe sessions"
  on "public"."stripe_sessions"
  as permissive
  for select
  to service_role
using (true);



  create policy "Users can update their own data"
  on "public"."users"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Users can view their own data"
  on "public"."users"
  as permissive
  for select
  to public
using ((auth.uid() = id));


CREATE TRIGGER update_generation_tasks_updated_at BEFORE UPDATE ON public.generation_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


