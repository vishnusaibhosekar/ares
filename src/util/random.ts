// src/util/random.ts
// Random value generation utilities

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a UUID v4 string
 */
export function generateId(): string {
    return uuidv4();
}

/**
 * Greek letter names for cluster naming
 */
const GREEK_LETTERS = [
    'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
    'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi',
    'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
];

/**
 * Generate a human-readable cluster name
 * Format: "Cluster-{greek_letter}-{number}"
 * Example: "Cluster-alpha-42"
 */
export function generateClusterName(): string {
    const letter = GREEK_LETTERS[Math.floor(Math.random() * GREEK_LETTERS.length)];
    const number = Math.floor(Math.random() * 100);
    return `Cluster-${letter}-${number}`;
}

/**
 * Generate a random string of specified length
 */
export function generateRandomString(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generate a random number within a range
 */
export function generateRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random confidence score between 0 and 1
 */
export function generateConfidence(): number {
    return Math.round(Math.random() * 100) / 100;
}

/**
 * Pick a random element from an array
 */
export function pickRandom<T>(array: T[]): T {
    if (array.length === 0) {
        throw new Error('Cannot pick from empty array');
    }
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
export function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export default {
    generateId,
    generateClusterName,
    generateRandomString,
    generateRandomNumber,
    generateConfidence,
    pickRandom,
    shuffleArray,
};
