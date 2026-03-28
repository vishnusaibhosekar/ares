// src/domain/types/index.ts
// Export all types

// Re-export API types
export * from './api';

// Re-export model types
export {
    Site,
    Entity,
    EntityType,
    Cluster,
    ClusterMembership,
    MembershipType,
    Embedding,
    EmbeddingSourceType,
    ResolutionRun,
    InputEntities,
} from '../models';

// ============================================
// Common Types
// ============================================

/**
 * UUID type alias for clarity
 */
export type UUID = string;

/**
 * Confidence score (0.0 - 1.0)
 */
export type Confidence = number;

/**
 * ISO 8601 date string
 */
export type ISODateString = string;

/**
 * Pagination parameters
 */
export interface PaginationParams {
    page?: number;
    limit?: number;
    offset?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Generic filter parameters
 */
export interface FilterParams {
    [key: string]: string | number | boolean | undefined;
}

/**
 * Service result with success/error handling
 */
export interface ServiceResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    errorCode?: string;
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
    successful: T[];
    failed: Array<{ item: T; error: string }>;
    totalProcessed: number;
}

// ============================================
// Configuration Types
// ============================================

/**
 * Application configuration
 */
export interface AppConfig {
    port: number;
    nodeEnv: 'development' | 'production' | 'test';
    logLevel: string;
    databaseUrl: string;
    mixedbreadApiKey: string;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
    connectionString: string;
    poolSize: number;
    idleTimeout: number;
    connectionTimeout: number;
}

/**
 * Embedding service configuration
 */
export interface EmbeddingConfig {
    apiKey: string;
    baseUrl: string;
    model: string;
    dimensions: number;
    batchSize: number;
}

// ============================================
// Resolution Types
// ============================================

/**
 * Resolution signal types
 */
export type SignalType =
    | 'email_match'
    | 'phone_match'
    | 'handle_match'
    | 'wallet_match'
    | 'domain_pattern'
    | 'embedding_similarity'
    | 'screenshot_match';

/**
 * Resolution signal
 */
export interface ResolutionSignal {
    type: SignalType;
    value: string;
    confidence: number;
    details?: string;
}

/**
 * Resolution context passed through the pipeline
 */
export interface ResolutionContext {
    inputUrl: string;
    inputDomain?: string;
    siteId?: string;
    entities: {
        emails: string[];
        phones: string[];
        handles: Array<{ type: string; value: string }>;
        wallets: string[];
    };
    embeddings: number[][];
    signals: ResolutionSignal[];
    startTime: number;
}
