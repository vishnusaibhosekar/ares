# ARES Build Phase 1: Scaffold, Schema & Types

**Duration**: ~1 hour  
**Goal**: Complete project structure, database schema, TypeScript types, and Express skeleton ready for service implementation.

---

## What to Build

1. Full directory structure (src/, db/, demos/, tests/, etc.)
2. package.json with all dependencies
3. Postgres schema (migrations)
4. Database.ts client with table repositories
5. Complete TypeScript types for models and API contracts
6. Express app skeleton with stub routes

---

## Detailed Instructions for Qoder

### Step 1: Initialize Project Structure

**Prompt to Qoder:**

```
Create a production-grade TypeScript service project structure for ARES (Actor Resolution & Entity Service).

Project name: ares
Base directory: src/

Directory structure:
- src/api/routes/ (ingest-site.ts, resolve-actor.ts, clusters.ts, seeds.ts)
- src/api/middleware/ (auth.ts, error-handler.ts)
- src/api/server.ts
- src/domain/models/ (Site.ts, Entity.ts, Cluster.ts, Embedding.ts, ResolutionRun.ts)
- src/domain/types/ (index.ts, api.ts)
- src/domain/constants/ (thresholds.ts, patterns.ts)
- src/service/ (EntityExtractor.ts, EntityNormalizer.ts, EmbeddingService.ts, SimilarityScorer.ts, ClusterResolver.ts, ResolutionEngine.ts)
- src/repository/ (SiteRepository.ts, EntityRepository.ts, ClusterRepository.ts, EmbeddingRepository.ts, ResolutionRunRepository.ts, Database.ts)
- src/util/ (logger.ts, random.ts, validation.ts)
- db/migrations/ (001_init_schema.sql, 002_seed_data.sql)
- demos/ (end-to-end.ts, curl-examples.sh, sample-payloads.json)
- tests/ (unit/, integration/)
- .env.example
- package.json
- tsconfig.json
- jest.config.js

Include:
- .gitignore
- README.md stub
- Makefile or package.json scripts for: db:migrate, db:seed, dev, build, test, demo

Do NOT implement logic yet; just create empty files and proper imports/exports.
```

**Output**: Full project scaffold with imports/exports but no implementations.

---

### Step 2: Package.json & Dependencies

**Prompt to Qoder:**

```
Generate package.json for ARES with:

Dependencies:
- express (web server)
- pg (postgres driver)
- dotenv (env config)
- uuid (ID generation)
- zod (input validation)
- pino (logging)
- axios (HTTP client)

Dev Dependencies:
- typescript
- @types/express
- @types/node
- @types/jest
- jest
- ts-jest
- ts-node
- tsx (for running scripts)
- prettier
- eslint
- @typescript-eslint/parser
- @typescript-eslint/eslint-plugin

Scripts:
- dev: tsx watch src/index.ts
- build: tsc
- test: jest
- test:watch: jest --watch
- db:migrate: tsx db/run-migrations.ts
- db:seed: tsx db/seed.ts
- demo: tsx demos/end-to-end.ts
- start: node dist/index.js

Also create:
- tsconfig.json (strict mode, ES2020 target, skipLibCheck: true)
- jest.config.js (ts-jest preset, testMatch patterns)
- .env.example with DATABASE_URL, MIXEDBREAD_API_KEY, NODE_ENV, PORT
- .prettierrc with standard formatting
```

**Output**: Complete package.json, tsconfig.json, jest.config.js, .env.example

---

### Step 3: Database Client & Connection

**Prompt to Qoder:**

```
Create src/repository/Database.ts:

```typescript
// Exports a singleton Postgres client via pg library
// Methods:
// - query(sql: string, values?: any[]): Promise<any>
// - transaction(callback: (client) => Promise<any>): Promise<any>
// - close(): Promise<void>

// Also export typed query builders for each table:
// - sites()
// - entities()
// - clusters()
// - cluster_memberships()
// - embeddings()
// - resolution_runs()

// Each builder should have:
// - insert(data): Promise<id>
// - findById(id): Promise<record>
// - findAll(filters?): Promise<records[]>
// - update(id, data): Promise<void>
// - delete(id): Promise<void>

// Use connection pooling with pool size 10
// Handle errors gracefully with retry logic on transient failures
```

**Output**: Database.ts with full typed client + query builders

---

### Step 4: TypeScript Domain Models & Types

**Prompt to Qoder:**

```
Create complete TypeScript types in src/domain/:

**src/domain/models/index.ts**: Export all models as classes with getters

Site:
- id: UUID
- domain: string
- url: string
- page_text: string | null
- screenshot_hash: string | null
- first_seen_at: Date
- created_at: Date

