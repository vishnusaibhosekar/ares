// src/api/routes/index.ts
// Export all route modules

export { default as ingestSiteRouter, ingestSiteRouter as ingestSite } from './ingest-site';
export { default as resolveActorRouter, resolveActorRouter as resolveActor } from './resolve-actor';
export { default as clustersRouter, clustersRouter as clusters } from './clusters';
export { default as seedsRouter, seedsRouter as seeds } from './seeds';
export { default as healthRouter, healthRouter as health } from './health';
