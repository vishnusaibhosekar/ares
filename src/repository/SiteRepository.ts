// src/repository/SiteRepository.ts
// Repository for Site table operations

import { Database } from './Database';
import { Site } from '../domain/models';

/**
 * Plain object input for creating a site
 */
export interface CreateSiteInput {
    domain: string;
    url: string;
    page_text?: string | null;
    screenshot_hash?: string | null;
    first_seen_at?: Date;
}

/**
 * SiteRepository - Data access layer for sites table
 */
export class SiteRepository {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    /**
     * Create a new site
     */
    async create(site: CreateSiteInput): Promise<string> {
        return this.db.sites().insert({
            domain: site.domain,
            url: site.url,
            page_text: site.page_text ?? null,
            screenshot_hash: site.screenshot_hash ?? null,
            first_seen_at: site.first_seen_at || new Date(),
        });
    }

    /**
     * Find site by ID
     */
    async findById(id: string): Promise<Site | null> {
        const record = await this.db.sites().findById(id);
        return record ? this.mapToModel(record) : null;
    }

    /**
     * Find site by domain
     */
    async findByDomain(domain: string): Promise<Site[]> {
        const records = await this.db.sites().findAll({ domain });
        return records.map(this.mapToModel);
    }

    /**
     * Find site by URL
     */
    async findByUrl(url: string): Promise<Site | null> {
        const records = await this.db.sites().findAll({ url });
        return records.length > 0 ? this.mapToModel(records[0]) : null;
    }

    /**
     * Update site
     */
    async update(id: string, data: Partial<Site>): Promise<void> {
        await this.db.sites().update(id, data);
    }

    /**
     * Delete site
     */
    async delete(id: string): Promise<void> {
        await this.db.sites().delete(id);
    }

    /**
     * Get all sites
     */
    async findAll(): Promise<Site[]> {
        const records = await this.db.sites().findAll();
        return records.map(this.mapToModel);
    }

    /**
     * Map database record to domain model
     */
    private mapToModel(record: {
        id: string;
        domain: string;
        url: string;
        page_text: string | null;
        screenshot_hash: string | null;
        first_seen_at: Date | string;
        created_at: Date | string;
    }): Site {
        return new Site(
            record.id,
            record.domain,
            record.url,
            record.page_text,
            record.screenshot_hash,
            typeof record.first_seen_at === 'string' ? new Date(record.first_seen_at) : record.first_seen_at,
            typeof record.created_at === 'string' ? new Date(record.created_at) : record.created_at
        );
    }
}

export default SiteRepository;
