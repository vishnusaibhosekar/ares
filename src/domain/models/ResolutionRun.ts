// src/domain/models/ResolutionRun.ts
// ResolutionRun domain model

/**
 * Input entities structure for resolution runs
 */
export interface InputEntities {
    emails?: string[];
    phones?: string[];
    handles?: Array<{ type: string; value: string }>;
    wallets?: string[];
}

/**
 * ResolutionRun - Represents a single resolution execution
 */
export class ResolutionRun {
    constructor(
        public readonly id: string,
        public readonly input_url: string,
        public readonly input_domain: string | null,
        public readonly input_entities: Record<string, unknown>,
        public readonly result_cluster_id: string | null,
        public readonly result_confidence: number,
        public readonly explanation: string | null,
        public readonly matching_signals: string[],
        public readonly execution_time_ms: number,
        public readonly created_at: Date
    ) {
        // Validate confidence is in range
        if (result_confidence < 0 || result_confidence > 1) {
            throw new Error('Confidence must be between 0 and 1');
        }
    }

    /**
     * Check if resolution found a match
     */
    get hasMatch(): boolean {
        return this.result_cluster_id !== null;
    }

    /**
     * Check if this is a high-confidence resolution
     */
    get isHighConfidence(): boolean {
        return this.result_confidence >= 0.8;
    }

    /**
     * Get number of matching signals
     */
    get signalCount(): number {
        return this.matching_signals.length;
    }

    /**
     * Get execution time in seconds
     */
    get executionTimeSeconds(): number {
        return this.execution_time_ms / 1000;
    }

    /**
     * Get typed input entities
     */
    get typedInputEntities(): InputEntities {
        return this.input_entities as InputEntities;
    }

    /**
     * Get a short description for logging
     */
    toString(): string {
        return `ResolutionRun(${this.input_url}, confidence: ${this.result_confidence})`;
    }

    /**
     * Convert to plain object
     */
    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            input_url: this.input_url,
            input_domain: this.input_domain,
            input_entities: this.input_entities,
            result_cluster_id: this.result_cluster_id,
            result_confidence: this.result_confidence,
            explanation: this.explanation,
            matching_signals: this.matching_signals,
            execution_time_ms: this.execution_time_ms,
            created_at: this.created_at.toISOString(),
        };
    }
}

export default ResolutionRun;
