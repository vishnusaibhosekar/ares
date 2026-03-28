// src/util/env.ts
// Environment configuration with validation

import * as dotenv from 'dotenv';

// Load .env file
dotenv.config();

/**
 * Environment variable types
 */
type NodeEnv = 'development' | 'production' | 'test';

/**
 * Application configuration interface
 */
export interface EnvConfig {
    DATABASE_URL: string;
    MIXEDBREAD_API_KEY: string;
    NODE_ENV: NodeEnv;
    PORT: number;
    LOG_LEVEL: string;
    CORS_ORIGIN: string;
}

/**
 * Required environment variables
 */
const REQUIRED_VARS = ['DATABASE_URL'] as const;

/**
 * Validate and parse environment variables
 */
function validateEnv(): EnvConfig {
    const errors: string[] = [];

    // Check required variables
    for (const varName of REQUIRED_VARS) {
        if (!process.env[varName]) {
            errors.push(`Missing required environment variable: ${varName}`);
        }
    }

    // Validate NODE_ENV
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (!['development', 'production', 'test'].includes(nodeEnv)) {
        errors.push(`Invalid NODE_ENV: ${nodeEnv}. Must be 'development', 'production', or 'test'`);
    }

    // Validate PORT
    const port = parseInt(process.env.PORT || '3000', 10);
    if (isNaN(port) || port < 1 || port > 65535) {
        errors.push(`Invalid PORT: ${process.env.PORT}. Must be a number between 1 and 65535`);
    }

    // Report errors
    if (errors.length > 0) {
        console.error('\n================================');
        console.error('Environment Configuration Errors:');
        console.error('================================');
        errors.forEach((error) => console.error(`  - ${error}`));
        console.error('\nPlease check your .env file or environment variables.');
        console.error('See .env.example for required configuration.\n');

        // In production, exit immediately
        if (nodeEnv === 'production') {
            process.exit(1);
        }
    }

    return {
        DATABASE_URL: process.env.DATABASE_URL || '',
        MIXEDBREAD_API_KEY: process.env.MIXEDBREAD_API_KEY || '',
        NODE_ENV: nodeEnv as NodeEnv,
        PORT: port,
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    };
}

/**
 * Validated environment configuration
 */
export const env = validateEnv();

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
    return env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
    return env.NODE_ENV === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
    return env.NODE_ENV === 'test';
}

/**
 * Get a safe representation of config (hides sensitive values)
 */
export function getSafeConfig(): Record<string, string> {
    return {
        DATABASE_URL: env.DATABASE_URL ? '[SET]' : '[NOT SET]',
        MIXEDBREAD_API_KEY: env.MIXEDBREAD_API_KEY ? '[SET]' : '[NOT SET]',
        NODE_ENV: env.NODE_ENV,
        PORT: String(env.PORT),
        LOG_LEVEL: env.LOG_LEVEL,
        CORS_ORIGIN: env.CORS_ORIGIN,
    };
}

export default env;
