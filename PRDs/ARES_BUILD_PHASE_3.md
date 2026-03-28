# ARES Build Phase 3: API Implementation

**Duration**: ~1.5 hours  
**Goal**: Implement all API routes with proper validation, error handling, and logging.

**Prerequisites**: Phase 2 complete, all services tested and working.

---

## Routes to Build

1. **POST /api/ingest-site** → Ingest storefront, extract entities, optionally resolve
2. **POST /api/resolve-actor** → Resolve site to operator cluster
3. **GET /api/clusters/:id** → Fetch cluster details
4. **POST /api/seeds** → (Dev-only) Seed database with test data
5. **GET /health** → Health check

---

## Detailed Instructions for Qoder

### Route 1: POST /api/ingest-site

**Prompt to Qoder:**

```
Create src/api/routes/ingest-site.ts:

**Purpose**: Ingest a new suspicious storefront, extract entities, generate embeddings, optionally resolve to operator cluster.

**Request validation:**

Use Zod schema:
```typescript
const IngestSiteRequestSchema = z.object({
  url: z.string().url("Invalid URL"),
  domain: z.string().optional(),
  page_text: z.string().optional(),
  entities: z.object({
    emails: z.array(z.string().email()).optional(),
    phones: z.array(z.string()).optional(),
    handles: z.array(z.object({
      type: z.enum(['whatsapp', 'telegram', 'wechat', 'other']),
      value: z.string()
    })).optional()
  }).optional(),
  screenshot_hash: z.string().optional(),
  attempt_resolve: z.boolean().default(false),
  use_llm_extraction: z.boolean().default(false)
});
```

**Route handler:**

```typescript
async function ingestSiteHandler(req, res) {
  // 1. Parse + validate request
  // 2. Extract domain from URL if not provided
  // 3. Create site record in DB
  // 4. Extract entities from page_text (use LLM if use_llm_extraction: true)
  // 5. Normalize + store entities
  // 6. Generate embeddings for page_text (if provided)
  // 7. If attempt_resolve: call ResolutionEngine.resolve()
  // 8. Return response: {site_id, entities_extracted, embeddings_generated, resolution?}

  // Error handling:
  // - 400 Bad Request: validation failed
  // - 409 Conflict: URL already ingested (check for duplicate domain)
  // - 500 Internal Server Error: unexpected failure (log to Sentry/logger)
}
```

**Implementation details:**

- Extract domain from URL using url.parse() or new URL()
- Check if site.domain already exists → if yes, return 409 Conflict with message "This domain has already been ingested"
- Call resolutionEngine.ingestSite(request)
- Return IngestSiteResponse (as defined in Phase 1)
- Log all steps (info level)
- Catch errors and return appropriate HTTP status

**Validation:**

Write integration test in tests/integration/ingest-site.test.ts:

- Valid request → 200, site_id returned
- Duplicate domain → 409 Conflict
- Invalid URL → 400 Bad Request
- Missing page_text → still succeeds (entities not extracted)
- attempt_resolve: true → includes resolution in response
- use_llm_extraction: true → calls LLM entity extractor
- Verify database has new site record + entities + embeddings
```

**Output**: src/api/routes/ingest-site.ts with Zod validation, error handling, and test

---

### Route 2: POST /api/resolve-actor

**Prompt to Qoder:**

