/**
 * ClusterResolver - Resolves which operator cluster a new site belongs to
 * using union-find algorithm and confidence aggregation
 */

import { logger } from '../util/logger';
import type { SimilarityScorer } from './SimilarityScorer';
import type { EmbeddingService } from './EmbeddingService';

/**
 * Union-Find (Disjoint Set Union) data structure
 * with path compression and union by rank
 */
export class UnionFind {
    private parent: Map<string, string> = new Map();
    private rank: Map<string, number> = new Map();

    /**
     * Find the root of the set containing x
     * Uses path compression for efficiency
     */
    find(x: string): string {
        if (!this.parent.has(x)) {
            this.parent.set(x, x);
            this.rank.set(x, 0);
        }

        if (this.parent.get(x) !== x) {
            // Path compression: point directly to root
            this.parent.set(x, this.find(this.parent.get(x)!));
        }

        return this.parent.get(x)!;
    }

    /**
     * Union two sets containing x and y
     * Uses union by rank to keep tree balanced
     * @returns true if they were already connected
     */
    union(x: string, y: string): boolean {
        const rootX = this.find(x);
        const rootY = this.find(y);

        if (rootX === rootY) {
            return true; // Already connected
        }

        const rankX = this.rank.get(rootX) || 0;
        const rankY = this.rank.get(rootY) || 0;

        // Attach smaller tree to larger
        if (rankX < rankY) {
            this.parent.set(rootX, rootY);
        } else if (rankX > rankY) {
            this.parent.set(rootY, rootX);
        } else {
            this.parent.set(rootY, rootX);
            this.rank.set(rootX, rankX + 1);
        }

        return false; // Were not connected before
    }

    /**
     * Check if x and y are in the same set
     */
    connected(x: string, y: string): boolean {
        return this.find(x) === this.find(y);
    }

    /**
     * Get all unique roots (cluster representatives)
     */
    getRoots(): string[] {
        const roots = new Set<string>();
        for (const key of this.parent.keys()) {
            roots.add(this.find(key));
        }
        return Array.from(roots);
    }

    /**
     * Get all elements in the same set as x
     */
    getMembers(x: string): string[] {
        const root = this.find(x);
        const members: string[] = [];
        for (const key of this.parent.keys()) {
            if (this.find(key) === root) {
                members.push(key);
            }
        }
        return members;
    }

    /**
     * Get the size of the set containing x
     */
    getSize(x: string): number {
        return this.getMembers(x).length;
    }

    /**
     * Clear all data
     */
    clear(): void {
        this.parent.clear();
        this.rank.clear();
    }
}

/**
 * Tracks confidence signals and calculates aggregate confidence
 */
export class ConfidenceTracker {
    private _signals: string[] = [];
    private _scores: number[] = [];
    private _weights: number[] = [];

    /**
     * Signal weights for confidence calculation
     */
    private static readonly SIGNAL_WEIGHTS: Record<string, number> = {
        exact_email: 1.0,
        exact_phone: 1.0,
        exact_handle: 0.9,
        exact_wallet: 1.0,
        fuzzy_phone: 0.8,
        fuzzy_handle: 0.7,
        domain_match: 0.5,
        similar_policy_text: 0.6,
        similar_about_text: 0.5,
        default: 0.5,
    };

    /**
     * Add a confidence signal
     */
    addSignal(signal: string, score: number): void {
        this._signals.push(signal);
        this._scores.push(score);

        const weight = ConfidenceTracker.SIGNAL_WEIGHTS[signal]
            ?? ConfidenceTracker.SIGNAL_WEIGHTS['default'];
        this._weights.push(weight);

        logger.debug({ signal, score, weight }, 'Added confidence signal');
    }

    /**
     * Get aggregate confidence and unique signals
     */
    getAggregate(): { confidence: number; signals: string[] } {
        if (this._scores.length === 0) {
            return { confidence: 0, signals: [] };
        }

        // Calculate weighted mean
        let weightedSum = 0;
        let totalWeight = 0;

        for (let i = 0; i < this._scores.length; i++) {
            weightedSum += this._scores[i] * this._weights[i];
            totalWeight += this._weights[i];
        }

        const confidence = totalWeight > 0 ? weightedSum / totalWeight : 0;
        const signals = [...new Set(this._signals)]; // Unique signals

        return { confidence, signals };
    }

