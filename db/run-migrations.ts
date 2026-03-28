// db/run-migrations.ts
// Database migration runner for ARES

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

interface MigrationResult {
    file: string;
    success: boolean;
    duration: number;
    error?: string;
}

/**
 * Run all database migrations
 */
async function runMigrations(): Promise<void> {
    const startTime = Date.now();
    console.log('ARES Database Migration Runner');
    console.log('================================\n');

    // Validate environment
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('ERROR: DATABASE_URL environment variable is required');
        console.error('Set it in .env or export it before running migrations');
        process.exit(1);
    }

    // Create database connection
    const pool = new Pool({
        connectionString: databaseUrl,
        max: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });

    const results: MigrationResult[] = [];

    try {
        // Test connection
        console.log('Connecting to database...');
        const client = await pool.connect();
        console.log('Connected successfully!\n');
        client.release();

        // Get migration files
        const files = fs.readdirSync(MIGRATIONS_DIR)
            .filter((file) => file.endsWith('.sql'))
            .sort();

        if (files.length === 0) {
            console.log('No migration files found in', MIGRATIONS_DIR);
            process.exit(0);
        }

        console.log(`Found ${files.length} migration file(s):\n`);
        files.forEach((file) => console.log(`  - ${file}`));
        console.log('');

        // Run each migration
        for (const file of files) {
            const migrationStart = Date.now();
            const filePath = path.join(MIGRATIONS_DIR, file);

            console.log(`Running: ${file}...`);

            try {
                const sql = fs.readFileSync(filePath, 'utf-8');

                // Execute migration
                await pool.query(sql);

                const duration = Date.now() - migrationStart;
                results.push({ file, success: true, duration });
                console.log(`  ✓ Completed in ${duration}ms`);
            } catch (error) {
                const duration = Date.now() - migrationStart;
                const errorMessage = error instanceof Error ? error.message : String(error);
                results.push({ file, success: false, duration, error: errorMessage });
                console.error(`  ✗ Failed after ${duration}ms`);
                console.error(`    Error: ${errorMessage}`);

                // Stop on first error
                break;
            }
        }

        console.log('\n================================');
        console.log('Migration Summary:');
        console.log('================================');

        const successful = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        console.log(`  Total:      ${results.length}`);
        console.log(`  Successful: ${successful.length}`);
        console.log(`  Failed:     ${failed.length}`);
        console.log(`  Duration:   ${Date.now() - startTime}ms`);

        if (failed.length > 0) {
            console.log('\nFailed migrations:');
            failed.forEach((r) => {
                console.log(`  - ${r.file}: ${r.error}`);
            });
            process.exit(1);
        }

        console.log('\nAll migrations completed successfully!');

    } catch (error) {
        console.error('\nFatal error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run migrations
runMigrations().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
