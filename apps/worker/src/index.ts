import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WebCrawler, type CrawlResult } from '@crawl-forge/crawler';
import { createExtractor, type OllamaConfig, type OpenAIConfig } from '@crawl-forge/extractor';
import type { Crawler, Extractor, CrawlJobData } from '@crawl-forge/shared';

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;

class CrawlForgeWorker {
  private supabase: SupabaseClient;
  private running = false;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async start() {
    console.log('🕷️ CrawlForge Worker starting...');
    this.running = true;

    while (this.running) {
      try {
        await this.processNextJob();
      } catch (error) {
        console.error('Error processing job:', error);
      }
      await this.sleep(POLL_INTERVAL);
    }
  }

  stop() {
    console.log('Worker stopping...');
    this.running = false;
  }

  private async processNextJob() {
    // Fetch next pending job
    const { data: job, error } = await this.supabase
      .from('job_queue')
      .select('*')
      .eq('state', 'created')
      .eq('name', 'crawl')
      .lte('run_at', new Date().toISOString())
      .order('run_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !job) {
      return; // No jobs available
    }

    console.log(`Processing job ${job.id}...`);

    // Mark as active
    await this.supabase
      .from('job_queue')
      .update({ state: 'active', started_at: new Date().toISOString() })
      .eq('id', job.id);

    try {
      const jobData = job.data as CrawlJobData;
      await this.runCrawl(jobData);

      // Mark completed
      await this.supabase
        .from('job_queue')
        .update({ state: 'completed', completed_at: new Date().toISOString() })
        .eq('id', job.id);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Job ${job.id} failed:`, errorMessage);

      const retryCount = (job.retry_count || 0) + 1;
      
      if (retryCount < MAX_RETRIES) {
        // Retry later
        await this.supabase
          .from('job_queue')
          .update({ 
            state: 'created', 
            retry_count: retryCount,
            run_at: new Date(Date.now() + 60000 * retryCount).toISOString(), // Exponential backoff
          })
          .eq('id', job.id);
      } else {
        // Mark as failed
        await this.supabase
          .from('job_queue')
          .update({ 
            state: 'failed', 
            error: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      }
    }
  }

  private async runCrawl(jobData: CrawlJobData) {
    const { crawler_id, run_id, tenant_id } = jobData;

    // Get crawler config
    const { data: crawler, error: crawlerError } = await this.supabase
      .from('crawlers')
      .select('*')
      .eq('id', crawler_id)
      .single();

    if (crawlerError || !crawler) {
      throw new Error(`Crawler not found: ${crawler_id}`);
    }

    // Get extractors
    const { data: extractors } = await this.supabase
      .from('extractors')
      .select('*')
      .eq('crawler_id', crawler_id);

    // Update run status
    await this.supabase
      .from('crawler_runs')
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString(),
      })
      .eq('id', run_id);

    // Create LLM extractor
    const llmProvider = process.env.LLM_PROVIDER || 'ollama';
    const extractor = llmProvider === 'openai'
      ? createExtractor('openai', {
          apiKey: process.env.OPENAI_API_KEY!,
          model: process.env.OPENAI_MODEL,
        } as OpenAIConfig)
      : createExtractor('ollama', {
          baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
        } as OllamaConfig);

    // Run crawler
    const webCrawler = new WebCrawler(crawler as Crawler);
    let pagesCrawled = 0;
    let pagesFailed = 0;
    let itemsExtracted = 0;

    const results = await webCrawler.start({
      onPageCrawled: async (result: CrawlResult) => {
        pagesCrawled++;
        
        // Save page
        const { data: page } = await this.supabase
          .from('crawled_pages')
          .insert({
            run_id,
            url: result.url,
            status_code: result.statusCode,
            duration_ms: result.durationMs,
            error: result.error,
          })
          .select()
          .single();

        if (page && !result.error && extractors?.length) {
          // Run extractors
          for (const ext of extractors as Extractor[]) {
            try {
              const extraction = await extractor.extract(
                ext.prompt,
                result.content,
                ext.output_schema
              );

              if (extraction.success && extraction.data) {
                // Save results
                for (const item of extraction.data) {
                  await this.supabase
                    .from('extraction_results')
                    .insert({
                      run_id,
                      extractor_id: ext.id,
                      page_id: page.id,
                      data: item,
                      tokens_used: extraction.tokensUsed,
                    });
                  itemsExtracted++;
                }

                // Also insert into target table if specified
                if (ext.target_table && extraction.data.length > 0) {
                  await this.supabase
                    .from(ext.target_table)
                    .insert(extraction.data);
                }
              }
            } catch (extractError) {
              console.error(`Extraction failed for ${result.url}:`, extractError);
            }
          }
        }

        // Update progress
        await this.supabase
          .from('crawler_runs')
          .update({ pages_crawled: pagesCrawled, items_extracted: itemsExtracted })
          .eq('id', run_id);
      },
      onError: async (url, error) => {
        pagesFailed++;
        console.error(`Failed to crawl ${url}:`, error.message);
      },
    });

    // Mark run complete
    await this.supabase
      .from('crawler_runs')
      .update({
        status: pagesFailed === pagesCrawled ? 'failed' : 'completed',
        pages_crawled: pagesCrawled,
        pages_failed: pagesFailed,
        items_extracted: itemsExtracted,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run_id);

    // Update crawler last_run_at
    await this.supabase
      .from('crawlers')
      .update({ last_run_at: new Date().toISOString() })
      .eq('id', crawler_id);

    console.log(`✅ Crawl complete: ${pagesCrawled} pages, ${itemsExtracted} items extracted`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main
const worker = new CrawlForgeWorker();

process.on('SIGINT', () => worker.stop());
process.on('SIGTERM', () => worker.stop());

worker.start();
