// src/repository/Database.ts
// Singleton Insforge client using direct REST API (bypasses SDK ESM issues)

import axios, { AxiosInstance, AxiosError } from 'axios';

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
 * Database class - Singleton Insforge client using REST API
 * Bypasses @insforge/sdk ESM/CJS compatibility issues
 */
export class Database {
    private static instance: Database | null = null;
    private httpClient: AxiosInstance | null = null;
    private baseUrl: string;
    private anonKey: string;
    private connected: boolean = false;

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
     * Check if database is connected
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Initialize the HTTP client and test connection
     */
    async connect(): Promise<void> {
        if (this.connected) {
            return;
        }

        // Create axios client with Insforge headers
        this.httpClient = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'apikey': this.anonKey,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });

        // Test connection by querying sites table
        try {
            await this.httpClient.get('/api/db/sites', {
                params: { select: 'id', limit: 1 }
            });
            this.connected = true;
            console.log('Insforge database connected via REST API');
        } catch (error) {
            const axiosError = error as AxiosError;
            // 404 or empty result is OK - table might not exist yet
            if (axiosError.response?.status === 404 || axiosError.response?.status === 200) {
                this.connected = true;
                console.log('Insforge database connected via REST API');
            } else {
                throw new Error(`Database connection failed: ${axiosError.message}`);
            }
        }
    }

    /**
     * Get the HTTP client
     */
    private getHttpClient(): AxiosInstance {
        if (!this.httpClient) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.httpClient;
    }

    /**
     * Close the database connection
     */
    async close(): Promise<void> {
        this.httpClient = null;
        this.connected = false;
        Database.instance = null;
    }

    // ============================================
    // Table Query Builders
    // ============================================

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
     * Generic query builder factory using REST API
     */
    private createQueryBuilder<T extends DatabaseRecord>(tableName: string): TableQueryBuilder<T> {
        const db = this;

        return {
            async insert(data: Partial<T>): Promise<string> {
                const client = db.getHttpClient();
                try {
                    const response = await client.post<T[]>(
                        `/api/db/${tableName}`,
                        data,
                        { headers: { 'Prefer': 'return=representation' } }
                    );
                    
                    if (!response.data || response.data.length === 0) {
                        throw new Error('Insert failed: No data returned');
                    }
                    
                    return response.data[0].id as string;
                } catch (error) {
                    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
                    const message = axiosError.response?.data?.message || 
                                    axiosError.response?.data?.error || 
                                    axiosError.message;
                    throw new Error(`Insert failed: ${message}`);
                }
            },

            async findById(id: string): Promise<T | null> {
                const client = db.getHttpClient();
                try {
                    const response = await client.get<T[]>(`/api/db/${tableName}`, {
                        params: { select: '*', id: `eq.${id}` }
                    });
                    
                    if (!response.data || response.data.length === 0) {
                        return null;
                    }
                    
                    return response.data[0];
                } catch (error) {
                    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
                    const message = axiosError.response?.data?.message || 
                                    axiosError.response?.data?.error || 
                                    axiosError.message;
                    throw new Error(`Find failed: ${message}`);
                }
            },

            async findAll(filters?: Partial<T>): Promise<T[]> {
                const client = db.getHttpClient();
                try {
                    const params: Record<string, string> = { select: '*' };
                    
                    if (filters && Object.keys(filters).length > 0) {
                        for (const [key, value] of Object.entries(filters)) {
                            params[key] = `eq.${value}`;
                        }
                    }
                    
                    const response = await client.get<T[]>(`/api/db/${tableName}`, { params });
                    return response.data || [];
                } catch (error) {
                    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
                    const message = axiosError.response?.data?.message || 
                                    axiosError.response?.data?.error || 
                                    axiosError.message;
                    throw new Error(`FindAll failed: ${message}`);
                }
            },

            async update(id: string, data: Partial<T>): Promise<void> {
                const client = db.getHttpClient();
                try {
                    await client.patch(
                        `/api/db/${tableName}`,
                        data,
                        { 
                            params: { id: `eq.${id}` },
                            headers: { 'Prefer': 'return=representation' }
                        }
                    );
                } catch (error) {
                    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
                    const message = axiosError.response?.data?.message || 
                                    axiosError.response?.data?.error || 
                                    axiosError.message;
                    throw new Error(`Update failed: ${message}`);
                }
            },

            async delete(id: string): Promise<void> {
                const client = db.getHttpClient();
                try {
                    await client.delete(`/api/db/${tableName}`, {
                        params: { id: `eq.${id}` }
                    });
                } catch (error) {
                    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
                    const message = axiosError.response?.data?.message || 
                                    axiosError.response?.data?.error || 
                                    axiosError.message;
                    throw new Error(`Delete failed: ${message}`);
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
