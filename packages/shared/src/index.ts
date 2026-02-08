import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  settings: z.record(z.unknown()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Tenant = z.infer<typeof TenantSchema>;

export const CrawlerSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  enabled: z.boolean().default(true),
  
  // Target configuration
  start_urls: z.array(z.string().url()),
  url_patterns: z.array(z.string()).default([]),
  max_depth: z.number().int().min(0).default(1),
  max_pages: z.number().int().min(1).default(100),
  
  // Crawling behavior
  user_agent: z.string().nullable(),
  headers: z.record(z.string()).default({}),
  wait_for_selector: z.string().nullable(),
  timeout_ms: z.number().int().min(1000).default(30000),
  
  // Rate limiting
  delay_ms: z.number().int().min(0).default(1000),
  concurrent_requests: z.number().int().min(1).default(1),
  
  // Schedule
  schedule: z.string().nullable(),
  
  // Metadata
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_run_at: z.string().datetime().nullable(),
});

export type Crawler = z.infer<typeof CrawlerSchema>;

export const ExtractorSchema = z.object({
  id: z.string().uuid(),
  crawler_id: z.string().uuid(),
  name: z.string().min(1),
  prompt: z.string().min(1),
  output_schema: z.record(z.unknown()),
  target_table: z.string().nullable(),
  model: z.string().nullable(),
  temperature: z.number().min(0).max(2).default(0.1),
  max_tokens: z.number().int().min(1).default(4096),
  content_selector: z.string().nullable(),
  skip_if_contains: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Extractor = z.infer<typeof ExtractorSchema>;

export const RunStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const CrawlerRunSchema = z.object({
  id: z.string().uuid(),
  crawler_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  status: RunStatusSchema,
  pages_crawled: z.number().int().default(0),
  pages_failed: z.number().int().default(0),
  items_extracted: z.number().int().default(0),
  started_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  error_message: z.string().nullable(),
  error_details: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
});

export type CrawlerRun = z.infer<typeof CrawlerRunSchema>;

// ============================================================================
// API Types
// ============================================================================

export const CreateCrawlerSchema = CrawlerSchema.omit({
  id: true,
  tenant_id: true,
  created_at: true,
  updated_at: true,
  last_run_at: true,
});

export type CreateCrawler = z.infer<typeof CreateCrawlerSchema>;

export const UpdateCrawlerSchema = CreateCrawlerSchema.partial();
export type UpdateCrawler = z.infer<typeof UpdateCrawlerSchema>;

export const CreateExtractorSchema = ExtractorSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateExtractor = z.infer<typeof CreateExtractorSchema>;

// ============================================================================
// Job Queue Types
// ============================================================================

export const CrawlJobDataSchema = z.object({
  crawler_id: z.string().uuid(),
  run_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
});

export type CrawlJobData = z.infer<typeof CrawlJobDataSchema>;

export const ExtractJobDataSchema = z.object({
  run_id: z.string().uuid(),
  page_id: z.string().uuid(),
  extractor_id: z.string().uuid(),
  url: z.string().url(),
  content: z.string(),
});

export type ExtractJobData = z.infer<typeof ExtractJobDataSchema>;

// ============================================================================
// LLM Types
// ============================================================================

export interface LLMProvider {
  name: string;
  extract(prompt: string, content: string, schema: Record<string, unknown>): Promise<ExtractionResult>;
}

export interface ExtractionResult {
  success: boolean;
  data?: Record<string, unknown>[];
  error?: string;
  tokensUsed?: number;
  confidence?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
