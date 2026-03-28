// src/repository/ClusterRepository.ts
// Repository for Cluster table operations

import { Database } from './Database';
import { Cluster } from '../domain/models';

/**
 * Plain object input for creating a cluster
 */
export interface CreateClusterInput {
    name?: string | null;
    confidence: number;
    description?: string | null;
}

/**
 * ClusterRepository - Data access layer for clusters table
 */
export class ClusterRepository {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    /**
     * Create a new cluster
     */
    async create(cluster: CreateClusterInput): Promise<string> {
        return this.db.clusters().insert({
            name: cluster.name ?? null,
            confidence: cluster.confidence,
            description: cluster.description ?? null,
            created_at: new Date(),
            updated_at: new Date(),
        });
    }

    /**
     * Find cluster by ID
     */
    async findById(id: string): Promise<Cluster | null> {
        const record = await this.db.clusters().findById(id);
        return record ? this.mapToModel(record) : null;
    }

    /**
     * Find cluster by name
     */
    async findByName(name: string): Promise<Cluster | null> {
        const records = await this.db.clusters().findAll({ name });
        return records.length > 0 ? this.mapToModel(records[0]) : null;
    }

    /**
     * Update cluster
     */
    async update(id: string, data: Partial<Cluster>): Promise<void> {
        await this.db.clusters().update(id, {
            ...data,
            updated_at: new Date(),
        });
    }

    /**
     * Delete cluster
     */
    async delete(id: string): Promise<void> {
        await this.db.clusters().delete(id);
    }

    /**
     * Get all clusters
     */
    async findAll(): Promise<Cluster[]> {
        const records = await this.db.clusters().findAll();
        return records.map(this.mapToModel);
    }

    /**
     * Map database record to domain model
     */
    private mapToModel(record: {
        id: string;
        name: string | null;
        confidence: number;
        description: string | null;
        created_at: Date | string;
        updated_at: Date | string;
    }): Cluster {
        return new Cluster(
            record.id,
            record.name,
            record.confidence,
            record.description,
            typeof record.created_at === 'string' ? new Date(record.created_at) : record.created_at,
            typeof record.updated_at === 'string' ? new Date(record.updated_at) : record.updated_at
        );
    }
}

export default ClusterRepository;
