import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const supabase = createClient();
  
  // Get user's tenants (or create default one)
  const { data: memberships } = await supabase
    .from('tenant_members')
    .select('tenant_id, role, tenants(id, name, slug)')
    .limit(10);

  const tenants = memberships?.map(m => m.tenants).filter(Boolean) ?? [];
  
  // Get crawler counts
  const { count: crawlerCount } = await supabase
    .from('crawlers')
    .select('*', { count: 'exact', head: true });

  // Get recent runs
  const { data: recentRuns } = await supabase
    .from('crawler_runs')
    .select('id, status, pages_crawled, items_extracted, created_at, crawlers(name)')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your crawling activity</p>
        </div>
        <Link href="/dashboard/crawlers/new">
          <Button>Create Crawler</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Crawlers</CardDescription>
            <CardTitle className="text-4xl">{crawlerCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Runs Today</CardDescription>
            <CardTitle className="text-4xl">
              {recentRuns?.filter(r => {
                const today = new Date().toDateString();
                return new Date(r.created_at).toDateString() === today;
              }).length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pages Crawled</CardDescription>
            <CardTitle className="text-4xl">
              {recentRuns?.reduce((sum, r) => sum + (r.pages_crawled ?? 0), 0) ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Items Extracted</CardDescription>
            <CardTitle className="text-4xl">
              {recentRuns?.reduce((sum, r) => sum + (r.items_extracted ?? 0), 0) ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
          <CardDescription>Latest crawler activity</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRuns && recentRuns.length > 0 ? (
            <div className="space-y-4">
              {recentRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{(run.crawlers as any)?.name ?? 'Unknown Crawler'}</p>
                    <p className="text-sm text-muted-foreground">
                      {run.pages_crawled} pages · {run.items_extracted} items
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      run.status === 'completed' ? 'bg-green-100 text-green-700' :
                      run.status === 'running' ? 'bg-blue-100 text-blue-700' :
                      run.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {run.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(run.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No runs yet. Create a crawler to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Start */}
      {crawlerCount === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🚀 Quick Start</CardTitle>
            <CardDescription>Get started in 3 easy steps</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
              <li>
                <strong className="text-foreground">Create a crawler</strong> - Define the URLs you want to crawl
              </li>
              <li>
                <strong className="text-foreground">Add an extractor</strong> - Write a prompt describing what data to extract
              </li>
              <li>
                <strong className="text-foreground">Run it!</strong> - Execute manually or set up a schedule
              </li>
            </ol>
            <div className="mt-6">
              <Link href="/dashboard/crawlers/new">
                <Button>Create Your First Crawler</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
