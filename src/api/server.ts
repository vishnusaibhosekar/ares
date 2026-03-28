/**
 * Express Server Configuration
 * Main application setup with routes and middleware
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { logger } from '../util/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { loggerMiddleware } from './middleware/logger';
import {
    ingestSiteRouter,
    resolveActorRouter,
    clustersRouter,
    seedsRouter,
    healthRouter,
} from './routes';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
    const app = express();

    // ============================================
    // Middleware
    // ============================================

    // Parse JSON bodies
    app.use(express.json({ limit: '10mb' }));

    // Parse URL-encoded bodies
    app.use(express.urlencoded({ extended: true }));

    // Enable CORS
    app.use(cors({
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }));

    // Request logging middleware
    app.use(loggerMiddleware);

    // ============================================
    // Health Check (before other routes)
    // ============================================
    app.use('/health', healthRouter);

    // ============================================
    // API Routes
    // ============================================

    // POST /api/ingest-site - Ingest a new storefront
    app.use('/api/ingest-site', ingestSiteRouter);

    // POST /api/resolve-actor - Resolve a site to an operator cluster
    app.use('/api/resolve-actor', resolveActorRouter);

    // GET /api/clusters/:id - Fetch cluster details
    app.use('/api/clusters', clustersRouter);

    // POST /api/seeds - Dev-only route for seeding test data
    // Only available in development/test environments
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        app.use('/api/seeds', seedsRouter);
        logger.info('Seeds endpoint enabled (development mode)');
    }

    // ============================================
    // Static Files (Frontend)
    // ============================================

    // Serve frontend static files in production
    if (process.env.NODE_ENV === 'production') {
        const frontendPath = path.join(__dirname, '../../frontend/dist');
        app.use(express.static(frontendPath));

        // SPA fallback - serve index.html for all non-API routes
        app.get('*', (req: Request, res: Response) => {
            // Don't serve index.html for API routes
            if (req.path.startsWith('/api') || req.path === '/health') {
                res.status(404).json({ error: 'Not Found' });
                return;
            }
            res.sendFile(path.join(frontendPath, 'index.html'));
        });
    } else {
        // 404 handler for unmatched routes (development)
        app.use(notFoundHandler);
    }

    // ============================================
    // Error Handling
    // ============================================

    // Global error handler (must be last)
    app.use(errorHandler);

    return app;
}

/**
 * Start the server
 */
export function startServer(port: number = 3000): void {
    const app = createApp();

    app.listen(port, () => {
        logger.info({ port, env: process.env.NODE_ENV }, `ARES server listening on port ${port}`);
        console.log(`
╔═══════════════════════════════════════════════════╗
║           ARES - Actor Resolution Engine          ║
║          Entity Service for Insforge              ║
╠═══════════════════════════════════════════════════╣
║  Server running on: http://localhost:${port}         ║
║  Health check:      http://localhost:${port}/health  ║
║  Environment:       ${(process.env.NODE_ENV || 'development').padEnd(26)}║
╚═══════════════════════════════════════════════════╝
    `);
    });
}

export default createApp;
