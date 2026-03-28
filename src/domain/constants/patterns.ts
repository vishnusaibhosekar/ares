// src/domain/constants/patterns.ts
// Regex patterns for entity extraction

/**
 * Email patterns
 */
export const EMAIL_PATTERNS = {
    /** Standard email pattern */
    STANDARD: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    /** Email with more strict validation */
    STRICT: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
} as const;

/**
 * Phone number patterns
 */
export const PHONE_PATTERNS = {
    /** International format */
    INTERNATIONAL: /\+?[1-9]\d{1,14}/g,
    /** US format */
    US: /(\+1)?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /** Generic digits */
    GENERIC: /\d{10,15}/g,
} as const;

/**
 * Social media handle patterns
 */
export const HANDLE_PATTERNS = {
    /** Twitter/X handle */
    TWITTER: /@[a-zA-Z0-9_]{1,15}/g,
    /** Instagram handle */
    INSTAGRAM: /@[a-zA-Z0-9._]{1,30}/g,
    /** Telegram handle */
    TELEGRAM: /@[a-zA-Z0-9_]{5,32}/g,
    /** WhatsApp (phone-based) */
    WHATSAPP: /\+\d{10,15}/g,
    /** Generic @ handle */
    GENERIC: /@[a-zA-Z0-9._]{1,50}/g,
} as const;

/**
 * Crypto wallet patterns
 */
export const WALLET_PATTERNS = {
    /** Bitcoin address */
    BITCOIN: /[13][a-km-zA-HJ-NP-Z1-9]{25,34}/g,
    /** Ethereum address */
    ETHEREUM: /0x[a-fA-F0-9]{40}/g,
    /** USDT (same as Ethereum) */
    USDT_ERC20: /0x[a-fA-F0-9]{40}/g,
    /** Litecoin address */
    LITECOIN: /[LM][a-km-zA-HJ-NP-Z1-9]{26,33}/g,
} as const;

/**
 * Domain patterns
 */
export const DOMAIN_PATTERNS = {
    /** Standard domain */
    STANDARD: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/,
    /** Domain with subdomains */
    WITH_SUBDOMAIN: /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/,
} as const;

/**
 * URL patterns
 */
export const URL_PATTERNS = {
    /** Full URL */
    FULL: /https?:\/\/[^\s]+/g,
    /** URL with optional protocol */
    OPTIONAL_PROTOCOL: /(https?:\/\/)?[^\s]+\.[a-zA-Z]{2,}[^\s]*/g,
} as const;

export default {
    EMAIL_PATTERNS,
    PHONE_PATTERNS,
    HANDLE_PATTERNS,
    WALLET_PATTERNS,
    DOMAIN_PATTERNS,
    URL_PATTERNS,
};
