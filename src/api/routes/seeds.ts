/**
 * POST /api/seeds Route (Development Only)
 * Seeds the database with realistic test data
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../../util/logger';
import { ForbiddenError } from '../middleware/error-handler';
import { getRequestId } from '../middleware/logger';
import { generateId } from '../../util/random';
import type { SeedDataResponse } from '../../domain/types/api';

// Import repositories
import { SiteRepository } from '../../repository/SiteRepository';
import { EntityRepository } from '../../repository/EntityRepository';
import { ClusterRepository } from '../../repository/ClusterRepository';
import { EmbeddingRepository } from '../../repository/EmbeddingRepository';
import { Database } from '../../repository/Database';

const router = Router();

/**
 * Request validation schema
 */
const SeedsRequestSchema = z.object({
    count: z.number().min(1).max(20).optional().default(10),
    include_matches: z.boolean().optional().default(true),
});

/**
 * Seed data configuration
 */
interface SeedCluster {
    name: string;
    description: string;
    sharedPhone: string;
    sharedEmail: string;
    policyText: string;
    sites: Array<{
        domain: string;
        url: string;
    }>;
}

/**
 * Generate realistic seed clusters
 */
function generateSeedClusters(): SeedCluster[] {
    return [
        {
            name: 'Shenzhen Luxury Replica Syndicate',
            description: 'Counterfeit luxury goods network operating from China',
            sharedPhone: '+8613812345678',
            sharedEmail: 'shipping@luxeoutlet.cn',
            policyText: '24/7 customer support. Ships worldwide. All items come with authenticity guarantee. No returns on sales items. Contact us via WhatsApp for fastest response.',
            sites: [
                { domain: 'fake-luxe.shop', url: 'https://fake-luxe.shop' },
                { domain: 'luxury-outlet.cn', url: 'https://luxury-outlet.cn' },
                { domain: 'designer-bargains.ru', url: 'https://designer-bargains.ru' },
            ],
        },
        {
            name: 'Eastern European Electronics Fraud Ring',
            description: 'Electronics scam network operating from Eastern Europe',
            sharedPhone: '+380441234567',
            sharedEmail: 'support@techdeals.ua',
            policyText: 'Best prices guaranteed. Fast shipping to EU and US. Bitcoin accepted. All products have 30-day warranty. Contact support for bulk orders.',
            sites: [
                { domain: 'tech-deals-direct.com', url: 'https://tech-deals-direct.com' },
                { domain: 'electronics-warehouse.ua', url: 'https://electronics-warehouse.ua' },
                { domain: 'gadget-outlet-eu.store', url: 'https://gadget-outlet-eu.store' },
            ],
        },
        {
            name: 'Southeast Asian Pharmaceutical Network',
            description: 'Illegal pharmaceutical sales network',
            sharedPhone: '+66812345678',
            sharedEmail: 'orders@pharma-direct.th',
            policyText: 'No prescription needed. Discrete shipping worldwide. All medications are genuine. Payment via crypto or wire transfer. Contact via Telegram for privacy.',
            sites: [
                { domain: 'pharma-direct-asia.com', url: 'https://pharma-direct-asia.com' },
                { domain: 'meds-online-discount.th', url: 'https://meds-online-discount.th' },
                { domain: 'generic-pharmacy.my', url: 'https://generic-pharmacy.my' },
            ],
        },
        {
            name: 'North American Ticket Scalping Operation',
            description: 'Fraudulent ticket reselling network',
            sharedPhone: '+14155551234',
            sharedEmail: 'tickets@eventdeals.biz',
            policyText: 'Guaranteed authentic tickets. Last minute deals available. Money back guarantee if event cancelled. VIP packages available.',
            sites: [
                { domain: 'event-tickets-now.com', url: 'https://event-tickets-now.com' },
                { domain: 'concert-deals-usa.net', url: 'https://concert-deals-usa.net' },
            ],
        },
        {
            name: 'Single Actor - Fashion Dropshipper',
            description: 'Individual dropshipper selling overpriced fashion items',
            sharedPhone: '+447911123456',
            sharedEmail: 'hello@fashionista.uk',
            policyText: 'Trendy fashion at affordable prices. Ships from UK warehouse. Returns within 14 days.',
            sites: [
                { domain: 'trendy-fashion.uk', url: 'https://trendy-fashion.uk' },
            ],
        },
    ];
}

