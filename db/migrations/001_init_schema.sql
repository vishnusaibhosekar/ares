-- ARES Database Schema
-- Migration: 001_init_schema.sql
-- Description: Initial database schema for ARES (Actor Resolution & Entity Service)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgvector;

-- ============================================
-- Table: sites
-- Description: Tracked storefronts/websites
-- ============================================
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    page_text TEXT,
    screenshot_hash VARCHAR(64),
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for sites table
CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(domain);
CREATE INDEX IF NOT EXISTS idx_sites_created_at ON sites(created_at);
CREATE INDEX IF NOT EXISTS idx_sites_first_seen_at ON sites(first_seen_at);

COMMENT ON TABLE sites IS 'Tracked storefronts and websites for actor resolution';
COMMENT ON COLUMN sites.domain IS 'Domain name extracted from URL';
COMMENT ON COLUMN sites.page_text IS 'Extracted text content from the page';
COMMENT ON COLUMN sites.screenshot_hash IS 'Hash of screenshot for visual comparison';

-- ============================================
-- Table: entities
-- Description: Extracted entities from sites (emails, phones, handles, wallets)
-- ============================================
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'phone', 'handle', 'wallet')),
    value TEXT NOT NULL,
    normalized_value TEXT,
    confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for entities table
CREATE INDEX IF NOT EXISTS idx_entities_site_id ON entities(site_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_normalized_value ON entities(normalized_value);
CREATE INDEX IF NOT EXISTS idx_entities_value ON entities(value);
CREATE INDEX IF NOT EXISTS idx_entities_type_value ON entities(type, value);

COMMENT ON TABLE entities IS 'Extracted entities from sites for actor correlation';
COMMENT ON COLUMN entities.type IS 'Entity type: email, phone, handle, or wallet';
COMMENT ON COLUMN entities.normalized_value IS 'Normalized form of value for comparison';
COMMENT ON COLUMN entities.confidence IS 'Confidence score of extraction (0.0 to 1.0)';

-- ============================================
-- Table: clusters
-- Description: Actor clusters grouping related entities and sites
-- ============================================
CREATE TABLE IF NOT EXISTS clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    confidence DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for clusters table
CREATE INDEX IF NOT EXISTS idx_clusters_name ON clusters(name);
CREATE INDEX IF NOT EXISTS idx_clusters_confidence ON clusters(confidence);
CREATE INDEX IF NOT EXISTS idx_clusters_created_at ON clusters(created_at);

COMMENT ON TABLE clusters IS 'Actor clusters representing operator identities';
COMMENT ON COLUMN clusters.name IS 'Human-readable cluster name';
COMMENT ON COLUMN clusters.confidence IS 'Overall confidence in cluster cohesion';

-- ============================================
-- Table: cluster_memberships
-- Description: Membership of entities and sites in clusters
-- ============================================
CREATE TABLE IF NOT EXISTS cluster_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    membership_type VARCHAR(10) NOT NULL CHECK (membership_type IN ('entity', 'site')),
    confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- At least one of entity_id or site_id must be non-null
    CONSTRAINT chk_membership_reference CHECK (
        (entity_id IS NOT NULL) OR (site_id IS NOT NULL)
    )
);

-- Indexes for cluster_memberships table
CREATE INDEX IF NOT EXISTS idx_cluster_memberships_cluster_id ON cluster_memberships(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_memberships_entity_id ON cluster_memberships(entity_id);
CREATE INDEX IF NOT EXISTS idx_cluster_memberships_site_id ON cluster_memberships(site_id);
CREATE INDEX IF NOT EXISTS idx_cluster_memberships_type ON cluster_memberships(membership_type);

COMMENT ON TABLE cluster_memberships IS 'Association between entities/sites and clusters';
COMMENT ON COLUMN cluster_memberships.membership_type IS 'Type of member: entity or site';
COMMENT ON COLUMN cluster_memberships.reason IS 'Explanation for cluster membership';

-- ============================================
-- Table: embeddings
-- Description: Text embeddings for similarity matching
-- ============================================
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_text TEXT NOT NULL,
    -- Using vector type for pgvector extension (1024 dimensions for MIXEDBREAD)
    -- Falls back to TEXT if pgvector is not available
    vector vector(1024),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for embeddings table
CREATE INDEX IF NOT EXISTS idx_embeddings_source_id ON embeddings(source_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_source_type ON embeddings(source_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON embeddings(created_at);

-- Vector similarity index (for pgvector)
-- CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);

COMMENT ON TABLE embeddings IS 'Text embeddings for semantic similarity matching';
COMMENT ON COLUMN embeddings.source_type IS 'Type of source: site_policy, site_contact, etc.';
COMMENT ON COLUMN embeddings.vector IS '1024-dimensional embedding vector from MIXEDBREAD';

-- ============================================
-- Table: resolution_runs
-- Description: Log of resolution executions
-- ============================================
CREATE TABLE IF NOT EXISTS resolution_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    input_url TEXT NOT NULL,
    input_domain VARCHAR(255),
    input_entities JSONB DEFAULT '{}',
    result_cluster_id UUID REFERENCES clusters(id) ON DELETE SET NULL,
    result_confidence DECIMAL(3,2) DEFAULT 0 CHECK (result_confidence >= 0 AND result_confidence <= 1),
    explanation TEXT,
    matching_signals JSONB DEFAULT '[]',
    execution_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for resolution_runs table
CREATE INDEX IF NOT EXISTS idx_resolution_runs_input_domain ON resolution_runs(input_domain);
CREATE INDEX IF NOT EXISTS idx_resolution_runs_result_cluster_id ON resolution_runs(result_cluster_id);
CREATE INDEX IF NOT EXISTS idx_resolution_runs_created_at ON resolution_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_resolution_runs_input_url ON resolution_runs(input_url);

COMMENT ON TABLE resolution_runs IS 'Log of actor resolution executions';
COMMENT ON COLUMN resolution_runs.input_entities IS 'JSON of entities used for resolution';
COMMENT ON COLUMN resolution_runs.matching_signals IS 'JSON array of signals that matched';
COMMENT ON COLUMN resolution_runs.execution_time_ms IS 'Time taken to execute resolution in milliseconds';

-- ============================================
-- Trigger: Update updated_at on clusters
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clusters_updated_at
    BEFORE UPDATE ON clusters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
