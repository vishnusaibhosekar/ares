// src/repository/EmbeddingRepository.ts
// Repository for Embedding table operations

import { Database } from './Database';
import { Embedding } from '../domain/models';

/**
 * Input type for creating embeddings
 */
export interface CreateEmbeddingInput {
    source_id: string;
    source_type: string;
    source_text: string;
    vector: number[];
}

/**
 * EmbeddingRepository - Data access layer for embeddings table
 */
export class EmbeddingRepository {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    /**
     * Create a new embedding
     */
    async create(embedding: CreateEmbeddingInput): Promise<string> {
        // Convert vector array to PostgreSQL array format
        const data = {
            source_id: embedding.source_id,
            source_type: embedding.source_type,
            source_text: embedding.source_text,
            vector: `{${embedding.vector.join(',')}}`,
        };
        return this.db.embeddings().insert(data as unknown as Partial<{
            id: string;
            source_id: string;
            source_type: string;
            source_text: string;
            vector: number[];
            created_at: Date;
        }>);
    }

    /**
     * Find embedding by ID
     */
    async findById(id: string): Promise<Embedding | null> {
        const record = await this.db.embeddings().findById(id);
        return record ? this.mapToModel(record) : null;
    }

    /**
     * Find embeddings by source ID
     */
    async findBySourceId(sourceId: string): Promise<Embedding[]> {
        const records = await this.db.embeddings().findAll({ source_id: sourceId });
        return records.map(this.mapToModel);
    }

    /**
     * Find embeddings by source type
     */
    async findBySourceType(sourceType: string): Promise<Embedding[]> {
        const records = await this.db.embeddings().findAll({ source_type: sourceType });
        return records.map(this.mapToModel);
    }

    /**
     * Delete embedding
     */
    async delete(id: string): Promise<void> {
        await this.db.embeddings().delete(id);
    }

    /**
     * Get all embeddings
     */
    async findAll(): Promise<Embedding[]> {
        const records = await this.db.embeddings().findAll();
        return records.map(this.mapToModel);
    }

    /**
     * Map database record to domain model
     */
    private mapToModel(record: {
        id: string;
        source_id: string;
        source_type: string;
        source_text: string;
        vector: number[] | string;
        created_at: Date;
    }): Embedding {
        // Handle vector parsing (may come as string from DB)
        let vector: number[];
        if (typeof record.vector === 'string') {
            vector = JSON.parse(record.vector.replace(/^\{/, '[').replace(/\}$/, ']'));
        } else {
            vector = record.vector;
        }

        return new Embedding(
            record.id,
            record.source_id,
            record.source_type,
            record.source_text,
            vector,
            record.created_at
        );
    }
}

export default EmbeddingRepository;
