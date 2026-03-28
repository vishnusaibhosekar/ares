// src/service/EntityExtractor.ts
// Service for extracting entities from site content using regex + LLM

import axios from 'axios';
import { logger } from '../util/logger';
import { env } from '../util/env';

/**
 * Handle type for social media handles
 */
export type HandleType = 'whatsapp' | 'telegram' | 'wechat' | 'other';

/**
 * Wallet type for cryptocurrency wallets
 */
export type WalletType = 'ethereum' | 'bitcoin' | 'other';

/**
 * Extracted entities result
 */
export interface ExtractedEntities {
    emails: string[];
    phones: string[];
    handles: Array<{ type: HandleType; value: string }>;
    wallets: Array<{ type: WalletType; value: string }>;
    raw_extraction_time_ms: number;
}

/**
 * EntityExtractor - Extracts entities using regex and optionally LLM
 */
export class EntityExtractor {
    private anthropicApiKey: string;
    private anthropicBaseUrl: string = 'https://api.anthropic.com/v1';

    constructor(anthropicApiKey?: string) {
        this.anthropicApiKey = anthropicApiKey || env.MIXEDBREAD_API_KEY || '';
    }

    /**
     * Main extraction method
     */
    async extract(text: string, useLLM: boolean = false): Promise<ExtractedEntities> {
        const startTime = Date.now();

        if (!text || text.trim().length === 0) {
            return {
                emails: [],
                phones: [],
                handles: [],
                wallets: [],
                raw_extraction_time_ms: Date.now() - startTime,
            };
        }

        // Extract with regex
        const regexResults = this.extractWithRegex(text);

        // Optionally extract with LLM
        if (useLLM && this.anthropicApiKey) {
            try {
                const llmResults = await this.extractEntitiesWithLLM(text);
                // Merge and deduplicate
                return {
                    emails: this.deduplicateArray([...regexResults.emails, ...llmResults.emails]),
                    phones: this.deduplicateArray([...regexResults.phones, ...llmResults.phones]),
                    handles: this.deduplicateHandles([...regexResults.handles, ...llmResults.handles]),
                    wallets: this.deduplicateWallets([...regexResults.wallets, ...llmResults.wallets]),
                    raw_extraction_time_ms: Date.now() - startTime,
                };
            } catch (error) {
                logger.warn({ error }, 'LLM extraction failed, using regex results only');
            }
        }

        return {
            ...regexResults,
            raw_extraction_time_ms: Date.now() - startTime,
        };
    }

    /**
     * Extract all entities using regex patterns
     */
    extractWithRegex(text: string): Omit<ExtractedEntities, 'raw_extraction_time_ms'> {
        return {
            emails: this.extractEmails(text),
            phones: this.extractPhones(text),
            handles: this.extractHandles(text),
            wallets: this.extractWallets(text),
        };
    }

    /**
     * Extract email addresses from text
     */
    extractEmails(text: string): string[] {
        if (!text) return [];

        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = text.match(emailPattern) || [];

        // Lowercase and deduplicate
        return this.deduplicateArray(matches.map((e) => e.toLowerCase()));
    }

    /**
     * Extract phone numbers from text
     */
    extractPhones(text: string): string[] {
        if (!text) return [];

        const allMatches: string[] = [];

        // US/Canada format: (206) 123-4567, 206-123-4567, 206.123.4567
        // More permissive pattern that matches 10-digit numbers
        const usPattern = /\(?(\d{3})\)?[-. ]?(\d{3})[-. ]?(\d{4})/g;
        let match;
        while ((match = usPattern.exec(text)) !== null) {
            allMatches.push(match[1] + match[2] + match[3]);
        }

        // International format: +1-206-123-4567, +86 138 1234 5678
        const intlPattern = /\+(\d{1,3})[-. ]?(\d{1,4})[-. ]?(\d{1,4})[-. ]?(\d{1,4})/g;
        while ((match = intlPattern.exec(text)) !== null) {
            const digits = match[0].replace(/[^\d]/g, '');
            if (digits.length >= 10 && digits.length <= 15) {
                allMatches.push(digits);
            }
        }

        // Simple digits with + prefix
        const simplePattern = /\+\d{10,15}/g;
        while ((match = simplePattern.exec(text)) !== null) {
            const digits = match[0].replace(/[^\d]/g, '');
            allMatches.push(digits);
        }

        // Clean and deduplicate
        const cleaned = allMatches.filter((p) => p.length >= 10 && p.length <= 15);

        return this.deduplicateArray(cleaned);
    }

