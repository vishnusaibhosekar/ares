# ARES Build Master Index

**ARES = Actor Resolution & Entity Service**

A standalone API service that identifies the operators behind counterfeit storefronts by linking domains, entities, and patterns.

Built for the **Insforge x Qoder AI Agent Hackathon** (Seattle, March 28–29, 2026).

---

## Quick Start

### Prerequisites

- Node.js 18+
- Postgres 14+ (local or cloud)
- ANTHROPIC_API_KEY (for Claude Haiku LLM extraction)
- MIXEDBREAD_API_KEY (for Mixedbread AI embeddings)

### Setup (5 min)

```bash
# 1. Clone or scaffold the project
git clone <repo> ares
cd ares

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, API keys

# 4. Run migrations
npm run db:migrate

# 5. Seed test data
npm run db:seed

# 6. Start backend API
npm run dev
# Server runs on http://localhost:3000

# 7. (In another terminal) Start frontend
cd frontend
npm install
npm run dev
# UI runs on http://localhost:5173

# 8. (In another terminal) Run demo
npm run demo
```

API will be available at `http://localhost:3000`. Frontend at `http://localhost:5173`.

---

## Build Phases (4 Phases, ~6 Hours Total)

### Phase 1: Scaffold, Schema & Types (~1 hour)
**File**: `ARES_BUILD_PHASE_1.md`

What's built:
- ✅ Full project structure
- ✅ package.json with dependencies
- ✅ Postgres schema (migrations)
- ✅ Database client + repositories
- ✅ TypeScript types (models + API contracts)
- ✅ Express app skeleton + stub routes

**Validation**: `npm install` works, migrations compile, tsc has no errors.

**Next**: Verify database connection works: `npm run db:migrate`

---

### Phase 2: Core Services (~2 hours)
**File**: `ARES_BUILD_PHASE_2.md`

What's built:
- ✅ EntityExtractor (regex + LLM-powered)
- ✅ EntityNormalizer (email/phone/handle canonicalization)
- ✅ EmbeddingService (Mixedbread AI integration)
- ✅ SimilarityScorer (entity + text matching)
- ✅ ClusterResolver (union-find graph + confidence aggregation)
- ✅ ResolutionEngine (orchestrator)
- ✅ Unit tests for all services

**Validation**: `npm run test` passes all tests, coverage > 80%.

**Key decisions**:
- LLM extraction is optional (use_llm_extraction flag)
- Text similarity threshold: 0.75
- Entity match threshold: 0.7
- Final confidence threshold: 0.6 (return cluster) vs < 0.6 (new cluster)

**Next**: All services tested in isolation; ready for API integration.

---

### Phase 3: API Routes (~1.5 hours)
**File**: `ARES_BUILD_PHASE_3.md`

What's built:
- ✅ POST /api/ingest-site (ingest storefront, extract entities, optionally resolve)
- ✅ POST /api/resolve-actor (resolve site to operator cluster)
- ✅ GET /api/clusters/:id (fetch cluster details with risk score)
- ✅ POST /api/seeds (dev-only database seeding)
- ✅ GET /health (health check endpoint)
- ✅ Error handling middleware (Zod validation, consistent error responses)
- ✅ Request logging middleware (structured JSON logs)
- ✅ Integration tests for all routes

**Validation**: Integration tests pass (`npm run test:integration`). Manual cURL tests work.

**Key features**:
- Zod request validation
- 400/404/500 error responses
- Request ID tracing
- Execution time tracking
- Risk score calculation for clusters

**Next**: All routes tested; API is production-ready.

---

### Phase 4: Frontend UI & Demo (~1.5 hours)
**File**: `ARES_BUILD_PHASE_4.md`

What's built:
- ✅ React frontend (Vite) with pages:
  - Dashboard (overview + recent activity)
  - Ingest Site (form + response display)
  - Resolve Actor (form + matched cluster results)
  - Cluster Details (viewer with risk score)
- ✅ CLI demo script (end-to-end resolution workflow)
- ✅ cURL examples (shell script)
- ✅ Sample payloads (JSON reference)
- ✅ Updated README with instructions

**Validation**: Frontend builds without errors, pages load, forms submit, demo script runs.

**Key features**:
- Real-time form validation
- Loading states
- Error handling
- Responsive design
- Confidence score visualizations
- Risk score indicators

**Next**: Full stack works end-to-end.

---

## Implementation Notes

### LLM-Powered Entity Extraction
**File**: `ARES_IMPLEMENTATION_NOTES.md`

Detailed guide on:
- Claude Haiku API integration
- System prompt design
- JSON response parsing
- Error handling + retry logic
- Cost optimization (~$0.001 per extraction)
- Testing LLM extraction
- Regex patterns reference

