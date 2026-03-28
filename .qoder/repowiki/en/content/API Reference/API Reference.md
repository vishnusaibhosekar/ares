# API Reference

<cite>
**Referenced Files in This Document**
- [server.ts](file://src/api/server.ts)
- [index.ts](file://src/api/routes/index.ts)
- [ingest-site.ts](file://src/api/routes/ingest-site.ts)
- [resolve-actor.ts](file://src/api/routes/resolve-actor.ts)
- [clusters.ts](file://src/api/routes/clusters.ts)
- [seeds.ts](file://src/api/routes/seeds.ts)
- [health.ts](file://src/api/routes/health.ts)
- [auth.ts](file://src/api/middleware/auth.ts)
- [error-handler.ts](file://src/api/middleware/error-handler.ts)
- [api.ts](file://src/domain/types/api.ts)
- [sample-payloads.json](file://demos/sample-payloads.json)
- [curl-examples.sh](file://demos/curl-examples.sh)
- [package.json](file://package.json)
</cite>

## Update Summary
**Changes Made**
- Updated all endpoint specifications to reflect the actual implementation in the codebase
- Added comprehensive middleware documentation including CORS, error handling, and request logging
- Enhanced request/response schemas with accurate field definitions and validation rules
- Updated security and authentication sections with current middleware capabilities
- Revised practical workflows with actual code examples and error handling patterns
- Added detailed parameter specifications and validation rules for all endpoints

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document provides a comprehensive API reference for the ARES RESTful endpoints. It covers HTTP methods, URL patterns, request/response schemas, authentication requirements, error handling, and practical usage patterns. The documented endpoints include:
- GET /health
- POST /api/ingest-site
- POST /api/resolve-actor
- GET /api/clusters/:id
- POST /api/seeds (development-only)

It also outlines CORS configuration, rate limiting considerations, security best practices, API versioning, and backwards compatibility policies.

## Project Structure
The API surface is organized under a central Express server that mounts route modules and applies shared middleware for logging, CORS, error handling, and future authentication. Domain-level TypeScript types define request/response schemas and validation rules.

```mermaid
graph TB
Client["Client"]
Express["Express App<br/>src/api/server.ts"]
RoutesIndex["Routes Index<br/>src/api/routes/index.ts"]
IngestRoute["POST /api/ingest-site<br/>src/api/routes/ingest-site.ts"]
ResolveRoute["POST /api/resolve-actor<br/>src/api/routes/resolve-actor.ts"]
ClustersRoute["GET /api/clusters/:id<br/>src/api/routes/clusters.ts"]
SeedsRoute["POST /api/seeds (dev)<br/>src/api/routes/seeds.ts"]
HealthRoute["GET /health<br/>src/api/routes/health.ts"]
AuthMW["Auth Middleware<br/>src/api/middleware/auth.ts"]
ErrorMW["Error Handler<br/>src/api/middleware/error-handler.ts"]
Types["API Types & Schemas<br/>src/domain/types/api.ts"]
Client --> Express
Express --> RoutesIndex
RoutesIndex --> IngestRoute
RoutesIndex --> ResolveRoute
RoutesIndex --> ClustersRoute
RoutesIndex --> SeedsRoute
RoutesIndex --> HealthRoute
Express --> AuthMW
Express --> ErrorMW
Express --> Types
```

**Diagram sources**
- [server.ts:19-105](file://src/api/server.ts#L19-L105)
- [index.ts:1-9](file://src/api/routes/index.ts#L1-L9)
- [ingest-site.ts:1-169](file://src/api/routes/ingest-site.ts#L1-L169)
- [resolve-actor.ts:1-163](file://src/api/routes/resolve-actor.ts#L1-L163)
- [clusters.ts:1-240](file://src/api/routes/clusters.ts#L1-L240)
- [seeds.ts:1-263](file://src/api/routes/seeds.ts#L1-L263)
- [health.ts:1-107](file://src/api/routes/health.ts#L1-L107)
- [auth.ts:1-24](file://src/api/middleware/auth.ts#L1-L24)
- [error-handler.ts:1-236](file://src/api/middleware/error-handler.ts#L1-L236)
- [api.ts:1-232](file://src/domain/types/api.ts#L1-L232)

**Section sources**
- [server.ts:19-105](file://src/api/server.ts#L19-L105)
- [index.ts:1-9](file://src/api/routes/index.ts#L1-L9)

## Core Components
- Health endpoint: GET /health returns service health, timestamp, version metadata, and dependency status.
- Ingest site endpoint: POST /api/ingest-site accepts a URL and optional entity hints, optionally triggering resolution.
- Resolve actor endpoint: POST /api/resolve-actor matches a new site to an existing operator cluster using multiple entity signals.
- Cluster details endpoint: GET /api/clusters/:id returns cluster metadata, associated sites, and entity summaries.
- Seeds endpoint: POST /api/seeds creates synthetic test data for development environments.

All endpoints share standardized error responses and request tracing via X-Request-ID.

**Section sources**
- [server.ts:46-81](file://src/api/server.ts#L46-L81)
- [ingest-site.ts:52-169](file://src/api/routes/ingest-site.ts#L52-L169)
- [resolve-actor.ts:29-163](file://src/api/routes/resolve-actor.ts#L29-L163)
- [clusters.ts:126-240](file://src/api/routes/clusters.ts#L126-L240)
- [seeds.ts:111-263](file://src/api/routes/seeds.ts#L111-L263)
- [error-handler.ts:134-236](file://src/api/middleware/error-handler.ts#L134-L236)

## Architecture Overview
The API follows a layered architecture:
- HTTP layer: Express app with CORS, body parsing, request logging, and route mounting.
- Route layer: Route modules for each endpoint.
- Middleware layer: Auth and error handling placeholders for future implementation.
- Domain layer: Strongly typed request/response interfaces and Zod schemas for runtime validation.
- Service/Repository layer: Services orchestrating business logic and repositories managing persistence (implementation placeholders in current codebase).

```mermaid
sequenceDiagram
participant C as "Client"
participant E as "Express App"
participant R as "Route Module"
participant M1 as "Auth Middleware"
participant M2 as "Error Handler"
C->>E : HTTP Request
E->>M1 : Apply auth middleware
M1-->>E : next()
E->>R : Route dispatch
R-->>E : Response or throws
E->>M2 : Global error handler (if error)
M2-->>C : Error response
E-->>C : Success response
```

**Diagram sources**
- [server.ts:19-105](file://src/api/server.ts#L19-L105)
- [auth.ts:6-21](file://src/api/middleware/auth.ts#L6-L21)
- [error-handler.ts:134-211](file://src/api/middleware/error-handler.ts#L134-L211)

## Detailed Component Analysis

### GET /health
- Method: GET
- Path: /health
- Purpose: Health check returning service status, timestamp, version, and database connectivity indicator.
- Response schema:
  - status: string enum with values "ok", "degraded", "error"
  - timestamp: ISO 8601 string
  - version: string (from package version)
  - database: string enum with values "connected", "disconnected"
  - embeddings: string enum with values "configured", "not_configured"
  - llm: string enum with values "configured", "not_configured"
  - uptime_seconds: number
- Example response:
  - status: "ok"
  - timestamp: "2025-01-01T00:00:00.000Z"
  - version: "1.0.0"
  - database: "connected"
  - embeddings: "configured"
  - llm: "not_configured"
  - uptime_seconds: 3600

Common status codes:
- 200 OK (when healthy)
- 503 Service Unavailable (when unhealthy)

Example invocation:
- curl http://localhost:3000/health

**Section sources**
- [server.ts:46-48](file://src/api/server.ts#L46-L48)
- [health.ts:43-107](file://src/api/routes/health.ts#L43-L107)
- [api.ts:185-193](file://src/domain/types/api.ts#L185-L193)
- [curl-examples.sh:21-29](file://demos/curl-examples.sh#L21-L29)

### POST /api/ingest-site
- Method: POST
- Path: /api/ingest-site
- Purpose: Ingest a new storefront URL, extract entities, generate embeddings, and optionally resolve to an operator cluster.
- Request body schema (fields):
  - url: string (required; URL format)
  - domain: string (optional)
  - page_text: string (optional)
  - entities: object (optional)
    - emails: array of strings (optional; each must be a valid email)
    - phones: array of strings (optional)
    - handles: array of objects (optional)
      - type: string (required; min length 1)
      - value: string (required; min length 1)
    - wallets: array of strings (optional)
  - screenshot_hash: string (optional)
  - attempt_resolve: boolean (optional)
  - use_llm_extraction: boolean (optional, defaults to false)
- Response schema:
  - site_id: string
  - entities_extracted: number
  - embeddings_generated: number
  - resolution: object|null (optional)
    - cluster_id: string
    - confidence: number (0.0–1.0)
    - explanation: string
    - matching_signals: array of strings
- Typical workflow:
  - Submit site URL and optional entity hints.
  - Entities are extracted and normalized; embeddings are generated.
  - If attempt_resolve is true, the system attempts to resolve to an existing operator cluster.
  - Returns ingestion metrics and optional resolution result.
- Example payload (basic):
  - url: "https://fake-luxury-goods.com"
  - domain: "fake-luxury-goods.com"
  - page_text: "Contact: support@fake-luxury.com, WhatsApp: +86-139-1234-5678"
  - entities:
    - emails: ["support@fake-luxury.com"]
    - phones: ["+8613912345678"]
    - handles: [{"type": "whatsapp", "value": "+8613912345678"}]
  - attempt_resolve: true
  - use_llm_extraction: false
- Example payload (with crypto wallet):
  - url: "https://crypto-store.xyz"
  - page_text: "Pay with Bitcoin: 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"
  - entities:
    - emails: ["orders@crypto-store.xyz"]
    - handles: [{"type": "telegram", "value": "@cryptostoreofficial"}]
  - screenshot_hash: "abc123def456"

Common status codes:
- 200 OK (on success)
- 400 Bad Request (validation errors)
- 409 Conflict (duplicate domain)
- 500 Internal Server Error (unexpected errors)

Notes:
- attempt_resolve toggles whether resolution is performed during ingestion.
- use_llm_extraction enables LLM-powered entity extraction.
- matching_signals enumerates the evidence used for resolution.

**Section sources**
- [ingest-site.ts:52-169](file://src/api/routes/ingest-site.ts#L52-L169)
- [api.ts:29-58](file://src/domain/types/api.ts#L29-L58)
- [api.ts:199-218](file://src/domain/types/api.ts#L199-L218)
- [sample-payloads.json:32-85](file://demos/sample-payloads.json#L32-L85)
- [curl-examples.sh:47-69](file://demos/curl-examples.sh#L47-L69)

### POST /api/resolve-actor
- Method: POST
- Path: /api/resolve-actor
- Purpose: Resolve a new site to an operator cluster using URL, domain, page text, and/or entity hints.
- Request body schema (fields):
  - url: string (required; URL format)
  - domain: string (optional)
  - page_text: string (optional)
  - entities: object (optional; same shape as ingest-site entities)
  - site_id: string (optional; UUID format)
- Response schema:
  - actor_cluster_id: string|null
  - confidence: number (0.0–1.0)
  - related_domains: array of strings
  - related_entities: array of objects
    - type: string
    - value: string
    - count: number
  - matching_signals: array of strings
  - explanation: string
- Typical workflow:
  - Provide entity hints or rely on URL/domain heuristics.
  - System computes similarity/embeddings and returns the most likely operator cluster with supporting signals.
- Example payload:
  - url: "https://another-site.net"
  - domain: "another-site.net"
  - entities:
    - emails: ["contact@another-site.net"]
    - phones: ["+8613912345678"]
    - handles: [{"type": "telegram", "value": "@cryptostoreofficial"}]
  - site_id: "550e8400-e29b-41d4-a716-446655440000"

Common status codes:
- 200 OK (on success)
- 400 Bad Request (validation errors)
- 404 Not Found (site not found when site_id provided)

**Section sources**
- [resolve-actor.ts:29-163](file://src/api/routes/resolve-actor.ts#L29-L163)
- [api.ts:64-94](file://src/domain/types/api.ts#L64-L94)
- [api.ts:220-226](file://src/domain/types/api.ts#L220-L226)
- [sample-payloads.json:86-139](file://demos/sample-payloads.json#L86-L139)
- [curl-examples.sh:72-94](file://demos/curl-examples.sh#L72-L94)

### GET /api/clusters/:id
- Method: GET
- Path: /api/clusters/:id
- Purpose: Retrieve detailed information about a specific operator cluster.
- Path parameters:
  - id: string (UUID; cluster identifier)
- Query parameters:
  - include_resolution_history: boolean (optional, defaults to false)
- Response schema:
  - cluster: object
    - id: string
    - name: string|null
    - confidence: number (0.0–1.0)
    - description: string|null
    - created_at: string (ISO 8601)
    - updated_at: string (ISO 8601)
  - sites: array of objects
    - id: string
    - domain: string
    - url: string
    - first_seen_at: string (ISO 8601)
  - entities: array of objects
    - type: string
    - value: string
    - normalized_value: string|null
    - count: number
    - sites_using: number
  - risk_score: number
  - total_unique_entities: number
  - resolution_runs: number
- Typical workflow:
  - After ingestion or resolution, query cluster details to analyze operator patterns and relationships.
- Example invocation:
  - curl http://localhost:3000/api/clusters/{cluster_id}?include_resolution_history=true

Common status codes:
- 200 OK (on success)
- 400 Bad Request (invalid UUID)
- 404 Not Found (cluster not found)

**Section sources**
- [clusters.ts:126-240](file://src/api/routes/clusters.ts#L126-L240)
- [api.ts:96-143](file://src/domain/types/api.ts#L96-L143)
- [curl-examples.sh:97-109](file://demos/curl-examples.sh#L97-L109)

### POST /api/seeds (Development Only)
- Method: POST
- Path: /api/seeds
- Purpose: Generate synthetic test data for development and testing.
- Availability: Mounted only when NODE_ENV is set to "development" or "test".
- Request body schema (fields):
  - count: integer (1-20, optional, defaults to 10)
  - include_matches: boolean (optional, defaults to true)
- Response schema:
  - sites_created: number
  - entities_created: number
  - clusters_created: number
  - embeddings_created: number
- Typical workflow:
  - Seed development databases with predefined scenarios to accelerate testing and UI development.
- Example invocation:
  - curl -X POST http://localhost:3000/api/seeds -H "Content-Type: application/json" -d '{"count": 10, "include_matches": true}'

Common status codes:
- 200 OK (on success)
- 400 Bad Request (validation errors)
- 403 Forbidden (when not in development mode)

**Section sources**
- [seeds.ts:111-263](file://src/api/routes/seeds.ts#L111-L263)
- [server.ts:63-68](file://src/api/server.ts#L63-L68)
- [api.ts:145-165](file://src/domain/types/api.ts#L145-L165)
- [api.ts:228-231](file://src/domain/types/api.ts#L228-L231)
- [curl-examples.sh:32-45](file://demos/curl-examples.sh#L32-L45)

## Dependency Analysis
- Route registration depends on centralized route exports.
- Server composes middleware and routes; error handling is global.
- Types define both TypeScript interfaces and Zod schemas for compile-time and runtime validation.
- Package version is embedded into health responses.

```mermaid
graph LR
Pkg["package.json<br/>version"]
Server["server.ts"]
RoutesIdx["routes/index.ts"]
Ingest["ingest-site.ts"]
Resolve["resolve-actor.ts"]
Clusters["clusters.ts"]
Seeds["seeds.ts"]
Health["health.ts"]
Types["domain/types/api.ts"]
Pkg --> Server
RoutesIdx --> Ingest
RoutesIdx --> Resolve
RoutesIdx --> Clusters
RoutesIdx --> Seeds
RoutesIdx --> Health
Server --> Types
```

**Diagram sources**
- [package.json:3-3](file://package.json#L3-L3)
- [server.ts:78-78](file://src/api/server.ts#L78-L78)
- [index.ts:4-8](file://src/api/routes/index.ts#L4-L8)
- [api.ts:1-232](file://src/domain/types/api.ts#L1-L232)

**Section sources**
- [index.ts:4-8](file://src/api/routes/index.ts#L4-L8)
- [server.ts:78-78](file://src/api/server.ts#L78-L78)
- [package.json:3-3](file://package.json#L3-L3)

## Performance Considerations
- Body size limits: The server enforces a 10 MB limit for JSON payloads to prevent resource exhaustion.
- Logging overhead: Request/response logging adds latency; disable or reduce verbosity in production if needed.
- Embedding generation: Expect higher latency for ingestion and resolution endpoints due to embedding computations.
- Database connections: The health endpoint checks database connectivity to prevent unnecessary connection attempts.
- Pagination: While not currently exposed on these endpoints, consider adding pagination for cluster sites/entities in future versions.

## Troubleshooting Guide
- 404 Not Found: Occurs when accessing unregistered routes. Verify base paths and method correctness.
- 400 Bad Request: Validation errors for malformed requests, invalid URLs, or incorrect data types.
- 403 Forbidden: Seeds endpoint is only available in development or test environments.
- 409 Conflict: Duplicate domain ingestion attempts.
- 500 Internal Server Error: Unexpected server errors with request ID correlation.
- Error logging: The server logs request errors with request ID and stack traces in development mode.
- Request tracing: All responses include X-Request-ID for correlating logs.

Common failure scenarios and resolutions:
- Malformed URL or missing required fields: Fix according to Zod schema validation rules.
- Excessive payload size (>10MB): Reduce payload or split requests.
- Development-only endpoint unavailable: Ensure NODE_ENV is set to "development" or "test".
- Database connectivity issues: Check database connection and credentials.

**Section sources**
- [error-handler.ts:134-236](file://src/api/middleware/error-handler.ts#L134-L236)
- [error-handler.ts:146-211](file://src/api/middleware/error-handler.ts#L146-L211)
- [server.ts:27-30](file://src/api/server.ts#L27-L30)
- [api.ts:211-218](file://src/domain/types/api.ts#L211-L218)
- [api.ts:220-226](file://src/domain/types/api.ts#L220-L226)
- [api.ts:228-231](file://src/domain/types/api.ts#L228-L231)

## Conclusion
The ARES API provides a comprehensive set of endpoints for site ingestion, actor resolution, cluster inspection, and development data seeding. The implementation includes robust middleware for CORS, error handling, request logging, and future authentication. The underlying schemas, validation, and middleware are production-ready with comprehensive error handling and request tracing capabilities.

## Appendices

### Authentication and Security
- Authentication: Not implemented yet; middleware exists as a placeholder for future implementation.
- API keys: Optional validation middleware exists as a placeholder.
- CORS: Enabled for common methods and headers; origin configurable via environment variable.
- Security best practices:
  - Enforce HTTPS in production.
  - Implement rate limiting at the gateway or middleware.
  - Sanitize and validate all inputs rigorously.
  - Rotate secrets and restrict access to development endpoints.

**Section sources**
- [auth.ts:6-21](file://src/api/middleware/auth.ts#L6-L21)
- [server.ts:35-40](file://src/api/server.ts#L35-L40)

### Rate Limiting
- Not implemented in the current codebase.
- Recommended approach: Introduce a rate-limiting middleware per endpoint or globally, considering burst and sustained limits.

### API Versioning and Backwards Compatibility
- Versioning: The health endpoint includes a version field derived from the package version.
- Backwards compatibility: Prefer additive changes; deprecate fields with clear timelines and transitional support.
- Deprecation policy: Announce deprecations via changelog and health/version metadata; maintain support windows before removal.

**Section sources**
- [server.ts:71-71](file://src/api/server.ts#L71-L71)
- [package.json:3-3](file://package.json#L3-L3)

### Practical Workflows

#### Workflow 1: Site Ingestion with Entity Extraction
- Steps:
  - Send POST /api/ingest-site with URL and optional entities.
  - Review response for site_id, extraction counts, and optional resolution.
- Example payload reference:
  - [sample-payloads.json:32-85](file://demos/sample-payloads.json#L32-L85)

**Section sources**
- [ingest-site.ts:52-169](file://src/api/routes/ingest-site.ts#L52-L169)
- [api.ts:29-58](file://src/domain/types/api.ts#L29-L58)
- [sample-payloads.json:32-85](file://demos/sample-payloads.json#L32-L85)

#### Workflow 2: Actor Resolution Queries
- Steps:
  - Send POST /api/resolve-actor with URL and entity hints.
  - Inspect returned cluster_id, confidence, and matching signals.
- Example payload reference:
  - [sample-payloads.json:86-139](file://demos/sample-payloads.json#L86-L139)

**Section sources**
- [resolve-actor.ts:29-163](file://src/api/routes/resolve-actor.ts#L29-L163)
- [api.ts:64-94](file://src/domain/types/api.ts#L64-L94)
- [sample-payloads.json:86-139](file://demos/sample-payloads.json#L86-L139)

#### Workflow 3: Cluster Analysis
- Steps:
  - Obtain a cluster_id from resolution or ingestion.
  - Call GET /api/clusters/:id to retrieve sites, entities, and risk metrics.
- Example invocation reference:
  - [curl-examples.sh:97-109](file://demos/curl-examples.sh#L97-L109)

**Section sources**
- [clusters.ts:126-240](file://src/api/routes/clusters.ts#L126-L240)
- [api.ts:96-143](file://src/domain/types/api.ts#L96-L143)
- [curl-examples.sh:97-109](file://demos/curl-examples.sh#L97-L109)

### Endpoint Summary

- GET /health
  - Method: GET
  - Path: /health
  - Auth: Not implemented
  - Success: 200
  - Failure: 503 (unhealthy)
  - Notes: Returns service metadata and dependency status

- POST /api/ingest-site
  - Method: POST
  - Path: /api/ingest-site
  - Auth: Not implemented
  - Success: 200
  - Failure: 400 (validation), 409 (conflict)
  - Schema: [api.ts:29-58](file://src/domain/types/api.ts#L29-L58)

- POST /api/resolve-actor
  - Method: POST
  - Path: /api/resolve-actor
  - Auth: Not implemented
  - Success: 200
  - Failure: 400 (validation), 404 (not found)
  - Schema: [api.ts:64-94](file://src/domain/types/api.ts#L64-L94)

- GET /api/clusters/:id
  - Method: GET
  - Path: /api/clusters/:id
  - Auth: Not implemented
  - Success: 200
  - Failure: 400 (validation), 404 (not found)
  - Schema: [api.ts:96-143](file://src/domain/types/api.ts#L96-L143)

- POST /api/seeds (dev-only)
  - Method: POST
  - Path: /api/seeds
  - Auth: Not implemented
  - Success: 200
  - Failure: 400 (validation), 403 (forbidden)
  - Schema: [api.ts:145-165](file://src/domain/types/api.ts#L145-L165)

**Section sources**
- [server.ts:46-81](file://src/api/server.ts#L46-L81)
- [ingest-site.ts:52-169](file://src/api/routes/ingest-site.ts#L52-L169)
- [resolve-actor.ts:29-163](file://src/api/routes/resolve-actor.ts#L29-L163)
- [clusters.ts:126-240](file://src/api/routes/clusters.ts#L126-L240)
- [seeds.ts:111-263](file://src/api/routes/seeds.ts#L111-L263)
- [api.ts:29-165](file://src/domain/types/api.ts#L29-L165)