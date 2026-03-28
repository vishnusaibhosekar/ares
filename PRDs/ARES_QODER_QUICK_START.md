# ARES Qoder Build Prompts & Checklist

This is a quick reference to copy-paste into Qoder for rapid iteration.

---

## Phase 1: The Master Prompt (Start Here)

**Copy this entire prompt into Qoder:**

```
Read the file ARES_BUILD_PHASE_1.md carefully. 

Then execute ALL steps in order:

1. Step 1: Initialize Project Structure
2. Step 2: Package.json & Dependencies
3. Step 3: Database Client & Connection
4. Step 4: TypeScript Domain Models & Types
5. Step 5: Database Migrations
6. Step 6: Migration Runner
7. Step 7: Express App Skeleton
8. Step 8: Entry Point & Environment Config
9. Step 9: Utilities
10. Step 10: Documentation & README

Do NOT skip steps. Execute them in order. After each step, verify:
- Files are created in correct locations
- TypeScript compiles (no errors)
- Imports/exports are correct
- Code follows the structure described

When complete, I will say "Phase 1 validation" and ask you to verify the checklist at the end of ARES_BUILD_PHASE_1.md.
```

---

## Phase 2: Sequential Service Prompts

**After Phase 1 is complete:**

### Service 1 Prompt: Entity Extractor
```
Read ARES_BUILD_PHASE_2.md, "Service 1: Entity Extractor" section.

Implement src/service/EntityExtractor.ts with:
- Regex-based extraction (emails, phones, handles, wallets)
- LLM-powered extraction using Claude Haiku
- merge() method combining both
- Full test file: tests/unit/EntityExtractor.test.ts

Use the system prompt and code snippets provided in the document.

After completion:
- npm run test -- EntityExtractor (should pass all tests)
- TypeScript compiles without errors
- No console.log; use logger instead
```

### Service 2 Prompt: Entity Normalizer
```
Read ARES_BUILD_PHASE_2.md, "Service 2: Entity Normalizer" section.

Implement src/service/EntityNormalizer.ts with:
- normalizeEmail()
- normalizePhone() with E.164 format
- normalizeHandle()
- normalizeWallet()
- normalizeEntity() dispatcher
- Helper functions for phone parsing

Add tests: tests/unit/EntityNormalizer.test.ts

After completion:
- npm run test -- EntityNormalizer (all tests pass)
- Handles edge cases (null, empty, invalid input)
```

### Service 3 Prompt: Embedding Service
```
Read ARES_BUILD_PHASE_2.md, "Service 3: Embedding Service" section.

Implement src/service/EmbeddingService.ts with:
- Constructor taking apiKey and model name
- embed(text): call Mixedbread AI API
- embedBatch(texts): batch embedding
- storeEmbedding(): store in DB
- Retry logic with exponential backoff
- In-memory caching

Add tests: tests/unit/EmbeddingService.test.ts

Mock Mixedbread responses in tests (don't make real API calls).

After completion:
- npm run test -- EmbeddingService (all tests pass)
- Caching works (second call doesn't make API request)
```

### Service 4 Prompt: Similarity Scorer
```
Read ARES_BUILD_PHASE_2.md, "Service 4: Similarity Scorer" section.

Implement src/service/SimilarityScorer.ts with:
- scoreEntityMatch(): exact + fuzzy + domain matching
- levenshteinDistance(): edit distance
- scoreTextSimilarity(): cosine similarity
- cosineSimilarity(): dot product / norms
- scoreEntitySet(): batch scoring

Add tests: tests/unit/SimilarityScorer.test.ts

Include edge cases (empty input, null values, very short text).

After completion:
- npm run test -- SimilarityScorer (all tests pass)
- Exact matches return 1.0, no matches return 0.0
```

### Service 5 Prompt: Cluster Resolver
```
Read ARES_BUILD_PHASE_2.md, "Service 5: Cluster Resolver" section.

Implement src/service/ClusterResolver.ts with:
- UnionFind class (find, union, connected)
- resolveCluster(): main resolution logic
- ConfidenceTracker: accumulate scores + signals
- Algorithm: score entities, score text, union, aggregate

Add tests: tests/unit/ClusterResolver.test.ts

Include integration test showing 3 sites with shared phone → matched cluster.

After completion:
- npm run test -- ClusterResolver (all tests pass)
- Union-find path compression works
- Confidence aggregation correct
```