Entity:
- id: UUID
- site_id: UUID
- type: 'email' | 'phone' | 'handle' | 'wallet'
- value: string
- normalized_value: string | null
- confidence: number (0.0-1.0)
- created_at: Date

Cluster:
- id: UUID
- name: string | null
- confidence: number (0.0-1.0)
- description: string | null
- created_at: Date
- updated_at: Date

ClusterMembership:
- id: UUID
- cluster_id: UUID
- entity_id: UUID | null
- site_id: UUID | null
- membership_type: 'entity' | 'site'
- confidence: number
- reason: string | null
- created_at: Date

Embedding:
- id: UUID
- source_id: UUID
- source_type: string ('site_policy', 'site_contact', etc.)
- source_text: string
- vector: number[] (1024 dimensions)
- created_at: Date

ResolutionRun:
- id: UUID
- input_url: string
- input_domain: string | null
- input_entities: JSON (emails, phones, handles)
- result_cluster_id: UUID | null
- result_confidence: number
- explanation: string | null
- matching_signals: string[]
- execution_time_ms: number
- created_at: Date

**src/domain/types/index.ts**: Export all types used across the app

**src/domain/types/api.ts**: API request/response shapes

IngestSiteRequest:
- url: string
- domain?: string
- page_text?: string
- entities?: { emails?: string[], phones?: string[], handles?: Array<{type: string, value: string}> }
- screenshot_hash?: string
- attempt_resolve?: boolean

IngestSiteResponse:
- site_id: string
- entities_extracted: number
- embeddings_generated: number
- resolution?: { cluster_id: string, confidence: number, explanation: string, matching_signals: string[] } | null

ResolveActorRequest:
- url: string
- domain?: string
- page_text?: string
- entities?: { emails?: string[], phones?: string[], handles?: Array<{type: string, value: string}> }
- site_id?: string

ResolveActorResponse:
- actor_cluster_id: string | null
- confidence: number
- related_domains: string[]
- related_entities: Array<{ type: string, value: string, count: number }>
- matching_signals: string[]
- explanation: string

ClusterDetailsResponse:
- cluster: { id, name, confidence, description, created_at, updated_at }
- sites: Array<{ id, domain, url, first_seen_at }>
- entities: Array<{ type, value, normalized_value, count, sites_using }>
- risk_score: number
- total_unique_entities: number
- resolution_runs: number

Use strict typing; no 'any'. Use Zod for runtime validation where needed.
```

**Output**: Complete typed models and API contracts

---

### Step 5: Database Migrations

**Prompt to Qoder:**

```
Create db/migrations/001_init_schema.sql with:

1. sites table (id, domain, url, page_text, screenshot_hash, first_seen_at, created_at)
   - Primary key: id UUID
   - Index on domain
   - Index on created_at

2. entities table (id, site_id, type, value, normalized_value, confidence, created_at)
   - Foreign key: site_id → sites(id) ON DELETE CASCADE
   - Indexes on: site_id, normalized_value, type
   - Constraint: type IN ('email', 'phone', 'handle', 'wallet')

3. clusters table (id, name, confidence, description, created_at, updated_at)
   - Primary key: id UUID
   - No foreign keys (independent entity)

4. cluster_memberships table (id, cluster_id, entity_id, site_id, membership_type, confidence, reason, created_at)
   - Foreign key: cluster_id → clusters(id) ON DELETE CASCADE
   - Foreign key: entity_id → entities(id) ON DELETE CASCADE (nullable)
   - Foreign key: site_id → sites(id) ON DELETE CASCADE (nullable)
   - Constraint: membership_type IN ('entity', 'site')
   - At least one of entity_id or site_id must be non-null
   - Indexes on: cluster_id, entity_id, site_id

5. embeddings table (id, source_id, source_type, source_text, vector, created_at)
   - source_id: UUID (flexible; can point to site or entity)
   - vector: vector(1024) type (requires pgvector extension; use TEXT as fallback if unavailable)
   - Indexes on: source_id, source_type, created_at

6. resolution_runs table (id, input_url, input_domain, input_entities, result_cluster_id, result_confidence, explanation, matching_signals, execution_time_ms, created_at)
   - input_entities: JSONB
   - matching_signals: JSONB (array)
   - Foreign key: result_cluster_id → clusters(id) ON DELETE SET NULL (nullable)
   - Indexes on: input_domain, result_cluster_id, created_at

Include:
- CREATE EXTENSION IF NOT EXISTS pgvector; (at top)
- CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; (at top)
- Proper timestamps with DEFAULT NOW()
- Index creation for query performance
- Comments explaining each table's purpose