**Key decision**: LLM extraction is optional. Default to regex (fast, free). Users can opt-in with `use_llm_extraction: true`.

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│   Frontend (React + Vite)           │
│   http://localhost:5173             │
├─────────────────────────────────────┤
│   API Routes (Express)              │
│   POST /ingest-site                 │
│   POST /resolve-actor               │
│   GET /clusters/:id                 │
├─────────────────────────────────────┤
│   Business Logic Services           │
│   - EntityExtractor (regex + LLM)   │
│   - EntityNormalizer                │
│   - EmbeddingService                │
│   - SimilarityScorer                │
│   - ClusterResolver (union-find)    │
│   - ResolutionEngine (orchestrator) │
├─────────────────────────────────────┤
│   Data Access (Repositories)        │
│   - Sites, Entities, Clusters       │
│   - Embeddings, ResolutionRuns      │
├─────────────────────────────────────┤
│   External Services                 │
│   - Postgres (Insforge)             │
│   - Mixedbread AI (embeddings)      │
│   - Claude API (LLM extraction)     │
└─────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Entity Matching Strategy
- **Exact match**: Score 1.0
- **Fuzzy match** (edit distance ≤ 2): Score 0.95
- **Email domain match**: Score 0.75
- **No match**: Score 0.0
- **Threshold**: 0.7 to consider a signal

### 2. Text Similarity
- Embed page text using Mixedbread AI
- Compare cosine similarity against historical embeddings
- Threshold: 0.75 to consider a signal

### 3. Cluster Resolution
- Union-find to group related entities
- Aggregate confidence from all matching signals
- Final confidence = mean(signal_scores)
- **Decision threshold**: ≥ 0.6 → return cluster; < 0.6 → new cluster

### 4. Risk Score Calculation
```
risk_score = (site_count × entity_overlap) / (total_unique_entities + 1)
```
- Heuristic: More sites + shared entities = higher risk
- Range: 0.0 (low) to 1.0 (high)

### 5. LLM Extraction
- **Optional**, triggered by `use_llm_extraction: true`
- **Model**: Claude Haiku 4.5 (~$0.001 per call)
- **Fallback**: Returns empty results gracefully
- **Merge**: Combines regex + LLM results, deduplicates

---

## API Contracts (Summary)

### POST /api/ingest-site
Ingest a new storefront, extract entities, optionally resolve.

```json
{
  "url": "https://fake-luxe.shop",
  "domain": "fake-luxe.shop",
  "page_text": "...",
  "entities": { "phones": [...], "emails": [...], "handles": [...] },
  "attempt_resolve": true,
  "use_llm_extraction": false
}
→ {
  "site_id": "uuid",
  "entities_extracted": 3,
  "embeddings_generated": 1,
  "resolution": { "cluster_id": "uuid", "confidence": 0.87, ... }
}
```

### POST /api/resolve-actor
Resolve a site to an operator cluster.

```json
{
  "url": "https://mirror-designer.cn",
  "page_text": "...",
  "entities": { "phones": ["+86 138 1234 5678"] }
}
→ {
  "actor_cluster_id": "uuid | null",
  "confidence": 0.92,
  "related_domains": ["domain1", "domain2"],
  "related_entities": [{ "type": "phone", "value": "+86...", "count": 5 }],
  "matching_signals": ["shared_phone", "similar_policy_text"],
  "explanation": "..."
}
```

### GET /api/clusters/:id
Fetch full cluster details.

```
→ {
  "cluster": { "id", "name", "confidence", "created_at" },
  "sites": [{ "domain", "url", "first_seen_at" }],
  "entities": [{ "type", "value", "count", "sites_using" }],
  "risk_score": 0.78,
  "total_unique_entities": 7,
  "resolution_runs": 12
}
```

---

## Database Schema (Summary)

| Table | Purpose |
|-------|---------|
| **sites** | Suspicious storefronts (domain, URL, page_text) |
| **entities** | Extracted contact info (emails, phones, handles, wallets) |
| **clusters** | Resolved operator groups (name, confidence) |
| **cluster_memberships** | Links sites/entities to clusters |
| **embeddings** | Vector embeddings for text (1024-dim Mixedbread) |
| **resolution_runs** | Audit trail of resolution decisions |

See `ARES_BUILD_PHASE_1.md` for full schema definitions.

---

## Testing & Validation

### Unit Tests
```bash
npm run test
```
Tests entity extraction, normalization, similarity scoring, cluster resolution.

### Integration Tests
```bash
npm run test:integration
```
Tests all API routes with real database.

### Manual Testing
```bash
# Health check
curl http://localhost:3000/health

# Seed data
curl -X POST http://localhost:3000/api/seeds \
  -H "Content-Type: application/json" \
  -d '{"count": 10}'

# Ingest site
curl -X POST http://localhost:3000/api/ingest-site \
  -H "Content-Type: application/json" \
  -d '{"url": "https://...", "page_text": "..."}'

# Resolve actor
curl -X POST http://localhost:3000/api/resolve-actor \
  -H "Content-Type: application/json" \
  -d '{"url": "https://...", "entities": {"phones": [...]}}'
```