    /**
     * Extract social media handles from text
     */
    extractHandles(text: string): Array<{ type: HandleType; value: string }> {
        if (!text) return [];

        const handles: Array<{ type: HandleType; value: string }> = [];

        // Telegram handles: @username (5-32 chars)
        const telegramPattern = /@([a-zA-Z][a-zA-Z0-9_]{4,31})\b/g;
        let match;
        while ((match = telegramPattern.exec(text)) !== null) {
            handles.push({ type: 'telegram', value: match[1] });
        }

        // WhatsApp mentions in text
        const whatsappTextPattern = /whatsapp[:\s]+([+\d\s\-]+)/gi;
        while ((match = whatsappTextPattern.exec(text)) !== null) {
            const cleaned = match[1].replace(/[\s\-]/g, '');
            if (cleaned.length >= 10) {
                handles.push({ type: 'whatsapp', value: cleaned });
            }
        }

        // WeChat mentions
        const wechatPattern = /wechat[:\s]+([a-zA-Z0-9_-]+)/gi;
        while ((match = wechatPattern.exec(text)) !== null) {
            handles.push({ type: 'wechat', value: match[1] });
        }

        // Generic @handles that aren't already captured
        const genericPattern = /@([a-zA-Z0-9_]{3,30})/g;
        while ((match = genericPattern.exec(text)) !== null) {
            const value = match[1];
            // Skip if already captured as telegram
            if (!handles.some((h) => h.value.toLowerCase() === value.toLowerCase())) {
                handles.push({ type: 'other', value });
            }
        }

        return this.deduplicateHandles(handles);
    }

    /**
     * Extract cryptocurrency wallet addresses from text
     */
    extractWallets(text: string): Array<{ type: WalletType; value: string }> {
        if (!text) return [];

        const wallets: Array<{ type: WalletType; value: string }> = [];

        // Ethereum addresses: 0x followed by 40 hex chars
        const ethPattern = /0x[a-fA-F0-9]{40}/g;
        let match;
        while ((match = ethPattern.exec(text)) !== null) {
            wallets.push({ type: 'ethereum', value: match[0].toLowerCase() });
        }

        // Bitcoin addresses: 1 or 3 followed by 25-34 alphanumeric chars (simplified)
        const btcPattern = /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g;
        while ((match = btcPattern.exec(text)) !== null) {
            wallets.push({ type: 'bitcoin', value: match[0] });
        }

        return this.deduplicateWallets(wallets);
    }

    /**
     * Extract entities using LLM (Anthropic Claude)
     */
    async extractEntitiesWithLLM(text: string): Promise<Omit<ExtractedEntities, 'raw_extraction_time_ms'>> {
        const emptyResult = { emails: [], phones: [], handles: [], wallets: [] };

        if (!this.anthropicApiKey) {
            return emptyResult;
        }

        // Truncate text to avoid token limits
        const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;

        const systemPrompt = `Extract all contact information from the following text. Return ONLY valid JSON with these keys:
- emails: array of email addresses
- phones: array of phone numbers
- handles: array of objects with {type: "whatsapp"|"telegram"|"wechat"|"other", value: string}
- wallets: array of objects with {type: "ethereum"|"bitcoin"|"other", value: string}

If no entities are found, return empty arrays. Do not include any explanation, only JSON.`;

        try {
            const response = await axios.post(
                `${this.anthropicBaseUrl}/messages`,
                {
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 1024,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: truncatedText }],
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.anthropicApiKey,
                        'anthropic-version': '2023-06-01',
                    },
                    timeout: 30000,
                }
            );

            const content = response.data.content?.[0]?.text || '';

            // Parse JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                logger.warn('LLM response did not contain valid JSON');
                return emptyResult;
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                emails: Array.isArray(parsed.emails) ? parsed.emails : [],
                phones: Array.isArray(parsed.phones) ? parsed.phones : [],
                handles: Array.isArray(parsed.handles) ? parsed.handles.map((h: { type?: string; value?: string }) => ({
                    type: this.normalizeHandleType(h.type || 'other'),
                    value: h.value || '',
                })) : [],
                wallets: Array.isArray(parsed.wallets) ? parsed.wallets.map((w: { type?: string; value?: string }) => ({
                    type: this.normalizeWalletType(w.type || 'other'),
                    value: w.value || '',
                })) : [],
            };
        } catch (error) {
            logger.error({ error }, 'LLM extraction failed');
            return emptyResult;
        }
    }

    /**
     * Normalize handle type to valid enum
     */
    private normalizeHandleType(type: string): HandleType {
        const normalized = type.toLowerCase();
        if (['whatsapp', 'telegram', 'wechat'].includes(normalized)) {
            return normalized as HandleType;
        }
        return 'other';
    }

    /**
     * Normalize wallet type to valid enum
     */
    private normalizeWalletType(type: string): WalletType {
        const normalized = type.toLowerCase();
        if (['ethereum', 'bitcoin'].includes(normalized)) {
            return normalized as WalletType;
        }
        return 'other';
    }

    /**
     * Deduplicate array of strings (case-insensitive)
     */
    private deduplicateArray(arr: string[]): string[] {
        const seen = new Set<string>();
        return arr.filter((item) => {
            const lower = item.toLowerCase();
            if (seen.has(lower)) return false;
            seen.add(lower);
            return true;
        });
    }

    /**
     * Deduplicate handles by value (case-insensitive)
     */
    private deduplicateHandles(handles: Array<{ type: HandleType; value: string }>): Array<{ type: HandleType; value: string }> {
        const seen = new Set<string>();
        return handles.filter((h) => {
            const key = h.value.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * Deduplicate wallets by value (case-insensitive)
     */
    private deduplicateWallets(wallets: Array<{ type: WalletType; value: string }>): Array<{ type: WalletType; value: string }> {
        const seen = new Set<string>();
        return wallets.filter((w) => {
            const key = w.value.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}

export default EntityExtractor;
