// src/domain/models/Embedding.ts
// Embedding domain model

/**
 * Embedding source types
 */
export type EmbeddingSourceType =
    | 'site_policy'
    | 'site_contact'
    | 'site_content'
    | 'entity_context';

/**
 * Embedding - Represents a text embedding vector
 */
export class Embedding {
    constructor(
        public readonly id: string,
        public readonly source_id: string,
        public readonly source_type: string,
        public readonly source_text: string,
        public readonly vector: number[],
        public readonly created_at: Date
    ) {
        // Validate vector dimension (expecting 1024 for MIXEDBREAD embeddings)
        if (vector.length !== 1024) {
            // Allow different dimensions but log warning in production
            console.warn(`Embedding vector has ${vector.length} dimensions, expected 1024`);
        }
    }

    /**
     * Get the dimension of the embedding vector
     */
    get dimension(): number {
        return this.vector.length;
    }

    /**
     * Get the magnitude of the embedding vector
     */
    get magnitude(): number {
        return Math.sqrt(this.vector.reduce((sum, val) => sum + val * val, 0));
    }

    /**
     * Normalize the vector (unit vector)
     */
    get normalizedVector(): number[] {
        const mag = this.magnitude;
        if (mag === 0) return this.vector;
        return this.vector.map((val) => val / mag);
    }

    /**
     * Get a short description for logging
     */
    toString(): string {
        return `Embedding(${this.source_type}, dim: ${this.dimension})`;
    }

    /**
     * Convert to plain object
     */
    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            source_id: this.source_id,
            source_type: this.source_type,
            source_text: this.source_text,
            vector_dimension: this.vector.length,
            created_at: this.created_at.toISOString(),
        };
    }
}

export default Embedding;