    /**
     * Get all signals with their scores
     */
    get signals(): string[] {
        return [...this._signals];
    }

    /**
     * Get all scores
     */
    get scores(): number[] {
        return [...this._scores];
    }

    /**
     * Get number of signals
     */
    get count(): number {
        return this._signals.length;
    }

    /**
     * Clear all signals
     */
    clear(): void {
        this._signals = [];
        this._scores = [];
        this._weights = [];
    }
}

/**
 * Result of cluster resolution
 */
export interface ClusterMatchResult {
    matched_cluster_id: string | null;
    confidence: number;
    matching_signals: string[];
    related_domains: string[];
    related_entities: Array<{ type: string; value: string; count: number }>;
    explanation: string;
}

/**
 * Historical site data for resolution
 */
export interface HistoricalSiteData {
    site_id: string;
    cluster_id: string | null;
    domain: string;
    entities: Array<{ id: string; type: string; value: string }>;
    embeddings: number[][];
}

/**
 * Entity type for resolution
 */
export type EntityType = 'email' | 'phone' | 'handle' | 'wallet';

/**
 * ClusterResolver - Main resolution service
 */
export class ClusterResolver {
    private unionFind: UnionFind;

    constructor() {
        this.unionFind = new UnionFind();
    }

    /**
     * Resolve which cluster a new site belongs to
     */
    async resolveCluster(
        inputEntities: Array<{ type: EntityType; value: string }>,
        inputText: string | null,
        historicalSites: HistoricalSiteData[],
        similarityScorer: SimilarityScorer,
        embeddingService: EmbeddingService | null = null
    ): Promise<ClusterMatchResult> {
        const startTime = Date.now();

        logger.info(
            {
                inputEntityCount: inputEntities.length,
                hasInputText: !!inputText,
                historicalSiteCount: historicalSites.length
            },
            'Starting cluster resolution'
        );

        // Reset union-find for this resolution
        this.unionFind.clear();
        const confidenceTracker = new ConfidenceTracker();
        const inputMarker = '__INPUT__';

        // Handle empty inputs
        if (inputEntities.length === 0 && !inputText) {
            logger.info('No input entities or text provided');
            return this.buildEmptyResult();
        }

        // Handle no historical data
        if (historicalSites.length === 0) {
            logger.info('No historical sites to compare against');
            return this.buildEmptyResult();
        }

        // Initialize union-find with all historical cluster IDs
        const clusterToSites = new Map<string, HistoricalSiteData[]>();
        for (const site of historicalSites) {
            const clusterId = site.cluster_id || site.site_id;
            this.unionFind.find(clusterId);

            if (!clusterToSites.has(clusterId)) {
                clusterToSites.set(clusterId, []);
            }
            clusterToSites.get(clusterId)!.push(site);
        }

        // Build historical entity lookup by type
        const historicalByType = this.buildEntityLookup(historicalSites);

        // Score each input entity against historical entities
        for (const inputEntity of inputEntities) {
            const historical = historicalByType.get(inputEntity.type) || [];

            if (historical.length === 0) {
                continue;
            }

            // Score against all historical entities of same type
            const scores = await this.scoreEntityAgainstHistorical(
                inputEntity,
                historical,
                similarityScorer
            );

            for (const score of scores) {
                if (score.match_score >= 0.7) {
                    // Union input with historical cluster
                    this.unionFind.union(inputMarker, score.cluster_id);

                    // Determine signal type based on score
                    const signalType = this.getSignalType(inputEntity.type, score.reason);
                    confidenceTracker.addSignal(signalType, score.match_score);

                    logger.debug(
                        {
                            inputValue: inputEntity.value,
                            matchedValue: score.historical_entity,
                            score: score.match_score,
                            signal: signalType
                        },
                        'Entity match found'
                    );
                }
            }
        }

        // Score text similarity if text provided
        if (inputText && embeddingService) {
            await this.scoreTextAgainstHistorical(
                inputText,
                historicalSites,
                similarityScorer,
                embeddingService,
                inputMarker,
                confidenceTracker
            );
        }

        // Get aggregate confidence
        const { confidence, signals } = confidenceTracker.getAggregate();

        // Check if we have a match
        if (confidence < 0.6 || signals.length === 0) {
            logger.info(
                { confidence, signalCount: signals.length },
                'No cluster match found (confidence too low)'
            );
            return this.buildEmptyResult();
        }

        // Find the matched cluster (most connections)
        const matchedClusterId = this.findBestMatchingCluster(
            inputMarker,
            clusterToSites
        );

        if (!matchedClusterId) {
            return this.buildEmptyResult();
        }

        // Get related domains and entities
        const matchedSites = clusterToSites.get(matchedClusterId) || [];
        const relatedDomains = matchedSites.map(s => s.domain);
        const relatedEntities = this.aggregateEntities(matchedSites);

        // Build explanation
        const explanation = this.buildExplanation(
            signals,
            confidence,
            relatedDomains.length,
            relatedEntities.length
        );

        const result: ClusterMatchResult = {
            matched_cluster_id: matchedClusterId,
            confidence,
            matching_signals: signals,
            related_domains: relatedDomains,
            related_entities: relatedEntities,
            explanation,
        };

        logger.info(
            {
                matchedClusterId,
                confidence,
                signalCount: signals.length,
                durationMs: Date.now() - startTime
            },
            'Cluster resolution complete'
        );

        return result;
    }

