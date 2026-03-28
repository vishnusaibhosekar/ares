/**
 * Request Logging Middleware
 * Logs all requests and responses with structured JSON
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../util/logger';
import { generateId } from '../../util/random';

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'api_key', 'apiKey', 'token', 'secret', 'authorization'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(body)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeBody(value as Record<string, unknown>);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Truncate long strings (like page_text) for logging
 */
function truncateForLogging(body: Record<string, unknown>, maxLength: number = 500): Record<string, unknown> {
    const truncated: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string' && value.length > maxLength) {
            truncated[key] = `${value.substring(0, maxLength)}... (truncated, ${value.length} chars)`;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            truncated[key] = truncateForLogging(value as Record<string, unknown>, maxLength);
        } else {
            truncated[key] = value;
        }
    }

    return truncated;
}

/**
 * Request logging middleware
 */
export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Get or generate request ID
    let requestId = req.headers['x-request-id'];
    if (typeof requestId !== 'string') {
        requestId = generateId();
    }

    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);

    // Attach request ID to request for use in handlers
    (req as RequestWithId).requestId = requestId;

    // Log incoming request
    const logBody = req.body && Object.keys(req.body).length > 0
        ? truncateForLogging(sanitizeBody(req.body as Record<string, unknown>))
        : undefined;

    logger.info({
        requestId,
        method: req.method,
        path: req.path,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        body: logBody,
        userAgent: req.headers['user-agent'],
        contentType: req.headers['content-type'],
        ip: req.ip || req.socket.remoteAddress,
    }, 'Incoming request');

    // Capture response
    const originalSend = res.send;
    let responseBody: unknown;

    res.send = function (body: unknown): Response {
        responseBody = body;
        return originalSend.call(this, body);
    };

    // Log response on finish
    res.on('finish', () => {
        const duration = Date.now() - startTime;

        // Parse response body for logging (truncate if needed)
        let parsedBody: unknown;
        if (typeof responseBody === 'string') {
            try {
                const parsed = JSON.parse(responseBody);
                parsedBody = truncateForLogging(parsed as Record<string, unknown>, 200);
            } catch {
                parsedBody = responseBody.length > 200
                    ? `${responseBody.substring(0, 200)}...`
                    : responseBody;
            }
        }

        const logLevel = res.statusCode >= 500 ? 'error'
            : res.statusCode >= 400 ? 'warn'
                : 'info';

        logger[logLevel]({
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            contentLength: res.get('content-length'),
            response: res.statusCode >= 400 ? parsedBody : undefined,
        }, `Request completed in ${duration}ms`);
    });

    next();
}

/**
 * Extended request with request ID
 */
export interface RequestWithId extends Request {
    requestId: string;
}

/**
 * Get request ID from request object
 */
export function getRequestId(req: Request): string {
    return (req as RequestWithId).requestId || generateId();
}

export default loggerMiddleware;
