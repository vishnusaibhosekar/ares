/**
 * API Types for ARES Frontend
 */

// ============================================
// Common Types
// ============================================

export interface HandleInput {
    type: 'whatsapp' | 'telegram' | 'wechat' | 'other';
    value: string;
}

export interface EntityInput {
    emails?: string[];
    phones?: string[];
    handles?: HandleInput[];
    wallets?: string[];
}

// ============================================
// Health Check
// ============================================

export interface HealthResponse {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
    version?: string;
    database?: 'connected' | 'disconnected';
    embeddings?: string;
    llm?: string;
    uptime_seconds?: number;
}

// ============================================
// Ingest Site
// ============================================

export interface IngestSiteRequest {
    url: string;
    domain?: string;
    page_text?: string;
    entities?: EntityInput;
    screenshot_hash?: string;
    attempt_resolve?: boolean;
    use_llm_extraction?: boolean;
}

export interface IngestResolutionResult {
    cluster_id: string;
    confidence: number;
    explanation: string;
    matching_signals: string[];
}

export interface IngestSiteResponse {
    site_id: string;
    entities_extracted: number;
    embeddings_generated: number;
    resolution?: IngestResolutionResult | null;
}

// ============================================
// Resolve Actor
// ============================================

export interface ResolveActorRequest {
    url: string;
    domain?: string;
    page_text?: string;
    entities?: EntityInput;
    site_id?: string;
}

export interface RelatedEntity {
    type: string;
    value: string;
    count: number;
}

export interface ResolveActorResponse {
    actor_cluster_id: string | null;
    confidence: number;
    related_domains: string[];
    related_entities: RelatedEntity[];
    matching_signals: string[];
    explanation: string;
}

// ============================================
// Cluster Details
// ============================================

export interface ClusterInfo {
    id: string;
    name: string | null;
    confidence: number;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface ClusterSite {
    id: string;
    domain: string;
    url: string;
    first_seen_at: string;
}

export interface ClusterEntity {
    type: string;
    value: string;
    normalized_value: string | null;
    count: number;
    sites_using: number;
}

export interface ClusterDetailsResponse {
    cluster: ClusterInfo;
    sites: ClusterSite[];
    entities: ClusterEntity[];
    risk_score: number;
    total_unique_entities: number;
    resolution_runs: number;
}

// ============================================
// Seeds
// ============================================

export interface SeedDataRequest {
    count?: number;
    include_matches?: boolean;
}

export interface SeedDataResponse {
    sites_created: number;
    entities_created: number;
    clusters_created: number;
    embeddings_created: number;
}

// ============================================
// Error Response
// ============================================

export interface ApiErrorResponse {
    error: string;
    code: string;
    details?: unknown;
    timestamp: string;
    request_id: string;
}

// ============================================
// Authentication
// ============================================

export interface AuthUser {
    id: string;
    email: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    providers: string[];
    profile: {
        name?: string;
    };
    metadata: Record<string, unknown>;
}

export interface SignInRequest {
    email: string;
    password: string;
}

export interface SignUpRequest {
    email: string;
    password: string;
    name?: string;
}

export interface AuthResponse {
    user: AuthUser;
    accessToken: string;
}