    /**
     * Build lookup of historical entities by type
     */
    private buildEntityLookup(
        sites: HistoricalSiteData[]
    ): Map<string, Array<{ value: string; cluster_id: string; entity_id: string }>> {
        const lookup = new Map<string, Array<{ value: string; cluster_id: string; entity_id: string }>>();

        for (const site of sites) {
            const clusterId = site.cluster_id || site.site_id;

            for (const entity of site.entities) {
                if (!lookup.has(entity.type)) {
                    lookup.set(entity.type, []);
                }
                lookup.get(entity.type)!.push({
                    value: entity.value,
                    cluster_id: clusterId,
                    entity_id: entity.id,
                });
            }
        }

        return lookup;
    }

    /**
     * Score an input entity against historical entities
     */
    private async scoreEntityAgainstHistorical(
        inputEntity: { type: EntityType; value: string },
        historical: Array<{ value: string; cluster_id: string; entity_id: string }>,
        scorer: SimilarityScorer
    ): Promise<Array<{
        match_score: number;
        reason: string;
        historical_entity: string;
        cluster_id: string;
    }>> {
        const results: Array<{
            match_score: number;
            reason: string;
            historical_entity: string;
            cluster_id: string;
        }> = [];

        for (const hist of historical) {
            const match = scorer.scoreEntityMatch(
                inputEntity.value,
                hist.value,
                inputEntity.type
            );

            if (match.score > 0) {
                results.push({
                    match_score: match.score,
                    reason: match.reason,
                    historical_entity: hist.value,
                    cluster_id: hist.cluster_id,
                });
            }
        }

        // Sort by score descending
        results.sort((a, b) => b.match_score - a.match_score);

        return results;
    }

    /**
     * Score text against historical embeddings
     */
    private async scoreTextAgainstHistorical(
        inputText: string,
        historicalSites: HistoricalSiteData[],
        scorer: SimilarityScorer,
        embeddingService: EmbeddingService,
        inputMarker: string,
        confidenceTracker: ConfidenceTracker
    ): Promise<void> {
        // Collect all historical embeddings with cluster mapping
        const embeddingsWithClusters: Array<{
            embedding: number[];
            cluster_id: string;
        }> = [];

        for (const site of historicalSites) {
            const clusterId = site.cluster_id || site.site_id;
            for (const emb of site.embeddings) {
                embeddingsWithClusters.push({
                    embedding: emb,
                    cluster_id: clusterId,
                });
            }
        }

        if (embeddingsWithClusters.length === 0) {
            return;
        }

        try {
            // Embed input text
            const inputEmbedding = await embeddingService.embed(inputText);

            // Score against each historical embedding
            for (const { embedding, cluster_id } of embeddingsWithClusters) {
                const similarity = scorer.cosineSimilarity(inputEmbedding, embedding);

                if (similarity >= 0.75) {
                    this.unionFind.union(inputMarker, cluster_id);
                    confidenceTracker.addSignal('similar_policy_text', similarity);

                    logger.debug(
                        { similarity, cluster_id },
                        'Text similarity match found'
                    );
                }
            }
        } catch (error) {
            logger.warn({ error }, 'Failed to compute text similarity');
        }
    }

