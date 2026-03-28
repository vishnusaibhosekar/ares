// src/service/EmbeddingService.ts
// Service for generating text embeddings via Mixedbread AI API

import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { logger } from '../util/logger';
import { env } from '../util/env';
import { EmbeddingRepository } from '../repository/EmbeddingRepository';
import { generateId } from '../util/random';

/**
 * Configuration for EmbeddingService
 */
export interface EmbeddingConfig {
    apiKey: string;
    baseUrl: string;
    model: string;
    maxTokens: number;
    retries: number;
    initialBackoff: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Omit<EmbeddingConfig, 'apiKey'> = {
    baseUrl: 'https://api.mixedbread.ai/v1',
    model: 'mixedbread-ai/mxbai-embed-large-v1',
    maxTokens: 8000,
    retries: 3,
    initialBackoff: 1000,
};

/**
 * EmbeddingService - Generates 1024-dimensional embeddings using Mixedbread AI
 */
export class EmbeddingService {
    private apiKey: string;
    private config: EmbeddingConfig;
    private cache: Map<string, number[]>;

    constructor(apiKey?: string, config?: Partial<EmbeddingConfig>) {
        this.apiKey = apiKey || env.MIXEDBREAD_API_KEY || '';
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
            apiKey: this.apiKey,
        };
        this.cache = new Map();
    }

    /**
     * Generate embedding for a single text
     */
    async embed(text: string): Promise<number[]> {
        if (!text || text.trim().length === 0) {
            logger.warn('Empty text provided for embedding');
            return this.getZeroVector();
        }

        // Check cache
        const cacheKey = this.getCacheKey(text);
        const cached = this.cache.get(cacheKey);
        if (cached) {
            logger.debug('Embedding cache hit');
            return cached;
        }

        // Truncate if needed
        const truncatedText = this.truncateText(text);

        // Call API with retry logic
        const vector = await this.callApiWithRetry(truncatedText);

        // Cache result
        if (vector.length > 0) {
            this.cache.set(cacheKey, vector);
        }

        return vector;
    }

    /**
     * Embed multiple texts efficiently
     */
    async embedBatch(texts: string[]): Promise<Array<{ text: string; vector: number[] }>> {
        const results: Array<{ text: string; vector: number[] }> = [];

        for (const text of texts) {
            try {
                const vector = await this.embed(text);
                results.push({ text, vector });
            } catch (error) {
                logger.error({ error, text: text.substring(0, 100) }, 'Failed to embed text in batch');
                results.push({ text, vector: this.getZeroVector() });
            }
        }

        return results;
    }

    /**
     * Store an embedding in the database
     */
    async storeEmbedding(
        sourceId: string,
        sourceType: string,
        text: string,
        repo: EmbeddingRepository
    ): Promise<string> {
        const vector = await this.embed(text);
        const embeddingId = generateId();

        await repo.create({
            source_id: sourceId,
            source_type: sourceType,
            source_text: text,
            vector,
        });

        logger.info({ sourceId, sourceType, embeddingId }, 'Stored embedding');
        return embeddingId;
    }

    /**
     * Clear the in-memory cache
     */
    clearCache(): void {
        this.cache.clear();
        logger.info('Embedding cache cleared');
    }

    /**
     * Get cache size for monitoring
     */
    getCacheSize(): number {
        return this.cache.size;
    }

    /**
     * Call the Mixedbread API with retry logic
     */
    private async callApiWithRetry(text: string): Promise<number[]> {
        let lastError: Error | null = null;
        let backoff = this.config.initialBackoff;

        for (let attempt = 0; attempt < this.config.retries; attempt++) {
            try {
                return await this.callApi(text);
            } catch (error) {
                lastError = error as Error;
                const axiosError = error as AxiosError;

                // Don't retry auth errors
                if (axiosError.response?.status === 401) {
                    logger.error('Mixedbread API authentication error');
                    throw new Error('Embedding API authentication failed');
                }

                // Rate limit - use longer backoff
                if (axiosError.response?.status === 429) {
                    backoff = backoff * 2;
                    logger.warn({ attempt, backoff }, 'Rate limited, increasing backoff');
                }

                // Wait before retry
                if (attempt < this.config.retries - 1) {
                    logger.debug({ attempt, backoff }, 'Retrying embedding request');
                    await this.delay(backoff);
                    backoff = backoff * 2;
                }
            }
        }

        // All retries exhausted
        logger.error({ error: lastError }, 'All embedding retries exhausted');
        return this.getZeroVector();
    }

    /**
     * Make the actual API call
     */
    private async callApi(text: string): Promise<number[]> {
        if (!this.apiKey) {
            logger.warn('No Mixedbread API key configured, returning zero vector');
            return this.getZeroVector();
        }

        const response = await axios.post(
            `${this.config.baseUrl}/embeddings`,
            {
                model: this.config.model,
                input: [text],
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                timeout: 30000,
            }
        );

        const embedding = response.data?.data?.[0]?.embedding;
        if (!Array.isArray(embedding)) {
            throw new Error('Invalid embedding response format');
        }

        return embedding;
    }

    /**
     * Truncate text to max token limit (rough estimate: 4 chars per token)
     */
    private truncateText(text: string): string {
        const maxChars = this.config.maxTokens * 4;
        if (text.length <= maxChars) {
            return text;
        }

        logger.debug({ originalLength: text.length, maxChars }, 'Truncating text for embedding');
        return text.substring(0, maxChars);
    }

    /**
     * Generate a cache key for text
     */
    private getCacheKey(text: string): string {
        return crypto.createHash('sha256').update(text).digest('hex');
    }

    /**
     * Get a zero vector (1024 dimensions)
     */
    private getZeroVector(): number[] {
        return new Array(1024).fill(0);
    }

    /**
     * Delay helper for backoff
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export default EmbeddingService;
