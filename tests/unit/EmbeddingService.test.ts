// tests/unit/EmbeddingService.test.ts
// Unit tests for EmbeddingService

import { EmbeddingService } from '../../src/service/EmbeddingService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EmbeddingService', () => {
    let service: EmbeddingService;
    const mockVector = new Array(1024).fill(0.1);

    beforeEach(() => {
        service = new EmbeddingService('test-api-key');
        service.clearCache();
        jest.clearAllMocks();
    });

    describe('embed', () => {
        it('should return 1024-dimensional vector', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: [{ embedding: mockVector }],
                },
            });

            const result = await service.embed('test text');

            expect(result).toHaveLength(1024);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        it('should cache results for same text', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: [{ embedding: mockVector }],
                },
            });

            // First call
            await service.embed('cached text');
            // Second call with same text
            const result = await service.embed('cached text');

            expect(result).toHaveLength(1024);
            // API should only be called once due to caching
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        it('should truncate very long text', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: [{ embedding: mockVector }],
                },
            });

            const longText = 'a'.repeat(50000);
            await service.embed(longText);

            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            const calledWith = mockedAxios.post.mock.calls[0][1] as { input: string[] };
            // Should be truncated (8000 tokens * 4 chars = 32000 chars max)
            expect(calledWith.input[0].length).toBeLessThanOrEqual(32000);
        });

        it('should return zero vector for empty text', async () => {
            const result = await service.embed('');

            expect(result).toHaveLength(1024);
            expect(result.every((v) => v === 0)).toBe(true);
            expect(mockedAxios.post).not.toHaveBeenCalled();
        });

        it('should return zero vector when API key is missing', async () => {
            const noKeyService = new EmbeddingService('');
            const result = await noKeyService.embed('test');

            expect(result).toHaveLength(1024);
            expect(result.every((v) => v === 0)).toBe(true);
        });
    });

    describe('retry logic', () => {
        it('should retry on network error', async () => {
            // First call fails, second succeeds
            mockedAxios.post
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    data: {
                        data: [{ embedding: mockVector }],
                    },
                });

            const result = await service.embed('retry test');

            expect(result).toHaveLength(1024);
            expect(mockedAxios.post).toHaveBeenCalledTimes(2);
        });

        it('should throw on auth error (401)', async () => {
            const authError = {
                response: { status: 401 },
                isAxiosError: true,
            };
            mockedAxios.post.mockRejectedValueOnce(authError);

            await expect(service.embed('auth test')).rejects.toThrow(
                'Embedding API authentication failed'
            );
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        it('should return zero vector after all retries exhausted', async () => {
            mockedAxios.post
                .mockRejectedValueOnce(new Error('Error 1'))
                .mockRejectedValueOnce(new Error('Error 2'))
                .mockRejectedValueOnce(new Error('Error 3'));

            const result = await service.embed('exhaust retries');

            expect(result).toHaveLength(1024);
            expect(result.every((v) => v === 0)).toBe(true);
            expect(mockedAxios.post).toHaveBeenCalledTimes(3);
        });

        it('should handle rate limiting (429)', async () => {
            const rateLimitError = {
                response: { status: 429 },
                isAxiosError: true,
            };
            mockedAxios.post
                .mockRejectedValueOnce(rateLimitError)
                .mockResolvedValueOnce({
                    data: {
                        data: [{ embedding: mockVector }],
                    },
                });

            const result = await service.embed('rate limit test');

            expect(result).toHaveLength(1024);
            expect(mockedAxios.post).toHaveBeenCalledTimes(2);
        });
    });

    describe('embedBatch', () => {
        it('should embed multiple texts', async () => {
            mockedAxios.post
                .mockResolvedValueOnce({
                    data: { data: [{ embedding: mockVector }] },
                })
                .mockResolvedValueOnce({
                    data: { data: [{ embedding: mockVector }] },
                })
                .mockResolvedValueOnce({
                    data: { data: [{ embedding: mockVector }] },
                });

            const texts = ['text1', 'text2', 'text3'];
            const results = await service.embedBatch(texts);

            expect(results).toHaveLength(3);
            results.forEach((r) => {
                expect(r.vector).toHaveLength(1024);
            });
        });

        it('should return zero vector for failed embeddings in batch', async () => {
            mockedAxios.post
                .mockResolvedValueOnce({
                    data: { data: [{ embedding: mockVector }] },
                })
                .mockRejectedValueOnce(new Error('Failed'))
                .mockRejectedValueOnce(new Error('Failed'))
                .mockRejectedValueOnce(new Error('Failed'));

            const results = await service.embedBatch(['success', 'fail']);

            expect(results).toHaveLength(2);
            expect(results[0].vector).toEqual(mockVector);
            // Second one should be zero vector after retries exhausted
            expect(results[1].vector.every((v) => v === 0)).toBe(true);
        });

        it('should handle empty batch', async () => {
            const results = await service.embedBatch([]);
            expect(results).toEqual([]);
        });
    });

    describe('clearCache', () => {
        it('should clear cached embeddings', async () => {
            mockedAxios.post.mockResolvedValue({
                data: { data: [{ embedding: mockVector }] },
            });

            // Cache a result
            await service.embed('cache me');
            expect(service.getCacheSize()).toBe(1);

            // Clear cache
            service.clearCache();
            expect(service.getCacheSize()).toBe(0);

            // New request should call API again
            await service.embed('cache me');
            expect(mockedAxios.post).toHaveBeenCalledTimes(2);
        });
    });

    describe('error handling', () => {
        it('should handle invalid response format', async () => {
            mockedAxios.post
                .mockResolvedValueOnce({
                    data: { invalid: 'response' },
                })
                .mockResolvedValueOnce({
                    data: { invalid: 'response' },
                })
                .mockResolvedValueOnce({
                    data: { invalid: 'response' },
                });

            const result = await service.embed('invalid response test');

            expect(result).toHaveLength(1024);
            expect(result.every((v) => v === 0)).toBe(true);
        });

        it('should handle null embedding in response', async () => {
            mockedAxios.post
                .mockResolvedValueOnce({
                    data: { data: [{ embedding: null }] },
                })
                .mockResolvedValueOnce({
                    data: { data: [{ embedding: null }] },
                })
                .mockResolvedValueOnce({
                    data: { data: [{ embedding: null }] },
                });

            const result = await service.embed('null embedding test');

            expect(result).toHaveLength(1024);
            expect(result.every((v) => v === 0)).toBe(true);
        });
    });

    describe('API call parameters', () => {
        it('should use correct model and endpoint', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { data: [{ embedding: mockVector }] },
            });

            await service.embed('test');

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.mixedbread.ai/v1/embeddings',
                expect.objectContaining({
                    model: 'mixedbread-ai/mxbai-embed-large-v1',
                    input: ['test'],
                }),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer test-api-key',
                    }),
                })
            );
        });
    });
});
