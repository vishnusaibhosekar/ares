-- ARES Database Schema - Additional Indexes
-- Migration: 002_add_sample_indexes.sql
-- Description: Additional indexes for common query patterns

-- ============================================
-- Composite indexes for common queries
-- ============================================

-- Index for finding entities by type across all sites
CREATE INDEX IF NOT EXISTS idx_entities_type_normalized ON entities(type, normalized_value) 
    WHERE normalized_value IS NOT NULL;

-- Index for high-confidence clusters
CREATE INDEX IF NOT EXISTS idx_clusters_high_confidence ON clusters(confidence DESC) 
    WHERE confidence >= 0.8;

-- Index for recent resolution runs
CREATE INDEX IF NOT EXISTS idx_resolution_runs_recent ON resolution_runs(created_at DESC)
    WHERE created_at > NOW() - INTERVAL '30 days';

-- ============================================
-- Full-text search indexes (optional)
-- ============================================

-- Full-text search on site page text
-- CREATE INDEX IF NOT EXISTS idx_sites_page_text_fts ON sites USING gin(to_tsvector('english', page_text));

-- ============================================
-- Partial indexes for common filters
-- ============================================

-- Index for matched resolution runs only
CREATE INDEX IF NOT EXISTS idx_resolution_runs_matched ON resolution_runs(result_cluster_id, created_at)
    WHERE result_cluster_id IS NOT NULL;

-- Index for unmatched resolution runs (need investigation)
CREATE INDEX IF NOT EXISTS idx_resolution_runs_unmatched ON resolution_runs(created_at)
    WHERE result_cluster_id IS NULL;

-- Index for entity memberships only
CREATE INDEX IF NOT EXISTS idx_memberships_entities_only ON cluster_memberships(cluster_id, entity_id)
    WHERE membership_type = 'entity' AND entity_id IS NOT NULL;

-- Index for site memberships only
CREATE INDEX IF NOT EXISTS idx_memberships_sites_only ON cluster_memberships(cluster_id, site_id)
    WHERE membership_type = 'site' AND site_id IS NOT NULL;

-- ============================================
-- Unique constraints for deduplication
-- ============================================

-- Prevent duplicate entity values per site
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_unique_per_site 
    ON entities(site_id, type, value);

-- Prevent duplicate cluster memberships
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_unique_entity 
    ON cluster_memberships(cluster_id, entity_id) 
    WHERE entity_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_unique_site 
    ON cluster_memberships(cluster_id, site_id) 
    WHERE site_id IS NOT NULL;

-- ============================================
-- Performance optimization comments
-- ============================================

COMMENT ON INDEX idx_entities_type_normalized IS 'Optimizes entity lookup by type with normalized value';
COMMENT ON INDEX idx_clusters_high_confidence IS 'Optimizes queries for reliable clusters';
COMMENT ON INDEX idx_resolution_runs_matched IS 'Optimizes queries for successful resolutions';
