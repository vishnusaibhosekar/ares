// src/domain/models/Site.ts
// Site domain model

/**
 * Site - Represents a tracked storefront/website
 */
export class Site {
    constructor(
        public readonly id: string,
        public readonly domain: string,
        public readonly url: string,
        public readonly page_text: string | null,
        public readonly screenshot_hash: string | null,
        public readonly first_seen_at: Date,
        public readonly created_at: Date
    ) { }

    /**
     * Check if site has page text
     */
    get hasPageText(): boolean {
        return this.page_text !== null && this.page_text.length > 0;
    }

    /**
     * Check if site has screenshot
     */
    get hasScreenshot(): boolean {
        return this.screenshot_hash !== null;
    }

    /**
     * Get a short description for logging
     */
    toString(): string {
        return `Site(${this.id}, ${this.domain})`;
    }

    /**
     * Convert to plain object
     */
    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            domain: this.domain,
            url: this.url,
            page_text: this.page_text,
            screenshot_hash: this.screenshot_hash,
            first_seen_at: this.first_seen_at.toISOString(),
            created_at: this.created_at.toISOString(),
        };
    }
}

export default Site;
