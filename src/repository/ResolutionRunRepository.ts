// src/repository/ResolutionRunRepository.ts
// Repository for ResolutionRun table operations

import { Database } from './Database';
import { ResolutionRun } from '../domain/models';

/**
 * Plain object input for creating a resolution run
 */
export interface CreateResolutionRunInput {
    input_url: string;
    input_domain: string | null;
    input_entities: Record<string, unknown>;
    result_cluster_id: string | null;
    result_confidence: number;
    explanation: string | null;
    matching_signals: string[];
    execution_time_ms: number;
}

/**
 * ResolutionRunRepository - Data access layer for resolution_runs table
 */
export class ResolutionRunRepository {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    /**
     * Create a new resolution run
     */
    async create(run: CreateResolutionRunInput): Promise<string> {
        return this.db.resolution_runs().insert({
            input_url: run.input_url,
            input_domain: run.input_domain,
            input_entities: run.input_entities,
            result_cluster_id: run.result_cluster_id,
            result_confidence: run.result_confidence,
            explanation: run.explanation,
            matching_signals: run.matching_signals,
            execution_time_ms: run.execution_time_ms,
        });
    }

    /**
     * Find resolution run by ID
     */
    async findById(id: string): Promise<ResolutionRun | null> {
        const record = await this.db.resolution_runs().findById(id);
        return record ? this.mapToModel(record) : null;
    }

    /**
     * Find resolution runs by input domain
     */
    async findByInputDomain(domain: string): Promise<ResolutionRun[]> {
        const records = await this.db.resolution_runs().findAll({ input_domain: domain });
        return records.map(this.mapToModel);
    }

    /**
     * Find resolution runs by result cluster ID
     */
    async findByClusterId(clusterId: string): Promise<ResolutionRun[]> {
        const records = await this.db.resolution_runs().findAll({ result_cluster_id: clusterId });
        return records.map(this.mapToModel);
    }

    /**
     * Delete resolution run
     */
    async delete(id: string): Promise<void> {
        await this.db.resolution_runs().delete(id);
    }

    /**
     * Get all resolution runs
     */
    async findAll(): Promise<ResolutionRun[]> {
        const records = await this.db.resolution_runs().findAll();
        return records.map(this.mapToModel);
    }

    /**
     * Map database record to domain model
     */
    private mapToModel(record: {
        id: string;
        input_url: string;
        input_domain: string | null;
        input_entities: Record<string, unknown>;
        result_cluster_id: string | null;
        result_confidence: number;
        explanation: string | null;
        matching_signals: string[];
        execution_time_ms: number;
        created_at: Date;
    }): ResolutionRun {
        return new ResolutionRun(
            record.id,
            record.input_url,
            record.input_domain,
            record.input_entities,
            record.result_cluster_id,
            record.result_confidence,
            record.explanation,
            Array.isArray(record.matching_signals) ? record.matching_signals : [],
            record.execution_time_ms,
            record.created_at
        );
    }
}

export default ResolutionRunRepository;
