// src/util/logger.ts
// Pino logger configuration with structured logging

import pino from 'pino';
import { env } from './env';

/**
 * Log levels supported by pino
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Create pino logger instance
 */
function createLogger(): pino.Logger {
    const isDevelopment = env.NODE_ENV === 'development';

    const options: pino.LoggerOptions = {
        level: env.LOG_LEVEL || 'info',
        // Add base context
        base: {
            service: 'ares',
            env: env.NODE_ENV,
        },
        // Timestamp format
        timestamp: pino.stdTimeFunctions.isoTime,
        // Redact sensitive fields
        redact: {
            paths: ['password', 'apiKey', 'token', 'authorization', 'cookie'],
            censor: '[REDACTED]',
        },
    };

    // Use pino-pretty in development for human-readable logs
    if (isDevelopment) {
        return pino({
            ...options,
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname,service,env',
                },
            },
        });
    }

    // Use standard JSON output in production
    return pino(options);
}

/**
 * Main logger instance
 */
export const logger = createLogger();

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, unknown>): pino.Logger {
    return logger.child(context);
}

/**
 * Create a request-specific logger
 */
export function createRequestLogger(requestId: string, path?: string): pino.Logger {
    return logger.child({
        requestId,
        path,
    });
}

/**
 * Log an operation with timing
 */
export async function logOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, unknown>
): Promise<T> {
    const startTime = Date.now();
    const operationLogger = context ? logger.child(context) : logger;

    operationLogger.debug({ operation: operationName }, `Starting ${operationName}`);

    try {
        const result = await operation();
        const duration = Date.now() - startTime;
        operationLogger.info({ operation: operationName, duration }, `Completed ${operationName}`);
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        operationLogger.error(
            { operation: operationName, duration, error },
            `Failed ${operationName}`
        );
        throw error;
    }
}

export default logger;
