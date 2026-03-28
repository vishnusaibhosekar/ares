// src/repository/Database.ts
// Singleton Postgres client with connection pooling and typed query builders

import { Pool, PoolClient, QueryResult } from 'pg';

// Database configuration type
interface DatabaseConfig {
    connectionString: string;
    poolSize?: number;
}

// Generic record type
type DatabaseRecord = Record<string, unknown>;

// Query builder interface for each table
interface TableQueryBuilder<T extends DatabaseRecord> {
    insert(data: Partial<T>): Promise<string>;
    findById(id: string): Promise<T | null>;
    findAll(filters?: Partial<T>): Promise<T[]>;
    update(id: string, data: Partial<T>): Promise<void>;
    delete(id: string): Promise<void>;
}

/**
 * Database class - Singleton Postgres client
 * Provides connection pooling and typed query builders for all tables
 */
export class Database {
    private static instance: Database | null = null;
    private pool: Pool | null = null;
    private config: DatabaseConfig;

    private constructor(config: DatabaseConfig) {
        this.config = config;
    }

    /**
     * Get or create the singleton instance
     */
    static getInstance(connectionString?: string): Database {
        if (!Database.instance) {
            if (!connectionString) {
                throw new Error('Database connection string required for initialization');
            }
            Database.instance = new Database({
                connectionString,
                poolSize: 10,
            });
        }
        return Database.instance;
    }

    /**
     * Initialize the connection pool
     */
    async connect(): Promise<void> {
        if (this.pool) {
            return;
        }

        this.pool = new Pool({
            connectionString: this.config.connectionString,
            max: this.config.poolSize || 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });

        // Test connection
        const client = await this.pool.connect();
        client.release();
    }

    /**
     * Get the pool (for advanced usage)
     */
    getPool(): Pool {
        if (!this.pool) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.pool;
    }

    /**
     * Execute a raw SQL query
     */
    async query<T extends DatabaseRecord = DatabaseRecord>(
        sql: string,
        values?: unknown[]
    ): Promise<QueryResult<T>> {
        if (!this.pool) {
            throw new Error('Database not connected. Call connect() first.');
        }

        let retries = 3;
        let lastError: Error | null = null;

        while (retries > 0) {
            try {
                return await this.pool.query<T>(sql, values);
            } catch (error) {
                lastError = error as Error;
                const errorCode = (error as { code?: string }).code;

                // Retry on transient errors
                if (errorCode === '57P01' || errorCode === '08006' || errorCode === '08003') {
                    retries--;
                    await this.delay(1000 * (4 - retries));
                    continue;
                }
                throw error;
            }
        }

        throw lastError;
    }

    /**
     * Execute a transaction
     */
    async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        if (!this.pool) {
            throw new Error('Database not connected. Call connect() first.');
        }

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Close the database connection pool
     */
    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
        Database.instance = null;
    }

    /**
     * Helper method to delay execution
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ============================================
    // Table Query Builders
    // ============================================

    /**
     * Sites table query builder
     */
    sites(): TableQueryBuilder<{
        id: string;
        domain: string;
        url: string;
        page_text: string | null;
        screenshot_hash: string | null;
        first_seen_at: Date;
        created_at: Date;
    }> {
        return this.createQueryBuilder('sites');
    }

    /**
     * Entities table query builder
     */
    entities(): TableQueryBuilder<{
        id: string;
        site_id: string;
        type: string;
        value: string;
        normalized_value: string | null;
        confidence: number;
        created_at: Date;
    }> {
        return this.createQueryBuilder('entities');
    }

    /**
     * Clusters table query builder
     */
    clusters(): TableQueryBuilder<{
        id: string;
        name: string | null;
        confidence: number;
        description: string | null;
        created_at: Date;
        updated_at: Date;
    }> {
        return this.createQueryBuilder('clusters');
    }

    /**
     * Cluster memberships table query builder
     */
    cluster_memberships(): TableQueryBuilder<{
        id: string;
        cluster_id: string;
        entity_id: string | null;
        site_id: string | null;
        membership_type: string;
        confidence: number;
        reason: string | null;
        created_at: Date;
    }> {
        return this.createQueryBuilder('cluster_memberships');
    }

    /**
     * Embeddings table query builder
     */
    embeddings(): TableQueryBuilder<{
        id: string;
        source_id: string;
        source_type: string;
        source_text: string;
        vector: number[];
        created_at: Date;
    }> {
        return this.createQueryBuilder('embeddings');
    }

    /**
     * Resolution runs table query builder
     */
    resolution_runs(): TableQueryBuilder<{
        id: string;
        input_url: string;
        input_domain: string | null;
        input_entities: Record<string, unknown>;
        result_cluster_id: string | null;
        result_confidence: number;
        explanation: string | null;
        matching_signals: string[];
        execution_time_ms: number;
        created_at: Date;
    }> {
        return this.createQueryBuilder('resolution_runs');
    }

    /**
     * Generic query builder factory
     */
    private createQueryBuilder<T extends DatabaseRecord>(tableName: string): TableQueryBuilder<T> {
        const db = this;

        return {
            async insert(data: Partial<T>): Promise<string> {
                const keys = Object.keys(data);
                const values = Object.values(data);
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                const columns = keys.join(', ');

                const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING id`;
                const result = await db.query<{ id: string }>(sql, values);
                return result.rows[0].id;
            },

            async findById(id: string): Promise<T | null> {
                const sql = `SELECT * FROM ${tableName} WHERE id = $1`;
                const result = await db.query<T>(sql, [id]);
                return result.rows[0] || null;
            },

            async findAll(filters?: Partial<T>): Promise<T[]> {
                if (!filters || Object.keys(filters).length === 0) {
                    const sql = `SELECT * FROM ${tableName}`;
                    const result = await db.query<T>(sql);
                    return result.rows;
                }

                const keys = Object.keys(filters);
                const values = Object.values(filters);
                const conditions = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
                const sql = `SELECT * FROM ${tableName} WHERE ${conditions}`;
                const result = await db.query<T>(sql, values);
                return result.rows;
            },

            async update(id: string, data: Partial<T>): Promise<void> {
                const keys = Object.keys(data);
                const values = Object.values(data);
                const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

                const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = $${keys.length + 1}`;
                await db.query(sql, [...values, id]);
            },

            async delete(id: string): Promise<void> {
                const sql = `DELETE FROM ${tableName} WHERE id = $1`;
                await db.query(sql, [id]);
            },
        };
    }
}

// Export singleton getter for convenience
export function getDatabase(connectionString?: string): Database {
    return Database.getInstance(connectionString);
}

export default Database;
