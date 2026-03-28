// tests/unit/EntityNormalizer.test.ts
// Unit tests for EntityNormalizer service

import { EntityNormalizer } from '../../src/service/EntityNormalizer';

describe('EntityNormalizer', () => {
    let normalizer: EntityNormalizer;

    beforeEach(() => {
        normalizer = new EntityNormalizer();
    });

    describe('normalizeEmail', () => {
        it('should lowercase and trim email', () => {
            expect(normalizer.normalizeEmail(' Email@Gmail.COM ')).toBe('email@gmail.com');
        });

        it('should preserve valid email structure', () => {
            expect(normalizer.normalizeEmail('first.last+tag@example.co.uk')).toBe(
                'first.last+tag@example.co.uk'
            );
        });

        it('should handle simple emails', () => {
            expect(normalizer.normalizeEmail('user@example.com')).toBe('user@example.com');
        });

        it('should handle emails with numbers', () => {
            expect(normalizer.normalizeEmail('User123@Test456.com')).toBe('user123@test456.com');
        });

        it('should return empty string for empty input', () => {
            expect(normalizer.normalizeEmail('')).toBe('');
            expect(normalizer.normalizeEmail('   ')).toBe('');
        });

        it('should return empty string for null/undefined', () => {
            expect(normalizer.normalizeEmail(null as unknown as string)).toBe('');
            expect(normalizer.normalizeEmail(undefined as unknown as string)).toBe('');
        });

        it('should return empty string for invalid email', () => {
            expect(normalizer.normalizeEmail('notanemail')).toBe('');
            expect(normalizer.normalizeEmail('missing@tld')).toBe('');
        });
    });

    describe('normalizePhone', () => {
        it('should normalize US phone with parentheses', () => {
            expect(normalizer.normalizePhone('(206) 123-4567')).toBe('+12061234567');
        });

        it('should normalize Chinese phone', () => {
            expect(normalizer.normalizePhone('+86 138 1234 5678')).toBe('+8613812345678');
        });

        it('should normalize US phone with spaces', () => {
            expect(normalizer.normalizePhone('206 123 4567')).toBe('+12061234567');
        });

        it('should normalize US phone with dashes and +1', () => {
            expect(normalizer.normalizePhone('+1-206-123-4567')).toBe('+12061234567');
        });

        it('should add +1 for 10-digit US numbers', () => {
            expect(normalizer.normalizePhone('2061234567')).toBe('+12061234567');
        });

        it('should keep existing country code', () => {
            expect(normalizer.normalizePhone('+442079460958')).toBe('+442079460958');
        });

        it('should return empty string for empty input', () => {
            expect(normalizer.normalizePhone('')).toBe('');
        });

        it('should return empty string for too-short phone', () => {
            expect(normalizer.normalizePhone('123456')).toBe('');
            expect(normalizer.normalizePhone('12345')).toBe('');
        });

        it('should return empty string for null/undefined', () => {
            expect(normalizer.normalizePhone(null as unknown as string)).toBe('');
            expect(normalizer.normalizePhone(undefined as unknown as string)).toBe('');
        });

        it('should handle phone with dots', () => {
            expect(normalizer.normalizePhone('206.123.4567')).toBe('+12061234567');
        });
    });

    describe('normalizeHandle', () => {
        it('should remove @ prefix', () => {
            expect(normalizer.normalizeHandle('@telegram_handle')).toBe('telegram_handle');
        });

        it('should lowercase handle', () => {
            expect(normalizer.normalizeHandle('WhatsApp_Handle')).toBe('whatsapp_handle');
        });

        it('should trim and lowercase with spaces', () => {
            expect(normalizer.normalizeHandle(' WeChat 123 ')).toBe('wechat 123');
        });

        it('should handle already normalized handles', () => {
            expect(normalizer.normalizeHandle('myhandle')).toBe('myhandle');
        });

        it('should return empty string for empty input', () => {
            expect(normalizer.normalizeHandle('')).toBe('');
            expect(normalizer.normalizeHandle('   ')).toBe('');
        });

        it('should return empty string for null/undefined', () => {
            expect(normalizer.normalizeHandle(null as unknown as string)).toBe('');
            expect(normalizer.normalizeHandle(undefined as unknown as string)).toBe('');
        });

        it('should handle @ with spaces after', () => {
            expect(normalizer.normalizeHandle('@ myhandle')).toBe('myhandle');
        });
    });

    describe('normalizeWallet', () => {
        it('should lowercase Ethereum address', () => {
            expect(normalizer.normalizeWallet('0xABCD1234567890ABCD1234567890ABCD12345678')).toBe(
                '0xabcd1234567890abcd1234567890abcd12345678'
            );
        });

        it('should trim whitespace', () => {
            expect(normalizer.normalizeWallet(' 0x1234abcd ')).toBe('0x1234abcd');
        });

        it('should preserve Bitcoin addresses', () => {
            expect(normalizer.normalizeWallet('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBe(
                '1bvbmseystwetqtfn5au4m4gfg7xjanvn2'
            );
        });

        it('should return empty string for empty input', () => {
            expect(normalizer.normalizeWallet('')).toBe('');
        });

        it('should return empty string for null/undefined', () => {
            expect(normalizer.normalizeWallet(null as unknown as string)).toBe('');
            expect(normalizer.normalizeWallet(undefined as unknown as string)).toBe('');
        });
    });

    describe('normalizeEntity', () => {
        it('should dispatch to email normalizer', () => {
            expect(
                normalizer.normalizeEntity({ type: 'email', value: 'Test@Example.COM' })
            ).toBe('test@example.com');
        });

        it('should dispatch to phone normalizer', () => {
            expect(
                normalizer.normalizeEntity({ type: 'phone', value: '(206) 123-4567' })
            ).toBe('+12061234567');
        });

        it('should dispatch to handle normalizer', () => {
            expect(
                normalizer.normalizeEntity({ type: 'handle', value: '@MyHandle' })
            ).toBe('myhandle');
        });

        it('should dispatch to wallet normalizer', () => {
            expect(
                normalizer.normalizeEntity({ type: 'wallet', value: '0xABCDEF' })
            ).toBe('0xabcdef');
        });

        it('should return empty string for unknown type', () => {
            expect(
                normalizer.normalizeEntity({ type: 'unknown', value: 'SomeValue' })
            ).toBe('somevalue');
        });

        it('should return empty string for null entity', () => {
            expect(normalizer.normalizeEntity(null as unknown as { type: string; value: string })).toBe('');
        });

        it('should return empty string for missing value', () => {
            expect(normalizer.normalizeEntity({ type: 'email', value: '' })).toBe('');
        });
    });

    describe('parsePhoneNumber', () => {
        it('should parse US phone number', () => {
            const result = normalizer.parsePhoneNumber('+1-206-123-4567');
            expect(result).not.toBeNull();
            expect(result?.country).toBe('+1');
        });

        it('should parse Chinese phone number', () => {
            const result = normalizer.parsePhoneNumber('+86 138 1234 5678');
            expect(result).not.toBeNull();
            expect(result?.country).toBe('+86');
        });

        it('should return null for invalid phone', () => {
            expect(normalizer.parsePhoneNumber('123')).toBeNull();
            expect(normalizer.parsePhoneNumber('')).toBeNull();
        });
    });

    describe('areEquivalent', () => {
        it('should return true for equivalent emails', () => {
            expect(
                normalizer.areEquivalent(
                    { type: 'email', value: 'Test@Example.com' },
                    { type: 'email', value: 'test@example.com' }
                )
            ).toBe(true);
        });

        it('should return true for equivalent phones', () => {
            expect(
                normalizer.areEquivalent(
                    { type: 'phone', value: '(206) 123-4567' },
                    { type: 'phone', value: '+1-206-123-4567' }
                )
            ).toBe(true);
        });

        it('should return false for different types', () => {
            expect(
                normalizer.areEquivalent(
                    { type: 'email', value: 'test@example.com' },
                    { type: 'phone', value: 'test@example.com' }
                )
            ).toBe(false);
        });

        it('should return false for different values', () => {
            expect(
                normalizer.areEquivalent(
                    { type: 'email', value: 'test1@example.com' },
                    { type: 'email', value: 'test2@example.com' }
                )
            ).toBe(false);
        });
    });

    describe('normalizeAll', () => {
        it('should normalize array of entities', () => {
            const entities = [
                { type: 'email', value: 'Test@Example.COM' },
                { type: 'phone', value: '206-123-4567' },
            ];
            const result = normalizer.normalizeAll(entities);

            expect(result).toHaveLength(2);
            expect(result[0].normalized_value).toBe('test@example.com');
            expect(result[1].normalized_value).toBe('+12061234567');
        });

        it('should handle empty array', () => {
            expect(normalizer.normalizeAll([])).toEqual([]);
        });
    });
});
