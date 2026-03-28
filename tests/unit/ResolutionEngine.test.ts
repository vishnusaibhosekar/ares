/**
 * Unit and Integration tests for ResolutionEngine service
 */

import {
    ResolutionEngine,
    type NormalizedEntities,
    type ResolveActorRequest,
    type ResolveActorResponse,
    type IngestSiteRequest,
    type IngestSiteResponse,
    type Repositories,
} from '../../src/service/ResolutionEngine';
import { EntityExtractor, type ExtractedEntities } from '../../src/service/EntityExtractor';
import { EntityNormalizer } from '../../src/service/EntityNormalizer';
import { EmbeddingService } from '../../src/service/EmbeddingService';
import { SimilarityScorer } from '../../src/service/SimilarityScorer';
import { ClusterResolver, type ClusterMatchResult } from '../../src/service/ClusterResolver';
import { SiteRepository } from '../../src/repository/SiteRepository';
import { EntityRepository } from '../../src/repository/EntityRepository';
import { ClusterRepository } from '../../src/repository/ClusterRepository';
import { EmbeddingRepository } from '../../src/repository/EmbeddingRepository';
import { ResolutionRunRepository } from '../../src/repository/ResolutionRunRepository';

// Mock the logger
jest.mock('../../src/util/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock uuid generation
jest.mock('../../src/util/random', () => ({
    generateId: jest.fn(() => 'test-uuid-123'),
}));

describe('ResolutionEngine', () => {
    let engine: ResolutionEngine;
    let mockExtractor: jest.Mocked<EntityExtractor>;
    let mockNormalizer: jest.Mocked<EntityNormalizer>;
    let mockEmbeddingService: jest.Mocked<EmbeddingService>;
    let mockScorer: jest.Mocked<SimilarityScorer>;
    let mockResolver: jest.Mocked<ClusterResolver>;
    let mockRepositories: {
        siteRepository: jest.Mocked<SiteRepository>;
        entityRepository: jest.Mocked<EntityRepository>;
        clusterRepository: jest.Mocked<ClusterRepository>;
        embeddingRepository: jest.Mocked<EmbeddingRepository>;
        resolutionRunRepository: jest.Mocked<ResolutionRunRepository>;
    };

    beforeEach(() => {
        // Create mock extractor
        mockExtractor = {
            extract: jest.fn(),
            extractEmails: jest.fn(),
            extractPhones: jest.fn(),
            extractHandles: jest.fn(),
            extractWallets: jest.fn(),
        } as unknown as jest.Mocked<EntityExtractor>;

        // Create mock normalizer
        mockNormalizer = {
            normalizeEmail: jest.fn((e) => e.toLowerCase().trim()),
            normalizePhone: jest.fn((p) => p.replace(/[^\d+]/g, '')),
            normalizeHandle: jest.fn((h) => h.toLowerCase().replace('@', '')),
            normalizeWallet: jest.fn((w) => w.toLowerCase()),
            normalizeEntity: jest.fn(),
        } as unknown as jest.Mocked<EntityNormalizer>;

        // Create mock embedding service
        mockEmbeddingService = {
            embed: jest.fn(),
            embedBatch: jest.fn(),
            storeEmbedding: jest.fn(),
            clearCache: jest.fn(),
        } as unknown as jest.Mocked<EmbeddingService>;

        // Create mock scorer
        mockScorer = {
            scoreEntityMatch: jest.fn(),
            levenshteinDistance: jest.fn(),
            cosineSimilarity: jest.fn(),
            scoreTextSimilarity: jest.fn(),
            scoreEntitySet: jest.fn(),
            findTopKSimilar: jest.fn(),
            areSimilar: jest.fn(),
        } as unknown as jest.Mocked<SimilarityScorer>;

        // Create mock resolver
        mockResolver = {
            resolveCluster: jest.fn(),
            getUnionFind: jest.fn(),
        } as unknown as jest.Mocked<ClusterResolver>;

        // Create mock repositories
        mockRepositories = {
            siteRepository: {
                create: jest.fn(),
                findById: jest.fn(),
                findByDomain: jest.fn(),
                findByUrl: jest.fn(),
                findAll: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            } as unknown as jest.Mocked<SiteRepository>,
            entityRepository: {
                create: jest.fn(),
                findById: jest.fn(),
                findBySiteId: jest.fn(),
                findByNormalizedValue: jest.fn(),
                findByTypeAndValue: jest.fn(),
                findAll: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            } as unknown as jest.Mocked<EntityRepository>,
            clusterRepository: {
                create: jest.fn(),
                findById: jest.fn(),
                findByName: jest.fn(),
                findAll: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            } as unknown as jest.Mocked<ClusterRepository>,
            embeddingRepository: {
                create: jest.fn(),
                findById: jest.fn(),
                findBySourceId: jest.fn(),
                findAll: jest.fn(),
                delete: jest.fn(),
            } as unknown as jest.Mocked<EmbeddingRepository>,
            resolutionRunRepository: {
                create: jest.fn(),
                findById: jest.fn(),
                findByInputDomain: jest.fn(),
                findByClusterId: jest.fn(),
                findAll: jest.fn(),
                delete: jest.fn(),
            } as unknown as jest.Mocked<ResolutionRunRepository>,
        };

        // Create engine instance
        engine = new ResolutionEngine(
            mockExtractor,
            mockNormalizer,
            mockEmbeddingService,
            mockScorer,
            mockResolver,
            mockRepositories
        );
    });

    describe('extractAndNormalize', () => {
        it('should extract and normalize entities from text', async () => {
            const extractedEntities: ExtractedEntities = {
                emails: ['Test@Example.COM'],
                phones: ['(206) 123-4567'],
                handles: [{ type: 'telegram', value: '@TelegramUser' }],
                wallets: [{ type: 'ethereum', value: '0xABCD1234' }],
                raw_extraction_time_ms: 50,
            };

            mockExtractor.extract.mockResolvedValue(extractedEntities);

            const result = await engine.extractAndNormalize('Some text with entities');

            expect(result.emails).toContain('test@example.com');
            expect(result.phones).toContain('2061234567');
            expect(result.handles).toContainEqual(
                expect.objectContaining({ type: 'telegram', value: 'telegramuser' })
            );
            expect(result.wallets).toContainEqual(
                expect.objectContaining({ type: 'ethereum', value: '0xabcd1234' })
            );
        });

        it('should merge extracted entities with hints', async () => {
            const extractedEntities: ExtractedEntities = {
                emails: ['extracted@test.com'],
                phones: [],
                handles: [],
                wallets: [],
                raw_extraction_time_ms: 50,
            };

            mockExtractor.extract.mockResolvedValue(extractedEntities);

            const hints = {
                emails: ['hint@test.com'],
                phones: ['+1-206-555-1234'],
            };

            const result = await engine.extractAndNormalize('text', hints);

            expect(result.emails).toContain('extracted@test.com');
            expect(result.emails).toContain('hint@test.com');
            expect(result.phones.length).toBeGreaterThan(0);
        });

        it('should handle extraction failure gracefully', async () => {
            mockExtractor.extract.mockRejectedValue(new Error('Extraction failed'));

            const result = await engine.extractAndNormalize('Some text');

            expect(result.emails).toEqual([]);
            expect(result.phones).toEqual([]);
            expect(result.handles).toEqual([]);
            expect(result.wallets).toEqual([]);
        });

        it('should deduplicate entities', async () => {
            const extractedEntities: ExtractedEntities = {
                emails: ['test@example.com', 'TEST@EXAMPLE.COM'],
                phones: [],
                handles: [],
                wallets: [],
                raw_extraction_time_ms: 50,
            };

            mockExtractor.extract.mockResolvedValue(extractedEntities);

            const result = await engine.extractAndNormalize('text');

            // After normalization, both should become the same
            expect(result.emails).toEqual(['test@example.com']);
        });
    });

    describe('resolve', () => {
        beforeEach(() => {
            // Setup default mocks
            mockExtractor.extract.mockResolvedValue({
                emails: ['scam@fake.com'],
                phones: ['+12061234567'],
                handles: [],
                wallets: [],
                raw_extraction_time_ms: 50,
            });

            mockRepositories.siteRepository.findAll.mockResolvedValue([]);
            mockRepositories.resolutionRunRepository.create.mockResolvedValue('run-1');
        });

        it('should return matched cluster with high confidence', async () => {
            const clusterResult: ClusterMatchResult = {
                matched_cluster_id: 'cluster-123',
                confidence: 0.95,
                matching_signals: ['exact_email', 'exact_phone'],
                related_domains: ['scam1.com', 'scam2.com'],
                related_entities: [{ type: 'email', value: 'scam@fake.com', count: 3 }],
                explanation: 'Matched with high confidence based on exact email',
            };

            mockResolver.resolveCluster.mockResolvedValue(clusterResult);

            const request: ResolveActorRequest = {
                url: 'https://new-scam.com',
                domain: 'new-scam.com',
                page_text: 'Contact us at scam@fake.com or +12061234567',
            };

            const result = await engine.resolve(request);

            expect(result.matched_cluster_id).toBe('cluster-123');
            expect(result.confidence).toBe(0.95);
            expect(result.matching_signals).toContain('exact_email');
            expect(result.related_domains).toContain('scam1.com');
            expect(result.run_id).toBe('test-uuid-123');
        });

        it('should return null cluster when no match found', async () => {
            const clusterResult: ClusterMatchResult = {
                matched_cluster_id: null,
                confidence: 0,
                matching_signals: [],
                related_domains: [],
                related_entities: [],
                explanation: 'No matching cluster found',
            };

            mockResolver.resolveCluster.mockResolvedValue(clusterResult);

            const request: ResolveActorRequest = {
                url: 'https://new-site.com',
                domain: 'new-site.com',
            };

            const result = await engine.resolve(request);

            expect(result.matched_cluster_id).toBeNull();
            expect(result.confidence).toBe(0);
        });

        it('should create resolution run record', async () => {
            const clusterResult: ClusterMatchResult = {
                matched_cluster_id: 'cluster-1',
                confidence: 0.8,
                matching_signals: ['exact_email'],
                related_domains: ['other.com'],
                related_entities: [],
                explanation: 'Match found',
            };

            mockResolver.resolveCluster.mockResolvedValue(clusterResult);

            const request: ResolveActorRequest = {
                url: 'https://test.com',
            };

            await engine.resolve(request);

            expect(mockRepositories.resolutionRunRepository.create).toHaveBeenCalled();
        });

        it('should handle resolution errors gracefully', async () => {
            mockResolver.resolveCluster.mockRejectedValue(new Error('Resolution failed'));

            const request: ResolveActorRequest = {
                url: 'https://test.com',
            };

            const result = await engine.resolve(request);

            expect(result.matched_cluster_id).toBeNull();
            expect(result.confidence).toBe(0);
            expect(result.explanation).toContain('Resolution failed');
        });

        it('should include extracted entities in response', async () => {
            mockExtractor.extract.mockResolvedValue({
                emails: ['found@email.com'],
                phones: [],
                handles: [],
                wallets: [],
                raw_extraction_time_ms: 50,
            });

            const clusterResult: ClusterMatchResult = {
                matched_cluster_id: null,
                confidence: 0,
                matching_signals: [],
                related_domains: [],
                related_entities: [],
                explanation: 'No match',
            };

            mockResolver.resolveCluster.mockResolvedValue(clusterResult);

            const request: ResolveActorRequest = {
                url: 'https://test.com',
                page_text: 'Contact found@email.com',
            };

            const result = await engine.resolve(request);

            expect(result.extracted_entities.emails).toContain('found@email.com');
        });

        it('should use LLM extraction when requested', async () => {
            mockExtractor.extract.mockResolvedValue({
                emails: [],
                phones: [],
                handles: [],
                wallets: [],
                raw_extraction_time_ms: 100,
            });

            const clusterResult: ClusterMatchResult = {
                matched_cluster_id: null,
                confidence: 0,
                matching_signals: [],
                related_domains: [],
                related_entities: [],
                explanation: 'No match',
            };

            mockResolver.resolveCluster.mockResolvedValue(clusterResult);

            const request: ResolveActorRequest = {
                url: 'https://test.com',
                page_text: 'Some text',
                use_llm: true,
            };

            await engine.resolve(request);

            expect(mockExtractor.extract).toHaveBeenCalledWith('Some text', true);
        });
    });

    describe('ingestSite', () => {
        beforeEach(() => {
            mockRepositories.siteRepository.create.mockResolvedValue('site-123');
            mockRepositories.entityRepository.create.mockResolvedValue('entity-1');
            mockRepositories.embeddingRepository.create.mockResolvedValue('emb-1');
            mockEmbeddingService.storeEmbedding.mockResolvedValue('emb-1');

            mockExtractor.extract.mockResolvedValue({
                emails: ['shop@store.com'],
                phones: [],
                handles: [],
                wallets: [],
                raw_extraction_time_ms: 50,
            });
        });

        it('should create site and extract entities', async () => {
            const request: IngestSiteRequest = {
                url: 'https://store.com/about',
                domain: 'store.com',
                page_text: 'Contact us at shop@store.com',
            };

            const result = await engine.ingestSite(request);

            expect(result.site_id).toBe('site-123');
            expect(result.entities_extracted).toBeGreaterThan(0);
            expect(mockRepositories.siteRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    domain: 'store.com',
                    url: 'https://store.com/about',
                })
            );
        });

        it('should store entities in repository', async () => {
            const request: IngestSiteRequest = {
                url: 'https://store.com',
                domain: 'store.com',
                page_text: 'shop@store.com',
            };

            await engine.ingestSite(request);

            expect(mockRepositories.entityRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    site_id: 'site-123',
                    type: 'email',
                })
            );
        });

        it('should generate embeddings for page text', async () => {
            const request: IngestSiteRequest = {
                url: 'https://store.com',
                domain: 'store.com',
                page_text: 'This is a longer text that should trigger embedding generation for the site.',
            };

            const result = await engine.ingestSite(request);

            expect(result.embeddings_generated).toBe(1);
            expect(mockEmbeddingService.storeEmbedding).toHaveBeenCalled();
        });

        it('should not generate embeddings for short text', async () => {
            const request: IngestSiteRequest = {
                url: 'https://store.com',
                domain: 'store.com',
                page_text: 'Short',
            };

            const result = await engine.ingestSite(request);

            expect(result.embeddings_generated).toBe(0);
        });

        it('should attempt resolution when requested', async () => {
            const clusterResult: ClusterMatchResult = {
                matched_cluster_id: 'cluster-1',
                confidence: 0.8,
                matching_signals: ['exact_email'],
                related_domains: [],
                related_entities: [],
                explanation: 'Match found',
            };

            mockResolver.resolveCluster.mockResolvedValue(clusterResult);
            mockRepositories.siteRepository.findAll.mockResolvedValue([]);
            mockRepositories.resolutionRunRepository.create.mockResolvedValue('run-1');

            const request: IngestSiteRequest = {
                url: 'https://store.com',
                domain: 'store.com',
                page_text: 'Contact shop@store.com',
                attempt_resolve: true,
            };

            const result = await engine.ingestSite(request);

            expect(result.resolution).toBeDefined();
            expect(result.resolution?.matched_cluster_id).toBe('cluster-1');
        });

        it('should not attempt resolution when not requested', async () => {
            const request: IngestSiteRequest = {
                url: 'https://store.com',
                domain: 'store.com',
                attempt_resolve: false,
            };

            const result = await engine.ingestSite(request);

            expect(result.resolution).toBeUndefined();
        });

        it('should handle embedding failure gracefully', async () => {
            mockEmbeddingService.storeEmbedding.mockRejectedValue(
                new Error('Embedding API error')
            );

            const request: IngestSiteRequest = {
                url: 'https://store.com',
                domain: 'store.com',
                page_text: 'This is enough text to trigger embedding generation attempt',
            };

            const result = await engine.ingestSite(request);

            // Should not throw, just have 0 embeddings
            expect(result.embeddings_generated).toBe(0);
        });
    });

    describe('integration scenarios', () => {
        it('full flow: ingest → resolve → match', async () => {
            // Setup historical site
            mockRepositories.siteRepository.findAll.mockResolvedValue([
                {
                    id: 'site-1',
                    domain: 'scam1.com',
                    url: 'https://scam1.com',
                    page_text: 'Contact scam@evil.com',
                    screenshot_hash: null,
                    first_seen_at: new Date(),
                    created_at: new Date(),
                } as never,
            ]);

            mockRepositories.entityRepository.findBySiteId.mockResolvedValue([
                {
                    id: 'e-1',
                    site_id: 'site-1',
                    type: 'email',
                    value: 'scam@evil.com',
                    normalized_value: 'scam@evil.com',
                    confidence: 1.0,
                    created_at: new Date(),
                } as never,
            ]);

            // New site with same email
            mockExtractor.extract.mockResolvedValue({
                emails: ['scam@evil.com'],
                phones: [],
                handles: [],
                wallets: [],
                raw_extraction_time_ms: 50,
            });

            const clusterResult: ClusterMatchResult = {
                matched_cluster_id: 'cluster-scam',
                confidence: 1.0,
                matching_signals: ['exact_email'],
                related_domains: ['scam1.com'],
                related_entities: [{ type: 'email', value: 'scam@evil.com', count: 2 }],
                explanation: 'Matched based on exact email match',
            };

            mockResolver.resolveCluster.mockResolvedValue(clusterResult);
            mockRepositories.resolutionRunRepository.create.mockResolvedValue('run-1');

            const request: ResolveActorRequest = {
                url: 'https://scam2.com',
                domain: 'scam2.com',
                page_text: 'Buy now! Contact scam@evil.com',
            };

            const result = await engine.resolve(request);

            expect(result.matched_cluster_id).toBe('cluster-scam');
            expect(result.confidence).toBe(1.0);
            expect(result.matching_signals).toContain('exact_email');
            expect(result.related_domains).toContain('scam1.com');
        });

        it('should call services in correct order', async () => {
            const callOrder: string[] = [];

            mockExtractor.extract.mockImplementation(async () => {
                callOrder.push('extract');
                return { emails: [], phones: [], handles: [], wallets: [], raw_extraction_time_ms: 0 };
            });

            mockRepositories.siteRepository.findAll.mockImplementation(async () => {
                callOrder.push('findAllSites');
                return [];
            });

            mockResolver.resolveCluster.mockImplementation(async () => {
                callOrder.push('resolveCluster');
                return {
                    matched_cluster_id: null,
                    confidence: 0,
                    matching_signals: [],
                    related_domains: [],
                    related_entities: [],
                    explanation: 'No match',
                };
            });

            mockRepositories.resolutionRunRepository.create.mockImplementation(async () => {
                callOrder.push('createRun');
                return 'run-1';
            });

            await engine.resolve({ url: 'https://test.com' });

            expect(callOrder[0]).toBe('extract');
            expect(callOrder).toContain('findAllSites');
            expect(callOrder).toContain('resolveCluster');
            expect(callOrder).toContain('createRun');
        });
    });
});
