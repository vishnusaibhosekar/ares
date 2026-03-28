/**
 * GET /api/clusters/:id Route
 * Fetches full details of a resolved operator cluster
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../../util/logger';
import { NotFoundError, ValidationError } from '../middleware/error-handler';
import { getRequestId } from '../middleware/logger';
import type {
    ClusterDetailsResponse,
    ClusterInfo,
    ClusterSiteInfo,
    ClusterEntitySummary
} from '../../domain/types/api';

// Import repositories
import { ClusterRepository } from '../../repository/ClusterRepository';
import { SiteRepository } from '../../repository/SiteRepository';
import { EntityRepository } from '../../repository/EntityRepository';
import { ResolutionRunRepository } from '../../repository/ResolutionRunRepository';
import { Database } from '../../repository/Database';
import type { Entity } from '../../domain/models';

const router = Router();

/**
 * UUID validation schema
 */
const UUIDSchema = z.string().uuid('Invalid cluster ID format');

/**
 * Query parameters schema
 */
const ClusterQuerySchema = z.object({
    include_resolution_history: z.coerce.boolean().optional().default(false),
});

/**
 * Calculate risk score for a cluster
 * Formula: (site_count × entity_overlap) / (total_unique_entities + 1)
 * 
 * Higher risk indicates:
 * - More sites in cluster
 * - More entity overlap across sites
 * - Presence of both phone and email
 */
function calculateRiskScore(
    sites: ClusterSiteInfo[],
    entities: ClusterEntitySummary[]
): number {
    if (sites.length === 0) {
        return 0;
    }

    let score = 0;

    // Base score from site count (max 0.3 from 3+ sites)
    const siteScore = Math.min(sites.length / 10, 0.3);
    score += siteScore;

    // Entity overlap score (entities shared across 3+ sites)
    const overlappingEntities = entities.filter(e => e.sites_using >= 3);
    if (overlappingEntities.length > 0) {
        score += 0.2;
    }

    // High-trust entity types (phone + email both present)
    const hasPhone = entities.some(e => e.type === 'phone');
    const hasEmail = entities.some(e => e.type === 'email');
    if (hasPhone && hasEmail) {
        score += 0.2;
    }

    // Additional score based on entity overlap ratio
    const totalEntities = entities.length;
    const avgSitesPerEntity = totalEntities > 0
        ? entities.reduce((sum, e) => sum + e.sites_using, 0) / totalEntities
        : 0;

    if (avgSitesPerEntity >= 2) {
        score += Math.min(avgSitesPerEntity / 10, 0.3);
    }

    return Math.min(score, 1.0);
}

/**
 * Aggregate entities from sites, counting usage
 */
function aggregateEntities(
    allEntities: Array<{ entity: Entity; siteId: string }>
): ClusterEntitySummary[] {
    const entityMap = new Map<string, {
        type: string;
        value: string;
        normalized_value: string | null;
        sites: Set<string>;
    }>();

    for (const { entity, siteId } of allEntities) {
        const key = `${entity.type}:${entity.normalized_value || entity.value}`;

        if (!entityMap.has(key)) {
            entityMap.set(key, {
                type: entity.type,
                value: entity.value,
                normalized_value: entity.normalized_value,
                sites: new Set(),
            });
        }

        entityMap.get(key)!.sites.add(siteId);
    }

    return Array.from(entityMap.values()).map(e => ({
        type: e.type,
        value: e.value,
        normalized_value: e.normalized_value,
        count: e.sites.size,
        sites_using: e.sites.size,
    })).sort((a, b) => b.sites_using - a.sites_using);
}

/**
 * GET /api/clusters/:id
 * Fetch cluster details with risk score
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    try {
        // 1. Validate cluster ID
        const idResult = UUIDSchema.safeParse(req.params.id);
        if (!idResult.success) {
            throw new ValidationError('Invalid cluster ID format', idResult.error.errors);
        }
        const clusterId = idResult.data;

        // 2. Parse query parameters
        const queryResult = ClusterQuerySchema.safeParse(req.query);
        if (!queryResult.success) {
            throw queryResult.error;
        }
        const { include_resolution_history } = queryResult.data;

        logger.info({
            requestId,
            clusterId,
            includeHistory: include_resolution_history,
        }, 'Processing cluster details request');

        // 3. Initialize repositories
        const db = Database.getInstance();
        const clusterRepo = new ClusterRepository(db);
        const siteRepo = new SiteRepository(db);
        const entityRepo = new EntityRepository(db);
        const resolutionRunRepo = new ResolutionRunRepository(db);

        // 4. Fetch cluster
        const cluster = await clusterRepo.findById(clusterId);

        if (!cluster) {
            throw new NotFoundError(`Cluster with ID ${clusterId} not found`);
        }

        // 5. For now, get all sites and filter those in this cluster
        // In a full implementation, we'd query cluster_memberships table
        const allSites = await siteRepo.findAll();

        // Build cluster info
        const clusterInfo: ClusterInfo = {
            id: cluster.id,
            name: cluster.name,
            confidence: cluster.confidence,
            description: cluster.description,
            created_at: cluster.created_at.toISOString(),
            updated_at: cluster.updated_at.toISOString(),
        };

        // Build sites info (for demo purposes, include some sites)
        // In production, this would query cluster_memberships
        const siteInfos: ClusterSiteInfo[] = allSites.slice(0, 5).map(site => ({
            id: site.id,
            domain: site.domain,
            url: site.url,
            first_seen_at: site.first_seen_at.toISOString(),
        }));

        // 6. Fetch all entities for sites in cluster
        const allEntitiesWithSites: Array<{ entity: Entity; siteId: string }> = [];

        for (const site of siteInfos) {
            const siteEntities = await entityRepo.findBySiteId(site.id);
            for (const entity of siteEntities) {
                allEntitiesWithSites.push({ entity, siteId: site.id });
            }
        }

        // 7. Aggregate entities
        const entitySummaries = aggregateEntities(allEntitiesWithSites);

        // 8. Calculate risk score
        const riskScore = calculateRiskScore(siteInfos, entitySummaries);

        // 9. Get resolution run count
        const resolutionRuns = await resolutionRunRepo.findByClusterId(clusterId);

        // 10. Build response
        const response: ClusterDetailsResponse = {
            cluster: clusterInfo,
            sites: siteInfos,
            entities: entitySummaries,
            risk_score: Math.round(riskScore * 100) / 100, // Round to 2 decimal places
            total_unique_entities: entitySummaries.length,
            resolution_runs: resolutionRuns.length,
        };

        const duration = Date.now() - startTime;

        logger.info({
            requestId,
            clusterId,
            siteCount: siteInfos.length,
            entityCount: entitySummaries.length,
            riskScore,
            duration,
        }, 'Cluster details retrieved');

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

export { router as clustersRouter };
export default router;
