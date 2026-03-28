// src/domain/constants/thresholds.ts
// Threshold constants for similarity and confidence scoring

/**
 * Similarity thresholds for embedding comparisons
 */
export const SIMILARITY_THRESHOLDS = {
    /** High confidence match threshold */
    HIGH: 0.95,
    /** Medium confidence match threshold */
    MEDIUM: 0.85,
    /** Low confidence match threshold */
    LOW: 0.70,
    /** Minimum threshold for consideration */
    MINIMUM: 0.50,
} as const;

/**
 * Confidence thresholds for cluster assignment
 */
export const CONFIDENCE_THRESHOLDS = {
    /** Very high confidence (strong match) */
    VERY_HIGH: 0.95,
    /** High confidence */
    HIGH: 0.85,
    /** Medium confidence */
    MEDIUM: 0.70,
    /** Low confidence (needs review) */
    LOW: 0.50,
    /** Minimum for any assignment */
    MINIMUM: 0.30,
} as const;

/**
 * Entity match weights for overall scoring
 */
export const ENTITY_WEIGHTS = {
    EMAIL: 0.9,
    PHONE: 0.85,
    WALLET: 0.95,
    HANDLE: 0.7,
} as const;

/**
 * Embedding similarity weights by source type
 */
export const EMBEDDING_WEIGHTS = {
    SITE_POLICY: 0.8,
    SITE_CONTACT: 0.9,
    SITE_CONTENT: 0.6,
} as const;

export default {
    SIMILARITY_THRESHOLDS,
    CONFIDENCE_THRESHOLDS,
    ENTITY_WEIGHTS,
    EMBEDDING_WEIGHTS,
};
