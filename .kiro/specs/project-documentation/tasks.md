# Implementation Plan: Project Documentation

## Overview

Create 9 structured markdown documentation files plus an index README, organized into `docs/architecture/`, `docs/flows/`, and `docs/onboarding/` subdirectories. Each file is authored by analyzing the existing codebase (schema SQL, Edge Functions, frontend services/pages, blender-service, and configuration files) and writing comprehensive markdown content. Pre-existing files in `docs/` are preserved untouched.

## Tasks

- [x] 1. Create directory structure and architecture overview
  - [x] 1.1 Create `docs/architecture/overview.md`
    - Describe each service: React frontend, Express proxy server, Vercel serverless functions, Supabase (Postgres + Auth + Edge Functions + Storage), Modal Blender service, and external vendor APIs
    - For each service list: name, primary responsibility, technology/runtime
    - Describe connections between services with source, destination, protocol, direction, and data category
    - Include a text-based Excalidraw-ready diagram description with labeled boxes and arrows
    - Describe the model generation pipeline as an ordered sequence of stages
    - Describe the order fulfillment pipeline as an ordered sequence of stages
    - Describe the authentication flow (Supabase Auth → tokens → proxy → RLS)
    - Include metadata header with "Last updated" date and "Source of truth" reference
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.2 Create `docs/architecture/tech-stack.md`
    - List all programming languages (TypeScript, Python, SQL, Deno/TypeScript) with where each is used
    - List frameworks and libraries grouped by layer with major version numbers from package.json
    - List database and storage technologies with descriptions
    - List all third-party services (Meshy AI, fal.ai, Stripe, Slant3D, Shapeways, Treatstock, CraftCloud, Sculpteo, Modal) with roles
    - List deployment targets with artifact types
    - List development tooling with commands/workflows
    - Note that versions should be updated alongside dependency bumps
    - _Requirements: 1.1, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 1.3 Create `docs/architecture/data-model.md`
    - Describe each table in the public schema (all 15 tables listed in Requirement 4.1)
    - List columns, types, defaults, and constraints per table in markdown tables
    - Describe custom enums (model_status, order_status, provider_type, source_type) with all allowed values
    - Describe foreign key relationships with referencing column, referenced table/column, and ON DELETE behavior
    - List each RLS policy per table with policy name, role, operation, and condition expression
    - Describe database triggers with trigger name, table, timing, event, and invoked function
    - Include an entity relationship summary with tables as nodes and foreign keys as labeled edges with cardinality
    - Describe database views (order_summary, quote_summary) with source tables and columns
    - _Requirements: 1.1, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [~] 2. Checkpoint - Verify architecture core documents
  - Ensure all three architecture files exist and contain required sections, ask the user if questions arise.

- [x] 3. Create API integrations and deployment documents
  - [x] 3.1 Create `docs/architecture/api-integrations.md`
    - Include a section for each vendor: Slant3D, Shapeways, Treatstock, CraftCloud, Sculpteo with name, category, base URL, file formats, and integration status
    - Describe Meshy AI integration (text-to-3D, image-to-3D, polling mechanism, model formats)
    - Describe fal.ai integration (endpoint, input/output formats, invoking Edge Function)
    - Describe Stripe integration (create-checkout-session, webhook handler, event types)
    - Describe Modal/Blender integration (repair, hollow, scale operations, Python entry points, file formats)
    - For each vendor list all corresponding Edge Functions, auth method, and endpoints called
    - For each vendor describe the order flow as numbered steps (quote → create → track)
    - For each vendor document rate limits and error response formats
    - _Requirements: 1.1, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 3.2 Create `docs/architecture/deployment.md`
    - Describe production deployment topology (Vercel, Supabase, Modal) with communication flows
    - List all required environment variables grouped by service with name, purpose, and where to obtain (no secrets)
    - Describe local development setup as numbered steps with prerequisites, commands, and startup order
    - Describe deployment process for each service with CLI auth steps and verification commands
    - Describe local dev routing (proxy-server.js) vs production routing (Vercel serverless) differences
    - _Requirements: 1.1, 6.1, 6.2, 6.3, 6.4, 6.5_

- [~] 4. Checkpoint - Verify all architecture documents complete
  - Ensure all 5 architecture files exist at correct paths, ask the user if questions arise.

