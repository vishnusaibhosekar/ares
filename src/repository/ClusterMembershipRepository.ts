// src/repository/ClusterMembershipRepository.ts
// Repository for ClusterMembership table operations

import { Database } from './Database';

/**
 * Plain object input for creating a cluster membership
 */
export interface CreateClusterMembershipInput {
    cluster_id: string;
    entity_id?: string | null;
    site_id?: string | null;
    membership_type: 'entity' | 'site';
    confidence: number;
    reason?: string | null;
}

/**
 * ClusterMembership record type
 */
export interface ClusterMembership {
    id: string;
    cluster_id: string;
    entity_id: string | null;
    site_id: string | null;
    membership_type: string;
    confidence: number;
    reason: string | null;
    created_at: Date;
}

/**
 * ClusterMembershipRepository - Data access layer for cluster_memberships table
 */
export class ClusterMembershipRepository {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    /**
     * Create a new cluster membership
     */
    async create(membership: CreateClusterMembershipInput): Promise<string> {
        return this.db.cluster_memberships().insert({
            cluster_id: membership.cluster_id,
            entity_id: membership.entity_id ?? null,
            site_id: membership.site_id ?? null,
            membership_type: membership.membership_type,
            confidence: membership.confidence,
            reason: membership.reason ?? null,
        });
    }

    /**
     * Find memberships by cluster ID
     */
    async findByClusterId(clusterId: string): Promise<ClusterMembership[]> {
        const records = await this.db.cluster_memberships().findAll({ cluster_id: clusterId });
        return records.map(this.mapToModel);
    }

    /**
     * Find memberships by site ID
     */
    async findBySiteId(siteId: string): Promise<ClusterMembership[]> {
        const records = await this.db.cluster_memberships().findAll({ site_id: siteId });
        return records.map(this.mapToModel);
    }

    /**
     * Find memberships by entity ID
     */
    async findByEntityId(entityId: string): Promise<ClusterMembership[]> {
        const records = await this.db.cluster_memberships().findAll({ entity_id: entityId });
        return records.map(this.mapToModel);
    }

    /**
     * Delete membership
     */
    async delete(id: string): Promise<void> {
        await this.db.cluster_memberships().delete(id);
    }

    /**
     * Get all memberships
     */
    async findAll(): Promise<ClusterMembership[]> {
        const records = await this.db.cluster_memberships().findAll();
        return records.map(this.mapToModel);
    }

    /**
     * Map database record to model
     */
    private mapToModel(record: {
        id: string;
        cluster_id: string;
        entity_id: string | null;
        site_id: string | null;
        membership_type: string;
        confidence: number;
        reason: string | null;
        created_at: Date | string;
    }): ClusterMembership {
        return {
            id: record.id,
            cluster_id: record.cluster_id,
            entity_id: record.entity_id,
            site_id: record.site_id,
            membership_type: record.membership_type,
            confidence: record.confidence,
            reason: record.reason,
            created_at: typeof record.created_at === 'string' ? new Date(record.created_at) : record.created_at,
        };
    }
}

export default ClusterMembershipRepository;
