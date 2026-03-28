// src/domain/models/Entity.ts
// Entity domain model

/**
 * Entity types supported by ARES
 */
export type EntityType = 'email' | 'phone' | 'handle' | 'wallet';

/**
 * Entity - Represents an extracted entity (email, phone, handle, wallet)
 */
export class Entity {
    constructor(
        public readonly id: string,
        public readonly site_id: string,
        public readonly type: EntityType,
        public readonly value: string,
        public readonly normalized_value: string | null,
        public readonly confidence: number,
        public readonly created_at: Date
    ) {
        // Validate confidence is in range
        if (confidence < 0 || confidence > 1) {
            throw new Error('Confidence must be between 0 and 1');
        }
    }

    /**
     * Check if entity has a normalized value
     */
    get isNormalized(): boolean {
        return this.normalized_value !== null;
    }

    /**
     * Get the effective value (normalized if available)
     */
    get effectiveValue(): string {
        return this.normalized_value || this.value;
    }

    /**
     * Check if this is a high-confidence entity
     */
    get isHighConfidence(): boolean {
        return this.confidence >= 0.8;
    }

    /**
     * Get a short description for logging
     */
    toString(): string {
        return `Entity(${this.type}: ${this.value})`;
    }

    /**
     * Convert to plain object
     */
    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            site_id: this.site_id,
            type: this.type,
            value: this.value,
            normalized_value: this.normalized_value,
            confidence: this.confidence,
            created_at: this.created_at.toISOString(),
        };
    }
}

export default Entity;
