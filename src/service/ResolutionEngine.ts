/**
 * ResolutionEngine - Orchestrates all services for entity resolution
 * Main entry point for extracting entities, scoring similarity, and resolving clusters
 */

import { logger } from '../util/logger';
import { generateId } from '../util/random';
import type { EntityExtractor, ExtractedEntities } from './EntityExtractor';
import type { EntityNormalizer } from './EntityNormalizer';
import type { EmbeddingService } from './EmbeddingService';
import type { SimilarityScorer } from './SimilarityScorer';
import type { ClusterResolver, ClusterMatchResult, HistoricalSiteData, EntityType } from './ClusterResolver';
import type { SiteRepository } from '../repository/SiteRepository';
import type { EntityRepository } from '../repository/EntityRepository';
import type { ClusterRepository } from '../repository/ClusterRepository';
import type { EmbeddingRepository } from '../repository/EmbeddingRepository';
import type { ResolutionRunRepository } from '../repository/ResolutionRunRepository';

/**
 * Normalized entities after extraction and normalization
 */
export interface NormalizedEntities {
    emails: string[];
    phones: string[];
    handles: Array<{ type: string; value: string }>;
    wallets: Array<{ type: string; value: string }>;
}

/**
 * Request to resolve an actor
 */
export interface ResolveActorRequest {
    url: string;
    domain?: string;
    page_text?: string;
    entities_hint?: {
        emails?: string[];
        phones?: string[];
        handles?: Array<{ type: string; value: string }>;
        wallets?: Array<{ type: string; value: string }>;
    };
    use_llm?: boolean;
}

/**
 * Response from actor resolution
 */
export interface ResolveActorResponse {
    run_id: string;
    matched_cluster_id: string | null;
    confidence: number;
    matching_signals: string[];
    related_domains: string[];
    related_entities: Array<{ type: string; value: string; count: number }>;
    explanation: string;
    extracted_entities: NormalizedEntities;
    execution_time_ms: number;
}

/**
 * Request to ingest a site
 */
export interface IngestSiteRequest {
    url: string;
    domain: string;
    page_text?: string;
    screenshot_hash?: string;
    entities_hint?: {
        emails?: string[];
        phones?: string[];
        handles?: Array<{ type: string; value: string }>;
        wallets?: Array<{ type: string; value: string }>;
    };
    attempt_resolve?: boolean;
    use_llm?: boolean;
}

/**
 * Response from site ingestion
 */
export interface IngestSiteResponse {
    site_id: string;
    entities_extracted: number;
    embeddings_generated: number;
    resolution?: ResolveActorResponse;
}

/**
 * Repository interfaces
 */
export interface Repositories {
    siteRepository: SiteRepository;
    entityRepository: EntityRepository;
    clusterRepository: ClusterRepository;
    embeddingRepository: EmbeddingRepository;
    resolutionRunRepository: ResolutionRunRepository;
}

/**
 * ResolutionEngine - Main orchestrator service
 */
export class ResolutionEngine {
    private extractor: EntityExtractor;
    private normalizer: EntityNormalizer;
    private embeddingService: EmbeddingService;
    private scorer: SimilarityScorer;
    private resolver: ClusterResolver;
    private repositories: Repositories;

    constructor(
        extractor: EntityExtractor,
        normalizer: EntityNormalizer,
        embeddingService: EmbeddingService,
        scorer: SimilarityScorer,
        resolver: ClusterResolver,
        repositories: Repositories
    ) {
        this.extractor = extractor;
        this.normalizer = normalizer;
        this.embeddingService = embeddingService;
        this.scorer = scorer;
        this.resolver = resolver;
        this.repositories = repositories;
    }

