/**
 * POST /api/ingest-site Route
 * Ingests a new suspicious storefront, extracts entities, generates embeddings
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../../util/logger';
import { ConflictError, ValidationError } from '../middleware/error-handler';
import { getRequestId } from '../middleware/logger';
import { IngestSiteRequestSchema } from '../../domain/types/api';
import type { IngestSiteResponse, IngestResolutionResult } from '../../domain/types/api';

// Import services and repositories (will be injected)
import { ResolutionEngine, IngestSiteRequest as EngineIngestRequest } from '../../service/ResolutionEngine';
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
 * Extended schema with LLM extraction option
 */
const IngestSiteRequestSchemaExtended = IngestSiteRequestSchema.extend({
    use_llm_extraction: z.boolean().optional().default(false),
});

type IngestSiteRequestBody = z.infer<typeof IngestSiteRequestSchemaExtended>;

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.hostname;
    } catch {
        throw new ValidationError('Invalid URL format');
    }
}

/**
 * POST /api/ingest-site
 * Ingest a new storefront and extract entities
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    try {
        // 1. Parse and validate request
        const parseResult = IngestSiteRequestSchemaExtended.safeParse(req.body);

        if (!parseResult.success) {
            throw parseResult.error;
        }

        const body: IngestSiteRequestBody = parseResult.data;

        // 2. Extract domain from URL if not provided
        const domain = body.domain || extractDomain(body.url);

        logger.info({
            requestId,
            url: body.url,
            domain,
            hasPageText: !!body.page_text,
            attemptResolve: body.attempt_resolve,
            useLlm: body.use_llm_extraction,
        }, 'Processing ingest-site request');

        // 3. Initialize services
        const db = Database.getInstance();
        const siteRepo = new SiteRepository(db);
        const entityRepo = new EntityRepository(db);
        const clusterRepo = new ClusterRepository(db);
        const embeddingRepo = new EmbeddingRepository(db);
        const resolutionRunRepo = new ResolutionRunRepository(db);

        // 4. Check for duplicate domain
        const existingSites = await siteRepo.findByDomain(domain);
        if (existingSites.length > 0) {
            throw new ConflictError('This domain has already been ingested');
        }

        // 5. Create services
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

        // 6. Build ingest request
        const ingestRequest: EngineIngestRequest = {
            url: body.url,
            domain,
            page_text: body.page_text,
            screenshot_hash: body.screenshot_hash,
            entities_hint: body.entities ? {
                emails: body.entities.emails,
                phones: body.entities.phones,
                handles: body.entities.handles,
            } : undefined,
            attempt_resolve: body.attempt_resolve || false,
            use_llm: body.use_llm_extraction || false,
        };

        // 7. Call resolution engine
        const result = await engine.ingestSite(ingestRequest);

        // 8. Build response
        const response: IngestSiteResponse = {
            site_id: result.site_id,
            entities_extracted: result.entities_extracted,
            embeddings_generated: result.embeddings_generated,
            resolution: result.resolution ? {
                cluster_id: result.resolution.matched_cluster_id || '',
                confidence: result.resolution.confidence,
                explanation: result.resolution.explanation,
                matching_signals: result.resolution.matching_signals,
            } as IngestResolutionResult : null,
        };

        const duration = Date.now() - startTime;

        logger.info({
            requestId,
            siteId: result.site_id,
            entitiesExtracted: result.entities_extracted,
            embeddingsGenerated: result.embeddings_generated,
            hasResolution: !!result.resolution,
            duration,
        }, 'Ingest-site completed');

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

export { router as ingestSiteRouter };
export default router;
