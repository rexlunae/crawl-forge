import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function CrawlersPage() {
  const supabase = createClient();
  
  const { data: crawlers } = await supabase
    .from('crawlers')
    .select('*, crawler_runs(id, status, created_at)')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Crawlers</h1>
          <p className="text-muted-foreground">Manage your web crawlers</p>
        </div>
        <Link href="/dashboard/crawlers/new">
          <Button>Create Crawler</Button>
        </Link>
      </div>

      {crawlers && crawlers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {crawlers.map((crawler) => {
            const lastRun = (crawler.crawler_runs as any[])?.[0];
            return (
              <Link key={crawler.id} href={`/dashboard/crawlers/${crawler.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{crawler.name}</CardTitle>
                      <span className={`h-2 w-2 rounded-full ${crawler.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                    <CardDescription className="line-clamp-2">
                      {crawler.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Start URLs</span>
                        <span>{crawler.start_urls?.length ?? 0}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Max Depth</span>
                        <span>{crawler.max_depth}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Schedule</span>
                        <span>{crawler.schedule || 'Manual'}</span>
                      </div>
                      {lastRun && (
                        <div className="flex justify-between text-muted-foreground pt-2 border-t">
                          <span>Last Run</span>
                          <span className={`font-medium ${
                            lastRun.status === 'completed' ? 'text-green-600' :
                            lastRun.status === 'failed' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            {lastRun.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <span className="text-6xl mb-4">🕷️</span>
            <h2 className="text-xl font-semibold mb-2">No crawlers yet</h2>
            <p className="text-muted-foreground mb-4">Create your first crawler to start extracting data</p>
            <Link href="/dashboard/crawlers/new">
              <Button>Create Crawler</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