See `demos/curl-examples.sh` for all examples.

---

## Demo Flow (2 min Pitch)

1. **Show health check**: `curl /health` → API is running
2. **Seed data**: `POST /api/seeds` → 10 test sites, 3 clusters
3. **New site detection**: `POST /ingest-site` with shared phone → Shows matched cluster with 85%+ confidence
4. **Cluster inspection**: `GET /clusters/:id` → Shows all related domains + shared entities + risk score
5. **Frontend demo**: Open http://localhost:5173 → Resolve Actor page → Form → Submit → See matched cluster in UI

**Story**: "AEGE finds websites selling counterfeits. ARES identifies the operators behind them. We built this with Qoder (agentic development) + Insforge (agent-native backend)."

---

## File Inventory

```
ARES_BUILD_PHASE_1.md          ← Start here: Scaffold, Schema, Types
ARES_BUILD_PHASE_2.md          ← Core Services: Extract, Normalize, Embed, Score, Resolve
ARES_BUILD_PHASE_3.md          ← API Routes: ingest-site, resolve-actor, clusters, seeds
ARES_BUILD_PHASE_4.md          ← UI + Demo: React frontend, CLI demo, cURL examples
ARES_IMPLEMENTATION_NOTES.md   ← LLM Entity Extraction: Claude API integration
ARES_BUILD_MASTER_INDEX.md     ← This file
```

---

## Estimated Timeline

| Phase | Duration | What's Done |
|-------|----------|------------|
| Phase 1 | ~1 hour | Scaffold + schema |
| Phase 2 | ~2 hours | Services + tests |
| Phase 3 | ~1.5 hours | API routes + integration tests |
| Phase 4 | ~1.5 hours | UI + demo |
| Buffer | ~0.5 hour | Debugging, polish |
| **Total** | **~6 hours** | **Full ARES MVP** |

---

## Success Criteria (Hackathon Submission)

- [ ] All 4 phases complete
- [ ] API routes tested (integration tests pass)
- [ ] Frontend loads without errors
- [ ] Demo script runs end-to-end
- [ ] Health check works
- [ ] Seed data creates realistic test clusters
- [ ] Resolve endpoint matches new sites to clusters (0.6+ confidence)
- [ ] Risk score calculated for clusters
- [ ] README is clear + complete
- [ ] Code is clean, well-logged, well-typed

---

## Known Limitations & Future Work

### MVP Limitations
- Single database (no sharding)
- Sync resolution (no async jobs)
- Simple threshold-based scoring (no ML)
- No API authentication (dev-only for hackathon)
- No rate limiting
- In-memory caching (no Redis)

### Future Enhancements
1. **Production hardening**
   - API key auth + rate limiting
   - Async resolution (job queue)
   - Caching layer (Redis)
   - Monitoring (Sentry, Datadog)

2. **Advanced resolution**
   - Neural network for confidence scoring
   - Link prediction models
   - Graph clustering algorithms
   - Multi-modal entity matching

3. **Integration with AEGE**
   - AEGE calls `/api/resolve-actor` after evidence collection
   - Operator info included in case files
   - Cross-system entity matching

4. **Scaling**
   - Distributed vector search (Milvus, Weaviate)
   - Sharded Postgres
   - Async embedding generation
   - Batch resolution jobs

---

## Questions?

**By Phase**:
- Phase 1: Schema, types, or directory structure → See `ARES_BUILD_PHASE_1.md`
- Phase 2: Entity extraction, embeddings, or scoring → See `ARES_BUILD_PHASE_2.md`
- Phase 3: API routes or error handling → See `ARES_BUILD_PHASE_3.md`
- Phase 4: Frontend or demo → See `ARES_BUILD_PHASE_4.md`

**By Feature**:
- LLM extraction details → See `ARES_IMPLEMENTATION_NOTES.md`
- API contracts → This file (summary) or Phase 3 (full details)
- Database schema → Phase 1
- Scoring/clustering logic → Phase 2

---

## Let's Build! 🚀

Start with **Phase 1** (`ARES_BUILD_PHASE_1.md`) in Qoder. Follow the prompts sequentially. Each phase builds on the previous one.

**Time to first API call**: ~1.5 hours (Phase 1 + Phase 2 skeleton)
**Time to working demo**: ~6 hours (all phases)
**Time to winning hackathon**: ?

Good luck!

---

**ARES: Identifying the operators behind counterfeit storefronts.**

*Built with ❤️ for the Insforge x Qoder Hackathon (Seattle, March 2026)*