    /**
     * Extract and normalize entities from text
     */
    async extractAndNormalize(
        text: string,
        entitiesHint?: {
            emails?: string[];
            phones?: string[];
            handles?: Array<{ type: string; value: string }>;
        },
        useLLM: boolean = false
    ): Promise<NormalizedEntities> {
        const startTime = Date.now();

        logger.info(
            { textLength: text.length, hasHint: !!entitiesHint, useLLM },
            'Starting entity extraction and normalization'
        );

        try {
            // Extract entities from text
            let extracted: ExtractedEntities;
            try {
                extracted = await this.extractor.extract(text, useLLM);
            } catch (error) {
                logger.warn({ error }, 'Entity extraction failed, using empty result');
                extracted = {
                    emails: [],
                    phones: [],
                    handles: [],
                    wallets: [],
                    raw_extraction_time_ms: 0,
                };
            }

            // Merge with hints (deduplicate)
            const allEmails = new Set([
                ...extracted.emails,
                ...(entitiesHint?.emails || []),
            ]);
            const allPhones = new Set([
                ...extracted.phones,
                ...(entitiesHint?.phones || []),
            ]);

            // Merge handles
            const handleMap = new Map<string, { type: string; value: string }>();
            for (const h of extracted.handles) {
                handleMap.set(`${h.type}:${h.value.toLowerCase()}`, h);
            }
            for (const h of entitiesHint?.handles || []) {
                handleMap.set(`${h.type}:${h.value.toLowerCase()}`, h);
            }

            // Normalize all entities and deduplicate after normalization
            const normalizedEmailSet = new Set<string>();
            for (const e of allEmails) {
                const normalized = this.normalizer.normalizeEmail(e);
                if (normalized.length > 0) {
                    normalizedEmailSet.add(normalized);
                }
            }
            const normalizedEmails = Array.from(normalizedEmailSet);

            const normalizedPhoneSet = new Set<string>();
            for (const p of allPhones) {
                const normalized = this.normalizer.normalizePhone(p);
                if (normalized.length > 0) {
                    normalizedPhoneSet.add(normalized);
                }
            }
            const normalizedPhones = Array.from(normalizedPhoneSet);

            const normalizedHandles = Array.from(handleMap.values()).map(h => ({
                type: h.type,
                value: this.normalizer.normalizeHandle(h.value),
            })).filter(h => h.value.length > 0);

            const normalizedWallets = extracted.wallets.map(w => ({
                type: w.type,
                value: this.normalizer.normalizeWallet(w.value),
            })).filter(w => w.value.length > 0);

            const result: NormalizedEntities = {
                emails: normalizedEmails,
                phones: normalizedPhones,
                handles: normalizedHandles,
                wallets: normalizedWallets,
            };

            logger.info(
                {
                    emailCount: result.emails.length,
                    phoneCount: result.phones.length,
                    handleCount: result.handles.length,
                    walletCount: result.wallets.length,
                    durationMs: Date.now() - startTime,
                },
                'Entity extraction and normalization complete'
            );

            return result;
        } catch (error) {
            logger.error({ error }, 'Error during extraction and normalization');
            return {
                emails: [],
                phones: [],
                handles: [],
                wallets: [],
            };
        }
    }

