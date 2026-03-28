/**
 * POST /api/resolve-actor Route
 * Resolves a site to an operator cluster
 */

import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../../util/logger';
import { NotFoundError } from '../middleware/error-handler';
import { getRequestId } from '../middleware/logger';
import { ResolveActorRequestSchema } from '../../domain/types/api';
import type { ResolveActorResponse } from '../../domain/types/api';

// Import services and repositories
import { ResolutionEngine, ResolveActorRequest as EngineResolveRequest } from '../../service/ResolutionEngine';
import { SiteRepository } from '../../repository/SiteRepository';
import { EntityRepository } from '../../repository/EntityRepository';
import { ClusterRepository } from '../../repository/ClusterRepository';
import { EmbeddingRepository } from '../../repository/EmbeddingRepository';
import { ResolutionRunRepository } from '../../repository/ResolutionRunRepository';
import { EntityExtractor } from '../../service/EntityExtractor';
import { EntityNormalizer } from '../../service/EntityNormalizer';
import { EmbeddingService } from '../../service/EmbeddingService';
import { SimilarityScorer } from '../../service/SimilarityScorer';
import { ClusterResolver } from '../../service/ClusterResolver';
import { Database } from '../../repository/Database';

const router = Router();

/**
 * POST /api/resolve-actor
 * Resolve a site to an operator cluster
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    try {
        // 1. Parse and validate request
        const parseResult = ResolveActorRequestSchema.safeParse(req.body);

        if (!parseResult.success) {
            throw parseResult.error;
        }

        const body = parseResult.data;

        logger.info({
            requestId,
            url: body.url,
            domain: body.domain,
            siteId: body.site_id,
            hasPageText: !!body.page_text,
            hasEntities: !!body.entities,
        }, 'Processing resolve-actor request');

        // 2. Initialize services
        const db = Database.getInstance();
        const siteRepo = new SiteRepository(db);
        const entityRepo = new EntityRepository(db);
        const clusterRepo = new ClusterRepository(db);
        const embeddingRepo = new EmbeddingRepository(db);
        const resolutionRunRepo = new ResolutionRunRepository(db);

        // 3. If site_id provided, fetch site and its entities
        let pageText = body.page_text;
        let entitiesHint = body.entities;
        let domain = body.domain;

        if (body.site_id) {
            const site = await siteRepo.findById(body.site_id);

            if (!site) {
                throw new NotFoundError(`Site with ID ${body.site_id} not found`);
            }

            // Use site data as fallback
            pageText = pageText || site.page_text || undefined;
            domain = domain || site.domain;

            // Fetch entities from site
            const siteEntities = await entityRepo.findBySiteId(body.site_id);

            if (!entitiesHint && siteEntities.length > 0) {
                entitiesHint = {
                    emails: siteEntities.filter(e => e.type === 'email').map(e => e.value),
                    phones: siteEntities.filter(e => e.type === 'phone').map(e => e.value),
                    handles: siteEntities.filter(e => e.type === 'handle').map(e => ({
                        type: 'other' as const,
                        value: e.value,
                    })),
                };
            }
        }

        // 4. Create services
        const extractor = new EntityExtractor();
        const normalizer = new EntityNormalizer();
        const embeddingService = new EmbeddingService(
            process.env.MIXEDBREAD_API_KEY || ''
        );
        const scorer = new SimilarityScorer(embeddingService);
        const resolver = new ClusterResolver();

        const engine = new ResolutionEngine(
            extractor,
            normalizer,
            embeddingService,
            scorer,
            resolver,
            {
                siteRepository: siteRepo,
                entityRepository: entityRepo,
                clusterRepository: clusterRepo,
                embeddingRepository: embeddingRepo,
                resolutionRunRepository: resolutionRunRepo,
            }
        );

        // 5. Build resolve request
        const resolveRequest: EngineResolveRequest = {
            url: body.url,
            domain,
            page_text: pageText,
            entities_hint: entitiesHint ? {
                emails: entitiesHint.emails,
                phones: entitiesHint.phones,
                handles: entitiesHint.handles,
            } : undefined,
        };

        // 6. Call resolution engine
        const result = await engine.resolve(resolveRequest);

        // 7. Build response
        const executionTime = Date.now() - startTime;

        const response: ResolveActorResponse = {
            actor_cluster_id: result.matched_cluster_id,
            confidence: result.confidence,
            related_domains: result.related_domains,
            related_entities: result.related_entities,
            matching_signals: result.matching_signals,
            explanation: result.explanation,
        };

        logger.info({
            requestId,
            runId: result.run_id,
            matchedClusterId: result.matched_cluster_id,
            confidence: result.confidence,
            signalCount: result.matching_signals.length,
            executionTime,
        }, 'Resolve-actor completed');

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

export { router as resolveActorRouter };
export default router;
