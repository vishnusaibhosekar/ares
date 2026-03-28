// src/service/EntityNormalizer.ts
// Service for normalizing extracted entities to canonical forms

import { Entity, EntityType } from '../domain/models';

/**
 * Parsed phone number structure
 */
export interface ParsedPhoneNumber {
    country: string;
    areaCode: string;
    number: string;
}

/**
 * Common country code prefixes for phone number parsing
 */
const COUNTRY_CODES: Record<string, string> = {
    '1': 'US/CA',
    '44': 'UK',
    '86': 'CN',
    '33': 'FR',
    '49': 'DE',
    '81': 'JP',
    '82': 'KR',
    '91': 'IN',
    '61': 'AU',
    '55': 'BR',
    '7': 'RU',
    '52': 'MX',
    '34': 'ES',
    '39': 'IT',
    '31': 'NL',
};

/**
 * EntityNormalizer - Normalizes entity values for consistent comparison
 */
export class EntityNormalizer {
    /**
     * Normalize an email address
     * - Convert to lowercase
     * - Trim whitespace
     * - Return empty string if invalid
     */
    normalizeEmail(email: string): string {
        if (!email || typeof email !== 'string') {
            return '';
        }

        const normalized = email.toLowerCase().trim();

        // Basic email validation
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(normalized)) {
            return '';
        }

        return normalized;
    }

    /**
     * Normalize a phone number to E.164 format
     * - Strip all non-digit characters except leading '+'
     * - Add country code if missing (default +1 for US/Canada)
     * - Return format: +[country][area][number]
     */
    normalizePhone(phone: string): string {
        if (!phone || typeof phone !== 'string') {
            return '';
        }

        // Keep only digits and leading +
        let digits = phone.replace(/[^\d+]/g, '');

        // If starts with +, keep it; otherwise add country code
        if (digits.startsWith('+')) {
            // Remove the + and work with digits only
            digits = digits.substring(1);
        } else if (digits.startsWith('00')) {
            // Some formats use 00 for international prefix
            digits = digits.substring(2);
        }

        // Remove any remaining + symbols
        digits = digits.replace(/\+/g, '');

        // Too short to be valid
        if (digits.length < 10) {
            return '';
        }

        // Too long to be valid
        if (digits.length > 15) {
            return '';
        }

        // If the number is exactly 10 digits, assume US/Canada (+1)
        if (digits.length === 10) {
            return '+1' + digits;
        }

        // If already has country code prefix (11+ digits), just add +
        return '+' + digits;
    }

    /**
     * Normalize a social media handle
     * - Remove @ prefix if present
     * - Convert to lowercase
     * - Trim whitespace
     */
    normalizeHandle(handle: string): string {
        if (!handle || typeof handle !== 'string') {
            return '';
        }

        let normalized = handle.trim().toLowerCase();

        // Remove @ prefix
        if (normalized.startsWith('@')) {
            normalized = normalized.substring(1);
        }

        // Trim again in case there was space after @
        return normalized.trim();
    }

    /**
     * Normalize a cryptocurrency wallet address
     * - Trim whitespace
     * - Convert to lowercase (for case-insensitive comparison)
     */
    normalizeWallet(wallet: string): string {
        if (!wallet || typeof wallet !== 'string') {
            return '';
        }

        return wallet.trim().toLowerCase();
    }

    /**
     * Normalize an entity based on its type
     */
    normalizeEntity(entity: Entity | { type: string; value: string }): string {
        if (!entity || !entity.type || !entity.value) {
            return '';
        }

        const entityType = entity.type as EntityType | string;
        const value = entity.value;

        switch (entityType) {
            case 'email':
                return this.normalizeEmail(value);
            case 'phone':
                return this.normalizePhone(value);
            case 'handle':
                return this.normalizeHandle(value);
            case 'wallet':
                return this.normalizeWallet(value);
            default:
                // For unknown types, just trim and lowercase
                return value.trim().toLowerCase();
        }
    }

    /**
     * Parse a phone number into its components
     */
    parsePhoneNumber(phone: string): ParsedPhoneNumber | null {
        if (!phone || typeof phone !== 'string') {
            return null;
        }

        const normalized = this.normalizePhone(phone);
        if (!normalized) {
            return null;
        }

        // Remove the leading +
        const digits = normalized.substring(1);

        // Try to identify country code
        const countryInfo = this.guessCountryCode(digits);

        return {
            country: countryInfo.code,
            areaCode: countryInfo.areaCode,
            number: countryInfo.number,
        };
    }

    /**
     * Guess the country code from a phone number
     * Default to +1 (US) if ambiguous
     */
    guessCountryCode(digits: string): { code: string; areaCode: string; number: string } {
        // Try 3-digit country codes first (rare but possible)
        for (const [code] of Object.entries(COUNTRY_CODES)) {
            if (digits.startsWith(code)) {
                const remaining = digits.substring(code.length);
                return {
                    code: '+' + code,
                    areaCode: remaining.substring(0, 3),
                    number: remaining.substring(3),
                };
            }
        }

        // Default to US (+1)
        if (digits.length === 11 && digits.startsWith('1')) {
            return {
                code: '+1',
                areaCode: digits.substring(1, 4),
                number: digits.substring(4),
            };
        }

        // If 10 digits, assume US
        if (digits.length === 10) {
            return {
                code: '+1',
                areaCode: digits.substring(0, 3),
                number: digits.substring(3),
            };
        }

        // Unknown format - return as-is with best guess
        return {
            code: '+' + digits.substring(0, 2),
            areaCode: digits.substring(2, 5),
            number: digits.substring(5),
        };
    }

    /**
     * Normalize all entities in a collection
     */
    normalizeAll<T extends { type: string; value: string }>(
        entities: T[]
    ): Array<T & { normalized_value: string }> {
        return entities.map((entity) => ({
            ...entity,
            normalized_value: this.normalizeEntity(entity),
        }));
    }

    /**
     * Check if two entities are equivalent after normalization
     */
    areEquivalent(entity1: { type: string; value: string }, entity2: { type: string; value: string }): boolean {
        if (entity1.type !== entity2.type) {
            return false;
        }

        const norm1 = this.normalizeEntity(entity1);
        const norm2 = this.normalizeEntity(entity2);

        if (!norm1 || !norm2) {
            return false;
        }

        return norm1 === norm2;
    }
}

export default EntityNormalizer;
