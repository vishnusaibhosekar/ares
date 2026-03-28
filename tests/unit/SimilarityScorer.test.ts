// tests/unit/SimilarityScorer.test.ts
// Unit tests for SimilarityScorer service

import { SimilarityScorer } from '../../src/service/SimilarityScorer';
import { EmbeddingService } from '../../src/service/EmbeddingService';

// Mock EmbeddingService
jest.mock('../../src/service/EmbeddingService');

describe('SimilarityScorer', () => {
    let scorer: SimilarityScorer;
    let mockEmbeddingService: jest.Mocked<EmbeddingService>;

    beforeEach(() => {
        mockEmbeddingService = new EmbeddingService() as jest.Mocked<EmbeddingService>;
        scorer = new SimilarityScorer(mockEmbeddingService);
        jest.clearAllMocks();
    });

    describe('scoreEntityMatch', () => {
        describe('exact matches', () => {
            it('should return 1.0 for exact email match', () => {
                const result = scorer.scoreEntityMatch(
                    'test@example.com',
                    'test@example.com',
                    'email'
                );
                expect(result.score).toBe(1.0);
                expect(result.reason).toBe('exact_match');
                expect(result.signal).toBe('shared_email');
            });

            it('should return 1.0 for exact phone match', () => {
                const result = scorer.scoreEntityMatch(
                    '+12061234567',
                    '+12061234567',
                    'phone'
                );
                expect(result.score).toBe(1.0);
                expect(result.reason).toBe('exact_match');
                expect(result.signal).toBe('shared_phone');
            });

            it('should return 1.0 for exact handle match (case-insensitive)', () => {
                const result = scorer.scoreEntityMatch(
                    'myhandle',
                    'MYHANDLE',
                    'handle'
                );
                expect(result.score).toBe(1.0);
                expect(result.reason).toBe('exact_match');
            });

            it('should return 1.0 for exact wallet match', () => {
                const result = scorer.scoreEntityMatch(
                    '0xabcdef1234567890',
                    '0xabcdef1234567890',
                    'wallet'
                );
                expect(result.score).toBe(1.0);
                expect(result.reason).toBe('exact_match');
                expect(result.signal).toBe('shared_wallet');
            });
        });

        describe('fuzzy matches', () => {
            it('should return 0.95 for phone with 1 digit difference', () => {
                const result = scorer.scoreEntityMatch(
                    '+12061234567',
                    '+12061234568',
                    'phone'
                );
                expect(result.score).toBe(0.95);
                expect(result.reason).toBe('fuzzy_match');
                expect(result.signal).toBe('similar_phone');
            });

            it('should return 0.95 for phone with 2 digit difference', () => {
                const result = scorer.scoreEntityMatch(
                    '+12061234567',
                    '+12061234599',
                    'phone'
                );
                expect(result.score).toBe(0.95);
                expect(result.reason).toBe('fuzzy_match');
            });

            it('should return 0.85 for handle with 1 char difference', () => {
                const result = scorer.scoreEntityMatch(
                    'myhandle',
                    'myhandel',
                    'handle'
                );
                expect(result.score).toBe(0.85);
                expect(result.reason).toBe('fuzzy_match');
                expect(result.signal).toBe('similar_handle');
            });
        });

        describe('domain matches', () => {
            it('should return 0.75 for same email domain', () => {
                const result = scorer.scoreEntityMatch(
                    'user1@company.com',
                    'user2@company.com',
                    'email'
                );
                expect(result.score).toBe(0.75);
                expect(result.reason).toBe('domain_match');
                expect(result.signal).toBe('shared_email_domain');
            });

            it('should return 0 for different email domains', () => {
                const result = scorer.scoreEntityMatch(
                    'user@company.com',
                    'user@different.com',
                    'email'
                );
                expect(result.score).toBe(0);
                expect(result.reason).toBe('no_match');
            });
        });

        describe('no matches', () => {
            it('should return 0 for completely different emails', () => {
                const result = scorer.scoreEntityMatch(
                    'alice@company.com',
                    'bob@different.org',
                    'email'
                );
                expect(result.score).toBe(0);
                expect(result.reason).toBe('no_match');
            });

            it('should return 0 for completely different phones', () => {
                const result = scorer.scoreEntityMatch(
                    '+12061234567',
                    '+44207946958',
                    'phone'
                );
                expect(result.score).toBe(0);
                expect(result.reason).toBe('no_match');
            });

            it('should return 0 for empty input', () => {
                const result = scorer.scoreEntityMatch('', 'test@example.com', 'email');
                expect(result.score).toBe(0);
                expect(result.signal).toBe('empty_input');
            });
        });
    });

    describe('levenshteinDistance', () => {
        it('should return 0 for identical strings', () => {
            expect(scorer.levenshteinDistance('test', 'test')).toBe(0);
        });

        it('should return correct distance for single char change', () => {
            expect(scorer.levenshteinDistance('test', 'tast')).toBe(1);
        });

        it('should return correct distance for insertion', () => {
            expect(scorer.levenshteinDistance('test', 'ttest')).toBe(1);
        });

        it('should return correct distance for deletion', () => {
            expect(scorer.levenshteinDistance('test', 'tst')).toBe(1);
        });

        it('should return length for empty string comparison', () => {
            expect(scorer.levenshteinDistance('', 'test')).toBe(4);
            expect(scorer.levenshteinDistance('test', '')).toBe(4);
        });

        it('should handle completely different strings', () => {
            expect(scorer.levenshteinDistance('abc', 'xyz')).toBe(3);
        });
    });

    describe('cosineSimilarity', () => {
        it('should return 1.0 for identical vectors', () => {
            const vec = [1, 2, 3, 4, 5];
            const result = scorer.cosineSimilarity(vec, vec);
            expect(result).toBeCloseTo(1.0, 5);
        });

        it('should return 0 for orthogonal vectors', () => {
            const vec1 = [1, 0, 0];
            const vec2 = [0, 1, 0];
            const result = scorer.cosineSimilarity(vec1, vec2);
            expect(result).toBeCloseTo(0, 5);
        });

        it('should return high similarity for similar vectors', () => {
            const vec1 = [1, 2, 3, 4, 5];
            const vec2 = [1.1, 2.1, 3.1, 4.1, 5.1];
            const result = scorer.cosineSimilarity(vec1, vec2);
            expect(result).toBeGreaterThan(0.99);
        });

        it('should return 0 for empty vectors', () => {
            expect(scorer.cosineSimilarity([], [])).toBe(0);
            expect(scorer.cosineSimilarity([1, 2, 3], [])).toBe(0);
        });

        it('should return 0 for zero vectors', () => {
            const zeroVec = [0, 0, 0];
            expect(scorer.cosineSimilarity(zeroVec, [1, 2, 3])).toBe(0);
        });

        it('should return 0 for mismatched dimensions', () => {
            expect(scorer.cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
        });
    });

    describe('scoreTextSimilarity', () => {
        it('should return high similarity for identical text', async () => {
            const embedding = new Array(1024).fill(0.5);
            mockEmbeddingService.embed = jest.fn().mockResolvedValue(embedding);

            const result = await scorer.scoreTextSimilarity('same text', [embedding]);

            expect(result).toBeGreaterThan(0.99);
        });

        it('should return 0 for dissimilar text', async () => {
            const inputEmbedding = new Array(1024).fill(0.5);
            const historicalEmbedding = new Array(1024).fill(-0.5);
            mockEmbeddingService.embed = jest.fn().mockResolvedValue(inputEmbedding);

            const result = await scorer.scoreTextSimilarity('text', [historicalEmbedding]);

            expect(result).toBeLessThan(0.75);
        });

        it('should return 0 for empty text', async () => {
            const result = await scorer.scoreTextSimilarity('', []);
            expect(result).toBe(0);
        });

        it('should return 0 when no embedding service', async () => {
            const scorerNoEmbed = new SimilarityScorer();
            const result = await scorerNoEmbed.scoreTextSimilarity('text', [[1, 2, 3]]);
            expect(result).toBe(0);
        });

        it('should return max similarity from multiple embeddings', async () => {
            const inputEmbedding = [1, 0, 0, 0];
            const closeEmbedding = [0.9, 0.1, 0, 0];
            const farEmbedding = [0, 1, 0, 0];

            mockEmbeddingService.embed = jest.fn().mockResolvedValue(inputEmbedding);

            const result = await scorer.scoreTextSimilarity('text', [farEmbedding, closeEmbedding]);

            // Should return the higher similarity (with closeEmbedding)
            expect(result).toBeGreaterThan(0.9);
        });
    });

    describe('scoreEntitySet', () => {
        it('should score multiple entities against historical', async () => {
            const inputEntities = [
                { value: 'test@example.com' },
                { value: 'other@example.com' },
            ];
            const historical = [
                { entity_id: 'e1', site_id: 's1', value: 'test@example.com' },
                { entity_id: 'e2', site_id: 's2', value: 'different@other.org' },
            ];

            const scores = await scorer.scoreEntitySet(inputEntities, historical, 'email');

            // Should find exact match
            expect(scores.some((s) => s.match_score === 1.0)).toBe(true);
            // Should also find domain match
            expect(scores.some((s) => s.reason === 'domain_match')).toBe(true);
        });

        it('should filter out low scores (< 0.7)', async () => {
            const inputEntities = [{ value: 'unrelated@different.com' }];
            const historical = [
                { entity_id: 'e1', site_id: 's1', value: 'other@other.org' },
            ];

            const scores = await scorer.scoreEntitySet(inputEntities, historical, 'email');

            // No matches above 0.7
            expect(scores).toHaveLength(0);
        });

        it('should sort results by score descending', async () => {
            const inputEntities = [{ value: 'user@company.com' }];
            const historical = [
                { entity_id: 'e1', site_id: 's1', value: 'different@company.com' },
                { entity_id: 'e2', site_id: 's2', value: 'user@company.com' },
            ];

            const scores = await scorer.scoreEntitySet(inputEntities, historical, 'email');

            expect(scores[0].match_score).toBeGreaterThanOrEqual(scores[1].match_score);
        });

        it('should handle empty input', async () => {
            const scores = await scorer.scoreEntitySet([], [], 'email');
            expect(scores).toEqual([]);
        });
    });

    describe('findTopKSimilar', () => {
        it('should return top K similar vectors', () => {
            const query = [1, 0, 0];
            const candidates = [
                { id: 'a', vector: [0.9, 0.1, 0] },
                { id: 'b', vector: [0.5, 0.5, 0] },
                { id: 'c', vector: [0.95, 0.05, 0] },
            ];

            const result = scorer.findTopKSimilar(query, candidates, 2);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('c'); // Most similar
            expect(result[1].id).toBe('a'); // Second most similar
        });

        it('should filter by threshold', () => {
            const query = [1, 0, 0];
            const candidates = [
                { id: 'a', vector: [0.5, 0.5, 0] }, // Lower similarity
                { id: 'b', vector: [0, 1, 0] },      // Orthogonal
            ];

            const result = scorer.findTopKSimilar(query, candidates, 10);

            // Only candidates above threshold (0.75)
            expect(result.every((r) => r.similarity >= 0.75)).toBe(true);
        });
    });

    describe('areSimilar', () => {
        it('should return true for similar vectors', () => {
            const vec1 = [1, 0, 0, 0];
            const vec2 = [0.9, 0.1, 0, 0];
            expect(scorer.areSimilar(vec1, vec2)).toBe(true);
        });

        it('should return false for dissimilar vectors', () => {
            const vec1 = [1, 0, 0, 0];
            const vec2 = [0, 1, 0, 0];
            expect(scorer.areSimilar(vec1, vec2)).toBe(false);
        });

        it('should respect custom threshold', () => {
            const vec1 = [1, 0, 0];
            const vec2 = [0.7, 0.7, 0];

            // With low threshold, should be similar
            expect(scorer.areSimilar(vec1, vec2, 0.5)).toBe(true);
            // With high threshold, should not be similar
            expect(scorer.areSimilar(vec1, vec2, 0.9)).toBe(false);
        });
    });
});
