/**
 * Integration tests for API routes
 * Tests all endpoints with mocked database
 */

import { Application } from 'express';
import request from 'supertest';
import { createApp } from '../../src/api/server';

// Set test environment
process.env.NODE_ENV = 'test';

// In-memory storage for mocking
const storage = {
    sites: new Map<string, Record<string, unknown>>(),
    entities: new Map<string, Record<string, unknown>>(),
    clusters: new Map<string, Record<string, unknown>>(),
    embeddings: new Map<string, Record<string, unknown>>(),
    resolution_runs: new Map<string, Record<string, unknown>>(),
};

let idCounter = 1;
const generateId = () => `test-id-${idCounter++}`;

// Mock Database
jest.mock('../../src/repository/Database', () => {
    const createQueryBuilder = (tableName: string) => {
        const store = (storage as Record<string, Map<string, Record<string, unknown>>>)[tableName] || new Map();

        return {
            insert: jest.fn(async (data: Record<string, unknown>) => {
                const id = generateId();
                store.set(id, { id, ...data, created_at: new Date() });
                return id;
            }),
            findById: jest.fn(async (id: string) => {
                return store.get(id) || null;
            }),
            findAll: jest.fn(async (where?: Record<string, unknown>) => {
                const results: Record<string, unknown>[] = [];
                store.forEach((value) => {
                    if (!where) {
                        results.push(value);
                        return;
                    }
                    const matches = Object.entries(where).every(([k, v]) => value[k] === v);
                    if (matches) {
                        results.push(value);
                    }
                });
                return results;
            }),
            update: jest.fn(async (id: string, data: Record<string, unknown>) => {
                const existing = store.get(id);
                if (existing) {
                    store.set(id, { ...existing, ...data, updated_at: new Date() });
                }
            }),
            delete: jest.fn(async (id: string) => {
                store.delete(id);
            }),
        };
    };

    return {
        Database: {
            getInstance: jest.fn(() => ({
                sites: () => createQueryBuilder('sites'),
                entities: () => createQueryBuilder('entities'),
                clusters: () => createQueryBuilder('clusters'),
                embeddings: () => createQueryBuilder('embeddings'),
                resolution_runs: () => createQueryBuilder('resolution_runs'),
            })),
        },
    };
});