### Service 6 Prompt: Resolution Engine
```
Read ARES_BUILD_PHASE_2.md, "Service 6: Resolution Engine" section.

Implement src/service/ResolutionEngine.ts orchestrating:
- EntityExtractor
- EntityNormalizer
- EmbeddingService
- SimilarityScorer
- ClusterResolver

Methods:
- extractAndNormalize()
- resolve() for ResolveActorRequest
- ingestSite() for IngestSiteRequest

Add integration test: tests/integration/ResolutionEngine.test.ts

After completion:
- npm run test -- ResolutionEngine (integration test passes)
- Full flow works end-to-end
```

---

## Phase 3: API Routes

**After Phase 2 is complete:**

### All Routes Prompt
```
Read ARES_BUILD_PHASE_3.md carefully.

Implement all routes:
1. src/api/routes/ingest-site.ts
2. src/api/routes/resolve-actor.ts
3. src/api/routes/clusters.ts
4. src/api/routes/seeds.ts
5. src/api/routes/health.ts

Update:
6. src/api/middleware/error-handler.ts
7. src/api/middleware/logger.ts
8. src/api/server.ts (register all routes)

Add tests: tests/integration/

Each route should:
- Validate input with Zod schema
- Call appropriate services
- Return typed response
- Handle errors (400, 404, 500)
- Log requests/responses

After completion:
- npm run test:integration (all integration tests pass)
- Manual curl tests work (see curl-examples.sh)
- npm run dev starts server without errors
```

---

## Phase 4: Frontend & Demo

**After Phase 3 is complete:**

### Frontend Prompt
```
Read ARES_BUILD_PHASE_4.md, "Option A: React Frontend" section.

Create frontend/ directory with React + Vite project:
- src/app/ with pages: Dashboard, IngestSite, ResolveActor, ClusterDetails
- src/components/ with forms and UI components
- src/hooks/ with useApi custom hook
- src/lib/ with axios client + types

Use Tailwind CSS for styling.

After completion:
- npm run build (builds without errors)
- npm run dev (starts on localhost:5173)
- All pages load without 404s
- Forms submit and call API
```

### Demo & Examples Prompt
```
Read ARES_BUILD_PHASE_4.md, "Demo Script" and other sections.

Create:
1. demos/end-to-end.ts - CLI script showing full flow
2. demos/curl-examples.sh - cURL reference
3. demos/sample-payloads.json - request/response examples
4. Updated README.md with all sections complete

After completion:
- npm run demo (runs without errors)
- ./demos/curl-examples.sh (all examples work)
- README.md is complete and clear
```

---

## Complete Build Checklist

### Pre-Build
- [ ] Node.js 18+ installed
- [ ] Postgres running (local or cloud)
- [ ] ANTHROPIC_API_KEY set
- [ ] MIXEDBREAD_API_KEY set
- [ ] DATABASE_URL set in .env

### Phase 1: Scaffold
- [ ] Project structure created
- [ ] package.json has all dependencies
- [ ] tsconfig.json is correct
- [ ] jest.config.js is configured
- [ ] Database migrations compile (no SQL errors)
- [ ] src/index.ts loads env variables
- [ ] npm install completes
- [ ] npx tsc --noEmit (no TypeScript errors)

### Phase 2: Services
- [ ] EntityExtractor tests pass (regex + LLM)
- [ ] EntityNormalizer tests pass (all types)
- [ ] EmbeddingService tests pass (caching works)
- [ ] SimilarityScorer tests pass (all scoring modes)
- [ ] ClusterResolver tests pass (union-find + confidence)
- [ ] ResolutionEngine tests pass (integration)
- [ ] npm run test (all unit tests pass)
- [ ] npm run test -- --coverage (80%+ coverage)

### Phase 3: API Routes
- [ ] POST /api/ingest-site validates + works
- [ ] POST /api/resolve-actor validates + works
- [ ] GET /api/clusters/:id works + risk score calculated
- [ ] POST /api/seeds works (dev-only)
- [ ] GET /health works
- [ ] Error responses are consistent
- [ ] npm run test:integration (all integration tests pass)
- [ ] Manual curl tests work
- [ ] npm run dev (server starts on port 3000)
- [ ] GET /health returns { status: 'ok' }

