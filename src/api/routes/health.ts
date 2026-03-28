/**
 * GET /health Route
 * Health check endpoint for monitoring
 */

import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../../util/logger';
import type { HealthResponse } from '../../domain/types/api';
import { Database } from '../../repository/Database';

const router = Router();

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<'connected' | 'disconnected'> {
    try {
        const db = Database.getInstance();
        // Check if connected using the isConnected flag
        if (!db.isConnected()) {
            return 'disconnected';
        }
        return 'connected';
    } catch {
        return 'disconnected';
    }
}

/**
 * Check if embedding API is configured
 */
function checkEmbeddingConfig(): 'configured' | 'not_configured' {
    const apiKey = process.env.MIXEDBREAD_API_KEY;
    return apiKey && apiKey.length > 0 ? 'configured' : 'not_configured';
}

/**
 * Check if Anthropic API is configured
 */
function checkAnthropicConfig(): 'configured' | 'not_configured' {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    return apiKey && apiKey.length > 0 ? 'configured' : 'not_configured';
}

/**
 * GET /health
 * Returns service health status
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    try {
        // Check all dependencies
        const dbStatus = await checkDatabase();
        const embeddingStatus = checkEmbeddingConfig();
        const anthropicStatus = checkAnthropicConfig();

        // Determine overall status
        const isHealthy = dbStatus === 'connected';
        const isDegraded = !isHealthy || embeddingStatus === 'not_configured';

        const status: HealthResponse['status'] = isHealthy
            ? (isDegraded ? 'degraded' : 'ok')
            : 'error';

        const response: HealthResponse & {
            embeddings?: string;
            llm?: string;
            uptime_seconds?: number;
        } = {
            status,
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            database: dbStatus,
            embeddings: embeddingStatus,
            llm: anthropicStatus,
            uptime_seconds: Math.floor(process.uptime()),
        };

        const duration = Date.now() - startTime;

        // Log health check (debug level to avoid spam)
        logger.debug({
            status,
            database: dbStatus,
            embeddings: embeddingStatus,
            llm: anthropicStatus,
            duration,
        }, 'Health check completed');

        // Return appropriate status code
        const statusCode = status === 'ok' ? 200 : status === 'degraded' ? 200 : 503;

        res.status(statusCode).json(response);
    } catch (error) {
        // If health check itself fails, return error status
        logger.error({ error }, 'Health check failed');

        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
        });
    }
});

export { router as healthRouter };
export default router;
