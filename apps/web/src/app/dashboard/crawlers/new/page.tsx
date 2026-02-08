'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewCrawlerPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_urls: '',
    url_patterns: '',
    max_depth: 1,
    max_pages: 100,
    delay_ms: 1000,
    wait_for_selector: '',
    schedule: '',
  });

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

    // Get user's tenant (or first one)
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .limit(1)
      .single();

    if (!membership) {
      // Create a default tenant
      const { data: { user } } = await supabase.auth.getUser();
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
    }

    // Re-fetch membership after potential creation
    const { data: finalMembership } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .limit(1)
      .single();

    if (!finalMembership) {
      setError('No workspace found');
      setLoading(false);
      return;
    }

    const { data: crawler, error: crawlerError } = await supabase
      .from('crawlers')
      .insert({
        tenant_id: finalMembership.tenant_id,
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

    router.push(`/dashboard/crawlers/${crawler.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Create Crawler</h1>
        <p className="text-muted-foreground">Configure a new web crawler</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Name and describe your crawler</CardDescription>
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
                placeholder="Crawls job listing websites to extract..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Target URLs</CardTitle>
            <CardDescription>Where should the crawler start?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="start_urls">Start URLs * (one per line)</Label>
              <Textarea
                id="start_urls"
                placeholder="https://example.com/jobs&#10;https://example.com/careers"
                value={formData.start_urls}
                onChange={(e) => setFormData({ ...formData, start_urls: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url_patterns">URL Patterns (regex, one per line)</Label>
              <Textarea
                id="url_patterns"
                placeholder="https://example\.com/jobs/.*&#10;https://example\.com/careers/\d+"
                value={formData.url_patterns}
                onChange={(e) => setFormData({ ...formData, url_patterns: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to stay within the same domain as start URLs
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Crawl Settings</CardTitle>
            <CardDescription>Control how the crawler behaves</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <p className="text-xs text-muted-foreground">
                  0 = only start URLs
                </p>
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

            <div className="space-y-2">
              <Label htmlFor="delay_ms">Delay Between Requests (ms)</Label>
              <Input
                id="delay_ms"
                type="number"
                min={0}
                value={formData.delay_ms}
                onChange={(e) => setFormData({ ...formData, delay_ms: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Be respectful - add delay to avoid overwhelming servers
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wait_for_selector">Wait For Selector (CSS)</Label>
              <Input
                id="wait_for_selector"
                placeholder=".job-listing, #content-loaded"
                value={formData.wait_for_selector}
                onChange={(e) => setFormData({ ...formData, wait_for_selector: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                For JavaScript-heavy sites - wait until this element appears
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Schedule (Optional)</CardTitle>
            <CardDescription>Run automatically on a schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="schedule">Cron Expression</Label>
              <Input
                id="schedule"
                placeholder="0 9 * * *"
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Examples: "0 9 * * *" (daily at 9am), "0 */6 * * *" (every 6 hours)
              </p>
            </div>
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
            {loading ? 'Creating...' : 'Create Crawler'}
          </Button>
        </div>
      </form>
    </div>
  );
}