// Mock logger
jest.mock('../../src/util/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock embedding service
jest.mock('../../src/service/EmbeddingService', () => ({
    EmbeddingService: jest.fn().mockImplementation(() => ({
        embed: jest.fn().mockResolvedValue(new Array(1024).fill(0.1)),
        embedBatch: jest.fn().mockResolvedValue([]),
        storeEmbedding: jest.fn().mockResolvedValue('emb-test-id'),
        clearCache: jest.fn(),
    })),
}));

// Mock entity extractor
jest.mock('../../src/service/EntityExtractor', () => ({
    EntityExtractor: jest.fn().mockImplementation(() => ({
        extract: jest.fn().mockResolvedValue({
            emails: ['test@example.com'],
            phones: ['+12061234567'],
            handles: [],
            wallets: [],
            raw_extraction_time_ms: 10,
        }),
    })),
}));

// Clear storage between tests
function clearStorage() {
    storage.sites.clear();
    storage.entities.clear();
    storage.clusters.clear();
    storage.embeddings.clear();
    storage.resolution_runs.clear();
    idCounter = 1;
}

describe('API Integration Tests', () => {
    let app: Application;

    beforeAll(() => {
        app = createApp();
    });

    beforeEach(() => {
        clearStorage();
    });

    // ==========================================
    // Health Check Tests
    // ==========================================
    describe('GET /health', () => {
        it('should return 200 with health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timestamp');
            expect(['ok', 'degraded', 'error']).toContain(response.body.status);
        });

        it('should include database status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('database');
        });
    });

    // ==========================================
    // POST /api/ingest-site Tests
    // ==========================================
    describe('POST /api/ingest-site', () => {
        it('should return 200 for valid request', async () => {
            const response = await request(app)
                .post('/api/ingest-site')
                .send({
                    url: 'https://test-site.com',
                    domain: 'test-site.com',
                    page_text: 'Contact us at test@example.com',
                })
                .expect(200);

            expect(response.body).toHaveProperty('site_id');
            expect(response.body).toHaveProperty('entities_extracted');
            expect(response.body).toHaveProperty('embeddings_generated');
        });

        it('should return 400 for invalid URL', async () => {
            const response = await request(app)
                .post('/api/ingest-site')
                .send({
                    url: 'not-a-valid-url',
                })
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('code');
            expect(response.body.code).toBe('VALIDATION_ERROR');
        });

        it('should return 409 for duplicate domain', async () => {
            // First request should succeed
            await request(app)
                .post('/api/ingest-site')
                .send({
                    url: 'https://duplicate.com',
                    domain: 'duplicate.com',
                })
                .expect(200);

            // Second request with same domain should fail
            const response = await request(app)
                .post('/api/ingest-site')
                .send({
                    url: 'https://duplicate.com/other',
                    domain: 'duplicate.com',
                })
                .expect(409);

            expect(response.body.code).toBe('CONFLICT');
        });

        it('should succeed without page_text', async () => {
            const response = await request(app)
                .post('/api/ingest-site')
                .send({
                    url: 'https://no-text.com',
                })
                .expect(200);

            expect(response.body).toHaveProperty('site_id');
        });

        it('should include resolution when attempt_resolve is true', async () => {
            const response = await request(app)
                .post('/api/ingest-site')
                .send({
                    url: 'https://resolve-test.com',
                    page_text: 'Test page content',
                    attempt_resolve: true,
                })
                .expect(200);

            // Resolution is included (may be null if no match)
            expect(response.body).toHaveProperty('resolution');
        });
    });

    // ==========================================
    // POST /api/resolve-actor Tests
    // ==========================================
    describe('POST /api/resolve-actor', () => {
        it('should return 200 for valid request', async () => {
            const response = await request(app)
                .post('/api/resolve-actor')
                .send({
                    url: 'https://test-actor.com',
                    page_text: 'Contact: test@example.com',
                })
                .expect(200);

            expect(response.body).toHaveProperty('actor_cluster_id');
            expect(response.body).toHaveProperty('confidence');
            expect(response.body).toHaveProperty('matching_signals');
            expect(response.body).toHaveProperty('explanation');
        });

        it('should return 400 for invalid URL', async () => {
            const response = await request(app)
                .post('/api/resolve-actor')
                .send({
                    url: 'invalid-url',
                })
                .expect(400);

            expect(response.body.code).toBe('VALIDATION_ERROR');
        });

        it('should return 404 for non-existent site_id', async () => {
            const response = await request(app)
                .post('/api/resolve-actor')
                .send({
                    url: 'https://test.com',
                    site_id: '00000000-0000-0000-0000-000000000000',
                })
                .expect(404);

            expect(response.body.code).toBe('NOT_FOUND');
        });

        it('should return null cluster_id when no match', async () => {
            const response = await request(app)
                .post('/api/resolve-actor')
                .send({
                    url: 'https://new-site.com',
                    page_text: 'Unique content',
                })
                .expect(200);

            // For a new site with no matches, cluster_id should be null
            expect(response.body.actor_cluster_id).toBeNull();
        });
    });

    // ==========================================
    // GET /api/clusters/:id Tests
    // ==========================================
    describe('GET /api/clusters/:id', () => {
        it('should return 400 for invalid UUID format', async () => {
            const response = await request(app)
                .get('/api/clusters/not-a-uuid')
                .expect(400);

            expect(response.body.code).toBe('VALIDATION_ERROR');
        });

        it('should return 404 for non-existent cluster', async () => {
            const response = await request(app)
                .get('/api/clusters/00000000-0000-0000-0000-000000000000')
                .expect(404);

            expect(response.body.code).toBe('NOT_FOUND');
        });

        it('should return cluster details when found', async () => {
            // First create a cluster with valid UUID
            const clusterId = '11111111-1111-1111-1111-111111111111';
            storage.clusters.set(clusterId, {
                id: clusterId,
                name: 'Test Cluster',
                confidence: 0.9,
                description: 'Test description',
                created_at: new Date(),
                updated_at: new Date(),
            });

            const response = await request(app)
                .get(`/api/clusters/${clusterId}`)
                .expect(200);

            expect(response.body).toHaveProperty('cluster');
            expect(response.body).toHaveProperty('sites');
            expect(response.body).toHaveProperty('entities');
            expect(response.body).toHaveProperty('risk_score');
            expect(response.body.risk_score).toBeGreaterThanOrEqual(0);
            expect(response.body.risk_score).toBeLessThanOrEqual(1);
        });
    });

    // ==========================================
    // POST /api/seeds Tests (Dev Only)
    // ==========================================
    describe('POST /api/seeds', () => {
        it('should return 200 and seed data', async () => {
            const response = await request(app)
                .post('/api/seeds')
                .send({
                    count: 3,
                    include_matches: true,
                })
                .expect(200);

            expect(response.body).toHaveProperty('sites_created');
            expect(response.body).toHaveProperty('clusters_created');
            expect(response.body).toHaveProperty('entities_created');
            expect(response.body).toHaveProperty('embeddings_created');
        });

        it('should return 400 for invalid count', async () => {
            const response = await request(app)
                .post('/api/seeds')
                .send({
                    count: 100, // Max is 20
                })
                .expect(400);

            expect(response.body.code).toBe('VALIDATION_ERROR');
        });
    });

    // ==========================================
    // 404 Handler Tests
    // ==========================================
    describe('404 Not Found', () => {
        it('should return 404 for unknown routes', async () => {
            const response = await request(app)
                .get('/api/unknown-route')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.code).toBe('NOT_FOUND');
        });
    });

    // ==========================================
    // Error Response Format Tests
    // ==========================================
    describe('Error Response Format', () => {
        it('should include required error fields', async () => {
            const response = await request(app)
                .post('/api/ingest-site')
                .send({ url: 'invalid' })
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('code');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('request_id');
        });

        it('should include X-Request-ID in response headers', async () => {
            const response = await request(app)
                .get('/health');

            expect(response.headers).toHaveProperty('x-request-id');
        });
    });
});
