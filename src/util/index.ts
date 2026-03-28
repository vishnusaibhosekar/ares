// src/util/index.ts
// Export all utilities

export { logger, createChildLogger, createRequestLogger, logOperation, LogLevel } from './logger';
export { env, EnvConfig, isDevelopment, isProduction, isTest, getSafeConfig } from './env';
export {
    generateId,
    generateClusterName,
    generateRandomString,
    generateRandomNumber,
    generateConfidence,
    pickRandom,
    shuffleArray,
} from './random';
export {
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
} from './validation';
