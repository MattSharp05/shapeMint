# Requirements Document

## Introduction

ShapeMint is an AI-powered 3D model generation and manufacturing platform. As the project grows in complexity — spanning a React/TypeScript frontend, Supabase backend with ~50 Edge Functions, a Python/Blender mesh processing service on Modal, Stripe payments, and multi-vendor 3D printing integrations — comprehensive project documentation is needed. This feature creates a structured `docs/` directory containing markdown files that document the architecture, tech stack, data model, API integrations, deployment infrastructure, user flows, and feature inventory. The documentation serves three purposes: enabling Excalidraw diagram creation, supporting explainer/marketing video production, and onboarding new developers.

## Glossary

- **Documentation_Generator**: The process and resulting markdown files that document the ShapeMint project
- **Architecture_Document**: A markdown file describing the system's services, their connections, and data flow
- **Tech_Stack_Document**: A markdown file listing all languages, frameworks, databases, third-party services, and deployment targets
- **Data_Model_Document**: A markdown file describing Supabase tables, relationships, enums, and key entities
- **API_Integration_Document**: A markdown file providing a consolidated view of all external API integrations
- **Deployment_Document**: A markdown file describing where services run, environment variables, and local dev setup
- **User_Journey_Document**: A markdown file mapping the end-to-end user flow from model generation through order fulfillment
- **Order_Lifecycle_Document**: A markdown file describing order state transitions across vendors
- **Getting_Started_Document**: A markdown file providing onboarding instructions for new developers
- **Feature_Inventory_Document**: A markdown file cataloging built, in-progress, and planned features
- **Docs_Directory**: The `docs/` folder structure containing all documentation files organized by category

## Requirements

### Requirement 1: Documentation Directory Structure

**User Story:** As a developer, I want a well-organized documentation directory, so that I can quickly find the information I need about any aspect of the project.

#### Acceptance Criteria

1. THE Documentation_Generator SHALL create the following directory structure under the project root:
   - `docs/architecture/overview.md`
   - `docs/architecture/tech-stack.md`
   - `docs/architecture/data-model.md`
   - `docs/architecture/api-integrations.md`
   - `docs/architecture/deployment.md`
   - `docs/flows/user-journey.md`
   - `docs/flows/order-lifecycle.md`
   - `docs/onboarding/getting-started.md`
   - `docs/onboarding/feature-inventory.md`
2. IF a file already exists at any of the target paths listed in criterion 1, THEN THE Documentation_Generator SHALL overwrite that file with the newly generated content.
3. THE Documentation_Generator SHALL not delete, modify, or relocate any pre-existing files or directories in `docs/` that are not listed as target paths in criterion 1 (including but not limited to `docs/API_information/`, `docs/supabase-backup/`, `docs/UI/`, `docs/sql-snippets/`, and any standalone files).
4. THE Documentation_Generator SHALL include a `docs/README.md` index file that contains a relative markdown link to every file listed in criterion 1 and a relative link to each pre-existing top-level directory or file in `docs/`, each accompanied by a one-sentence description (maximum 120 characters per description).

### Requirement 2: Architecture Overview Document

**User Story:** As a developer or stakeholder, I want a high-level architecture overview, so that I can understand how all services connect and data flows through the system.

#### Acceptance Criteria

1. THE Architecture_Document SHALL describe each service in the system — React frontend, Express proxy server, Vercel serverless functions, Supabase (Postgres + Auth + Edge Functions + Storage), Modal Blender service, and external vendor APIs — listing for each service its name, primary responsibility, and the technology or runtime it uses
2. THE Architecture_Document SHALL describe the connections between services, specifying for each connection the source service, destination service, protocol (HTTP/REST, WebSocket, or database client), direction of data flow, and the category of data exchanged (e.g., authentication tokens, model files, order payloads)
3. THE Architecture_Document SHALL include a text-based diagram description suitable for recreating in Excalidraw, containing one labeled box per service defined in criterion 1 and one labeled arrow per connection defined in criterion 2, where each arrow label states the protocol and data-flow direction
4. THE Architecture_Document SHALL describe the model generation pipeline as an ordered sequence of stages — user prompt submission, Meshy AI task creation, generation polling, model file storage in Supabase Storage, post-processing via Modal Blender service, and 3D model display in the React frontend — identifying which service performs each stage and what data is passed to the next stage
5. THE Architecture_Document SHALL describe the order fulfillment pipeline as an ordered sequence of stages — checkout initiation, payment processing via Stripe, vendor order submission to the selected printing vendor API, order status tracking via webhooks or polling, and delivery status update — identifying which service performs each stage and what data is passed to the next stage
6. THE Architecture_Document SHALL describe the authentication flow, specifying how Supabase Auth issues tokens to the React frontend, how tokens are forwarded through the Express proxy and Vercel serverless functions, and how Row Level Security in Supabase Postgres enforces per-user data access