/**
 * POST /api/seeds
 * Seed database with test data (development only)
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    try {
        // 1. Check environment
        if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
            throw new ForbiddenError('Seeds endpoint is only available in development mode');
        }

        // 2. Parse request
        const parseResult = SeedsRequestSchema.safeParse(req.body);

        if (!parseResult.success) {
            throw parseResult.error;
        }

        const { count, include_matches } = parseResult.data;

        logger.info({
            requestId,
            count,
            includeMatches: include_matches,
        }, 'Seeding database');

        // 3. Initialize repositories
        const db = Database.getInstance();
        const siteRepo = new SiteRepository(db);
        const entityRepo = new EntityRepository(db);
        const clusterRepo = new ClusterRepository(db);
        const embeddingRepo = new EmbeddingRepository(db);

        // 4. Generate seed data
        const seedClusters = generateSeedClusters();

        let sitesCreated = 0;
        let entitiesCreated = 0;
        let clustersCreated = 0;
        let embeddingsCreated = 0;

        // 5. Create clusters and associated data
        for (const seedCluster of seedClusters.slice(0, Math.min(count, seedClusters.length))) {
            try {
                // Create cluster
                const clusterId = await clusterRepo.create({
                    name: seedCluster.name,
                    confidence: 0.85 + Math.random() * 0.15, // 0.85-1.0
                    description: seedCluster.description,
                });
                clustersCreated++;

                // Create sites for this cluster
                const sitesToCreate = include_matches
                    ? seedCluster.sites
                    : seedCluster.sites.slice(0, 1);

                for (const siteData of sitesToCreate) {
                    try {
                        // Check if site already exists
                        const existing = await siteRepo.findByDomain(siteData.domain);
                        if (existing.length > 0) {
                            continue;
                        }

                        const siteId = await siteRepo.create({
                            domain: siteData.domain,
                            url: siteData.url,
                            page_text: seedCluster.policyText,
                            first_seen_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
                        });
                        sitesCreated++;

                        // Create shared phone entity
                        await entityRepo.create({
                            site_id: siteId,
                            type: 'phone',
                            value: seedCluster.sharedPhone,
                            normalized_value: seedCluster.sharedPhone.replace(/[\s-]/g, ''),
                            confidence: 0.95,
                        });
                        entitiesCreated++;

                        // Create shared email entity
                        await entityRepo.create({
                            site_id: siteId,
                            type: 'email',
                            value: seedCluster.sharedEmail,
                            normalized_value: seedCluster.sharedEmail.toLowerCase(),
                            confidence: 0.95,
                        });
                        entitiesCreated++;

                        // Create some unique entities per site
                        const uniqueEmail = `contact@${siteData.domain}`;
                        await entityRepo.create({
                            site_id: siteId,
                            type: 'email',
                            value: uniqueEmail,
                            normalized_value: uniqueEmail.toLowerCase(),
                            confidence: 0.9,
                        });
                        entitiesCreated++;

                        // Create mock embedding
                        const mockVector = Array.from({ length: 1024 }, () => Math.random() * 2 - 1);
                        await embeddingRepo.create({
                            source_id: siteId,
                            source_type: 'site_page_text',
                            source_text: seedCluster.policyText.substring(0, 500),
                            vector: mockVector,
                        });
                        embeddingsCreated++;
                    } catch (siteError) {
                        logger.warn({ error: siteError, domain: siteData.domain }, 'Failed to create site');
                    }
                }
            } catch (clusterError) {
                logger.warn({ error: clusterError, cluster: seedCluster.name }, 'Failed to create cluster');
            }
        }

        // 6. Build response
        const response: SeedDataResponse = {
            sites_created: sitesCreated,
            entities_created: entitiesCreated,
            clusters_created: clustersCreated,
            embeddings_created: embeddingsCreated,
        };

        const duration = Date.now() - startTime;

        logger.info({
            requestId,
            sitesCreated,
            entitiesCreated,
            clustersCreated,
            embeddingsCreated,
            duration,
        }, 'Database seeding completed');

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

export { router as seedsRouter };
export default router;
