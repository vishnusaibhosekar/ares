# ARES Architecture

## System Design

ARES (Actor Resolution & Entity Service) is designed as a modular, layered service for identifying and clustering the operators behind multiple storefronts.

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│  ┌─────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │ ingest-site │  │ resolve-actor  │  │   clusters     │   │
│  └─────────────┘  └────────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ EntityExtractor │  │ EntityNormalizer│                   │
│  └─────────────────┘  └─────────────────┘                   │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │EmbeddingService │  │ SimilarityScorer│                   │
│  └─────────────────┘  └─────────────────┘                   │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ ClusterResolver │  │ResolutionEngine │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Repository Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐     │
│  │    Sites    │  │  Entities   │  │    Clusters     │     │
│  └─────────────┘  └─────────────┘  └─────────────────┘     │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │  Embeddings │  │ Resolution  │                           │
│  └─────────────┘  │    Runs     │                           │
│                   └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL + pgvector                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Site Ingestion Flow

```
Request (URL, page_text, entities)
         │
         ▼
┌────────────────────┐
│  Validate Input    │
│  (Zod schemas)     │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│  Create Site       │
│  Record            │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│  Extract Entities  │
│  (regex patterns)  │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│  Normalize Values  │
│  (email, phone)    │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ Generate Embeddings│
│  (MIXEDBREAD API)  │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│  Store All Data    │
└────────────────────┘
         │
         ▼
  Response (site_id, entities_count)
```

### 2. Actor Resolution Flow

```
Request (URL or entities)
         │
         ▼
┌────────────────────────────────┐
│  Gather Input Signals          │
│  - Entities (email, phone)     │
│  - Domain patterns             │
│  - Page text embeddings        │
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│  Entity Matching               │
│  - Exact match on normalized   │
│  - Score: 0.9-1.0              │
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│  Embedding Similarity          │
│  - Cosine similarity search    │
│  - Threshold: 0.85+            │
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│  Aggregate Signals             │
│  - Weight by type              │
│  - Calculate confidence        │
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│  Resolve to Cluster            │
│  - Find existing or create new │
│  - Update memberships          │
└────────────────────────────────┘
         │
         ▼
  Response (cluster_id, confidence, explanation)
```

---

## Service Responsibilities

### EntityExtractor
- Parse page text for entities using regex patterns
- Identify emails, phones, handles, and crypto wallets
- Return extracted entities with confidence scores

### EntityNormalizer
- Normalize entity values for comparison
- Handle Gmail aliases, phone formats
- Lowercase and clean handles

### EmbeddingService
- Generate 1024-dim embeddings via MIXEDBREAD API
- Batch processing for efficiency
- Cache embeddings for reuse

### SimilarityScorer
- Compute cosine similarity between embeddings
- Find top-K similar items
- Support threshold filtering

### ClusterResolver
- Find existing clusters for entities
- Create new clusters when needed
- Merge clusters with overlapping entities

### ResolutionEngine
- Orchestrate full resolution pipeline
- Aggregate matching signals
- Generate explanations

---

## Database Schema Overview

### Tables

| Table | Purpose |
|-------|---------|
| sites | Tracked storefronts with URL, domain, content |
| entities | Extracted entities (email, phone, handle, wallet) |
| clusters | Actor groups with confidence scores |
| cluster_memberships | Links entities/sites to clusters |
| embeddings | Vector embeddings for similarity search |
| resolution_runs | Log of resolution executions |

### Key Relationships

- Site → Entities (1:N)
- Cluster → Memberships (1:N)
- Entity/Site → Memberships (N:M via cluster)
- Site → Embeddings (1:N)

### Indexes

- Domain lookup on sites
- Normalized value lookup on entities
- Cluster membership lookups
- Vector similarity on embeddings (pgvector)

---

## Confidence Scoring

### Signal Weights

| Signal Type | Weight |
|-------------|--------|
| Exact email match | 0.90 |
| Exact phone match | 0.85 |
| Wallet address match | 0.95 |
| Handle match | 0.70 |
| Embedding similarity (>0.9) | 0.80 |

### Thresholds

| Level | Confidence |
|-------|------------|
| High confidence | ≥ 0.85 |
| Medium confidence | ≥ 0.70 |
| Low confidence | ≥ 0.50 |
| Minimum for assignment | ≥ 0.30 |

---

## External Dependencies

### MIXEDBREAD API
- Purpose: Generate text embeddings
- Model: 1024-dimensional embeddings
- Rate limit: Handle with exponential backoff

### PostgreSQL + pgvector
- Purpose: Store data and vector similarity search
- Version: PostgreSQL 14+, pgvector 0.5+
- Index: IVFFlat for approximate nearest neighbor

---

## Future Enhancements

1. **Screenshot Similarity**: Use perceptual hashing for visual matching
2. **Real-time Ingestion**: Webhook/queue-based ingestion
3. **Graph Analysis**: Use graph algorithms for cluster refinement
4. **ML Enhancement**: Train custom models on resolution patterns
5. **Multi-tenant**: Support multiple organizations with isolation
