// src/service/SimilarityScorer.ts
// Service for computing similarity scores between entities and text embeddings

import { EmbeddingService } from './EmbeddingService';
import { logger } from '../util/logger';

/**
 * Result of entity matching
 */
export interface EntityMatchResult {
    score: number;
    reason: 'exact_match' | 'fuzzy_match' | 'domain_match' | 'no_match';
    signal: string;
}

/**
 * Entity score for batch scoring
 */
export interface EntityScore {
    entity_id?: string;
    site_id?: string;
    input_entity: string;
    historical_entity: string;
    match_score: number;
    reason: string;
    signal: string;
}

/**
 * Entity type for scoring
 */
export type EntityType = 'email' | 'phone' | 'handle' | 'wallet';

/**
 * SimilarityScorer - Computes similarity between entities and text embeddings
 */
export class SimilarityScorer {
    private embeddingService: EmbeddingService | null;
    private similarityThreshold: number;

    constructor(embeddingService?: EmbeddingService, similarityThreshold: number = 0.75) {
        this.embeddingService = embeddingService || null;
        this.similarityThreshold = similarityThreshold;
    }

    /**
     * Score entity match between input and historical entity
     */
    scoreEntityMatch(
        input: string,
        historical: string,
        type: EntityType
    ): EntityMatchResult {
        if (!input || !historical) {
            return { score: 0, reason: 'no_match', signal: 'empty_input' };
        }

        const normalizedInput = input.toLowerCase().trim();
        const normalizedHistorical = historical.toLowerCase().trim();

        // Exact match
        if (normalizedInput === normalizedHistorical) {
            return {
                score: 1.0,
                reason: 'exact_match',
                signal: `shared_${type}`,
            };
        }

        // For phones, check fuzzy match (edit distance <= 2)
        if (type === 'phone') {
            const distance = this.levenshteinDistance(normalizedInput, normalizedHistorical);
            if (distance <= 2 && distance > 0) {
                return {
                    score: 0.95,
                    reason: 'fuzzy_match',
                    signal: 'similar_phone',
                };
            }
        }

        // For emails, check domain match
        if (type === 'email') {
            const inputDomain = this.extractEmailDomain(normalizedInput);
            const historicalDomain = this.extractEmailDomain(normalizedHistorical);
            if (inputDomain && historicalDomain && inputDomain === historicalDomain) {
                return {
                    score: 0.75,
                    reason: 'domain_match',
                    signal: 'shared_email_domain',
                };
            }
        }

        // For handles, check fuzzy match
        if (type === 'handle') {
            const distance = this.levenshteinDistance(normalizedInput, normalizedHistorical);
            if (distance <= 2 && distance > 0) {
                return {
                    score: 0.85,
                    reason: 'fuzzy_match',
                    signal: 'similar_handle',
                };
            }
        }

        return { score: 0, reason: 'no_match', signal: 'no_match' };
    }

    /**
     * Compute Levenshtein (edit) distance between two strings
     */
    levenshteinDistance(a: string, b: string): number {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix: number[][] = [];

        // Initialize matrix
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Fill in the matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Compute cosine similarity between two vectors
     */
    cosineSimilarity(vec1: number[], vec2: number[]): number {
        if (!vec1 || !vec2 || vec1.length === 0 || vec2.length === 0) {
            return 0;
        }

        if (vec1.length !== vec2.length) {
            logger.warn({ len1: vec1.length, len2: vec2.length }, 'Vector dimension mismatch');
            return 0;
        }

        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            magnitude1 += vec1[i] * vec1[i];
            magnitude2 += vec2[i] * vec2[i];
        }

        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);

        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }

        return dotProduct / (magnitude1 * magnitude2);
    }

    /**
     * Score text similarity against historical embeddings
     */
    async scoreTextSimilarity(
        inputText: string,
        historicalEmbeddings: number[][]
    ): Promise<number> {
        if (!inputText || historicalEmbeddings.length === 0) {
            return 0;
        }

        if (!this.embeddingService) {
            logger.warn('No embedding service configured for text similarity');
            return 0;
        }

        try {
            // Generate embedding for input text
            const inputEmbedding = await this.embeddingService.embed(inputText);

            // Find max similarity
            let maxSimilarity = 0;
            for (const historical of historicalEmbeddings) {
                const similarity = this.cosineSimilarity(inputEmbedding, historical);
                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity;
                }
            }

            // Apply threshold
            return maxSimilarity >= this.similarityThreshold ? maxSimilarity : 0;
        } catch (error) {
            logger.error({ error }, 'Error computing text similarity');
            return 0;
        }
    }

    /**
     * Score input entities against historical entities
     */
    async scoreEntitySet(
        inputEntities: Array<{ id?: string; value: string }>,
        historical: Array<{ entity_id: string; site_id?: string; value: string }>,
        type: EntityType
    ): Promise<EntityScore[]> {
        const scores: EntityScore[] = [];

        for (const input of inputEntities) {
            for (const hist of historical) {
                const result = this.scoreEntityMatch(input.value, hist.value, type);

                // Only include scores above threshold
                if (result.score >= 0.7) {
                    scores.push({
                        entity_id: hist.entity_id,
                        site_id: hist.site_id,
                        input_entity: input.value,
                        historical_entity: hist.value,
                        match_score: result.score,
                        reason: result.reason,
                        signal: result.signal,
                    });
                }
            }
        }

        // Sort by score descending
        return scores.sort((a, b) => b.match_score - a.match_score);
    }

    /**
     * Check if two vectors are similar above threshold
     */
    areSimilar(vec1: number[], vec2: number[], threshold?: number): boolean {
        const thresh = threshold ?? this.similarityThreshold;
        return this.cosineSimilarity(vec1, vec2) >= thresh;
    }

    /**
     * Find top K most similar vectors
     */
    findTopKSimilar(
        queryVector: number[],
        candidateVectors: Array<{ id: string; vector: number[] }>,
        k: number
    ): Array<{ id: string; similarity: number }> {
        const similarities = candidateVectors.map((candidate) => ({
            id: candidate.id,
            similarity: this.cosineSimilarity(queryVector, candidate.vector),
        }));

        return similarities
            .filter((s) => s.similarity >= this.similarityThreshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, k);
    }

    /**
     * Extract email domain
     */
    private extractEmailDomain(email: string): string | null {
        const parts = email.split('@');
        return parts.length === 2 ? parts[1] : null;
    }
}

export default SimilarityScorer;
