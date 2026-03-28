// src/util/validation.ts
// Input validation utilities

import {
    EMAIL_PATTERNS,
    PHONE_PATTERNS,
    HANDLE_PATTERNS,
    URL_PATTERNS,
    DOMAIN_PATTERNS,
} from '../domain/constants/patterns';

/**
 * Validate an email address
 */
export function validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
        return false;
    }
    return EMAIL_PATTERNS.STRICT.test(email.trim());
}

/**
 * Validate a phone number
 */
export function validatePhoneNumber(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
        return false;
    }
    // Remove common formatting characters
    const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
    // Check if it contains 10-15 digits
    return /^\+?\d{10,15}$/.test(cleaned);
}

/**
 * Validate a social media handle
 */
export function validateHandle(handle: string): boolean {
    if (!handle || typeof handle !== 'string') {
        return false;
    }
    // Generic handle validation (starts with @ and has valid characters)
    return HANDLE_PATTERNS.GENERIC.test(handle.trim());
}

/**
 * Validate a URL
 */
export function validateUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
        return false;
    }
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate a domain name
 */
export function validateDomain(domain: string): boolean {
    if (!domain || typeof domain !== 'string') {
        return false;
    }
    return DOMAIN_PATTERNS.STANDARD.test(domain.trim()) ||
        DOMAIN_PATTERNS.WITH_SUBDOMAIN.test(domain.trim());
}

/**
 * Normalize a URL (lowercase, remove trailing slash, remove fragments)
 */
export function normalizeUrl(url: string): string {
    if (!url) {
        return '';
    }

    try {
        const parsed = new URL(url);
        // Lowercase protocol and host
        let normalized = `${parsed.protocol}//${parsed.host.toLowerCase()}`;
        // Add path (remove trailing slash unless it's just "/")
        let path = parsed.pathname;
        if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        normalized += path;
        // Add search params if present
        if (parsed.search) {
            normalized += parsed.search;
        }
        return normalized;
    } catch {
        // If URL parsing fails, just lowercase and trim
        return url.toLowerCase().trim();
    }
}

/**
 * Extract domain from a URL
 */
export function extractDomainFromUrl(url: string): string {
    if (!url) {
        return '';
    }

    try {
        const parsed = new URL(url);
        return parsed.hostname.toLowerCase();
    } catch {
        // Try to extract domain manually
        const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/i);
        return match ? match[1].toLowerCase() : '';
    }
}

/**
 * Normalize an email address
 */
export function normalizeEmail(email: string): string {
    if (!email) {
        return '';
    }

    let normalized = email.toLowerCase().trim();

    // Handle Gmail-specific normalization
    const parts = normalized.split('@');
    if (parts.length === 2) {
        let localPart = parts[0];
        const domain = parts[1];

        // Gmail treats dots as optional and ignores + aliases
        if (domain === 'gmail.com' || domain === 'googlemail.com') {
            localPart = localPart.replace(/\./g, '').split('+')[0];
        }

        normalized = `${localPart}@${domain}`;
    }

    return normalized;
}

/**
 * Normalize a phone number (digits only, with optional country code)
 */
export function normalizePhoneNumber(phone: string): string {
    if (!phone) {
        return '';
    }
    // Keep only digits and leading +
    let normalized = phone.replace(/[^\d+]/g, '');
    // Ensure + is only at the start
    const hasPlus = normalized.startsWith('+');
    normalized = normalized.replace(/\+/g, '');
    return hasPlus ? `+${normalized}` : normalized;
}

/**
 * Normalize a handle (lowercase, remove @)
 */
export function normalizeHandle(handle: string): string {
    if (!handle) {
        return '';
    }
    return handle.toLowerCase().trim().replace(/^@/, '');
}

/**
 * Validate UUID format
 */
export function validateUuid(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') {
        return false;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Sanitize a string (remove control characters, trim)
 */
export function sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') {
        return '';
    }
    // Remove control characters except newlines and tabs
    return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

export default {
    validateEmail,
    validatePhoneNumber,
    validateHandle,
    validateUrl,
    validateDomain,
    normalizeUrl,
    extractDomainFromUrl,
    normalizeEmail,
    normalizePhoneNumber,
    normalizeHandle,
    validateUuid,
    sanitizeString,
};
