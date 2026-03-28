// src/index.ts
// ARES (Actor Resolution & Entity Service) - Entry Point

import { env, getSafeConfig } from './util/env';
import { logger } from './util/logger';
import { createApp } from './api/server';
import { Database } from './repository/Database';

/**
 * Start the ARES server
 */
async function main(): Promise<void> {
    logger.info('Starting ARES (Actor Resolution & Entity Service)...');

    // Log configuration (safe values only)
    logger.info({ config: getSafeConfig() }, 'Configuration loaded');

    // Initialize database connection (optional in production without SDK)
    let dbConnected = false;
    if (env.INSFORGE_BASE_URL && env.INSFORGE_ANON_KEY) {
        try {
            logger.info('Connecting to Insforge database...');
            const db = Database.getInstance(env.INSFORGE_BASE_URL, env.INSFORGE_ANON_KEY);
            await db.connect();
            dbConnected = true;
            logger.info('Insforge database connection established');
        } catch (error) {
            logger.error({ error }, 'Failed to connect to Insforge database');
            logger.warn('Continuing without database connection');
        }
    } else {
        logger.warn('INSFORGE_BASE_URL or INSFORGE_ANON_KEY not set, running without database');
    }

    // Create Express application
    const app = createApp();

    // Start server
    const server = app.listen(env.PORT, () => {
        logger.info({
            port: env.PORT,
            env: env.NODE_ENV,
            database: dbConnected ? 'connected' : 'disconnected',
        }, `ARES server listening on port ${env.PORT}`);

        // Log startup info
        console.log('\n================================');
        console.log('  ARES Server Started');
        console.log('================================');
        console.log(`  URL:      http://localhost:${env.PORT}`);
        console.log(`  Health:   http://localhost:${env.PORT}/health`);
        console.log(`  Env:      ${env.NODE_ENV}`);
        console.log(`  Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
        console.log('================================\n');
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string): Promise<void> => {
        logger.info({ signal }, 'Received shutdown signal');

        // Close HTTP server
        server.close(() => {
            logger.info('HTTP server closed');
        });

        // Close database connection
        if (dbConnected) {
            try {
                const db = Database.getInstance();
                await db.close();
                logger.info('Database connection closed');
            } catch (error) {
                logger.error({ error }, 'Error closing database connection');
            }
        }

        // Exit process
        process.exit(0);
    };

    // Handle termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        logger.fatal({ error }, 'Uncaught exception');
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        logger.fatal({ reason }, 'Unhandled rejection');
        process.exit(1);
    });
}

// Start the application
main().catch((error) => {
    console.error('Failed to start ARES:', error);
    process.exit(1);
});
