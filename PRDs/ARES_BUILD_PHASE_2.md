# ARES Build Phase 2: Core Services Implementation

**Duration**: ~2 hours  
**Goal**: Implement all business logic services (entity extraction/normalization, embeddings, similarity scoring, cluster resolution) with unit tests.

**Prerequisites**: Phase 1 scaffold complete, Express server running.

---

## Services to Build

1. **EntityExtractor** → Extract emails, phones, handles, wallets (both regex + LLM-powered)
2. **EntityNormalizer** → Canonicalize entities to comparable forms
3. **EmbeddingService** → Call Mixedbread AI to embed text
4. **SimilarityScorer** → Score entity matches and text similarity
5. **ClusterResolver** → Union-find graph to resolve operator clusters
6. **ResolutionEngine** → Orchestrate all services

---

## Detailed Instructions for Qoder

### Service 1: Entity Extractor (with LLM-Powered Extraction)

**Prompt to Qoder:**

```
Create src/service/EntityExtractor.ts:

This service extracts entities (emails, phones, handles, wallets) from raw text using BOTH regex patterns AND LLM-powered extraction.

**Regex-based extraction:**

Implement functions:
- extractEmails(text: string): string[] → find all email addresses
- extractPhones(text: string): string[] → find all phone numbers (intl format, just digits+symbols)
- extractHandles(text: string): Array<{type: string, value: string}> → find @whatsapp, @telegram, @wechat, handles
- extractWallets(text: string): Array<{type: string, value: string}> → find crypto wallets (simplified)

Regex patterns:
- Emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
- Phones: /(\+?1[-.\s]?)?(\([2-9]\d{2}\)|[2-9]\d{2})[-.\s]?([2-9]\d{2})[-.\s]?(\d{4})/g plus intl patterns like +86, +44, etc.
- WhatsApp: /\b\+?1?\s*\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g or WhatsApp mentions
- Telegram: /@[a-zA-Z0-9_]{5,32}/g or mention handles
- WeChat: /WeChat:\s*(\w+)/gi or similar patterns
- Wallets: /0x[a-fA-F0-9]{40}/g (Ethereum), other crypto patterns

Return results with duplicates removed.

**LLM-powered extraction:**

Implement async function:
- extractEntitiesWithLLM(text: string): Promise<{emails: string[], phones: string[], handles: Array<{type, value}>, wallets: Array<{type, value}>}>

Uses:
- Anthropic Claude API (claude-haiku-4.5 for speed + cost)
- System prompt: "Extract all emails, phone numbers, WhatsApp/Telegram/WeChat handles, and crypto wallets from the following text. Return as JSON with keys: emails (array), phones (array), handles (array of {type, value}), wallets (array of {type, value})."
- Input: raw text
- Output: parsed JSON

Fallback: If LLM fails, silently return empty results (don't crash).

**Main extraction method:**

Implement:
- async extract(text: string, useLLM: boolean = false): Promise<ExtractedEntities>
  - If useLLM: call extractEntitiesWithLLM
  - Else: call regex extractors
  - Merge results (deduplicate across both methods if both are used)
  - Return typed ExtractedEntities object

**Type definition:**

```typescript
interface ExtractedEntities {
  emails: string[];
  phones: string[];
  handles: Array<{ type: 'whatsapp' | 'telegram' | 'wechat' | 'other', value: string }>;
  wallets: Array<{ type: 'ethereum' | 'bitcoin' | 'other', value: string }>;
  raw_extraction_time_ms: number;
}
```

**Testing:**

Write tests in tests/unit/EntityExtractor.test.ts:

Regex tests:
- Test email extraction with 5+ variations (with dots, numbers, etc.)
- Test phone extraction with intl formats (+1, +86, +44)
- Test handle extraction for @whatsapp, @telegram, @wechat
- Test that duplicates are removed

LLM tests:
- Test with real page text snippet (mock Claude response if needed)
- Verify JSON parsing works
- Test fallback behavior on LLM failure

Edge cases:
- Empty text → empty results
- Text with no entities → empty results
- Malformed phones → filtered out
- Very long text → truncate before LLM call to avoid token limits
```

**Output**: src/service/EntityExtractor.ts with regex + LLM methods, comprehensive tests

---

### Service 2: Entity Normalizer

**Prompt to Qoder:**

```
Create src/service/EntityNormalizer.ts:

Normalize extracted entities to canonical forms for comparison.

**Methods:**

```typescript
normalizeEmail(email: string): string
// - convert to lowercase
// - trim whitespace
// - return email or empty string if invalid

