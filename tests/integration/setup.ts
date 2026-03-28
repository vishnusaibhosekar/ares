/**
 * Integration test setup
 * Provides test utilities and mock database for API testing
 */

import { Application } from 'express';
import request from 'supertest';
import { createApp } from '../../src/api/server';
import { Database } from '../../src/repository/Database';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock the database to use in-memory storage
jest.mock('../../src/repository/Database', () => {
    // In-memory storage
    const storage = {
        sites: new Map<string, Record<string, unknown>>(),
        entities: new Map<string, Record<string, unknown>>(),
        clusters: new Map<string, Record<string, unknown>>(),
        embeddings: new Map<string, Record<string, unknown>>(),
        resolution_runs: new Map<string, Record<string, unknown>>(),
    };

    let idCounter = 1;
    const generateId = () => `test-id-${idCounter++}`;

    const createQueryBuilder = (tableName: string) => {
        const store = storage[tableName as keyof typeof storage] || new Map();

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
        clearStorage: () => {
            storage.sites.clear();
            storage.entities.clear();
            storage.clusters.clear();
            storage.embeddings.clear();
            storage.resolution_runs.clear();
            idCounter = 1;
        },
    };
});

// Mock logger to reduce noise
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

// Get the clearStorage function
const { clearStorage } = require('../../src/repository/Database');

/**
 * Create test application
 */
export function createTestApp(): Application {
    return createApp();
}

/**
 * Reset test database
 */
export function resetTestDatabase(): void {
    clearStorage();
}

/**
 * Create a test request helper
 */
export function createTestRequest(app: Application) {
    return request(app);
}

export { request };