### Phase 4: Frontend & Demo
- [ ] React frontend builds (npm run build)
- [ ] Frontend runs (npm run dev on localhost:5173)
- [ ] All pages load without 404s
- [ ] Forms submit and call API
- [ ] Loading states visible
- [ ] Error messages display
- [ ] npm run demo (runs end-to-end without errors)
- [ ] ./demos/curl-examples.sh (all examples work)
- [ ] README.md complete

### Final Validation
- [ ] Full stack works: backend + frontend + demo
- [ ] Seed data creates realistic test clusters
- [ ] New site resolution shows matched cluster (0.6+ confidence)
- [ ] Risk score calculated for clusters
- [ ] All code is TypeScript (no .js files in src/)
- [ ] All code is well-logged (pino logger)
- [ ] No console.log anywhere (use logger)
- [ ] Error messages are user-friendly
- [ ] No API keys in logs or error messages
- [ ] All tests pass
- [ ] Code is clean and well-structured

### Hackathon Submission
- [ ] Pitch: "AEGE finds counterfeits, ARES identifies the operators"
- [ ] Demo flow works (seed → ingest → resolve → cluster details)
- [ ] Frontend UI is polished (no rough edges)
- [ ] README is clear for judges
- [ ] Code is production-style (not toy code)
- [ ] Qoder story: "Built autonomously by agentic development"
- [ ] Insforge story: "Backend substrate is agent-understandable primitives"

---

## Common Issues & Fixes

### Issue: "Cannot find module @anthropic/sdk"
**Fix**: `npm install @anthropic-ai/sdk` (check Phase 2 dependencies)

### Issue: "ANTHROPIC_API_KEY is undefined"
**Fix**: Set in .env file (copy from .env.example, add your key)

### Issue: "Postgres connection failed"
**Fix**: Verify DATABASE_URL in .env, ensure Postgres is running

### Issue: "TypeScript errors about missing types"
**Fix**: Run `npm install @types/express @types/node` etc. (see package.json)

### Issue: "Tests fail with 'Cannot GET /api/ingest-site'"
**Fix**: Ensure server.ts has the route registered and error handler is not interfering

### Issue: "Frontend won't start (port already in use)"
**Fix**: Kill existing process or use different port: `npm run dev -- --port 5174`

### Issue: "Demo script hangs on HTTP request"
**Fix**: Ensure backend is running (`npm run dev` in separate terminal)

---

## How to Use These Files with Qoder

1. **Read this checklist first** to understand the overall flow
2. **Read ARES_BUILD_MASTER_INDEX.md** for high-level architecture
3. **For each phase**:
   - Read the corresponding ARES_BUILD_PHASE_X.md file
   - Copy prompts from this checklist into Qoder
   - Let Qoder execute each step
   - Run tests to validate
4. **Reference ARES_IMPLEMENTATION_NOTES.md** for LLM extraction details

---

## Qoder Best Practices

1. **Be explicit**: Tell Qoder exactly what file to create and where
2. **Include full prompts**: Copy the "Prompt to Qoder" sections verbatim
3. **Validate after each step**: Run npm run test to verify
4. **Let Qoder decide implementations**: Give it constraints, let it figure out the code
5. **Use Agent mode**: Qoder's autonomous decision-making is the point
6. **Check logs**: If something fails, read the error message carefully

---

## Timing Estimate

- Phase 1: 1 hour
- Phase 2: 2 hours
- Phase 3: 1.5 hours
- Phase 4: 1.5 hours
- **Total: 6 hours** (includes testing + validation)

---

## Success = Working Demo

At the end, you should be able to:

```bash
# Terminal 1
npm run dev
# Server running on localhost:3000

# Terminal 2
cd frontend && npm run dev
# Frontend running on localhost:5173

# Terminal 3
npm run demo
# Full flow runs end-to-end

# Browser
# Visit http://localhost:5173
# Click "Seed Data" → See test clusters
# "Resolve Actor" → Enter URL + phone → See matched cluster (85%+ confidence)
# Click cluster ID → See full operator profile
```

That's a working ARES system. Ready to pitch it to judges. 🚀

---

## Questions During Build?

- **"What does this TypeScript type mean?"** → Check phase X for explanation
- **"How should this function work?"** → See the code snippet in phase X
- **"What's the error?"** → Check the error message + "Common Issues" section above
- **"Should I implement feature X?"** → Check if it's in scope (MVP vs future work)

---

**Let's build ARES! 🎯**

Start with ARES_BUILD_PHASE_1.md and follow the prompts.
