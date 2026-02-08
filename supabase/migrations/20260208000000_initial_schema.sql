-- CrawlForge Database Schema
-- Multi-tenant, Row-Level Security enabled

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- ============================================================================
-- TENANTS & USERS
-- ============================================================================

-- Tenants (workspaces/organizations)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant memberships (connects auth.users to tenants)
CREATE TABLE tenant_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- Index for fast lookups
CREATE INDEX idx_tenant_members_user ON tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id);

-- ============================================================================
-- CRAWLERS
-- ============================================================================

-- Crawler configurations
CREATE TABLE crawlers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic info
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    
    -- Target configuration
    start_urls TEXT[] NOT NULL DEFAULT '{}',  -- URLs or URL patterns
    url_patterns TEXT[] DEFAULT '{}',         -- Regex patterns to follow
    max_depth INT DEFAULT 1,                  -- How deep to crawl (0 = start URLs only)
    max_pages INT DEFAULT 100,                -- Max pages per run
    
    -- Crawling behavior
    user_agent TEXT,
    headers JSONB DEFAULT '{}',
    wait_for_selector TEXT,                   -- CSS selector to wait for (JS sites)
    timeout_ms INT DEFAULT 30000,
    
    -- Rate limiting
    delay_ms INT DEFAULT 1000,                -- Delay between requests
    concurrent_requests INT DEFAULT 1,
    
    -- Schedule (cron expression, null = manual only)
    schedule TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_run_at TIMESTAMPTZ,
    
    CONSTRAINT valid_schedule CHECK (schedule IS NULL OR schedule ~ '^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$')
);

CREATE INDEX idx_crawlers_tenant ON crawlers(tenant_id);
CREATE INDEX idx_crawlers_enabled ON crawlers(tenant_id, enabled) WHERE enabled = true;

-- ============================================================================
-- EXTRACTORS (LLM prompts that define what to extract)
-- ============================================================================

CREATE TABLE extractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crawler_id UUID NOT NULL REFERENCES crawlers(id) ON DELETE CASCADE,
    
    -- Extraction configuration
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,                     -- LLM prompt for extraction
    
    -- Output schema (JSON Schema format)
    output_schema JSONB NOT NULL,             -- Defines expected output structure
    
    -- Target table for results
    target_table TEXT,                        -- Supabase table name (null = use default results table)
    
    -- LLM settings
    model TEXT,                               -- Override default model
    temperature FLOAT DEFAULT 0.1,
    max_tokens INT DEFAULT 4096,
    
    -- Filtering
    content_selector TEXT,                    -- CSS selector to extract content from (null = full page)
    skip_if_contains TEXT[],                  -- Skip pages containing these strings
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_extractors_crawler ON extractors(crawler_id);

-- ============================================================================
-- RUNS & RESULTS
-- ============================================================================

-- Crawler run history
CREATE TABLE crawler_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crawler_id UUID NOT NULL REFERENCES crawlers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Stats
    pages_crawled INT DEFAULT 0,
    pages_failed INT DEFAULT 0,
    items_extracted INT DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Error info
    error_message TEXT,
    error_details JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_runs_crawler ON crawler_runs(crawler_id);
CREATE INDEX idx_runs_tenant ON crawler_runs(tenant_id);
CREATE INDEX idx_runs_status ON crawler_runs(status) WHERE status IN ('pending', 'running');

-- Pages crawled (per run)
CREATE TABLE crawled_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES crawler_runs(id) ON DELETE CASCADE,
    
    url TEXT NOT NULL,
    status_code INT,
    content_hash TEXT,                        -- For deduplication
    
    -- Timing
    crawled_at TIMESTAMPTZ DEFAULT NOW(),
    duration_ms INT,
    
    -- Errors
    error TEXT,
    
    -- Content (optional storage)
    content_stored BOOLEAN DEFAULT false      -- Whether raw content is stored
);

CREATE INDEX idx_pages_run ON crawled_pages(run_id);
CREATE INDEX idx_pages_url ON crawled_pages(url);