Also create db/migrations/002_add_sample_indexes.sql with additional indexes if needed for common queries.
```

**Output**: SQL migrations in db/migrations/

---

### Step 6: Migration Runner

**Prompt to Qoder:**

```
Create db/run-migrations.ts:

- Read all .sql files from db/migrations/ in order
- Connect to DATABASE_URL from .env
- Execute each migration file
- Log progress (migrations run, time taken, success/error)
- Exit gracefully

Also create db/seed.ts stub that will be filled in Phase 4.
```

**Output**: db/run-migrations.ts, db/seed.ts stub

---

### Step 7: Express App Skeleton

**Prompt to Qoder:**

```
Create src/api/server.ts:

```typescript
// Express app with:
// - JSON body parser
// - CORS enabled
// - Request logging middleware (pino)
// - Error handler middleware
// - Routes stubbed:
//   POST /api/ingest-site
//   POST /api/resolve-actor
//   GET /api/clusters/:id
//   POST /api/seeds (dev-only)
// - Each route returns { error: "Not implemented" } with 501

// Health check route: GET /health → { status: 'ok' }
// 404 handler at end
```

**Output**: src/api/server.ts with middleware and stub routes

---

### Step 8: Entry Point & Environment Config

**Prompt to Qoder:**

```
Create src/index.ts:

- Load .env via dotenv
- Validate required vars (DATABASE_URL, NODE_ENV, PORT)
- Initialize Database client
- Start Express server
- Log startup info (port, env, db connection status)

Create src/util/env.ts:

- Export typed config object
- DATABASE_URL: string
- MIXEDBREAD_API_KEY: string
- NODE_ENV: 'development' | 'production'
- PORT: number (default 3000)
- LOG_LEVEL: string (default 'info')

Include validation with helpful error messages if vars are missing.
```

**Output**: src/index.ts, src/util/env.ts

---

### Step 9: Utilities

**Prompt to Qoder:**

```
Create utility modules:

**src/util/logger.ts**:
- Export pino logger instance
- Set log level from env
- Include request ID tracing
- Structured logging (not console.log)

**src/util/random.ts**:
- generateId(): string → UUID
- generateClusterName(): string → e.g. "Cluster-alpha-42"

**src/util/validation.ts**:
- validateUrl(url: string): boolean
- validateEmail(email: string): boolean
- validatePhoneNumber(phone: string): boolean
- validateHandle(handle: string): boolean
- normalizeUrl(url: string): string
- extractDomainFromUrl(url: string): string
```

**Output**: All utility modules

---

### Step 10: Documentation & README

**Prompt to Qoder:**

```
Create README.md with:

# ARES: Actor Resolution & Entity Service

## Overview
ARES identifies the operators behind counterfeit storefronts by linking domains, entities, and patterns.

## Quick Start

### Prerequisites
- Node.js 18+
- Postgres 14+
- MIXEDBREAD_API_KEY (for embeddings)

### Setup
1. \`npm install\`
2. Copy .env.example to .env and fill in DATABASE_URL + MIXEDBREAD_API_KEY
3. \`npm run db:migrate\`
4. \`npm run db:seed\`
5. \`npm run dev\`

Server will start on http://localhost:3000

## API Endpoints

### POST /api/ingest-site
Ingest a new storefront and extract entities.

### POST /api/resolve-actor
Resolve a site to an operator cluster.

### GET /api/clusters/:id
Fetch cluster details.

## Project Structure
[describe src/ layout]

## Testing
\`npm run test\`

## Development
\`npm run dev\` (with file watching)

## Building for Production
\`npm run build\`
\`npm start\`

## Contributing
[standard guidelines]

---

Also create ARCHITECTURE.md:
- System design
- Data flow diagrams (text-based)
- Service responsibilities
- Database schema overview
```

**Output**: README.md, ARCHITECTURE.md

---

## Validation Checklist

Before moving to Phase 2, verify:

- [ ] All directories exist with correct structure
- [ ] package.json has all dependencies
- [ ] tsconfig.json is strict and correct
- [ ] jest.config.js is configured
- [ ] .env.example is present
- [ ] Database migrations compile without syntax errors
- [ ] src/api/server.ts starts without crashing (stub routes)
- [ ] src/index.ts loads env variables correctly
- [ ] Database client initializes (test connection in a script)
- [ ] All TypeScript types compile (no tsc errors)
- [ ] logger, validation, random utilities are importable
- [ ] npm install completes successfully

---

## Next Steps

Once Phase 1 is complete and validated:

1. Run migrations against a local Postgres database
2. Verify tables exist with correct schema
3. Start the Express server on http://localhost:3000
4. Test that GET /health returns { status: 'ok' }

Then proceed to **ARES_BUILD_PHASE_2** (Core Services Implementation).
