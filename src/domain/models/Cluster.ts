// src/domain/models/Cluster.ts
// Cluster domain model

/**
 * Cluster - Represents a group of related entities/sites belonging to the same actor
 */
export class Cluster {
    constructor(
        public readonly id: string,
        public readonly name: string | null,
        public readonly confidence: number,
        public readonly description: string | null,
        public readonly created_at: Date,
        public readonly updated_at: Date
    ) {
        // Validate confidence is in range
        if (confidence < 0 || confidence > 1) {
            throw new Error('Confidence must be between 0 and 1');
        }
    }

    /**
     * Check if cluster has a name
     */
    get hasName(): boolean {
        return this.name !== null && this.name.length > 0;
    }

    /**
     * Check if cluster has a description
     */
    get hasDescription(): boolean {
        return this.description !== null && this.description.length > 0;
    }

    /**
     * Get display name (ID if no name set)
     */
    get displayName(): string {
        return this.name || `Cluster-${this.id.substring(0, 8)}`;
    }

    /**
     * Check if this is a high-confidence cluster
     */
    get isHighConfidence(): boolean {
        return this.confidence >= 0.8;
    }

    /**
     * Get a short description for logging
     */
    toString(): string {
        return `Cluster(${this.displayName}, confidence: ${this.confidence})`;
    }

    /**
     * Convert to plain object
     */
    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            name: this.name,
            confidence: this.confidence,
            description: this.description,
            created_at: this.created_at.toISOString(),
            updated_at: this.updated_at.toISOString(),
        };
    }
}

/**
 * Membership types for cluster associations
 */
export type MembershipType = 'entity' | 'site';

/**
 * ClusterMembership - Represents membership of an entity or site in a cluster
 */
export class ClusterMembership {
    constructor(
        public readonly id: string,
        public readonly cluster_id: string,
        public readonly entity_id: string | null,
        public readonly site_id: string | null,
        public readonly membership_type: MembershipType,
        public readonly confidence: number,
        public readonly reason: string | null,
        public readonly created_at: Date
    ) {
        // Validate confidence is in range
        if (confidence < 0 || confidence > 1) {
            throw new Error('Confidence must be between 0 and 1');
        }

        // Validate that at least one of entity_id or site_id is set
        if (entity_id === null && site_id === null) {
            throw new Error('At least one of entity_id or site_id must be set');
        }
    }

    /**
     * Check if this is an entity membership
     */
    get isEntityMembership(): boolean {
        return this.membership_type === 'entity' && this.entity_id !== null;
    }

    /**
     * Check if this is a site membership
     */
    get isSiteMembership(): boolean {
        return this.membership_type === 'site' && this.site_id !== null;
    }

    /**
     * Get the member ID (entity or site)
     */
    get memberId(): string {
        return this.entity_id || this.site_id || '';
    }

    /**
     * Convert to plain object
     */
    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            cluster_id: this.cluster_id,
            entity_id: this.entity_id,
            site_id: this.site_id,
            membership_type: this.membership_type,
            confidence: this.confidence,
            reason: this.reason,
            created_at: this.created_at.toISOString(),
        };
    }
}

export default Cluster;
