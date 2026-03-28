// src/domain/types/api.ts
// API request/response type definitions

import { z } from 'zod';

// ============================================
// Ingest Site API
// ============================================

/**
 * Handle input for entity ingestion
 */
export interface HandleInput {
    type: string;
    value: string;
}

/**
 * Entity input for ingestion/resolution
 */
export interface EntityInput {
    emails?: string[];
    phones?: string[];
    handles?: HandleInput[];
    wallets?: string[];
}

/**
 * Request body for POST /api/ingest-site
 */
export interface IngestSiteRequest {
    url: string;
    domain?: string;
    page_text?: string;
    entities?: EntityInput;
    screenshot_hash?: string;
    attempt_resolve?: boolean;
}

/**
 * Resolution result included in ingest response
 */
export interface IngestResolutionResult {
    cluster_id: string;
    confidence: number;
    explanation: string;
    matching_signals: string[];
}

/**
 * Response body for POST /api/ingest-site
 */
export interface IngestSiteResponse {
    site_id: string;
    entities_extracted: number;
    embeddings_generated: number;
    resolution?: IngestResolutionResult | null;
}

// ============================================
// Resolve Actor API
// ============================================

/**
 * Request body for POST /api/resolve-actor
 */
export interface ResolveActorRequest {
    url: string;
    domain?: string;
    page_text?: string;
    entities?: EntityInput;
    site_id?: string;
}

/**
 * Related entity in resolution response
 */
export interface RelatedEntity {
    type: string;
    value: string;
    count: number;
}

/**
 * Response body for POST /api/resolve-actor
 */
export interface ResolveActorResponse {
    actor_cluster_id: string | null;
    confidence: number;
    related_domains: string[];
    related_entities: RelatedEntity[];
    matching_signals: string[];
    explanation: string;
}

// ============================================
// Cluster Details API
// ============================================

/**
 * Cluster info in details response
 */
export interface ClusterInfo {
    id: string;
    name: string | null;
    confidence: number;
    description: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Site info in cluster details
 */
export interface ClusterSiteInfo {
    id: string;
    domain: string;
    url: string;
    first_seen_at: string;
}

/**
 * Entity summary in cluster details
 */
export interface ClusterEntitySummary {
    type: string;
    value: string;
    normalized_value: string | null;
    count: number;
    sites_using: number;
}

/**
 * Response body for GET /api/clusters/:id
 */
export interface ClusterDetailsResponse {
    cluster: ClusterInfo;
    sites: ClusterSiteInfo[];
    entities: ClusterEntitySummary[];
    risk_score: number;
    total_unique_entities: number;
    resolution_runs: number;
}

// ============================================
// Seeds API (dev-only)
// ============================================

/**
 * Request body for POST /api/seeds
 */
export interface SeedDataRequest {
    scenario?: 'counterfeit_network' | 'single_actor' | 'multiple_clusters';
    count?: number;
}

/**
 * Response body for POST /api/seeds
 */
export interface SeedDataResponse {
    sites_created: number;
    entities_created: number;
    clusters_created: number;
    embeddings_created: number;
}

// ============================================
// Error Response
// ============================================

/**
 * Standard error response
 */
export interface ErrorResponse {
    error: string;
    message?: string;
    details?: Record<string, unknown>;
    stack?: string;
}

// ============================================
// Health Check
// ============================================

/**
 * Health check response
 */
export interface HealthResponse {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
    version?: string;
    database?: 'connected' | 'disconnected';
}

// ============================================
// Zod Schemas for Runtime Validation
// ============================================

export const HandleInputSchema = z.object({
    type: z.string().min(1),
    value: z.string().min(1),
});

export const EntityInputSchema = z.object({
    emails: z.array(z.string().email()).optional(),
    phones: z.array(z.string()).optional(),
    handles: z.array(HandleInputSchema).optional(),
    wallets: z.array(z.string()).optional(),
});

export const IngestSiteRequestSchema = z.object({
    url: z.string().url(),
    domain: z.string().optional(),
    page_text: z.string().optional(),
    entities: EntityInputSchema.optional(),
    screenshot_hash: z.string().optional(),
    attempt_resolve: z.boolean().optional(),
});

export const ResolveActorRequestSchema = z.object({
    url: z.string().url(),
    domain: z.string().optional(),
    page_text: z.string().optional(),
    entities: EntityInputSchema.optional(),
    site_id: z.string().uuid().optional(),
});

export const SeedDataRequestSchema = z.object({
    scenario: z.enum(['counterfeit_network', 'single_actor', 'multiple_clusters']).optional(),
    count: z.number().int().positive().max(100).optional(),
});