normalizePhone(phone: string): string
// - strip all non-digit characters except leading '+'
// - if starts with '+1' (US/Canada), keep as-is; else add country code if missing
// - return E.164 format: +[country][area][number]
// - examples:
//   "(206) 123-4567" → "+12061234567"
//   "+86 138 1234 5678" → "+8613812345678"
//   "206-123-4567" → "+12061234567" (assumes US/Canada)

normalizeHandle(handle: string): string
// - remove @ prefix if present
// - convert to lowercase
// - trim whitespace
// - return as-is (handles are often case-sensitive on platforms, but normalize for comparison)

normalizeWallet(wallet: string): string
// - trim whitespace
// - convert to lowercase for case-insensitive comparison
// - return as-is

normalizeEntity(entity: Entity | {type: string, value: string}): string
// - dispatch to appropriate normalizer based on type
// - return normalized value or empty string
```

**Helper functions:**

```typescript
function parsePhoneNumber(phone: string): {country: string, areaCode: string, number: string} | null
// Use libphonenumber-js or simple parsing
// Extract country code, area code, number
// Return structured data or null if invalid

function guessCountryCode(phone: string): string
// If phone doesn't start with +, guess country code
// Default to +1 (US) if ambiguous
// Can detect from common prefixes: +86 (China), +44 (UK), +33 (France), etc.
```

**Testing:**

Write tests in tests/unit/EntityNormalizer.test.ts:

Email tests:
- " Email@Gmail.COM " → "email@gmail.com"
- "first.last+tag@example.co.uk" → "first.last+tag@example.co.uk"

Phone tests:
- "(206) 123-4567" → "+12061234567"
- "+86 138 1234 5678" → "+8613812345678"
- "206 123 4567" → "+12061234567"
- "+1-206-123-4567" → "+12061234567"

Handle tests:
- "@telegram_handle" → "telegram_handle"
- "whatsapp_handle" → "whatsapp_handle"
- " WeChat 123 " → "wechat 123"

Wallet tests:
- "0xABCD1234..." → "0xabcd1234..."

Edge cases:
- null / empty string → empty string
- invalid phone → empty string
- too-short phone → empty string
```

**Output**: src/service/EntityNormalizer.ts with comprehensive normalization, tests

---

### Service 3: Embedding Service

**Prompt to Qoder:**

```
Create src/service/EmbeddingService.ts:

Generate embeddings for text using Mixedbread AI API (same as AEGE uses).

**Methods:**

```typescript
class EmbeddingService {
  constructor(apiKey: string, embeddingModel: string = "mixedbread-ai/mxbai-embed-large-v1")

  async embed(text: string): Promise<number[]>
  // - Call Mixedbread AI /embed endpoint
  // - Input: text (truncate to 8000 tokens if too long)
  // - Output: vector array (1024 dimensions)
  // - Retry on transient failure (3 retries, exponential backoff)
  // - Cache results in memory (simple Map<hash, vector>) to avoid redundant calls

  async embedBatch(texts: string[]): Promise<Array<{text: string, vector: number[]}>>
  // - Embed multiple texts efficiently
  // - Use batch endpoint if available
  // - Return {text, vector} pairs

  async storeEmbedding(source_id: UUID, source_type: string, text: string, repo: EmbeddingRepository): Promise<UUID>
  // - Call embed(text)
  // - Store {source_id, source_type, text, vector} in embeddings table
  // - Return embedding id