```
Create src/api/routes/resolve-actor.ts:

**Purpose**: Given site signals, resolve to operator cluster.

**Request validation:**

Use Zod schema:
```typescript
const ResolveActorRequestSchema = z.object({
  url: z.string().url("Invalid URL"),
  domain: z.string().optional(),
  page_text: z.string().optional(),
  entities: z.object({
    emails: z.array(z.string().email()).optional(),
    phones: z.array(z.string()).optional(),
    handles: z.array(z.object({
      type: z.enum(['whatsapp', 'telegram', 'wechat', 'other']),
      value: z.string()
    })).optional()
  }).optional(),
  site_id: z.string().uuid().optional()
});
```

**Route handler:**

```typescript
async function resolveActorHandler(req, res) {
  // 1. Parse + validate request
  // 2. If site_id provided: fetch site record + entities from DB
  //    Else: use inline entities from request
  // 3. Call resolutionEngine.resolve(request)
  // 4. Return response: ResolveActorResponse

  // Timing:
  // - Record start time
  // - Return execution_time_ms in response

  // Error handling:
  // - 400 Bad Request: validation failed
  // - 404 Not Found: site_id provided but not found
  // - 500 Internal Server Error: resolution failed
}
```

**Implementation details:**

- If site_id is provided, fetch full site context from DB
- If not found, return 404 Not Found
- Call resolutionEngine.resolve()
- Return ResolveActorResponse
- Timing: measure resolve() execution time
- Log all steps

**Validation:**

Write integration test in tests/integration/resolve-actor.test.ts:

- Valid request → 200, resolution result returned
- site_id not found → 404 Not Found
- Invalid URL → 400 Bad Request
- Matched cluster → actor_cluster_id is not null
- No match → actor_cluster_id is null
- confidence >= 0.6 → returns cluster
- confidence < 0.6 → returns null cluster_id
- matching_signals is non-empty if matched
- explanation is non-empty if matched
```

**Output**: src/api/routes/resolve-actor.ts with validation and error handling, test

---

### Route 3: GET /api/clusters/:id

**Prompt to Qoder:**

```
Create src/api/routes/clusters.ts:

**Purpose**: Fetch full details of a resolved operator cluster.

**Query parameters (optional):**

- include_resolution_history: boolean (default: false) → include last 10 resolution_runs

**Route handler:**

```typescript
async function getClusterHandler(req, res) {
  // 1. Parse + validate cluster_id from params
  // 2. Fetch cluster record
  // 3. Fetch all sites in cluster (via cluster_memberships)
  // 4. Fetch all entities in cluster (via cluster_memberships)
  // 5. Calculate risk_score:
  //    risk_score = (site_count * entity_overlap) / (total_unique_entities + 1)
  // 6. Fetch resolution_runs if include_resolution_history: true
  // 7. Return ClusterDetailsResponse

  // Error handling:
  // - 400 Bad Request: invalid cluster_id UUID
  // - 404 Not Found: cluster doesn't exist
  // - 500 Internal Server Error: query failed
}
```

**Implementation details:**

Risk score calculation:
```typescript
function calculateRiskScore(sites: Site[], entities: Entity[]): number {
  // Heuristic: more sites + more entity overlap = higher risk
  // Base: 0.0
  // +0.3 for each unique site (capped at 3 unique sites)
  // +0.2 if entities shared across 3+ sites
  // +0.2 if "high-trust" entity types (phone + email both present)
  // Result: 0.0–1.0

  let score = 0;
  const siteCount = Math.min(sites.length / 3, 0.3);
  score += siteCount;

  const entitySharing = entities.filter(e => e.sites_using.length >= 3).length;
  if (entitySharing > 0) score += 0.2;

  const hasPhone = entities.some(e => e.type === 'phone');
  const hasEmail = entities.some(e => e.type === 'email');
  if (hasPhone && hasEmail) score += 0.2;

  return Math.min(score, 1.0);
}
```

Entity count:
```typescript
// related_entities: unique entities across all sites in cluster
// count: how many sites in cluster use this entity
// sites_using: [site_id1, site_id2, ...]
```

**Validation:**

Write integration test in tests/integration/clusters.test.ts:

- Valid cluster_id → 200, cluster details returned
- Invalid UUID format → 400 Bad Request
- Non-existent cluster → 404 Not Found
- Risk score is 0.0–1.0
- related_domains is array of unique domains
- related_entities includes count + sites_using
- include_resolution_history: true → includes resolution_runs
- Verify all sites in cluster are returned
- Verify all entities are deduplicated
```

**Output**: src/api/routes/clusters.ts with risk scoring, error handling, and test

---

### Route 4: POST /api/seeds (Dev-Only)

**Prompt to Qoder:**