### Requirement 3: Tech Stack Summary Document

**User Story:** As a new developer, I want a complete tech stack summary, so that I can understand what technologies I need to be familiar with before contributing.

#### Acceptance Criteria

1. THE Tech_Stack_Document SHALL list all programming languages used in the project (TypeScript, Python, SQL, Deno/TypeScript) with a one-sentence description of where each language is used in the codebase
2. THE Tech_Stack_Document SHALL list all frameworks and libraries grouped by layer (frontend, backend, 3D rendering, animation) including the major version number as specified in package.json (React 18, Vite 5, Tailwind CSS 3, Three.js 0.158, React Three Fiber 8, Framer Motion 12, Express)
3. THE Tech_Stack_Document SHALL list all database and storage technologies (Supabase Postgres, Supabase Storage, Supabase Auth) with a one-sentence description of what each stores or manages
4. THE Tech_Stack_Document SHALL list all third-party services (Meshy AI, fal.ai, Stripe, Slant3D, Shapeways, Treatstock, CraftCloud, Sculpteo, Modal) with a one-sentence description of each service's role in the system
5. THE Tech_Stack_Document SHALL list all deployment targets (Vercel for frontend and API routes, Supabase hosted for Edge Functions and database, Modal for Blender service) with the type of artifact deployed to each target
6. THE Tech_Stack_Document SHALL list development tooling (ESLint, Vite dev server, Supabase CLI) with the command or workflow each tool supports
7. WHEN a framework or library listed in the document has its version updated in package.json, THEN THE Tech_Stack_Document SHALL be updated to reflect the new major version number within the same pull request

### Requirement 4: Data Model Document

**User Story:** As a developer, I want a clear data model reference, so that I can understand the database schema, table relationships, and access patterns without reading raw SQL.

#### Acceptance Criteria

1. THE Data_Model_Document SHALL describe each table in the public schema: users, generated_models, generation_tasks, orders, quotes, manufacturing_quotes, model_likes, stripe_sessions, failed_orders, function_errors, sw_models_cache, thumbnail_processing_queue, hy_generated_jobs, hy_generated_models, hy_generation_jobs
2. THE Data_Model_Document SHALL list columns, types, defaults, and constraints (including CHECK constraints and UNIQUE constraints) for each table in a markdown table with one row per column
3. THE Data_Model_Document SHALL describe all custom enums (model_status, order_status, provider_type, source_type) with their allowed values listed exhaustively
4. THE Data_Model_Document SHALL describe foreign key relationships between tables including the referencing column, referenced table and column, and ON DELETE behavior (CASCADE, SET NULL, or RESTRICT)
5. THE Data_Model_Document SHALL list each Row Level Security policy per table, specifying the policy name, the role it applies to (anon, authenticated, or service_role), the operation (SELECT, INSERT, UPDATE, or ALL), and the condition expression
6. THE Data_Model_Document SHALL describe database triggers by specifying the trigger name, the table it fires on, the timing (BEFORE or AFTER), the event (INSERT or UPDATE), and the function it invokes (update_updated_at_column, update_quotes_updated_at, handle_new_user)
7. THE Data_Model_Document SHALL include an entity relationship summary that lists each table as a node and each foreign key as a labeled edge with cardinality (one-to-many or many-to-one), sufficient for recreating as an Excalidraw diagram without consulting additional sources
8. THE Data_Model_Document SHALL describe each database view (order_summary, quote_summary) including the source table and the columns exposed

### Requirement 5: API Integration Map Document

**User Story:** As a developer, I want a consolidated view of all external API integrations, so that I can understand what each vendor provides, how authentication works, and which Edge Functions handle each integration.

#### Acceptance Criteria

1. THE API_Integration_Document SHALL include a section for each vendor integration — Slant3D (FDM printing), Shapeways (multi-material printing), Treatstock (printing marketplace), CraftCloud (printing aggregator), Sculpteo (printing service) — containing at minimum: vendor name, service category, base API URL, supported file formats, and current integration status (active, planned, or deprecated)
2. THE API_Integration_Document SHALL describe the Meshy AI integration including text-to-3D and image-to-3D endpoints, polling mechanism with polling interval and timeout duration, and model format outputs (GLB, OBJ, STL)
3. THE API_Integration_Document SHALL describe the fal.ai integration for image transformation including the endpoint used, input/output formats, and the Edge Function that invokes it
4. THE API_Integration_Document SHALL describe the Stripe integration for payment processing including the create-checkout-session Edge Function, webhook handler Edge Function, and the event types processed by the webhook
5. THE API_Integration_Document SHALL describe the Modal integration for Blender mesh processing listing each operation (repair, hollow, scale), the corresponding Python entry point in the blender-service, and the input/output file formats
6. FOR EACH vendor integration, THE API_Integration_Document SHALL list all corresponding Supabase Edge Functions by name, the authentication method used (API key via Bearer header, OAuth2 client credentials, or query parameter token), and every endpoint called by the system
7. FOR EACH vendor integration, THE API_Integration_Document SHALL describe the order flow as a numbered sequence of steps covering: quote request, order creation, and status tracking, specifying for each step the Edge Function invoked and the vendor endpoint called
8. FOR EACH vendor integration, THE API_Integration_Document SHALL document rate limits (requests per minute or per day) and the expected error response format returned by the vendor API

