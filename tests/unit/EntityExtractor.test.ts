// tests/unit/EntityExtractor.test.ts
// Unit tests for EntityExtractor service

import { EntityExtractor, ExtractedEntities } from '../../src/service/EntityExtractor';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EntityExtractor', () => {
    let extractor: EntityExtractor;

    beforeEach(() => {
        extractor = new EntityExtractor();
        jest.clearAllMocks();
    });

    describe('extractEmails', () => {
        it('should extract simple email addresses', () => {
            const text = 'Contact us at support@example.com';
            const emails = extractor.extractEmails(text);
            expect(emails).toEqual(['support@example.com']);
        });

        it('should extract multiple emails', () => {
            const text = 'Email: sales@company.com or support@company.org';
            const emails = extractor.extractEmails(text);
            expect(emails).toContain('sales@company.com');
            expect(emails).toContain('support@company.org');
        });

        it('should extract emails with dots and numbers', () => {
            const text = 'Contact john.doe123@email-service.co.uk';
            const emails = extractor.extractEmails(text);
            expect(emails).toEqual(['john.doe123@email-service.co.uk']);
        });

        it('should extract emails with plus signs', () => {
            const text = 'Email: user+tag@gmail.com';
            const emails = extractor.extractEmails(text);
            expect(emails).toEqual(['user+tag@gmail.com']);
        });

        it('should deduplicate emails (case-insensitive)', () => {
            const text = 'Contact Support@Example.com or SUPPORT@example.COM';
            const emails = extractor.extractEmails(text);
            expect(emails).toHaveLength(1);
            expect(emails[0]).toBe('support@example.com');
        });

        it('should return empty array for empty text', () => {
            expect(extractor.extractEmails('')).toEqual([]);
            expect(extractor.extractEmails('   ')).toEqual([]);
        });

        it('should return empty array when no emails present', () => {
            const text = 'No contact information here';
            expect(extractor.extractEmails(text)).toEqual([]);
        });
    });

    describe('extractPhones', () => {
        it('should extract US phone numbers with parentheses', () => {
            const text = 'Call us at (206) 123-4567';
            const phones = extractor.extractPhones(text);
            expect(phones).toContain('2061234567');
        });

        it('should extract US phone numbers with dashes', () => {
            const text = 'Phone: 206-123-4567';
            const phones = extractor.extractPhones(text);
            expect(phones).toContain('2061234567');
        });

        it('should extract international format (+1)', () => {
            const text = 'Call +1-206-123-4567';
            const phones = extractor.extractPhones(text);
            expect(phones.some((p) => p.includes('12061234567'))).toBe(true);
        });

        it('should extract Chinese phone numbers (+86)', () => {
            const text = 'WeChat: +86 138 1234 5678';
            const phones = extractor.extractPhones(text);
            expect(phones.some((p) => p.includes('8613812345678'))).toBe(true);
        });

        it('should extract UK phone numbers (+44)', () => {
            const text = 'UK Office: +44 20 7946 0958';
            const phones = extractor.extractPhones(text);
            expect(phones.some((p) => p.includes('442079460958'))).toBe(true);
        });

        it('should filter out too-short phone numbers', () => {
            const text = 'Call 123-456';
            const phones = extractor.extractPhones(text);
            expect(phones).toHaveLength(0);
        });

        it('should deduplicate phone numbers', () => {
            const text = 'Call (206) 123-4567 or 206.123.4567';
            const phones = extractor.extractPhones(text);
            expect(phones).toHaveLength(1);
        });

        it('should return empty array for empty text', () => {
            expect(extractor.extractPhones('')).toEqual([]);
        });
    });

    describe('extractHandles', () => {
        it('should extract Telegram handles', () => {
            const text = 'Contact us on Telegram @exampleshop';
            const handles = extractor.extractHandles(text);
            expect(handles).toContainEqual({ type: 'telegram', value: 'exampleshop' });
        });

        it('should extract WhatsApp numbers from text', () => {
            const text = 'WhatsApp: +1 206 123 4567';
            const handles = extractor.extractHandles(text);
            expect(handles.some((h) => h.type === 'whatsapp')).toBe(true);
        });

        it('should extract WeChat IDs', () => {
            const text = 'WeChat: myshop123';
            const handles = extractor.extractHandles(text);
            expect(handles).toContainEqual({ type: 'wechat', value: 'myshop123' });
        });

        it('should extract generic @handles', () => {
            const text = 'Follow us @instagram_shop';
            const handles = extractor.extractHandles(text);
            expect(handles.some((h) => h.value === 'instagram_shop')).toBe(true);
        });

        it('should deduplicate handles', () => {
            const text = '@myhandle and @MyHandle again';
            const handles = extractor.extractHandles(text);
            expect(handles.filter((h) => h.value.toLowerCase() === 'myhandle')).toHaveLength(1);
        });

        it('should return empty array for empty text', () => {
            expect(extractor.extractHandles('')).toEqual([]);
        });
    });

    describe('extractWallets', () => {
        it('should extract Ethereum addresses', () => {
            const text = 'Pay to: 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD80';
            const wallets = extractor.extractWallets(text);
            expect(wallets).toContainEqual({
                type: 'ethereum',
                value: '0x742d35cc6634c0532925a3b844bc9e7595f2bd80',
            });
        });

        it('should extract Bitcoin addresses', () => {
            const text = 'BTC: 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
            const wallets = extractor.extractWallets(text);
            expect(wallets.some((w) => w.type === 'bitcoin')).toBe(true);
        });

        it('should lowercase Ethereum addresses', () => {
            const text = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
            const wallets = extractor.extractWallets(text);
            expect(wallets[0].value).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
        });

        it('should return empty array for empty text', () => {
            expect(extractor.extractWallets('')).toEqual([]);
        });
    });

    describe('extract (main method)', () => {
        it('should combine all extraction methods', async () => {
            const text = `
        Contact: support@example.com
        Phone: +1-206-123-4567
        Telegram: @exampleshop
        ETH: 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD80
      `;
            const result = await extractor.extract(text, false);

            expect(result.emails).toContain('support@example.com');
            expect(result.phones.length).toBeGreaterThan(0);
            expect(result.handles.some((h) => h.value === 'exampleshop')).toBe(true);
            expect(result.wallets.length).toBeGreaterThan(0);
            expect(result.raw_extraction_time_ms).toBeGreaterThanOrEqual(0);
        });

        it('should return empty results for empty text', async () => {
            const result = await extractor.extract('', false);
            expect(result.emails).toEqual([]);
            expect(result.phones).toEqual([]);
            expect(result.handles).toEqual([]);
            expect(result.wallets).toEqual([]);
        });

        it('should handle text with no entities', async () => {
            const result = await extractor.extract('Just some random text without entities', false);
            expect(result.emails).toEqual([]);
            expect(result.phones).toEqual([]);
        });
    });

    describe('extractEntitiesWithLLM', () => {
        it('should parse LLM response correctly', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    content: [
                        {
                            text: JSON.stringify({
                                emails: ['test@example.com'],
                                phones: ['+12061234567'],
                                handles: [{ type: 'telegram', value: 'myshop' }],
                                wallets: [{ type: 'ethereum', value: '0x123...' }],
                            }),
                        },
                    ],
                },
            });

            const extractorWithKey = new EntityExtractor('test-api-key');
            const result = await extractorWithKey['extractEntitiesWithLLM']('some text');

            expect(result.emails).toContain('test@example.com');
            expect(result.phones).toContain('+12061234567');
            expect(result.handles).toContainEqual({ type: 'telegram', value: 'myshop' });
        });

        it('should return empty results on LLM failure', async () => {
            mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));

            const extractorWithKey = new EntityExtractor('test-api-key');
            const result = await extractorWithKey['extractEntitiesWithLLM']('some text');

            expect(result.emails).toEqual([]);
            expect(result.phones).toEqual([]);
            expect(result.handles).toEqual([]);
            expect(result.wallets).toEqual([]);
        });

        it('should return empty results when API key is missing', async () => {
            const result = await extractor['extractEntitiesWithLLM']('some text');
            expect(result.emails).toEqual([]);
        });

        it('should handle malformed JSON response', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    content: [{ text: 'not valid json' }],
                },
            });

            const extractorWithKey = new EntityExtractor('test-api-key');
            const result = await extractorWithKey['extractEntitiesWithLLM']('some text');

            expect(result.emails).toEqual([]);
        });
    });

    describe('extract with LLM enabled', () => {
        it('should merge regex and LLM results', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    content: [
                        {
                            text: JSON.stringify({
                                emails: ['llm@example.com'],
                                phones: [],
                                handles: [],
                                wallets: [],
                            }),
                        },
                    ],
                },
            });

            const extractorWithKey = new EntityExtractor('test-api-key');
            const text = 'Contact regex@example.com for info';
            const result = await extractorWithKey.extract(text, true);

            expect(result.emails).toContain('regex@example.com');
            expect(result.emails).toContain('llm@example.com');
        });

        it('should deduplicate merged results', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    content: [
                        {
                            text: JSON.stringify({
                                emails: ['same@example.com'],
                                phones: [],
                                handles: [],
                                wallets: [],
                            }),
                        },
                    ],
                },
            });

            const extractorWithKey = new EntityExtractor('test-api-key');
            const text = 'Contact same@example.com';
            const result = await extractorWithKey.extract(text, true);

            expect(result.emails).toHaveLength(1);
            expect(result.emails).toContain('same@example.com');
        });

        it('should fall back to regex results on LLM failure', async () => {
            mockedAxios.post.mockRejectedValueOnce(new Error('LLM Error'));

            const extractorWithKey = new EntityExtractor('test-api-key');
            const text = 'Contact fallback@example.com';
            const result = await extractorWithKey.extract(text, true);

            expect(result.emails).toContain('fallback@example.com');
        });
    });

    describe('edge cases', () => {
        it('should handle very long text by truncating for LLM', async () => {
            const longText = 'a'.repeat(10000) + ' email@test.com';
            const result = await extractor.extract(longText, false);
            expect(result.emails).toContain('email@test.com');
        });

        it('should handle special characters in text', async () => {
            const text = 'Email: test@example.com! Call: (206) 123-4567.';
            const result = await extractor.extract(text, false);
            expect(result.emails).toContain('test@example.com');
        });

        it('should handle Unicode text', async () => {
            const text = '联系我们 support@example.com 或 WeChat: shop123';
            const result = await extractor.extract(text, false);
            expect(result.emails).toContain('support@example.com');
            expect(result.handles.some((h) => h.value === 'shop123')).toBe(true);
        });
    });
});