    /**
     * Find the best matching cluster based on union-find connections
     */
    private findBestMatchingCluster(
        inputMarker: string,
        clusterToSites: Map<string, HistoricalSiteData[]>
    ): string | null {
        const inputRoot = this.unionFind.find(inputMarker);

        // Find which cluster root the input is connected to
        let bestCluster: string | null = null;
        let maxSize = 0;

        for (const clusterId of clusterToSites.keys()) {
            if (this.unionFind.connected(inputMarker, clusterId)) {
                const size = this.unionFind.getSize(clusterId);
                if (size > maxSize) {
                    maxSize = size;
                    bestCluster = clusterId;
                }
            }
        }

        return bestCluster;
    }

    /**
     * Aggregate entities from matched sites
     */
    private aggregateEntities(
        sites: HistoricalSiteData[]
    ): Array<{ type: string; value: string; count: number }> {
        const entityCounts = new Map<string, { type: string; value: string; count: number }>();

        for (const site of sites) {
            for (const entity of site.entities) {
                const key = `${entity.type}:${entity.value}`;
                if (!entityCounts.has(key)) {
                    entityCounts.set(key, { type: entity.type, value: entity.value, count: 0 });
                }
                entityCounts.get(key)!.count++;
            }
        }

        return Array.from(entityCounts.values())
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Get signal type based on entity type and match reason
     */
    private getSignalType(entityType: EntityType, reason: string): string {
        if (reason === 'exact_match') {
            return `exact_${entityType}`;
        } else if (reason === 'fuzzy_match') {
            return `fuzzy_${entityType}`;
        } else if (reason === 'domain_match') {
            return 'domain_match';
        }
        return `${entityType}_match`;
    }

    /**
     * Build human-readable explanation
     */
    private buildExplanation(
        signals: string[],
        confidence: number,
        domainCount: number,
        entityCount: number
    ): string {
        const signalDescriptions = signals.map(s => {
            switch (s) {
                case 'exact_email': return 'matching email address';
                case 'exact_phone': return 'matching phone number';
                case 'exact_handle': return 'matching social media handle';
                case 'exact_wallet': return 'matching cryptocurrency wallet';
                case 'fuzzy_phone': return 'similar phone number';
                case 'fuzzy_handle': return 'similar handle';
                case 'domain_match': return 'same email domain';
                case 'similar_policy_text': return 'similar policy/about text';
                default: return s.replace(/_/g, ' ');
            }
        });

        const confidenceLevel = confidence >= 0.9 ? 'high'
            : confidence >= 0.7 ? 'medium'
                : 'low';

        return `Matched with ${confidenceLevel} confidence (${(confidence * 100).toFixed(1)}%) ` +
            `based on ${signalDescriptions.join(', ')}. ` +
            `Cluster contains ${domainCount} related domain(s) and ${entityCount} shared entities.`;
    }

    /**
     * Build empty/no-match result
     */
    private buildEmptyResult(): ClusterMatchResult {
        return {
            matched_cluster_id: null,
            confidence: 0,
            matching_signals: [],
            related_domains: [],
            related_entities: [],
            explanation: 'No matching cluster found. This appears to be a new operator.',
        };
    }

    /**
     * Get the union-find instance (for testing)
     */
    getUnionFind(): UnionFind {
        return this.unionFind;
    }
}

export default ClusterResolver;