### Requirement 6: Deployment and Infrastructure Document

**User Story:** As a developer, I want to understand where each service runs and how to set up my local environment, so that I can develop and debug effectively.

#### Acceptance Criteria

1. THE Deployment_Document SHALL describe the production deployment topology including: the hosting platform for each service (Vercel for frontend SPA and serverless API routes, Supabase for hosted Postgres/Auth/Edge Functions/Storage, Modal for Blender service endpoints), and the communication flow between services (which service calls which, and over what protocol)
2. THE Deployment_Document SHALL list all required environment variables grouped by service (frontend, blender-service, Supabase), where each variable entry includes: the variable name, a one-sentence description of its purpose, and where to obtain its value (without exposing actual secrets)
3. THE Deployment_Document SHALL describe the local development setup as a numbered sequence of steps including: prerequisite tools and minimum versions (Node.js 18+, npm, Supabase CLI, Modal CLI), dependency installation commands, environment variable configuration, startup commands for both servers (Vite dev server on port 5175, Express proxy on port 3001), the required startup order, and a verification check confirming both servers are running
4. THE Deployment_Document SHALL describe the deployment process for each service (Vercel auto-deploy on push, `supabase functions deploy`, `modal deploy modal_app.py`) including: prerequisite CLI authentication steps and the command to verify a successful deployment
5. THE Deployment_Document SHALL describe the difference between local dev routing (proxy-server.js forwarding requests from port 3001 to external APIs for CORS handling) and production routing (Vercel serverless functions in `frontend/api/` handling the same requests without a proxy), specifying which request paths are affected and how the frontend determines which route to use based on environment

### Requirement 7: User Journey Flow Document

**User Story:** As a stakeholder or new developer, I want to understand the complete user journey, so that I can see how the platform works end-to-end from a user's perspective.

#### Acceptance Criteria

1. THE User_Journey_Document SHALL describe the model generation flow including each of these sequential steps: text or image input → AI generation request to Meshy → polling for task completion → model metadata and URL storage in Supabase → display in the 3D viewer with rotate/zoom controls
2. THE User_Journey_Document SHALL describe the ordering flow including each of these sequential steps: select model → choose vendor and material from available vendors → receive price quote → proceed to checkout via Stripe → order placed with selected vendor → order tracking
3. THE User_Journey_Document SHALL describe the authentication flow including each of these sequential steps: anonymous session creation → model generation as anonymous user → account creation prompted at checkout → merge of anonymous session models into the new authenticated account
4. THE User_Journey_Document SHALL describe the marketplace flow including each of these sequential steps: browse completed community models → like or save a model → order a physical print of a community model
5. THE User_Journey_Document SHALL reference the page route, component name, and service name involved at each step of every flow
6. THE User_Journey_Document SHALL present each flow as a numbered sequence of steps where each step identifies the actor, the action performed, and the resulting system state or transition to the next step, so that the sequence can be directly recreated as a flowchart
7. IF a step in any flow can fail, THEN THE User_Journey_Document SHALL describe the alternative path including the failure condition, the feedback shown to the user, and whether the user can retry or is redirected

### Requirement 8: Order Lifecycle Document

**User Story:** As a developer, I want to understand order state transitions across different vendors, so that I can debug order issues and understand the fulfillment pipeline.

#### Acceptance Criteria

