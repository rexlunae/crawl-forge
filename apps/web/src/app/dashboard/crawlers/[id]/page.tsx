import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RunCrawlerButton } from './run-button';
import { ExtractorForm } from './extractor-form';

export default async function CrawlerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  
  const { data: crawler, error } = await supabase
    .from('crawlers')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !crawler) {
    notFound();
  }

  // Get extractors
  const { data: extractors } = await supabase
    .from('extractors')
    .select('*')
    .eq('crawler_id', params.id);

  // Get recent runs
  const { data: runs } = await supabase
    .from('crawler_runs')
    .select('*')
    .eq('crawler_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{crawler.name}</h1>
            <span className={`h-3 w-3 rounded-full ${crawler.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
          </div>
          <p className="text-muted-foreground">{crawler.description || 'No description'}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/crawlers/${params.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <RunCrawlerButton crawlerId={params.id} tenantId={crawler.tenant_id} />
        </div>
      </div>

      {/* Config Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Start URLs</CardDescription>
            <CardTitle>{crawler.start_urls?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Max Depth</CardDescription>
            <CardTitle>{crawler.max_depth}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Max Pages</CardDescription>
            <CardTitle>{crawler.max_pages}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Schedule</CardDescription>
            <CardTitle className="text-base">{crawler.schedule || 'Manual'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Start URLs */}
      <Card>
        <CardHeader>
          <CardTitle>Start URLs</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {crawler.start_urls?.map((url: string, i: number) => (
              <li key={i} className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {url}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Extractors */}
      <Card>
        <CardHeader>
          <CardTitle>Extractors</CardTitle>
          <CardDescription>
            Define what data to extract from crawled pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {extractors && extractors.length > 0 ? (
            <div className="space-y-4">
              {extractors.map((extractor) => (
                <div key={extractor.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{extractor.name}</h4>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                  <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
                    {extractor.prompt}
                  </pre>
                  {extractor.target_table && (
                    <p className="text-sm text-muted-foreground mt-2">
                      → Results to table: <code>{extractor.target_table}</code>
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No extractors yet. Add one to define what data to extract.
              </p>
            </div>
          )}
          
          <div className="mt-6">
            <ExtractorForm crawlerId={params.id} />
          </div>
        </CardContent>
      </Card>

      {/* Run History */}
      <Card>
        <CardHeader>
          <CardTitle>Run History</CardTitle>
          <CardDescription>Recent crawler executions</CardDescription>
        </CardHeader>
        <CardContent>
          {runs && runs.length > 0 ? (
            <div className="space-y-4">
              {runs.map((run) => (
                <Link 
                  key={run.id} 
                  href={`/dashboard/runs/${run.id}`}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 hover:bg-muted/50 -mx-2 px-2 py-2 rounded"
                >
                  <div>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      run.status === 'completed' ? 'bg-green-100 text-green-700' :
                      run.status === 'running' ? 'bg-blue-100 text-blue-700' :
                      run.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {run.status}
                    </span>
                    <span className="ml-3 text-sm text-muted-foreground">
                      {run.pages_crawled} pages · {run.items_extracted} items
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(run.created_at).toLocaleString()}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No runs yet. Click "Run Now" to execute this crawler.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
