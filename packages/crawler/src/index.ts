import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import type { Crawler } from '@crawl-forge/shared';

export interface CrawlResult {
  url: string;
  statusCode: number;
  content: string;
  title: string;
  links: string[];
  durationMs: number;
  error?: string;
}

export interface CrawlerOptions {
  onPageCrawled?: (result: CrawlResult) => void | Promise<void>;
  onError?: (url: string, error: Error) => void | Promise<void>;
  signal?: AbortSignal;
}

export class WebCrawler {
  private browser: Browser | null = null;
  private config: Crawler;
  private visitedUrls = new Set<string>();
  private robotsCache = new Map<string, string[]>();

  constructor(config: Crawler) {
    this.config = config;
  }

  async start(options: CrawlerOptions = {}): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];
    
    try {
      this.browser = await chromium.launch({
        headless: true,
      });

      const urlQueue: { url: string; depth: number }[] = 
        this.config.start_urls.map(url => ({ url, depth: 0 }));

      while (urlQueue.length > 0 && results.length < this.config.max_pages) {
        if (options.signal?.aborted) break;

        const { url, depth } = urlQueue.shift()!;
        
        if (this.visitedUrls.has(url)) continue;
        if (depth > this.config.max_depth) continue;
        if (!this.matchesPatterns(url)) continue;

        this.visitedUrls.add(url);

        try {
          const result = await this.crawlPage(url);
          results.push(result);
          
          await options.onPageCrawled?.(result);

          // Add discovered links to queue
          if (depth < this.config.max_depth) {
            for (const link of result.links) {
              if (!this.visitedUrls.has(link)) {
                urlQueue.push({ url: link, depth: depth + 1 });
              }
            }
          }

          // Rate limiting
          if (this.config.delay_ms > 0) {
            await this.sleep(this.config.delay_ms);
          }
        } catch (error) {
          const crawlError = error instanceof Error ? error : new Error(String(error));
          await options.onError?.(url, crawlError);
          results.push({
            url,
            statusCode: 0,
            content: '',
            title: '',
            links: [],
            durationMs: 0,
            error: crawlError.message,
          });
        }
      }
    } finally {
      await this.close();
    }

    return results;
  }

  private async crawlPage(url: string): Promise<CrawlResult> {
    if (!this.browser) throw new Error('Browser not initialized');

    const startTime = Date.now();
    const page = await this.browser.newPage();

    try {
      // Set custom user agent if configured
      if (this.config.user_agent) {
        await page.setExtraHTTPHeaders({ 'User-Agent': this.config.user_agent });
      }

      // Set custom headers
      if (this.config.headers && Object.keys(this.config.headers).length > 0) {
        await page.setExtraHTTPHeaders(this.config.headers as Record<string, string>);
      }

      const response = await page.goto(url, {
        timeout: this.config.timeout_ms,
        waitUntil: 'domcontentloaded',
      });

      // Wait for specific selector if configured (for JS-heavy sites)
      if (this.config.wait_for_selector) {
        await page.waitForSelector(this.config.wait_for_selector, {
          timeout: this.config.timeout_ms,
        });
      }

      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Extract text content (remove scripts, styles, etc.)
      $('script, style, noscript, iframe').remove();
      const textContent = $('body').text().replace(/\s+/g, ' ').trim();

      // Extract links
      const links = this.extractLinks($, url);

      return {
        url,
        statusCode: response?.status() || 0,
        content: textContent,
        title: $('title').text().trim(),
        links,
        durationMs: Date.now() - startTime,
      };
    } finally {
      await page.close();
    }
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];
    const base = new URL(baseUrl);

    $('a[href]').each((_, el) => {
      try {
        const href = $(el).attr('href');
        if (!href) return;

        // Skip anchors, javascript, mailto, etc.
        if (href.startsWith('#') || href.startsWith('javascript:') || 
            href.startsWith('mailto:') || href.startsWith('tel:')) {
          return;
        }

        const absoluteUrl = new URL(href, baseUrl);
        
        // Only follow same-origin links by default
        if (absoluteUrl.origin === base.origin) {
          // Normalize URL (remove hash, trailing slash)
          absoluteUrl.hash = '';
          const normalized = absoluteUrl.href.replace(/\/$/, '');
          
          if (!links.includes(normalized)) {
            links.push(normalized);
          }
        }
      } catch {
        // Invalid URL, skip
      }
    });

    return links;
  }

  private matchesPatterns(url: string): boolean {
    // If no patterns specified, allow all start_url origins
    if (!this.config.url_patterns.length) {
      try {
        const urlOrigin = new URL(url).origin;
        return this.config.start_urls.some(startUrl => {
          const startOrigin = new URL(startUrl).origin;
          return urlOrigin === startOrigin;
        });
      } catch {
        return false;
      }
    }

    // Check against patterns
    return this.config.url_patterns.some(pattern => {
      try {
        const regex = new RegExp(pattern);
        return regex.test(url);
      } catch {
        return false;
      }
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Simple fetch-based crawler for static sites (lighter weight)
export class SimpleCrawler {
  private config: Crawler;
  private visitedUrls = new Set<string>();

  constructor(config: Crawler) {
    this.config = config;
  }

  async crawlPage(url: string): Promise<CrawlResult> {
    const startTime = Date.now();
    
    try {
      const headers: Record<string, string> = {
        'User-Agent': this.config.user_agent || 'CrawlForge/1.0',
        ...(this.config.headers as Record<string, string> || {}),
      };

      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(this.config.timeout_ms),
      });

      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('script, style, noscript, iframe').remove();
      const textContent = $('body').text().replace(/\s+/g, ' ').trim();

      return {
        url,
        statusCode: response.status,
        content: textContent,
        title: $('title').text().trim(),
        links: [], // Simplified - no link extraction
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        url,
        statusCode: 0,
        content: '',
        title: '',
        links: [],
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export { WebCrawler as default };