1. THE Order_Lifecycle_Document SHALL describe the order state machine including all valid states (created, pending, paid, manufacturing, shipped, delivered, cancelled) and SHALL enumerate which state transitions are valid (e.g., created → paid, paid → manufacturing, any state → cancelled) with the triggering event for each transition
2. THE Order_Lifecycle_Document SHALL describe how each vendor (Slant3D, Shapeways, Treatstock, CraftCloud, Sculpteo) maps vendor-specific statuses to the common order lifecycle states, listing at least the vendor status value and its corresponding common state for each supported transition
3. THE Order_Lifecycle_Document SHALL describe the payment flow including: Stripe checkout session creation, redirect to Stripe, webhook confirmation (checkout.session.completed), stripe_sessions record creation, and order record creation with stripe_session_id linkage
4. THE Order_Lifecycle_Document SHALL describe error handling including: the failed_orders table (order_data, error_message, api_status, processed flag), the function_errors table (function_name, error_message, error_stack), and the conditions under which a failed order can be reprocessed (processed = false → true)
5. THE Order_Lifecycle_Document SHALL describe vendor-specific data stored on orders including Slant3D fields (slant_order_id, slant_response JSONB), Sculpteo fields (sculpteo_order_id, sculpteo_response JSONB), and the generic order_data JSONB field used by other vendors
6. THE Order_Lifecycle_Document SHALL include a diagram or table showing the relationship between the orders table status field, the orders table payment_status field, and the failed_orders table, clarifying when a failed order is stored in failed_orders versus remaining in the orders table with a cancelled or failed-adjacent status

### Requirement 9: Getting Started Onboarding Document

**User Story:** As a new developer joining the project, I want a clear getting-started guide, so that I can have the project running locally and understand the codebase layout within my first day.

#### Acceptance Criteria

1. THE Getting_Started_Document SHALL list all prerequisites with minimum versions: Node.js 18+, npm 9+, Git, Supabase CLI, Modal CLI, and Python 3.10+ (for blender-service)
2. THE Getting_Started_Document SHALL provide step-by-step local setup instructions including cloning the repository, installing dependencies via `npm install` in the `frontend/` directory, configuring environment variables, and starting both the Vite dev server (port 5175) and the Express proxy server (port 3001), specifying the directory from which each command must be run
3. THE Getting_Started_Document SHALL list all required environment variables grouped by location: client-side variables (prefixed with VITE_) in `frontend/.env`, and server-side secrets (Stripe, fal.ai, Modal, Supabase service-role) in the proxy server or Edge Function environment, indicating where to obtain each value
4. THE Getting_Started_Document SHALL describe the repository layout with a one-sentence purpose statement for each top-level directory: frontend/ (React SPA and proxy), blender-service/ (Python mesh processing on Modal), docs/ (API references and schema backups), and frontend/supabase/functions/ (Deno Edge Functions)
5. THE Getting_Started_Document SHALL describe key conventions: RLS-first database access, proxy URL for 3D assets (`/api/meshy/glb?url=...`), navigation state passing between pages via React Router state, emoji logging style (🔄 ✅ ❌), and VITE_ prefix for client-side env vars
6. THE Getting_Started_Document SHALL provide a "where to look" reference mapping each of the following tasks to its relevant file paths: model generation, thumbnails, payments, vendor fulfillment, auth, 3D viewer, and mesh processing
7. THE Getting_Started_Document SHALL note known gotchas: README.md is partially stale, no test runner is configured, `npm start` does not launch the proxy, and two separate `supabase/` directories exist (frontend/supabase/ and root supabase/migrations/)
8. THE Getting_Started_Document SHALL include a verification step that lists the expected observable outcomes confirming successful setup: Vite dev server accessible at http://localhost:5175, proxy server responding on http://localhost:3001, and the application loading without console errors related to missing environment variables

### Requirement 10: Feature Inventory Document

**User Story:** As a project manager or developer, I want a catalog of all features with their status, so that I can understand what is built, what is in progress, and what is planned.

#### Acceptance Criteria

1. THE Feature_Inventory_Document SHALL list all completed features with a one-to-two sentence description each: AI model generation (text and image), 3D model viewer, multi-vendor quoting, Stripe checkout, order management, admin dashboard, marketplace, thumbnail generation, mesh post-processing (repair/hollow/scale), anonymous-to-authenticated user merge
2. THE Feature_Inventory_Document SHALL list features that are in progress or partially implemented, each annotated with what is functional and what remains incomplete: Sculpteo integration, HY3D generation pipeline, cart/multi-item checkout, download checkout
3. THE Feature_Inventory_Document SHALL list planned or future features referenced in existing documentation, each annotated with the source document where the feature is referenced: refund automation, vendor webhook polling, comprehensive test suite
4. THE Feature_Inventory_Document SHALL organize features by domain: Generation, Ordering, Payments, User Management, Admin, Marketplace, Infrastructure
5. THE Feature_Inventory_Document SHALL indicate which services each feature touches using the following service categories: frontend, Edge Functions, Blender service, database
6. THE Feature_Inventory_Document SHALL assign each feature exactly one status from the following values: "Completed", "In Progress", or "Planned"
7. THE Feature_Inventory_Document SHALL include for each feature entry: feature name, status, one-to-two sentence description, domain classification, and list of services touched
