

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."model_status" AS ENUM (
    'generating',
    'ready',
    'failed'
);


ALTER TYPE "public"."model_status" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'paid',
    'manufacturing',
    'shipped',
    'delivered',
    'cancelled'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."provider_type" AS ENUM (
    'printify',
    'craftcloud',
    'jlcpcb',
    'xometry'
);


ALTER TYPE "public"."provider_type" OWNER TO "postgres";


CREATE TYPE "public"."source_type" AS ENUM (
    'text',
    'image'
);


ALTER TYPE "public"."source_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_auth_user_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object('full_name', NEW.display_name)
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_auth_user_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."failed_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_data" "jsonb" NOT NULL,
    "payment_info" "jsonb",
    "error_message" "text",
    "api_status" integer,
    "processed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."failed_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."function_errors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "function_name" "text" NOT NULL,
    "error_message" "text",
    "error_stack" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."function_errors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."generated_models" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text",
    "prompt" "text",
    "style" "text",
    "obj_url" "text",
    "stl_url" "text",
    "glb_url" "text",
    "thumbnail_url" "text",
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "task_id" "text" DEFAULT ''::"text",
    "thumbnail_status" "text",
    "thumbnail_angles" "jsonb",
    "thumbnail_selected" "text" DEFAULT 'isometric'::"text",
    "thumbnail_custom" boolean DEFAULT false,
    "thumbnail_error" "text",
    "type" character varying(50),
    CONSTRAINT "generated_models_status_check" CHECK (("status" = ANY (ARRAY['processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."generated_models" OWNER TO "postgres";


COMMENT ON COLUMN "public"."generated_models"."thumbnail_status" IS 'Status of thumbnail generation process';



COMMENT ON COLUMN "public"."generated_models"."thumbnail_angles" IS 'Array of thumbnail images taken from different angles';



COMMENT ON COLUMN "public"."generated_models"."thumbnail_selected" IS 'Index of the selected thumbnail from angles array';



COMMENT ON COLUMN "public"."generated_models"."thumbnail_custom" IS 'Whether user uploaded a custom thumbnail';



COMMENT ON COLUMN "public"."generated_models"."thumbnail_error" IS 'Error message if thumbnail generation failed';



CREATE TABLE IF NOT EXISTS "public"."generation_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "text" NOT NULL,
    "user_id" "uuid",
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "type" "text" NOT NULL,
    "prompt" "text",
    "image_url" "text",
    "model_urls" "jsonb",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."generation_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hy_generated_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "prompt_id" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "progress" integer DEFAULT 0,
    "prompt" "text",
    "image_filename" "text",
    "workflow_type" "text" DEFAULT 'hy3d'::"text",
    "workflow_nodes" integer,
    "comfyui_server" "text",
    "output_files" "jsonb",
    "primary_model_url" "text",
    "primary_preview_url" "text",
    "execution_time" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hy_generated_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hy_generated_models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "prompt" "text" NOT NULL,
    "style" "text",
    "obj_url" "text" NOT NULL,
    "stl_url" "text" NOT NULL,
    "glb_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "job_id" "uuid"
);


ALTER TABLE "public"."hy_generated_models" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hy_generation_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "prompt_id" "text" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "progress" integer DEFAULT 0,
    "prompt" "text",
    "image_filename" "text",
    "workflow_type" "text" DEFAULT 'hy3d'::"text",
    "output_files" "jsonb" DEFAULT '[]'::"jsonb",
    "primary_model_url" "text",
    "primary_preview_url" "text",
    "error_message" "text",
    "execution_time" "text",
    "workflow_nodes" integer,
    "comfyui_server" "text" DEFAULT 'http://comfy.tunell.live'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hy_generation_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manufacturing_quotes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "model_id" "uuid" NOT NULL,
    "material" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "shipping_price" numeric(10,2) NOT NULL,
    "estimated_days" integer NOT NULL,
    "quote_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "manufacturer" character varying(50) DEFAULT 'slant3d'::character varying,
    "vendor_model_id" character varying(255)
);


ALTER TABLE "public"."manufacturing_quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."model_likes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "model_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."model_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slant_order_id" "text",
    "order_number" "text" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_email" "text" NOT NULL,
    "customer_phone" "text",
    "file_url" "text" NOT NULL,
    "filename" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "color" "text" NOT NULL,
    "profile" "text" DEFAULT 'PLA'::"text",
    "status" "text" DEFAULT 'created'::"text",
    "stripe_session_id" "text",
    "amount_paid" integer,
    "payment_status" "text" DEFAULT 'pending'::"text",
    "tracking_numbers" "text"[],
    "shipping_status" "text",
    "label_download_url" "text",
    "billing_address" "jsonb",
    "shipping_address" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "shipped_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "order_data" "jsonb",
    "user_id" "uuid",
    "slant_response" "jsonb"
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_summary" AS
 SELECT "id",
    "slant_order_id",
    "order_number",
    "customer_name",
    "customer_email",
    "filename",
    "quantity",
    "color",
    "profile",
    "status",
    "tracking_numbers",
    "shipping_status",
    "label_download_url",
    ("shipping_address" ->> 'name'::"text") AS "ship_to_name",
    ("shipping_address" ->> 'city'::"text") AS "ship_to_city",
    ("shipping_address" ->> 'state'::"text") AS "ship_to_state",
    "created_at",
    "updated_at"
   FROM "public"."orders"
  ORDER BY "created_at" DESC;


ALTER VIEW "public"."order_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "text" NOT NULL,
    "payment_status" "text" NOT NULL,
    "amount_total" integer,
    "customer_email" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stripe_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."thumbnail_processing_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "model_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "priority" integer DEFAULT 0,
    "attempts" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 3,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "error_message" "text",
    "processing_started_at" timestamp with time zone
);


ALTER TABLE "public"."thumbnail_processing_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "avatar_url" "text",
    "stripe_customer_id" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "bio" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."failed_orders"
    ADD CONSTRAINT "failed_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."function_errors"
    ADD CONSTRAINT "function_errors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generated_models"
    ADD CONSTRAINT "generated_models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generation_tasks"
    ADD CONSTRAINT "generation_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generation_tasks"
    ADD CONSTRAINT "generation_tasks_task_id_key" UNIQUE ("task_id");



ALTER TABLE ONLY "public"."hy_generated_jobs"
    ADD CONSTRAINT "hy_generated_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hy_generated_models"
    ADD CONSTRAINT "hy_generated_models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hy_generation_jobs"
    ADD CONSTRAINT "hy_generation_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manufacturing_quotes"
    ADD CONSTRAINT "manufacturing_quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."model_likes"
    ADD CONSTRAINT "model_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."model_likes"
    ADD CONSTRAINT "model_likes_user_id_model_id_key" UNIQUE ("user_id", "model_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_slant_order_id_key" UNIQUE ("slant_order_id");



ALTER TABLE ONLY "public"."stripe_sessions"
    ADD CONSTRAINT "stripe_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_sessions"
    ADD CONSTRAINT "stripe_sessions_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."thumbnail_processing_queue"
    ADD CONSTRAINT "thumbnail_processing_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey1" PRIMARY KEY ("id");



CREATE INDEX "idx_failed_orders_processed" ON "public"."failed_orders" USING "btree" ("processed") WHERE ("processed" = false);



CREATE INDEX "idx_generated_models_created_at" ON "public"."generated_models" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_generated_models_status" ON "public"."generated_models" USING "btree" ("status");



CREATE INDEX "idx_generated_models_user_id" ON "public"."generated_models" USING "btree" ("user_id");



CREATE INDEX "idx_generation_jobs_prompt_id" ON "public"."hy_generation_jobs" USING "btree" ("prompt_id");



CREATE INDEX "idx_generation_jobs_status" ON "public"."hy_generation_jobs" USING "btree" ("status");



CREATE INDEX "idx_generation_jobs_user_id" ON "public"."hy_generation_jobs" USING "btree" ("user_id");



CREATE INDEX "idx_generation_tasks_created_at" ON "public"."generation_tasks" USING "btree" ("created_at");



CREATE INDEX "idx_generation_tasks_status" ON "public"."generation_tasks" USING "btree" ("status");



CREATE INDEX "idx_generation_tasks_task_id" ON "public"."generation_tasks" USING "btree" ("task_id");



CREATE INDEX "idx_generation_tasks_user_id" ON "public"."generation_tasks" USING "btree" ("user_id");



CREATE INDEX "idx_hy_generated_jobs_created_at" ON "public"."hy_generated_jobs" USING "btree" ("created_at");



CREATE INDEX "idx_hy_generated_jobs_prompt_id" ON "public"."hy_generated_jobs" USING "btree" ("prompt_id");



CREATE INDEX "idx_hy_generated_jobs_status" ON "public"."hy_generated_jobs" USING "btree" ("status");



CREATE INDEX "idx_hy_generated_jobs_user_id" ON "public"."hy_generated_jobs" USING "btree" ("user_id");



CREATE INDEX "idx_model_likes_user_model" ON "public"."model_likes" USING "btree" ("user_id", "model_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at");



CREATE INDEX "idx_orders_customer_email" ON "public"."orders" USING "btree" ("customer_email");



CREATE INDEX "idx_orders_slant_order_id" ON "public"."orders" USING "btree" ("slant_order_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_tracking" ON "public"."orders" USING "gin" ("tracking_numbers");



CREATE INDEX "idx_orders_tracking_numbers" ON "public"."orders" USING "gin" ("tracking_numbers");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_stripe_sessions_session_id" ON "public"."stripe_sessions" USING "btree" ("session_id");



CREATE INDEX "idx_thumbnail_queue_status_priority" ON "public"."thumbnail_processing_queue" USING "btree" ("status", "priority" DESC, "created_at");



CREATE OR REPLACE TRIGGER "update_generation_tasks_updated_at" BEFORE UPDATE ON "public"."generation_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."generated_models"
    ADD CONSTRAINT "generated_models_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."generation_tasks"
    ADD CONSTRAINT "generation_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."hy_generated_jobs"
    ADD CONSTRAINT "hy_generated_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hy_generated_models"
    ADD CONSTRAINT "hy_generated_models_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."hy_generated_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hy_generated_models"
    ADD CONSTRAINT "hy_generated_models_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hy_generation_jobs"
    ADD CONSTRAINT "hy_generation_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."thumbnail_processing_queue"
    ADD CONSTRAINT "thumbnail_processing_queue_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."generated_models"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey1" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



CREATE POLICY "Allow read of completed models for all" ON "public"."generated_models" FOR SELECT USING (("status" = 'completed'::"text"));



CREATE POLICY "Service role can manage all orders" ON "public"."orders" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage all tasks" ON "public"."generation_tasks" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage failed orders" ON "public"."failed_orders" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage function errors" ON "public"."function_errors" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage stripe sessions" ON "public"."stripe_sessions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can access their own models" ON "public"."generated_models" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own models" ON "public"."generated_models" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own generation jobs" ON "public"."hy_generation_jobs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own models" ON "public"."hy_generated_models" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own jobs" ON "public"."hy_generated_jobs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own tasks" ON "public"."generation_tasks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own likes" ON "public"."model_likes" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own generation jobs" ON "public"."hy_generation_jobs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own data" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own jobs" ON "public"."hy_generated_jobs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own generation jobs" ON "public"."hy_generation_jobs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own models" ON "public"."hy_generated_models" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own data" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own jobs" ON "public"."hy_generated_jobs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own models" ON "public"."generated_models" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own orders" ON "public"."orders" FOR SELECT USING (("customer_email" = ("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Users can view their own tasks" ON "public"."generation_tasks" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."failed_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."function_errors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."generated_models" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."generation_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hy_generated_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hy_generated_models" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hy_generation_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."manufacturing_quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."model_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_auth_user_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_auth_user_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_auth_user_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."failed_orders" TO "anon";
GRANT ALL ON TABLE "public"."failed_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."failed_orders" TO "service_role";



GRANT ALL ON TABLE "public"."function_errors" TO "anon";
GRANT ALL ON TABLE "public"."function_errors" TO "authenticated";
GRANT ALL ON TABLE "public"."function_errors" TO "service_role";



GRANT ALL ON TABLE "public"."generated_models" TO "anon";
GRANT ALL ON TABLE "public"."generated_models" TO "authenticated";
GRANT ALL ON TABLE "public"."generated_models" TO "service_role";



GRANT ALL ON TABLE "public"."generation_tasks" TO "anon";
GRANT ALL ON TABLE "public"."generation_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."generation_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."hy_generated_jobs" TO "anon";
GRANT ALL ON TABLE "public"."hy_generated_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."hy_generated_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."hy_generated_models" TO "anon";
GRANT ALL ON TABLE "public"."hy_generated_models" TO "authenticated";
GRANT ALL ON TABLE "public"."hy_generated_models" TO "service_role";



GRANT ALL ON TABLE "public"."hy_generation_jobs" TO "anon";
GRANT ALL ON TABLE "public"."hy_generation_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."hy_generation_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."manufacturing_quotes" TO "anon";
GRANT ALL ON TABLE "public"."manufacturing_quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."manufacturing_quotes" TO "service_role";



GRANT ALL ON TABLE "public"."model_likes" TO "anon";
GRANT ALL ON TABLE "public"."model_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."model_likes" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."order_summary" TO "anon";
GRANT ALL ON TABLE "public"."order_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."order_summary" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_sessions" TO "anon";
GRANT ALL ON TABLE "public"."stripe_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."thumbnail_processing_queue" TO "anon";
GRANT ALL ON TABLE "public"."thumbnail_processing_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."thumbnail_processing_queue" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