  clearCache(): void
  // - Clear in-memory cache
```

**Configuration:**

- API endpoint: https://api.mixedbread.ai/v1/embeddings (or via env var)
- Model: mixedbread-ai/mxbai-embed-large-v1 (1024 dimensions)
- Max text length: 8000 tokens (truncate if needed)
- Retry policy: 3 retries, 1s initial backoff, exponential

**Error handling:**

- Catch rate limits (429) → implement backoff
- Catch auth errors (401) → throw loudly
- Catch network errors → retry
- Return null if all retries exhausted (don't crash resolution flow)

**Testing:**

Write tests in tests/unit/EmbeddingService.test.ts:

- Test embed() with sample text → verify vector has 1024 dimensions
- Test embedBatch() with multiple texts → verify all succeed
- Test caching: same text twice → only one API call
- Test truncation: very long text → truncated and embedded
- Test retry logic: mock failure then success → verify retry happens
- Test error handling: auth error → throws; network error → retries

Mock Mixedbread API responses (don't make real calls in tests).
```

**Output**: src/service/EmbeddingService.ts with caching and retry logic, tests

---

### Service 4: Similarity Scorer

**Prompt to Qoder:**

```
Create src/service/SimilarityScorer.ts:

Score entity matches and text similarity.

**Entity matching:**

```typescript
interface EntityMatchResult {
  score: number;        // 0.0–1.0
  reason: string;       // 'exact_match', 'fuzzy_match', 'domain_match', 'no_match'
  signal: string;       // e.g. 'shared_email', 'similar_phone'
}

function scoreEntityMatch(input: string, historical: string, type: 'email' | 'phone' | 'handle' | 'wallet'): EntityMatchResult

// Exact match: 1.0
// Fuzzy match (edit distance <= 2 for phones): 0.95
// Email domain match (same @domain): 0.75
// No match: 0.0

function levenshteinDistance(a: string, b: string): number
// Standard edit distance algorithm
```

**Text similarity:**

```typescript
async function scoreTextSimilarity(input_text: string, historical_embeddings: number[][]): Promise<number>
// - Embed input_text using EmbeddingService
// - Compute cosine similarity against each historical embedding
// - Return max similarity (0.0–1.0)
// - If max > 0.75, return as is; else return 0.0 (threshold)

function cosineSimilarity(vec1: number[], vec2: number[]): number
// Compute cosine similarity between two vectors
// (vec1 · vec2) / (||vec1|| * ||vec2||)
```

**Batched scoring:**

```typescript
interface EntityScore {
  entity_id?: string;
  site_id?: string;
  input_entity: string;
  historical_entity: string;
  match_score: number;
  reason: string;
  signal: string;
}

async function scoreEntitySet(input_entities: Entity[], historical: {entity_id, value}[], type: string): Promise<EntityScore[]>
// Score each input entity against all historical entities of same type
// Return sorted by match_score (descending)
// Filter out scores < 0.7
```

**Configuration:**

- Entity match thresholds:
  - Exact match ≥ 1.0 → score 1.0, signal "exact_match"
  - Fuzzy match ≥ 0.95 → score 0.95, signal "fuzzy_match"
  - Domain match ≥ 0.75 → score 0.75, signal "domain_match"
- Text similarity threshold ≥ 0.75 → consider a signal

**Testing:**

Write tests in tests/unit/SimilarityScorer.test.ts:

Entity matching:
- Exact email match → 1.0
- Phone with 1 digit diff → 0.95
- Same email domain → 0.75
- No match → 0.0

Text similarity:
- Identical text → 0.99+
- Similar shipping policy → 0.80+
- Dissimilar text → < 0.75
- Empty/null → 0.0

Batched scoring:
- 5 input entities vs 10 historical → returns only scores > 0.7

Edge cases:
- Empty input → empty results
- Very short text → still processes
- Null embeddings → gracefully handled
```

**Output**: src/service/SimilarityScorer.ts with comprehensive scoring logic, tests

---

### Service 5: Cluster Resolver

**Prompt to Qoder:**

```
Create src/service/ClusterResolver.ts:

Resolve which operator cluster a new site belongs to using union-find + confidence aggregation.

**Union-Find implementation:**

```typescript
class UnionFind {
  private parent: Map<string, string> = new Map();
  private rank: Map<string, number> = new Map();

  find(x: string): string
  // Path compression: find root, update parent pointers
  // Return root

  union(x: string, y: string): void
  // Union by rank: attach smaller tree to larger
  // Return boolean (true if they were already connected)

  connected(x: string, y: string): boolean
  // Check if x and y are in same set
}
```

**Resolution logic:**

```typescript
interface ClusterMatchResult {
  matched_cluster_id: string | null;
  confidence: number;              // 0.0–1.0
  matching_signals: string[];      // ["shared_phone", "similar_policy", ...]
  related_domains: string[];       // other sites in cluster
  related_entities: Array<{type: string, value: string, count: number}>;
  explanation: string;             // human-readable reasoning
}

async function resolveCluster(
  input_entities: Entity[],
  input_text: string | null,
  historicalSites: Array<{site_id, cluster_id, entities, embeddings}>,
  similarityScorer: SimilarityScorer,
  embeddingService: EmbeddingService
): Promise<ClusterMatchResult>

// Algorithm:
// 1. Initialize UnionFind with all historical cluster IDs
// 2. For each input entity:
//    a. Score against all historical entities of same type
//    b. If score >= 0.7, union(input_entity, historical_cluster_id)
//    c. Accumulate signal + confidence
// 3. If input_text:
//    a. Score against all historical embeddings
//    b. If similarity >= 0.75, union(input_text_hash, historical_cluster_id)
//    c. Accumulate "similar_policy_text" signal + confidence
// 4. Find root cluster (most connections)
// 5. If confidence >= 0.6, return cluster; else return null (new cluster)
// 6. Fetch all sites/entities in matched cluster
// 7. Build explanation string with matching signals
```

**Confidence calculation:**

```typescript
interface ConfidenceTracker {
  signals: string[];
  scores: number[];

