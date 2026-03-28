// src/repository/Database.ts
// Singleton Insforge client with typed query builders

// Flag to track if SDK is available
let sdkAvailable = false;
let sdkError: Error | null = null;

// Use any type for the SDK to avoid ESM/CJS compatibility type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let insforgeSDK: any = null;

// Try to load the SDK at module initialization
try {
    // Use require for synchronous loading with error handling
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    insforgeSDK = require('@insforge/sdk');
    sdkAvailable = true;
} catch (error) {
    sdkError = error instanceof Error ? error : new Error(String(error));
    console.warn('Insforge SDK not available:', sdkError.message);
    console.warn('Database functionality will be disabled.');
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

// Insforge query result type
interface InsforgeResult<T> {
    data: T[] | null;
    error: { message: string; code?: string } | null;
}

/**
 * Database class - Singleton Insforge client
 * Provides typed query builders for all tables
 */
export class Database {
    private static instance: Database | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private client: any = null;
    private baseUrl: string;
    private anonKey: string;

    private constructor(baseUrl: string, anonKey: string) {
        this.baseUrl = baseUrl;
        this.anonKey = anonKey;
    }

    /**
     * Get or create the singleton instance
     */
    static getInstance(baseUrl?: string, anonKey?: string): Database {
        if (!Database.instance) {
            if (!baseUrl || !anonKey) {
                throw new Error('Insforge baseUrl and anonKey required for initialization');
            }
            Database.instance = new Database(baseUrl, anonKey);
        }
        return Database.instance;
    }

    /**
     * Initialize the Insforge client
     */
    async connect(): Promise<void> {
        if (this.client) {
            return;
        }

        // Check if SDK is available
        if (!sdkAvailable) {
            throw new Error(`Database SDK not available: ${sdkError?.message || 'Unknown error'}`);
        }

        this.client = insforgeSDK.createClient({
            baseUrl: this.baseUrl,
            anonKey: this.anonKey,
        });

        // Test connection by querying a simple value
        const { error } = await this.client.database
            .from('sites')
            .select('id')
            .limit(1);

        if (error && !error.message.includes('0 rows')) {
            // Ignore "no rows" error, it's expected for empty tables
            if (!error.message.includes('relation') && !error.message.includes('does not exist')) {
                throw new Error(`Database connection failed: ${error.message}`);
            }
        }
    }

    /**
     * Get the Insforge client (for advanced usage)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getClient(): any {
        if (!this.client) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.client;
    }

    /**
     * Execute a raw SQL query via Insforge RPC
     * Note: This requires a database function to be set up
     */
    async query<T extends DatabaseRecord = DatabaseRecord>(
        _sql: string,
        _values?: unknown[]
    ): Promise<{ rows: T[] }> {
        // For raw SQL queries, we'd need to set up an RPC function in Insforge
        // For now, this is a placeholder - use the table query builders instead
        throw new Error('Raw SQL queries not supported with Insforge SDK. Use table query builders.');
    }

    /**
     * Close the database connection
     */
    async close(): Promise<void> {
        this.client = null;
        Database.instance = null;
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
        vector: number[] | string;
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
     * Generic query builder factory using Insforge SDK
     */
    private createQueryBuilder<T extends DatabaseRecord>(tableName: string): TableQueryBuilder<T> {
        const db = this;

        return {
            async insert(data: Partial<T>): Promise<string> {
                const client = db.getClient();
                const result = await client.database
                    .from(tableName)
                    .insert(data as Record<string, unknown>)
                    .select('id') as InsforgeResult<{ id: string }>;

                if (result.error) {
                    throw new Error(`Insert failed: ${result.error.message}`);
                }

                if (!result.data || result.data.length === 0) {
                    throw new Error('Insert failed: No data returned');
                }

                return result.data[0].id;
            },

            async findById(id: string): Promise<T | null> {
                const client = db.getClient();
                const result = await client.database
                    .from(tableName)
                    .select('*')
                    .eq('id', id)
                    .maybeSingle() as { data: T | null; error: { message: string } | null };

                if (result.error) {
                    throw new Error(`Find failed: ${result.error.message}`);
                }

                return result.data;
            },

            async findAll(filters?: Partial<T>): Promise<T[]> {
                const client = db.getClient();
                let query = client.database.from(tableName).select('*');

                if (filters && Object.keys(filters).length > 0) {
                    for (const [key, value] of Object.entries(filters)) {
                        query = query.eq(key, value);
                    }
                }

                const result = await query as InsforgeResult<T>;

                if (result.error) {
                    throw new Error(`FindAll failed: ${result.error.message}`);
                }

                return result.data || [];
            },

            async update(id: string, data: Partial<T>): Promise<void> {
                const client = db.getClient();
                const result = await client.database
                    .from(tableName)
                    .update(data as Record<string, unknown>)
                    .eq('id', id) as InsforgeResult<T>;

                if (result.error) {
                    throw new Error(`Update failed: ${result.error.message}`);
                }
            },

            async delete(id: string): Promise<void> {
                const client = db.getClient();
                const result = await client.database
                    .from(tableName)
                    .delete()
                    .eq('id', id) as InsforgeResult<T>;

                if (result.error) {
                    throw new Error(`Delete failed: ${result.error.message}`);
                }
            },
        };
    }
}

// Export singleton getter for convenience
export function getDatabase(baseUrl?: string, anonKey?: string): Database {
    return Database.getInstance(baseUrl, anonKey);
}

export default Database;
