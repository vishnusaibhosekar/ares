// src/repository/EntityRepository.ts
// Repository for Entity table operations

import { Database } from './Database';
import { Entity, EntityType } from '../domain/models';

/**
 * Plain object input for creating an entity
 */
export interface CreateEntityInput {
    site_id: string;
    type: EntityType | string;
    value: string;
    normalized_value?: string | null;
    confidence: number;
}

/**
 * EntityRepository - Data access layer for entities table
 */
export class EntityRepository {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    /**
     * Create a new entity
     */
    async create(entity: CreateEntityInput): Promise<string> {
        return this.db.entities().insert({
            site_id: entity.site_id,
            type: entity.type,
            value: entity.value,
            normalized_value: entity.normalized_value ?? null,
            confidence: entity.confidence,
        });
    }

    /**
     * Find entity by ID
     */
    async findById(id: string): Promise<Entity | null> {
        const record = await this.db.entities().findById(id);
        return record ? this.mapToModel(record) : null;
    }

    /**
     * Find entities by site ID
     */
    async findBySiteId(siteId: string): Promise<Entity[]> {
        const records = await this.db.entities().findAll({ site_id: siteId });
        return records.map(this.mapToModel);
    }

    /**
     * Find entities by normalized value
     */
    async findByNormalizedValue(normalizedValue: string): Promise<Entity[]> {
        const records = await this.db.entities().findAll({ normalized_value: normalizedValue });
        return records.map(this.mapToModel);
    }

    /**
     * Find entities by type and value
     */
    async findByTypeAndValue(type: EntityType, value: string): Promise<Entity[]> {
        const records = await this.db.entities().findAll({ type, value });
        return records.map(this.mapToModel);
    }

    /**
     * Update entity
     */
    async update(id: string, data: Partial<Entity>): Promise<void> {
        await this.db.entities().update(id, data);
    }

    /**
     * Delete entity
     */
    async delete(id: string): Promise<void> {
        await this.db.entities().delete(id);
    }

    /**
     * Get all entities
     */
    async findAll(): Promise<Entity[]> {
        const records = await this.db.entities().findAll();
        return records.map(this.mapToModel);
    }

    /**
     * Map database record to domain model
     */
    private mapToModel(record: {
        id: string;
        site_id: string;
        type: string;
        value: string;
        normalized_value: string | null;
        confidence: number;
        created_at: Date | string;
    }): Entity {
        return new Entity(
            record.id,
            record.site_id,
            record.type as EntityType,
            record.value,
            record.normalized_value,
            record.confidence,
            typeof record.created_at === 'string' ? new Date(record.created_at) : record.created_at
        );
    }
}

export default EntityRepository;
