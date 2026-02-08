'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface GeneratedConfig {
  name: string;
  description: string;
  start_urls: string[];
  url_patterns: string[];
  max_depth: number;
  max_pages: number;
  delay_ms: number;
  wait_for_selector: string | null;
  extraction_prompt: string;
}

export default function NewCrawlerPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedConfig, setGeneratedConfig] = useState<GeneratedConfig | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_urls: '',
    url_patterns: '',
    max_depth: 1,
    max_pages: 100,
    delay_ms: 1000,
    wait_for_selector: '',
    extraction_prompt: '',
    schedule: '',
  });

  const examplePrompts = [
    "Crawl Hacker News and extract all job postings with title, company, location, and salary",
    "Scrape product listings from https://example.com/products - get name, price, description, and image URL",
    "Monitor https://news.site.com for articles about AI, extract headlines, dates, and summaries",
    "Extract restaurant data from Yelp search results - name, rating, cuisine type, price range",
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please describe what you want to crawl');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // Call local Ollama to generate config
      const response = await fetch('/api/generate-crawler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        // Fallback: parse the prompt ourselves for basic configs
        const config = parsePromptLocally(prompt);
        setGeneratedConfig(config);
        setFormData({
          name: config.name,
          description: config.description,
          start_urls: config.start_urls.join('\n'),
          url_patterns: config.url_patterns.join('\n'),
          max_depth: config.max_depth,
          max_pages: config.max_pages,
          delay_ms: config.delay_ms,
          wait_for_selector: config.wait_for_selector || '',
          extraction_prompt: config.extraction_prompt,
          schedule: '',
        });
      } else {
        const config = await response.json();
        setGeneratedConfig(config);
        setFormData({
          name: config.name,
          description: config.description,
          start_urls: config.start_urls.join('\n'),
          url_patterns: config.url_patterns.join('\n'),
          max_depth: config.max_depth,
          max_pages: config.max_pages,
          delay_ms: config.delay_ms,
          wait_for_selector: config.wait_for_selector || '',
          extraction_prompt: config.extraction_prompt,
          schedule: '',
        });
      }
    } catch (err) {
      // Fallback parsing
      const config = parsePromptLocally(prompt);
      setGeneratedConfig(config);
      setFormData({
        name: config.name,
        description: config.description,
        start_urls: config.start_urls.join('\n'),
        url_patterns: config.url_patterns.join('\n'),
        max_depth: config.max_depth,
        max_pages: config.max_pages,
        delay_ms: config.delay_ms,
        wait_for_selector: config.wait_for_selector || '',
        extraction_prompt: config.extraction_prompt,
        schedule: '',
      });
    } finally {
      setGenerating(false);
    }
  };

  // Simple local parsing when API isn't available
  const parsePromptLocally = (text: string): GeneratedConfig => {
    // Extract URLs from the prompt
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    // Try to identify the site name
    let siteName = 'Web Crawler';
    const siteMatch = text.match(/(?:crawl|scrape|extract from|monitor)\s+([A-Z][a-zA-Z\s]+?)(?:\s+and|\s+for|\s+-|$)/i);
    if (siteMatch) {
      siteName = siteMatch[1].trim();
    } else if (urls.length > 0 && urls[0]) {
      try {
        const hostname = new URL(urls[0]).hostname.replace('www.', '');
        siteName = hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
      } catch {}
    }

    // Generate extraction prompt from the user's description
    const extractionPrompt = text.includes('extract') || text.includes('get')
      ? text
      : `Extract data from this page. ${text}`;

    return {
      name: `${siteName} Crawler`,
      description: text,
      start_urls: urls.length > 0 ? urls : ['https://example.com'],
      url_patterns: [],
      max_depth: 1,
      max_pages: 100,
      delay_ms: 1000,
      wait_for_selector: null,
      extraction_prompt: extractionPrompt,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Parse URLs
    const startUrls = formData.start_urls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (startUrls.length === 0) {
      setError('At least one start URL is required');
      setLoading(false);
      return;
    }

    // Validate URLs
    for (const url of startUrls) {
      try {
        new URL(url);
      } catch {
        setError(`Invalid URL: ${url}`);
        setLoading(false);
        return;
      }
    }

    const urlPatterns = formData.url_patterns
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    // Get user's tenant (or create one)
    let { data: membership } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .limit(1)
      .single();

    if (!membership) {
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: 'My Workspace',
          slug: `workspace-${Date.now()}`,
        })
        .select()
        .single();

      if (tenantError) {
        setError('Failed to create workspace');
        setLoading(false);
        return;
      }

      // Re-fetch membership
      const result = await supabase
        .from('tenant_members')
        .select('tenant_id')
        .limit(1)
        .single();
      membership = result.data;
    }

    if (!membership) {
      setError('No workspace found');
      setLoading(false);
      return;
    }

    // Create crawler
    const { data: crawler, error: crawlerError } = await supabase
      .from('crawlers')
      .insert({
        tenant_id: membership.tenant_id,
        name: formData.name,
        description: formData.description || null,
        start_urls: startUrls,
        url_patterns: urlPatterns,
        max_depth: formData.max_depth,
        max_pages: formData.max_pages,
        delay_ms: formData.delay_ms,
        wait_for_selector: formData.wait_for_selector || null,
        schedule: formData.schedule || null,
      })
      .select()
      .single();

    if (crawlerError) {
      setError(crawlerError.message);
      setLoading(false);
      return;
    }

    // Create extractor if we have an extraction prompt
    if (formData.extraction_prompt) {
      await supabase.from('extractors').insert({
        crawler_id: crawler.id,
        name: 'Default Extractor',
        prompt: formData.extraction_prompt,
        output_schema: null,
      });
    }

    router.push(`/dashboard/crawlers/${crawler.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Crawler</h1>
        <p className="text-muted-foreground">Describe what you want to crawl in plain English</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'ai' ? 'default' : 'outline'}
          onClick={() => setMode('ai')}
          size="sm"
        >
          ✨ AI-Assisted
        </Button>
        <Button
          variant={mode === 'manual' ? 'default' : 'outline'}
          onClick={() => setMode('manual')}
          size="sm"
        >
          ⚙️ Manual
        </Button>
      </div>

      {mode === 'ai' && !generatedConfig && (
        <Card>
          <CardHeader>
            <CardTitle>🤖 What do you want to crawl?</CardTitle>
            <CardDescription>
              Describe the website, what data you want to extract, and any specific requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="e.g., Crawl https://news.ycombinator.com/jobs and extract job postings. For each job, get the title, company name, location (if mentioned), and the link to apply."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="text-base"
            />

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Try an example:</p>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((example, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-left"
                  >
                    {example.slice(0, 50)}...
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? '🔄 Generating config...' : '✨ Generate Crawler Config'}
            </Button>
          </CardContent>
        </Card>
      )}

      {(mode === 'manual' || generatedConfig) && (
        <form onSubmit={handleSubmit}>
          {generatedConfig && (
            <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardContent className="pt-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✨ Config generated! Review and edit below, then create your crawler.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setGeneratedConfig(null);
                    setFormData({
                      name: '',
                      description: '',
                      start_urls: '',
                      url_patterns: '',
                      max_depth: 1,
                      max_pages: 100,
                      delay_ms: 1000,
                      wait_for_selector: '',
                      extraction_prompt: '',
                      schedule: '',
                    });
                  }}
                >
                  ← Start over
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Job Listings Crawler"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What does this crawler do?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>URLs to Crawl</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="start_urls">Start URLs * (one per line)</Label>
                <Textarea
                  id="start_urls"
                  placeholder="https://example.com/jobs"
                  value={formData.start_urls}
                  onChange={(e) => setFormData({ ...formData, start_urls: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url_patterns">URL Patterns (optional, regex)</Label>
                <Textarea
                  id="url_patterns"
                  placeholder="https://example\.com/jobs/.*"
                  value={formData.url_patterns}
                  onChange={(e) => setFormData({ ...formData, url_patterns: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_depth">Max Depth</Label>
                  <Input
                    id="max_depth"
                    type="number"
                    min={0}
                    max={10}
                    value={formData.max_depth}
                    onChange={(e) => setFormData({ ...formData, max_depth: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_pages">Max Pages</Label>
                  <Input
                    id="max_pages"
                    type="number"
                    min={1}
                    max={10000}
                    value={formData.max_pages}
                    onChange={(e) => setFormData({ ...formData, max_pages: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>🤖 Extraction Prompt</CardTitle>
              <CardDescription>Tell the AI what data to extract from each page</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="extraction_prompt"
                placeholder="Extract job postings from this page. For each job, return:
- title: Job title
- company: Company name
- location: City or 'Remote'
- url: Link to the full posting"
                value={formData.extraction_prompt}
                onChange={(e) => setFormData({ ...formData, extraction_prompt: e.target.value })}
                rows={6}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-red-600 mt-4">{error}</p>
          )}

          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : '🕷️ Create Crawler'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