  addSignal(signal: string, score: number): void
  // Accumulate matching evidence

  getAggregate(): {confidence: number, signals: string[]}
  // confidence = mean(scores) or weighted mean
  // signals = unique signals
}
```

**Testing:**

Write tests in tests/unit/ClusterResolver.test.ts:

Union-Find tests:
- union(a, b), union(b, c) → find(a) === find(c)
- connected(a, b) after union
- Path compression works

Resolution tests:
- New site with exact phone match to cluster → confidence 0.85+ → returns cluster
- New site with no matches → confidence < 0.6 → returns null
- New site with similar policy text → includes "similar_policy_text" in signals
- Aggregation of 3 signals → confidence = mean

Edge cases:
- Empty input entities → returns null
- No historical data → returns null
- Single high-confidence signal → returns cluster
- Multiple low-confidence signals → aggregates correctly

Integration test:
- Seed 3 sites with shared phone
- Add new site with same phone
- Resolve → should return their cluster with 0.9+ confidence
```

**Output**: src/service/ClusterResolver.ts with union-find and full resolution logic, tests

---

### Service 6: Resolution Engine (Orchestrator)

**Prompt to Qoder:**

```
Create src/service/ResolutionEngine.ts:

Orchestrate all services (extraction, normalization, embedding, scoring, resolution).

**Main interface:**

```typescript
class ResolutionEngine {
  constructor(
    extractor: EntityExtractor,
    normalizer: EntityNormalizer,
    embeddingService: EmbeddingService,
    scorer: SimilarityScorer,
    resolver: ClusterResolver,
    repositories: {
      siteRepository: SiteRepository,
      entityRepository: EntityRepository,
      clusterRepository: ClusterRepository,
      embeddingRepository: EmbeddingRepository,
      resolutionRunRepository: ResolutionRunRepository
    }
  )

  async extractAndNormalize(text: string, entities_hint?: {emails, phones, handles}): Promise<NormalizedEntities>
  // - Extract entities from text (with optional input hints)
  // - Normalize all entities
  // - Return { emails, phones, handles, wallets } (all normalized)

  async resolve(request: ResolveActorRequest): Promise<ResolveActorResponse>
  // - Main entry point
  // - Extract entities from request (text + entities hint)
  // - Query historical data
  // - Score against historical
  // - Resolve to cluster or new cluster
  // - Create ResolutionRun record
  // - Return response

  async ingestSite(request: IngestSiteRequest): Promise<{site_id, entities_extracted, embeddings_generated, resolution?}>
  // - Create site record
  // - Extract entities from page_text
  // - Store entities
  // - Generate embeddings for page_text
  // - If attempt_resolve: call resolve()
  // - Return response
}
```

**Error handling & logging:**

- Wrap all external calls (LLM, embeddings) in try/catch
- Log all major steps (extraction, scoring, clustering)
- Create ResolutionRun even if resolution fails (mark as error)
- Return graceful errors to user

**Testing:**

Write integration test in tests/integration/ResolutionEngine.test.ts:

- Full flow: request → extract → normalize → resolve → response
- Verify all services are called in correct order
- Verify database state is consistent
- Verify explanation is non-empty

Mocks:
- EntityExtractor (return predictable entities)
- EmbeddingService (return fixed vectors)
- Repositories (use in-memory or test database)

Test scenarios:
1. New site with no match → returns null cluster_id
2. New site with exact entity match → returns existing cluster
3. New site with text similarity → includes signal
4. Multiple signals → aggregates confidence
```

**Output**: src/service/ResolutionEngine.ts as orchestrator, integration test

---

## Validation Checklist

Before moving to Phase 3, verify:

- [ ] EntityExtractor extracts emails, phones, handles (regex + LLM)
- [ ] EntityNormalizer canonicalizes all entity types
- [ ] EmbeddingService calls Mixedbread API (or mocks it) and caches
- [ ] SimilarityScorer computes entity + text similarity correctly
- [ ] ClusterResolver uses union-find and aggregates confidence
- [ ] ResolutionEngine orchestrates all services end-to-end
- [ ] All unit tests pass (npm run test)
- [ ] All integration tests pass
- [ ] No TypeScript errors (npx tsc --noEmit)
- [ ] Code is well-logged (easy to debug)
- [ ] Error handling is graceful (no crashes)

---

## Next Steps

Once Phase 2 is complete:

1. Run all tests: npm run test
2. Check coverage: npm run test -- --coverage
3. Verify integration test end-to-end flow works
4. Proceed to **ARES_BUILD_PHASE_3** (API Route Implementation)