    /**
     * Resolve an actor to a cluster
     */
    async resolve(request: ResolveActorRequest): Promise<ResolveActorResponse> {
        const startTime = Date.now();
        const runId = generateId();

        logger.info(
            { runId, url: request.url, domain: request.domain },
            'Starting actor resolution'
        );

        try {
            // Extract and normalize entities
            const normalizedEntities = await this.extractAndNormalize(
                request.page_text || '',
                request.entities_hint,
                request.use_llm
            );

            // Build input entities for resolution
            const inputEntities = this.buildInputEntities(normalizedEntities);

            // Query historical data
            const historicalSites = await this.getHistoricalSites();

            // Resolve to cluster
            const clusterResult = await this.resolver.resolveCluster(
                inputEntities,
                request.page_text || null,
                historicalSites,
                this.scorer,
                this.embeddingService
            );

            const executionTime = Date.now() - startTime;

            // Create resolution run record
            await this.createResolutionRun(
                runId,
                request,
                normalizedEntities,
                clusterResult,
                executionTime
            );

            const response: ResolveActorResponse = {
                run_id: runId,
                matched_cluster_id: clusterResult.matched_cluster_id,
                confidence: clusterResult.confidence,
                matching_signals: clusterResult.matching_signals,
                related_domains: clusterResult.related_domains,
                related_entities: clusterResult.related_entities,
                explanation: clusterResult.explanation,
                extracted_entities: normalizedEntities,
                execution_time_ms: executionTime,
            };

            logger.info(
                {
                    runId,
                    matchedClusterId: clusterResult.matched_cluster_id,
                    confidence: clusterResult.confidence,
                    signalCount: clusterResult.matching_signals.length,
                    executionTimeMs: executionTime,
                },
                'Actor resolution complete'
            );

            return response;
        } catch (error) {
            const executionTime = Date.now() - startTime;

            logger.error(
                { runId, error, executionTimeMs: executionTime },
                'Actor resolution failed'
            );

            // Create error resolution run record
            await this.createErrorResolutionRun(runId, request, error, executionTime);

            // Return graceful error response
            return {
                run_id: runId,
                matched_cluster_id: null,
                confidence: 0,
                matching_signals: [],
                related_domains: [],
                related_entities: [],
                explanation: `Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                extracted_entities: { emails: [], phones: [], handles: [], wallets: [] },
                execution_time_ms: executionTime,
            };
        }
    }

    /**
     * Ingest a new site
     */
    async ingestSite(request: IngestSiteRequest): Promise<IngestSiteResponse> {
        const startTime = Date.now();

        logger.info(
            { url: request.url, domain: request.domain, attemptResolve: request.attempt_resolve },
            'Starting site ingestion'
        );

        try {
            // Create site record
            const siteId = await this.repositories.siteRepository.create({
                domain: request.domain,
                url: request.url,
                page_text: request.page_text || null,
                screenshot_hash: request.screenshot_hash || null,
                first_seen_at: new Date(),
            });

            logger.info({ siteId }, 'Site record created');

            // Extract and normalize entities
            const normalizedEntities = await this.extractAndNormalize(
                request.page_text || '',
                request.entities_hint,
                request.use_llm
            );

            // Store entities
            let entitiesExtracted = 0;

            for (const email of normalizedEntities.emails) {
                await this.repositories.entityRepository.create({
                    site_id: siteId,
                    type: 'email',
                    value: email,
                    normalized_value: email,
                    confidence: 1.0,
                });
                entitiesExtracted++;
            }

            for (const phone of normalizedEntities.phones) {
                await this.repositories.entityRepository.create({
                    site_id: siteId,
                    type: 'phone',
                    value: phone,
                    normalized_value: phone,
                    confidence: 1.0,
                });
                entitiesExtracted++;
            }

            for (const handle of normalizedEntities.handles) {
                await this.repositories.entityRepository.create({
                    site_id: siteId,
                    type: 'handle',
                    value: `${handle.type}:${handle.value}`,
                    normalized_value: handle.value,
                    confidence: 0.9,
                });
                entitiesExtracted++;
            }

            for (const wallet of normalizedEntities.wallets) {
                await this.repositories.entityRepository.create({
                    site_id: siteId,
                    type: 'wallet',
                    value: `${wallet.type}:${wallet.value}`,
                    normalized_value: wallet.value,
                    confidence: 1.0,
                });
                entitiesExtracted++;
            }

            logger.info({ siteId, entitiesExtracted }, 'Entities stored');

            // Generate embeddings for page text
            let embeddingsGenerated = 0;
            if (request.page_text && request.page_text.length > 50) {
                try {
                    await this.embeddingService.storeEmbedding(
                        siteId,
                        'site_page_text',
                        request.page_text,
                        this.repositories.embeddingRepository
                    );
                    embeddingsGenerated++;
                    logger.info({ siteId }, 'Embedding generated and stored');
                } catch (error) {
                    logger.warn({ siteId, error }, 'Failed to generate embedding');
                }
            }

            // Attempt resolution if requested
            let resolution: ResolveActorResponse | undefined;
            if (request.attempt_resolve) {
                resolution = await this.resolve({
                    url: request.url,
                    domain: request.domain,
                    page_text: request.page_text,
                    entities_hint: request.entities_hint,
                    use_llm: request.use_llm,
                });

                // If matched, update site with cluster
                if (resolution.matched_cluster_id) {
                    await this.repositories.siteRepository.update(siteId, {
                        // Note: cluster_id field would need to be added to Site model
                        // For now, this is handled through the resolution run
                    });
                }
            }

            const response: IngestSiteResponse = {
                site_id: siteId,
                entities_extracted: entitiesExtracted,
                embeddings_generated: embeddingsGenerated,
                resolution,
            };

            logger.info(
                {
                    siteId,
                    entitiesExtracted,
                    embeddingsGenerated,
                    hasResolution: !!resolution,
                    durationMs: Date.now() - startTime,
                },
                'Site ingestion complete'
            );

            return response;
        } catch (error) {
            logger.error({ url: request.url, error }, 'Site ingestion failed');
            throw error;
        }
    }

    /**
     * Build input entities for resolution
     */
    private buildInputEntities(
        normalized: NormalizedEntities
    ): Array<{ type: EntityType; value: string }> {
        const entities: Array<{ type: EntityType; value: string }> = [];

        for (const email of normalized.emails) {
            entities.push({ type: 'email', value: email });
        }

        for (const phone of normalized.phones) {
            entities.push({ type: 'phone', value: phone });
        }

        for (const handle of normalized.handles) {
            entities.push({ type: 'handle', value: handle.value });
        }

        for (const wallet of normalized.wallets) {
            entities.push({ type: 'wallet', value: wallet.value });
        }

        return entities;
    }

    /**
     * Get historical site data for resolution
     */
    private async getHistoricalSites(): Promise<HistoricalSiteData[]> {
        try {
            const sites = await this.repositories.siteRepository.findAll();
            const historicalSites: HistoricalSiteData[] = [];

            for (const site of sites) {
                // Get entities for this site
                const entities = await this.repositories.entityRepository.findBySiteId(site.id);

                // Get embeddings for this site (simplified - would need vector data)
                // For now, we'll return empty embeddings as the repository doesn't expose vectors

                historicalSites.push({
                    site_id: site.id,
                    cluster_id: null, // Would come from cluster membership
                    domain: site.domain,
                    entities: entities.map(e => ({
                        id: e.id,
                        type: e.type,
                        value: e.normalized_value || e.value,
                    })),
                    embeddings: [], // Would need to fetch from embedding repository
                });
            }

            return historicalSites;
        } catch (error) {
            logger.warn({ error }, 'Failed to fetch historical sites');
            return [];
        }
    }

    /**
     * Create a resolution run record
     */
    private async createResolutionRun(
        runId: string,
        request: ResolveActorRequest,
        entities: NormalizedEntities,
        result: ClusterMatchResult,
        executionTimeMs: number
    ): Promise<void> {
        try {
            await this.repositories.resolutionRunRepository.create({
                input_url: request.url,
                input_domain: request.domain || null,
                input_entities: entities as unknown as Record<string, unknown>,
                result_cluster_id: result.matched_cluster_id,
                result_confidence: result.confidence,
                explanation: result.explanation,
                matching_signals: result.matching_signals,
                execution_time_ms: executionTimeMs,
            });
        } catch (error) {
            logger.warn({ runId, error }, 'Failed to create resolution run record');
        }
    }

    /**
     * Create an error resolution run record
     */
    private async createErrorResolutionRun(
        runId: string,
        request: ResolveActorRequest,
        error: unknown,
        executionTimeMs: number
    ): Promise<void> {
        try {
            await this.repositories.resolutionRunRepository.create({
                input_url: request.url,
                input_domain: request.domain || null,
                input_entities: {} as Record<string, unknown>,
                result_cluster_id: null,
                result_confidence: 0,
                explanation: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                matching_signals: [],
                execution_time_ms: executionTimeMs,
            });
        } catch (createError) {
            logger.warn(
                { runId, originalError: error, createError },
                'Failed to create error resolution run record'
            );
        }
    }
}

export default ResolutionEngine;
