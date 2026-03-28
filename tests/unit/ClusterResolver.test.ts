/**
 * Unit tests for ClusterResolver service
 */

import {
    ClusterResolver,
    UnionFind,
    ConfidenceTracker,
    type ClusterMatchResult,
    type HistoricalSiteData,
    type EntityType
} from '../../src/service/ClusterResolver';
import { SimilarityScorer } from '../../src/service/SimilarityScorer';
import { EmbeddingService } from '../../src/service/EmbeddingService';

// Mock the logger
jest.mock('../../src/util/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock EmbeddingService
jest.mock('../../src/service/EmbeddingService');

describe('UnionFind', () => {
    let uf: UnionFind;

    beforeEach(() => {
        uf = new UnionFind();
    });

    describe('find', () => {
        it('should return element itself for new element', () => {
            expect(uf.find('a')).toBe('a');
        });

        it('should return root after union', () => {
            uf.union('a', 'b');
            const rootA = uf.find('a');
            const rootB = uf.find('b');
            expect(rootA).toBe(rootB);
        });

        it('should apply path compression', () => {
            // Create chain: a -> b -> c -> d
            uf.union('a', 'b');
            uf.union('b', 'c');
            uf.union('c', 'd');

            // After finding, all should point to same root
            const root = uf.find('a');
            expect(uf.find('b')).toBe(root);
            expect(uf.find('c')).toBe(root);
            expect(uf.find('d')).toBe(root);
        });
    });

    describe('union', () => {
        it('should return false when merging disjoint sets', () => {
            const result = uf.union('a', 'b');
            expect(result).toBe(false);
        });

        it('should return true when elements already connected', () => {
            uf.union('a', 'b');
            const result = uf.union('a', 'b');
            expect(result).toBe(true);
        });

        it('should connect transitive elements', () => {
            uf.union('a', 'b');
            uf.union('b', 'c');
            expect(uf.find('a')).toBe(uf.find('c'));
        });

        it('should handle multiple independent unions', () => {
            uf.union('a', 'b');
            uf.union('c', 'd');

            expect(uf.connected('a', 'b')).toBe(true);
            expect(uf.connected('c', 'd')).toBe(true);
            expect(uf.connected('a', 'c')).toBe(false);
        });
    });

    describe('connected', () => {
        it('should return true for same element', () => {
            expect(uf.connected('a', 'a')).toBe(true);
        });

        it('should return true after union', () => {
            uf.union('a', 'b');
            expect(uf.connected('a', 'b')).toBe(true);
        });

        it('should return false for disconnected elements', () => {
            expect(uf.connected('a', 'b')).toBe(false);
        });

        it('should work with transitive connections', () => {
            uf.union('a', 'b');
            uf.union('b', 'c');
            expect(uf.connected('a', 'c')).toBe(true);
        });
    });

    describe('getRoots', () => {
        it('should return empty array for empty union-find', () => {
            expect(uf.getRoots()).toEqual([]);
        });

        it('should return single root for connected elements', () => {
            uf.union('a', 'b');
            uf.union('b', 'c');
            expect(uf.getRoots().length).toBe(1);
        });

        it('should return multiple roots for disconnected sets', () => {
            uf.union('a', 'b');
            uf.union('c', 'd');
            expect(uf.getRoots().length).toBe(2);
        });
    });

    describe('getMembers', () => {
        it('should return all connected members', () => {
            uf.union('a', 'b');
            uf.union('b', 'c');

            const members = uf.getMembers('a');
            expect(members).toContain('a');
            expect(members).toContain('b');
            expect(members).toContain('c');
            expect(members.length).toBe(3);
        });
    });

    describe('getSize', () => {
        it('should return correct size', () => {
            uf.union('a', 'b');
            uf.union('b', 'c');
            expect(uf.getSize('a')).toBe(3);
        });

        it('should return 1 for single element', () => {
            uf.find('x'); // Initialize x
            expect(uf.getSize('x')).toBe(1);
        });
    });

    describe('clear', () => {
        it('should reset all data', () => {
            uf.union('a', 'b');
            uf.clear();
            expect(uf.connected('a', 'b')).toBe(false);
        });
    });
});

describe('ConfidenceTracker', () => {
    let tracker: ConfidenceTracker;

    beforeEach(() => {
        tracker = new ConfidenceTracker();
    });

    describe('addSignal', () => {
        it('should accumulate signals', () => {
            tracker.addSignal('exact_email', 1.0);
            tracker.addSignal('fuzzy_phone', 0.95);

            expect(tracker.signals).toContain('exact_email');
            expect(tracker.signals).toContain('fuzzy_phone');
            expect(tracker.count).toBe(2);
        });
    });

    describe('getAggregate', () => {
        it('should return 0 confidence for no signals', () => {
            const result = tracker.getAggregate();
            expect(result.confidence).toBe(0);
            expect(result.signals).toEqual([]);
        });

        it('should return exact score for single signal', () => {
            tracker.addSignal('exact_email', 1.0);
            const result = tracker.getAggregate();
            expect(result.confidence).toBe(1.0);
            expect(result.signals).toEqual(['exact_email']);
        });

        it('should calculate weighted mean for multiple signals', () => {
            tracker.addSignal('exact_email', 1.0); // weight 1.0
            tracker.addSignal('domain_match', 0.75); // weight 0.5

            const result = tracker.getAggregate();
            // Weighted mean: (1.0*1.0 + 0.75*0.5) / (1.0 + 0.5) = 1.375 / 1.5 ≈ 0.917
            expect(result.confidence).toBeCloseTo(0.917, 2);
        });

        it('should return unique signals', () => {
            tracker.addSignal('exact_email', 1.0);
            tracker.addSignal('exact_email', 0.95);

            const result = tracker.getAggregate();
            expect(result.signals).toEqual(['exact_email']);
        });
    });

    describe('clear', () => {
        it('should reset tracker', () => {
            tracker.addSignal('exact_email', 1.0);
            tracker.clear();

            expect(tracker.count).toBe(0);
            expect(tracker.getAggregate().confidence).toBe(0);
        });
    });
});

describe('ClusterResolver', () => {
    let resolver: ClusterResolver;
    let mockScorer: jest.Mocked<SimilarityScorer>;
    let mockEmbeddingService: jest.Mocked<EmbeddingService>;

    beforeEach(() => {
        resolver = new ClusterResolver();

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

        // Create mock embedding service
        mockEmbeddingService = {
            embed: jest.fn(),
            embedBatch: jest.fn(),
            storeEmbedding: jest.fn(),
            clearCache: jest.fn(),
        } as unknown as jest.Mocked<EmbeddingService>;
    });

    describe('resolveCluster', () => {
        describe('empty inputs', () => {
            it('should return null for empty input entities and no text', async () => {
                const result = await resolver.resolveCluster(
                    [],
                    null,
                    [],
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.matched_cluster_id).toBeNull();
                expect(result.confidence).toBe(0);
                expect(result.matching_signals).toEqual([]);
            });

            it('should return null when no historical data', async () => {
                const inputEntities = [{ type: 'email' as EntityType, value: 'test@example.com' }];

                const result = await resolver.resolveCluster(
                    inputEntities,
                    null,
                    [],
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.matched_cluster_id).toBeNull();
            });
        });

        describe('entity matching', () => {
            it('should match cluster with exact email match', async () => {
                const inputEntities = [{ type: 'email' as EntityType, value: 'scammer@fake.com' }];

                const historicalSites: HistoricalSiteData[] = [{
                    site_id: 'site-1',
                    cluster_id: 'cluster-1',
                    domain: 'fake-store.com',
                    entities: [{ id: 'e1', type: 'email', value: 'scammer@fake.com' }],
                    embeddings: [],
                }];

                mockScorer.scoreEntityMatch.mockReturnValue({
                    score: 1.0,
                    reason: 'exact_match',
                    signal: 'shared_email',
                });

                const result = await resolver.resolveCluster(
                    inputEntities,
                    null,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.matched_cluster_id).toBe('cluster-1');
                expect(result.confidence).toBeGreaterThanOrEqual(0.6);
                expect(result.matching_signals).toContain('exact_email');
            });

            it('should match cluster with exact phone match', async () => {
                const inputEntities = [{ type: 'phone' as EntityType, value: '+12061234567' }];

                const historicalSites: HistoricalSiteData[] = [{
                    site_id: 'site-1',
                    cluster_id: 'cluster-1',
                    domain: 'scam-site.com',
                    entities: [{ id: 'e1', type: 'phone', value: '+12061234567' }],
                    embeddings: [],
                }];

                mockScorer.scoreEntityMatch.mockReturnValue({
                    score: 1.0,
                    reason: 'exact_match',
                    signal: 'shared_phone',
                });

                const result = await resolver.resolveCluster(
                    inputEntities,
                    null,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.matched_cluster_id).toBe('cluster-1');
                expect(result.matching_signals).toContain('exact_phone');
            });

            it('should return null when no matches above threshold', async () => {
                const inputEntities = [{ type: 'email' as EntityType, value: 'new@example.com' }];

                const historicalSites: HistoricalSiteData[] = [{
                    site_id: 'site-1',
                    cluster_id: 'cluster-1',
                    domain: 'other-site.com',
                    entities: [{ id: 'e1', type: 'email', value: 'different@other.com' }],
                    embeddings: [],
                }];

                mockScorer.scoreEntityMatch.mockReturnValue({
                    score: 0.0,
                    reason: 'no_match',
                    signal: '',
                });

                const result = await resolver.resolveCluster(
                    inputEntities,
                    null,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.matched_cluster_id).toBeNull();
                expect(result.confidence).toBe(0);
            });

            it('should handle fuzzy phone match', async () => {
                const inputEntities = [{ type: 'phone' as EntityType, value: '+12061234568' }];

                const historicalSites: HistoricalSiteData[] = [{
                    site_id: 'site-1',
                    cluster_id: 'cluster-1',
                    domain: 'scam-site.com',
                    entities: [{ id: 'e1', type: 'phone', value: '+12061234567' }],
                    embeddings: [],
                }];

                mockScorer.scoreEntityMatch.mockReturnValue({
                    score: 0.95,
                    reason: 'fuzzy_match',
                    signal: 'similar_phone',
                });

                const result = await resolver.resolveCluster(
                    inputEntities,
                    null,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.matched_cluster_id).toBe('cluster-1');
                expect(result.matching_signals).toContain('fuzzy_phone');
            });
        });

        describe('text similarity', () => {
            it('should include similar_policy_text signal for high text similarity', async () => {
                const inputEntities: Array<{ type: EntityType; value: string }> = [];
                const inputText = 'We ship worldwide with tracking numbers provided.';

                const historicalSites: HistoricalSiteData[] = [{
                    site_id: 'site-1',
                    cluster_id: 'cluster-1',
                    domain: 'fake-store.com',
                    entities: [],
                    embeddings: [[0.1, 0.2, 0.3]], // Mock embedding
                }];

                // Mock embedding service to return similar vector
                mockEmbeddingService.embed.mockResolvedValue([0.1, 0.2, 0.3]);

                // Mock cosine similarity to return high score
                mockScorer.cosineSimilarity.mockReturnValue(0.85);

                const result = await resolver.resolveCluster(
                    inputEntities,
                    inputText,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.matching_signals).toContain('similar_policy_text');
            });

            it('should not match on low text similarity', async () => {
                const inputEntities: Array<{ type: EntityType; value: string }> = [];
                const inputText = 'Completely different text';

                const historicalSites: HistoricalSiteData[] = [{
                    site_id: 'site-1',
                    cluster_id: 'cluster-1',
                    domain: 'site.com',
                    entities: [],
                    embeddings: [[0.9, 0.8, 0.7]],
                }];

                mockEmbeddingService.embed.mockResolvedValue([0.1, 0.2, 0.3]);
                mockScorer.cosineSimilarity.mockReturnValue(0.3); // Low similarity

                const result = await resolver.resolveCluster(
                    inputEntities,
                    inputText,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.matched_cluster_id).toBeNull();
            });
        });

        describe('confidence aggregation', () => {
            it('should aggregate multiple signals', async () => {
                const inputEntities = [
                    { type: 'email' as EntityType, value: 'scammer@fake.com' },
                    { type: 'phone' as EntityType, value: '+12061234567' },
                ];

                const historicalSites: HistoricalSiteData[] = [{
                    site_id: 'site-1',
                    cluster_id: 'cluster-1',
                    domain: 'fake-store.com',
                    entities: [
                        { id: 'e1', type: 'email', value: 'scammer@fake.com' },
                        { id: 'e2', type: 'phone', value: '+12061234567' },
                    ],
                    embeddings: [],
                }];

                mockScorer.scoreEntityMatch.mockReturnValue({
                    score: 1.0,
                    reason: 'exact_match',
                    signal: 'shared_entity',
                });

                const result = await resolver.resolveCluster(
                    inputEntities,
                    null,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.matched_cluster_id).toBe('cluster-1');
                expect(result.confidence).toBeGreaterThanOrEqual(0.9);
                expect(result.matching_signals.length).toBeGreaterThanOrEqual(2);
            });

            it('should calculate correct mean confidence', async () => {
                const inputEntities = [
                    { type: 'email' as EntityType, value: 'test@fake.com' },
                ];

                const historicalSites: HistoricalSiteData[] = [{
                    site_id: 'site-1',
                    cluster_id: 'cluster-1',
                    domain: 'fake-store.com',
                    entities: [
                        { id: 'e1', type: 'email', value: 'test@fake.com' },
                    ],
                    embeddings: [],
                }];

                // Return exact match
                mockScorer.scoreEntityMatch.mockReturnValue({
                    score: 0.9,
                    reason: 'exact_match',
                    signal: 'shared_email',
                });

                const result = await resolver.resolveCluster(
                    inputEntities,
                    null,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.confidence).toBeGreaterThanOrEqual(0.6);
            });
        });

        describe('related data', () => {
            it('should return related domains from cluster', async () => {
                const inputEntities = [{ type: 'phone' as EntityType, value: '+12061234567' }];

                const historicalSites: HistoricalSiteData[] = [
                    {
                        site_id: 'site-1',
                        cluster_id: 'cluster-1',
                        domain: 'fake-store-1.com',
                        entities: [{ id: 'e1', type: 'phone', value: '+12061234567' }],
                        embeddings: [],
                    },
                    {
                        site_id: 'site-2',
                        cluster_id: 'cluster-1',
                        domain: 'fake-store-2.com',
                        entities: [{ id: 'e2', type: 'phone', value: '+12061234567' }],
                        embeddings: [],
                    },
                ];

                mockScorer.scoreEntityMatch.mockReturnValue({
                    score: 1.0,
                    reason: 'exact_match',
                    signal: 'shared_phone',
                });

                const result = await resolver.resolveCluster(
                    inputEntities,
                    null,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.related_domains).toContain('fake-store-1.com');
                expect(result.related_domains).toContain('fake-store-2.com');
            });

            it('should return aggregated related entities', async () => {
                const inputEntities = [{ type: 'email' as EntityType, value: 'scam@test.com' }];

                const historicalSites: HistoricalSiteData[] = [{
                    site_id: 'site-1',
                    cluster_id: 'cluster-1',
                    domain: 'fake-store.com',
                    entities: [
                        { id: 'e1', type: 'email', value: 'scam@test.com' },
                        { id: 'e2', type: 'phone', value: '+12061234567' },
                    ],
                    embeddings: [],
                }];

                mockScorer.scoreEntityMatch.mockReturnValue({
                    score: 1.0,
                    reason: 'exact_match',
                    signal: 'shared_email',
                });

                const result = await resolver.resolveCluster(
                    inputEntities,
                    null,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.related_entities.length).toBeGreaterThan(0);
                const emailEntity = result.related_entities.find(e => e.type === 'email');
                expect(emailEntity).toBeDefined();
            });
        });

        describe('explanation', () => {
            it('should generate human-readable explanation for match', async () => {
                const inputEntities = [{ type: 'email' as EntityType, value: 'scam@test.com' }];

                const historicalSites: HistoricalSiteData[] = [{
                    site_id: 'site-1',
                    cluster_id: 'cluster-1',
                    domain: 'fake-store.com',
                    entities: [{ id: 'e1', type: 'email', value: 'scam@test.com' }],
                    embeddings: [],
                }];

                mockScorer.scoreEntityMatch.mockReturnValue({
                    score: 1.0,
                    reason: 'exact_match',
                    signal: 'shared_email',
                });

                const result = await resolver.resolveCluster(
                    inputEntities,
                    null,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.explanation).toContain('confidence');
                expect(result.explanation.length).toBeGreaterThan(20);
            });

            it('should generate explanation for no match', async () => {
                const result = await resolver.resolveCluster(
                    [],
                    null,
                    [],
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.explanation).toContain('No matching cluster');
            });
        });

        describe('integration test', () => {
            it('should resolve 3 sites with shared phone to same cluster', async () => {
                const sharedPhone = '+12061234567';
                const inputEntities = [{ type: 'phone' as EntityType, value: sharedPhone }];

                const historicalSites: HistoricalSiteData[] = [
                    {
                        site_id: 'site-1',
                        cluster_id: 'cluster-shared',
                        domain: 'fake1.com',
                        entities: [{ id: 'e1', type: 'phone', value: sharedPhone }],
                        embeddings: [],
                    },
                    {
                        site_id: 'site-2',
                        cluster_id: 'cluster-shared',
                        domain: 'fake2.com',
                        entities: [{ id: 'e2', type: 'phone', value: sharedPhone }],
                        embeddings: [],
                    },
                    {
                        site_id: 'site-3',
                        cluster_id: 'cluster-shared',
                        domain: 'fake3.com',
                        entities: [{ id: 'e3', type: 'phone', value: sharedPhone }],
                        embeddings: [],
                    },
                ];

                mockScorer.scoreEntityMatch.mockReturnValue({
                    score: 1.0,
                    reason: 'exact_match',
                    signal: 'shared_phone',
                });

                const result = await resolver.resolveCluster(
                    inputEntities,
                    null,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.matched_cluster_id).toBe('cluster-shared');
                expect(result.confidence).toBeGreaterThanOrEqual(0.9);
                expect(result.related_domains).toHaveLength(3);
            });

            it('should handle single high-confidence signal', async () => {
                const inputEntities = [{ type: 'wallet' as EntityType, value: '0x1234567890abcdef' }];

                const historicalSites: HistoricalSiteData[] = [{
                    site_id: 'site-1',
                    cluster_id: 'cluster-crypto',
                    domain: 'crypto-scam.com',
                    entities: [{ id: 'e1', type: 'wallet', value: '0x1234567890abcdef' }],
                    embeddings: [],
                }];

                mockScorer.scoreEntityMatch.mockReturnValue({
                    score: 1.0,
                    reason: 'exact_match',
                    signal: 'shared_wallet',
                });

                const result = await resolver.resolveCluster(
                    inputEntities,
                    null,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.matched_cluster_id).toBe('cluster-crypto');
            });

            it('should aggregate multiple low-confidence signals correctly', async () => {
                const inputEntities = [
                    { type: 'email' as EntityType, value: 'user@scam.com' },
                    { type: 'phone' as EntityType, value: '+12061234568' }, // Similar phone
                ];

                const historicalSites: HistoricalSiteData[] = [{
                    site_id: 'site-1',
                    cluster_id: 'cluster-1',
                    domain: 'scam.com',
                    entities: [
                        { id: 'e1', type: 'email', value: 'admin@scam.com' }, // Same domain
                        { id: 'e2', type: 'phone', value: '+12061234567' },
                    ],
                    embeddings: [],
                }];

                // First call for email - domain match
                mockScorer.scoreEntityMatch
                    .mockReturnValueOnce({
                        score: 0.75,
                        reason: 'domain_match',
                        signal: 'same_domain',
                    })
                    // Second call for phone - fuzzy match
                    .mockReturnValueOnce({
                        score: 0.95,
                        reason: 'fuzzy_match',
                        signal: 'similar_phone',
                    });

                const result = await resolver.resolveCluster(
                    inputEntities,
                    null,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                expect(result.matched_cluster_id).toBe('cluster-1');
                expect(result.confidence).toBeGreaterThanOrEqual(0.6);
            });
        });

        describe('error handling', () => {
            it('should handle embedding service failure gracefully', async () => {
                const inputEntities: Array<{ type: EntityType; value: string }> = [];
                const inputText = 'Some text';

                const historicalSites: HistoricalSiteData[] = [{
                    site_id: 'site-1',
                    cluster_id: 'cluster-1',
                    domain: 'site.com',
                    entities: [],
                    embeddings: [[0.1, 0.2, 0.3]],
                }];

                mockEmbeddingService.embed.mockRejectedValue(new Error('API error'));

                const result = await resolver.resolveCluster(
                    inputEntities,
                    inputText,
                    historicalSites,
                    mockScorer,
                    mockEmbeddingService
                );

                // Should not throw, should return empty result
                expect(result.matched_cluster_id).toBeNull();
            });
        });
    });

    describe('getUnionFind', () => {
        it('should return the union-find instance', () => {
            const uf = resolver.getUnionFind();
            expect(uf).toBeInstanceOf(UnionFind);
        });
    });
});