-- Generic extraction results (when no target table specified)
CREATE TABLE extraction_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES crawler_runs(id) ON DELETE CASCADE,
    extractor_id UUID NOT NULL REFERENCES extractors(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES crawled_pages(id) ON DELETE CASCADE,
    
    -- Extracted data
    data JSONB NOT NULL,
    
    -- Metadata
    confidence FLOAT,                         -- LLM's confidence score if available
    tokens_used INT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_results_run ON extraction_results(run_id);
CREATE INDEX idx_results_extractor ON extraction_results(extractor_id);

-- ============================================================================
-- JOB QUEUE (pg_boss style, simplified)
-- ============================================================================

CREATE TABLE job_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                       -- Job type
    data JSONB NOT NULL DEFAULT '{}',
    
    state TEXT NOT NULL DEFAULT 'created' CHECK (state IN ('created', 'active', 'completed', 'failed', 'cancelled')),
    
    -- Retry logic
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Scheduling
    run_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Results
    output JSONB,
    error TEXT
);

CREATE INDEX idx_jobs_pending ON job_queue(run_at) WHERE state = 'created';
CREATE INDEX idx_jobs_name ON job_queue(name, state);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawlers ENABLE ROW LEVEL SECURITY;
ALTER TABLE extractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawler_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawled_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_results ENABLE ROW LEVEL SECURITY;

-- Helper function: Get user's tenant IDs
CREATE OR REPLACE FUNCTION get_user_tenants()
RETURNS SETOF UUID AS $$
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Tenants: Users can see tenants they're members of
CREATE POLICY tenant_select ON tenants
    FOR SELECT USING (id IN (SELECT get_user_tenants()));

CREATE POLICY tenant_insert ON tenants
    FOR INSERT WITH CHECK (true);  -- Anyone can create a tenant

CREATE POLICY tenant_update ON tenants
    FOR UPDATE USING (
        id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- Tenant members: Users can see members of their tenants
CREATE POLICY member_select ON tenant_members
    FOR SELECT USING (tenant_id IN (SELECT get_user_tenants()));

CREATE POLICY member_insert ON tenant_members
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
        OR NOT EXISTS (SELECT 1 FROM tenant_members WHERE tenant_id = tenant_members.tenant_id)  -- First member
    );

CREATE POLICY member_delete ON tenant_members
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner')
        OR user_id = auth.uid()  -- Can remove self
    );

-- Crawlers: Users can manage crawlers in their tenants
CREATE POLICY crawler_all ON crawlers
    FOR ALL USING (tenant_id IN (SELECT get_user_tenants()));

-- Extractors: Users can manage extractors for their crawlers
CREATE POLICY extractor_all ON extractors
    FOR ALL USING (
        crawler_id IN (SELECT id FROM crawlers WHERE tenant_id IN (SELECT get_user_tenants()))
    );

-- Runs: Users can see runs for their tenants
CREATE POLICY run_select ON crawler_runs
    FOR SELECT USING (tenant_id IN (SELECT get_user_tenants()));

CREATE POLICY run_insert ON crawler_runs
    FOR INSERT WITH CHECK (tenant_id IN (SELECT get_user_tenants()));

-- Pages & Results: Inherit from runs
CREATE POLICY pages_select ON crawled_pages
    FOR SELECT USING (
        run_id IN (SELECT id FROM crawler_runs WHERE tenant_id IN (SELECT get_user_tenants()))
    );

CREATE POLICY results_select ON extraction_results
    FOR SELECT USING (
        run_id IN (SELECT id FROM crawler_runs WHERE tenant_id IN (SELECT get_user_tenants()))
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER crawlers_updated_at BEFORE UPDATE ON crawlers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER extractors_updated_at BEFORE UPDATE ON extractors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-add creator as owner when tenant created
CREATE OR REPLACE FUNCTION add_tenant_owner()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tenant_members (tenant_id, user_id, role)
    VALUES (NEW.id, auth.uid(), 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tenant_add_owner AFTER INSERT ON tenants
    FOR EACH ROW EXECUTE FUNCTION add_tenant_owner();
