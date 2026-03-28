/**
 * Error Handler Middleware
 * Catches all errors and returns consistent error responses
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../../util/logger';
import { generateId } from '../../util/random';

/**
 * Standard error response interface
 */
export interface ErrorResponse {
    error: string;
    code: string;
    details?: unknown;
    timestamp: string;
    request_id: string;
}

/**
 * Custom application error with status code
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;
    public readonly details?: unknown;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        details?: unknown
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        this.details = details;

        Object.setPrototypeOf(this, AppError.prototype);
    }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(message, 409, 'CONFLICT');
    }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

/**
 * Get request ID from headers or generate new one
 */
function getRequestId(req: Request): string {
    const headerRequestId = req.headers['x-request-id'];
    if (typeof headerRequestId === 'string') {
        return headerRequestId;
    }
    return generateId();
}

/**
 * Format Zod validation errors
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    for (const issue of error.errors) {
        const path = issue.path.join('.') || 'root';
        if (!formatted[path]) {
            formatted[path] = [];
        }
        formatted[path].push(issue.message);
    }

    return formatted;
}

/**
 * Build error response object
 */
function buildErrorResponse(
    error: string,
    code: string,
    requestId: string,
    details?: unknown
): ErrorResponse {
    const response: ErrorResponse = {
        error,
        code,
        timestamp: new Date().toISOString(),
        request_id: requestId,
    };

    if (details !== undefined) {
        response.details = details;
    }

    return response;
}

/**
 * Global error handling middleware
 */
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    const requestId = getRequestId(req);

    // Handle Zod validation errors
    if (err instanceof ZodError) {
        const details = formatZodErrors(err);

        logger.warn({
            requestId,
            path: req.path,
            method: req.method,
            validationErrors: details,
        }, 'Validation error');

        res.status(400).json(
            buildErrorResponse(
                'Validation failed',
                'VALIDATION_ERROR',
                requestId,
                details
            )
        );
        return;
    }

    // Handle custom AppError
    if (err instanceof AppError) {
        logger.warn({
            requestId,
            path: req.path,
            method: req.method,
            statusCode: err.statusCode,
            code: err.code,
            message: err.message,
        }, 'Application error');

        res.status(err.statusCode).json(
            buildErrorResponse(
                err.message,
                err.code,
                requestId,
                err.details
            )
        );
        return;
    }

    // Handle unexpected errors
    logger.error({
        requestId,
        path: req.path,
        method: req.method,
        error: err.message,
        stack: err.stack,
    }, 'Unexpected error');

    // Don't expose internal details in production
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(500).json(
        buildErrorResponse(
            message,
            'INTERNAL_SERVER_ERROR',
            requestId,
            process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined
        )
    );
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
    const requestId = getRequestId(req);

    logger.info({
        requestId,
        path: req.path,
        method: req.method,
    }, 'Route not found');

    res.status(404).json(
        buildErrorResponse(
            'Not Found',
            'NOT_FOUND',
            requestId,
            { path: req.path }
        )
    );
}

export default errorHandler;