```
Create src/api/routes/seeds.ts:

**Purpose**: (Development only) Seed database with realistic test data.

**Request:**

```typescript
const SeedsRequestSchema = z.object({
  count: z.number().min(1).max(20).default(10),
  include_matches: z.boolean().default(true)
});
```

**Route handler:**

```typescript
async function seedsHandler(req, res) {
  // 0. Verify NODE_ENV === 'development' or return 403 Forbidden
  // 1. Parse request
  // 2. Generate 'count' fictional storefronts
  // 3. Cluster them with shared entities:
  //    - Generate 3–5 "operator clusters"
  //    - Create 'count' sites
  //    - Distribute sites across clusters
  //    - Assign shared phone numbers / emails / policies within cluster
  // 4. Create site records
  // 5. Create entity records
  // 6. Generate embeddings for all sites
  // 7. Create cluster records + memberships
  // 8. Return { created_sites: number, created_clusters: number, created_entities: number }

  // Error handling:
  // - 403 Forbidden: NODE_ENV !== 'development'
  // - 400 Bad Request: invalid request
  // - 500 Internal Server Error: seeding failed
}
```

**Seed data generation:**

Create a function that generates realistic test data:

```typescript
interface SeedConfig {
  clusters: number;        // 3–5 operator groups
  sites_per_cluster: number;
  shared_phones: boolean;   // 70% of sites in cluster share phone
  shared_emails: boolean;   // 50% of sites in cluster share email
  similar_policies: boolean; // use semantic similarity
}

function generateSeedData(config: SeedConfig): {
  sites: Site[],
  entities: Entity[],
  clusters: Cluster[],
  memberships: ClusterMembership[]
}

// Example cluster: "Shenzhen Luxury Replica Syndicate"
// Sites:
//   - fake-luxe.shop
//   - luxury-outlet.cn
//   - designer-bargains.ru
// Shared entities:
//   - +86 138 1234 5678 (phone)
//   - shipping@luxeoutlet.cn (email variant)
//   - Policy text: "24/7 customer support. Ships worldwide. No returns on sales items."
```

**Validation:**

Write test in tests/integration/seeds.test.ts:

- POST /api/seeds → 200, returns counts
- Verify sites are created in DB
- Verify clusters are created
- Verify entities are created
- Verify memberships are created
- Verify embeddings are generated
- Verify shared entities work as expected
- NODE_ENV !== 'development' → 403 Forbidden
```

**Output**: src/api/routes/seeds.ts with realistic seed generation, test

---

### Error Handler Middleware

**Prompt to Qoder:**

```
Create/enhance src/api/middleware/error-handler.ts:

This middleware catches all errors and returns consistent error responses.

```typescript
interface ErrorResponse {
  error: string;           // human-readable message
  code: string;            // error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND', 'INTERNAL_SERVER_ERROR')
  details?: any;           // optional details
  timestamp: string;       // ISO 8601 timestamp
  request_id: string;      // unique request ID for logging
}

// Catch:
// - Zod validation errors → 400 + details
// - Not found errors → 404
// - Database errors → 500 + logged
// - LLM/embedding errors → 500 + logged (don't expose API keys)
// - Unexpected errors → 500 + logged

// Always include request_id (from X-Request-ID header or generate new UUID)
// Log all errors with request context
```

**Output**: Enhanced src/api/middleware/error-handler.ts

---

### Request Logging Middleware

**Prompt to Qoder:**

```
Create/enhance src/api/middleware/logger.ts:

Log all requests + responses.

```typescript
// Middleware logs:
// - method + path
// - request_id (UUID)
// - user agent
// - query + body (sanitize API keys)
// - response status + time (ms)
// - any errors

// Format: structured JSON logs (pino)
// Use pino http plugin for automatic request logging
```

**Output**: Enhanced src/api/middleware/logger.ts

---

### Health Check Route

**Prompt to Qoder:**

```
Create/verify src/api/routes/health.ts:

GET /health endpoint.

```typescript
async function healthHandler(req, res) {
  // Check:
  // 1. Database connection (simple query)
  // 2. Mixedbread API key is set (don't call API; just check env)
  // 3. Return { status: 'ok', timestamp: ISO8601, db: 'ok', embeddings: 'ok' }

  // If any check fails: return { status: 'degraded', ... } with 503 Service Unavailable
}
```

**Output**: src/api/routes/health.ts with dependency checks

---

### Server Setup Update

**Prompt to Qoder:**

```
Update src/api/server.ts:

Register all routes + middleware:

```typescript
import express from 'express';
import { errorHandler, loggerMiddleware } from './middleware';
import { 
  ingestSiteHandler, 
  resolveActorHandler, 
  getClusterHandler,
  seedsHandler,
  healthHandler
} from './routes';

export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(loggerMiddleware);

  // Routes
  app.post('/api/ingest-site', ingestSiteHandler);
  app.post('/api/resolve-actor', resolveActorHandler);
  app.get('/api/clusters/:id', getClusterHandler);
  app.post('/api/seeds', seedsHandler);
  app.get('/health', healthHandler);

  // 404
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', code: 'NOT_FOUND' });
  });

  // Error handler (last)
  app.use(errorHandler);

  return app;
}
```

**Output**: Updated src/api/server.ts with all routes registered

---

### Integration Tests

**Prompt to Qoder:**

```
Create comprehensive integration tests in tests/integration/:

**Setup (before all):**
- Start Express server
- Run migrations
- Seed initial data

**Tests:**

1. **POST /api/ingest-site**
   - Valid request → 200, site created
   - Duplicate domain → 409 Conflict
   - Invalid URL → 400 Bad Request
   - With attempt_resolve → includes resolution

2. **POST /api/resolve-actor**
   - Matched cluster → returns cluster_id + confidence
   - No match → returns null cluster_id
   - Invalid site_id → 404 Not Found

3. **GET /api/clusters/:id**
   - Valid cluster → 200, full details
   - Invalid UUID → 400 Bad Request
   - Non-existent cluster → 404 Not Found
   - risk_score calculated correctly

4. **POST /api/seeds**
   - Valid request → 200, data seeded
   - NODE_ENV !== 'development' → 403 Forbidden

5. **GET /health**
   - Server healthy → 200, status: 'ok'

**Cleanup (after all):**
- Truncate test database tables
- Close server connection

Use jest for testing; set up supertest for HTTP assertions.
```

**Output**: tests/integration/ with all integration tests

---

## Validation Checklist

Before moving to Phase 4, verify:

- [ ] All routes compile without errors
- [ ] All routes have Zod validation
- [ ] All routes have error handling (400, 404, 500)
- [ ] All routes log requests/responses
- [ ] Integration tests pass (npm run test:integration)
- [ ] Database state is consistent after each test
- [ ] Error responses are consistent (ErrorResponse format)
- [ ] No sensitive data in error messages (API keys, passwords)
- [ ] Health check works and tests all dependencies
- [ ] Seeds endpoint only works in development
- [ ] Request IDs are generated and logged
- [ ] Response times are fast (< 1s for most endpoints)

---

## Testing the Routes Manually

Once Phase 3 is complete:

```bash
# Start server
npm run dev

# Health check
curl http://localhost:3000/health

# Seed data (dev only)
curl -X POST http://localhost:3000/api/seeds \
  -H "Content-Type: application/json" \
  -d '{"count": 10, "include_matches": true}'

# Ingest a site
curl -X POST http://localhost:3000/api/ingest-site \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://fake-luxe.shop",
    "domain": "fake-luxe.shop",
    "page_text": "Contact: +86 138 1234 5678. Fast shipping worldwide.",
    "attempt_resolve": true
  }'

# Resolve actor
curl -X POST http://localhost:3000/api/resolve-actor \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://luxury-outlet.cn",
    "domain": "luxury-outlet.cn",
    "page_text": "Contact: +86 138 1234 5678",
    "entities": {
      "phones": ["+86 138 1234 5678"]
    }
  }'

# Get cluster (use cluster_id from previous response)
curl http://localhost:3000/api/clusters/{cluster_id}
```

---

## Next Steps

Once Phase 3 is complete and all routes are tested:

1. Run integration tests: npm run test:integration
2. Verify manual curl tests work
3. Check logs for any issues
4. Proceed to **ARES_BUILD_PHASE_4** (UI & Demo)