- [x] 5. Create user flow documents
  - [x] 5.1 Create `docs/flows/user-journey.md`
    - Describe model generation flow (text/image input → Meshy → polling → storage → 3D viewer)
    - Describe ordering flow (select model → vendor/material → quote → Stripe checkout → vendor order → tracking)
    - Describe authentication flow (anonymous session → generation → account creation prompt → merge)
    - Describe marketplace flow (browse → like/save → order print)
    - Reference page route, component name, and service name at each step
    - Present each flow as numbered steps with actor, action, and resulting state
    - Describe alternative paths for failure conditions with feedback and retry options
    - _Requirements: 1.1, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 5.2 Create `docs/flows/order-lifecycle.md`
    - Describe order state machine with all valid states and transitions with triggering events
    - Describe vendor-specific status mapping to common lifecycle states for each vendor
    - Describe payment flow (Stripe session → redirect → webhook → stripe_sessions → order record)
    - Describe error handling (failed_orders table, function_errors table, reprocessing conditions)
    - Describe vendor-specific data stored on orders (Slant3D fields, Sculpteo fields, generic JSONB)
    - Include diagram/table showing relationship between orders.status, orders.payment_status, and failed_orders
    - _Requirements: 1.1, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [~] 6. Checkpoint - Verify flow documents complete
  - Ensure both flow documents exist and cover all required flows, ask the user if questions arise.

- [ ] 7. Create onboarding documents
  - [-] 7.1 Create `docs/onboarding/getting-started.md`
    - List all prerequisites with minimum versions (Node.js 18+, npm 9+, Git, Supabase CLI, Modal CLI, Python 3.10+)
    - Provide step-by-step local setup instructions (clone, install, configure env, start servers)
    - List required environment variables grouped by location (client-side VITE_ vars, server-side secrets)
    - Describe repository layout with one-sentence purpose per top-level directory
    - Describe key conventions (RLS-first, proxy URL for 3D assets, navigation state, emoji logging, VITE_ prefix)
    - Provide "where to look" reference mapping tasks to file paths
    - Note known gotchas (stale README, no test runner, npm start limitation, two supabase/ directories)
    - Include verification step with expected observable outcomes
    - _Requirements: 1.1, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [-] 7.2 Create `docs/onboarding/feature-inventory.md`
    - List all completed features with descriptions (AI generation, 3D viewer, multi-vendor quoting, Stripe, orders, admin, marketplace, thumbnails, mesh processing, user merge)
    - List in-progress features with what's functional and what remains (Sculpteo, HY3D, cart, download checkout)
    - List planned features with source document references (refund automation, webhook polling, test suite)
    - Organize features by domain (Generation, Ordering, Payments, User Management, Admin, Marketplace, Infrastructure)
    - Indicate which services each feature touches (frontend, Edge Functions, Blender service, database)
    - Assign each feature exactly one status: "Completed", "In Progress", or "Planned"
    - Include for each entry: name, status, description, domain, and services touched
    - _Requirements: 1.1, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ] 8. Create docs/README.md index
  - [~] 8.1 Create `docs/README.md` index file
    - Include a one-line project description
    - Add table of contents with relative links to all 9 new documentation files
    - Add "Legacy Documentation" section with relative links to pre-existing directories and files (API_information/, supabase-backup/, UI/, sql-snippets/, phase2_shapeways_finishing_touches.md, phase3_high_level_overview.md)
    - Each link accompanied by a description ≤120 characters
    - Verify all relative links point to existing files
    - _Requirements: 1.1, 1.3, 1.4_

- [~] 9. Final checkpoint - Validate all documentation
  - Ensure all 9 documentation files + README.md exist at correct paths, verify no pre-existing files were modified, ask the user if questions arise.

## Notes

- This feature produces static markdown files only — no runtime code, APIs, or database changes
- Pre-existing files in `docs/` (API_information/, supabase-backup/, UI/, sql-snippets/, standalone files) must remain untouched
- Each document should include a metadata header with "Last updated" date and "Source of truth" reference
- Content should be sourced from the actual codebase (schema.sql, package.json, Edge Functions, etc.) for accuracy
- Excalidraw-ready descriptions should use labeled boxes and arrows that can be directly recreated as diagrams
- Mark gaps in information with `<!-- TODO: ... -->` comments for future completion
- Property-based testing does not apply to this feature (static documentation, no computed values)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["5.1", "5.2"] },
    { "id": 4, "tasks": ["7.1", "7.2"] },
    { "id": 5, "tasks": ["8.1"] }
  ]
}
```
