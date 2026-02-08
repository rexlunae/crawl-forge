import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function RunDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  
  const { data: run, error } = await supabase
    .from('crawler_runs')
    .select('*, crawlers(id, name)')
    .eq('id', params.id)
    .single();

  if (error || !run) {
    notFound();
  }

  // Get crawled pages
  const { data: pages } = await supabase
    .from('crawled_pages')
    .select('*')
    .eq('run_id', params.id)
    .order('created_at', { ascending: true });

  // Get extraction results
  const { data: results } = await supabase
    .from('extraction_results')
    .select('*, extractors(name)')
    .eq('run_id', params.id)
    .order('created_at', { ascending: true })
    .limit(100);

  const duration = run.completed_at && run.started_at
    ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              run.status === 'completed' ? 'bg-green-100 text-green-700' :
              run.status === 'running' ? 'bg-blue-100 text-blue-700' :
              run.status === 'failed' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {run.status}
            </span>
            <h1 className="text-3xl font-bold">Run Details</h1>
          </div>
          <p className="text-muted-foreground">
            <Link href={`/dashboard/crawlers/${(run.crawlers as any)?.id}`} className="hover:underline">
              {(run.crawlers as any)?.name}
            </Link>
            {' · '}
            {new Date(run.created_at).toLocaleString()}
          </p>
        </div>
        <Link href={`/dashboard/crawlers/${(run.crawlers as any)?.id}`}>
          <Button variant="outline">View Crawler</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pages Crawled</CardDescription>
            <CardTitle className="text-3xl">{run.pages_crawled ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pages Failed</CardDescription>
            <CardTitle className="text-3xl">{run.pages_failed ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Items Extracted</CardDescription>
            <CardTitle className="text-3xl">{run.items_extracted ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Duration</CardDescription>
            <CardTitle className="text-3xl">
              {duration ? `${duration}s` : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Error */}
      {run.error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-300">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap">
              {run.error}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Crawled Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Crawled Pages</CardTitle>
          <CardDescription>{pages?.length ?? 0} pages</CardDescription>
        </CardHeader>
        <CardContent>
          {pages && pages.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {pages.map((page) => (
                <div key={page.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex-shrink-0 w-12 text-center rounded px-1 ${
                      page.status_code >= 200 && page.status_code < 300 ? 'bg-green-100 text-green-700' :
                      page.status_code >= 400 ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {page.status_code || 'ERR'}
                    </span>
                    <a 
                      href={page.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="truncate hover:underline text-blue-600 dark:text-blue-400"
                    >
                      {page.url}
                    </a>
                  </div>
                  <span className="text-muted-foreground flex-shrink-0 ml-2">
                    {page.duration_ms}ms
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No pages crawled</p>
          )}
        </CardContent>
      </Card>

      {/* Extracted Data */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Extracted Data</CardTitle>
            <CardDescription>{results?.length ?? 0} items</CardDescription>
          </div>
          {results && results.length > 0 && (
            <Button variant="outline" size="sm">
              Export JSON
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {results && results.length > 0 ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {results.map((result, i) => (
                <div key={result.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Item {i + 1}
                      {result.extractors && (
                        <span className="text-muted-foreground ml-2">
                          via {(result.extractors as any).name}
                        </span>
                      )}
                    </span>
                    {result.tokens_used && (
                      <span className="text-xs text-muted-foreground">
                        {result.tokens_used} tokens
                      </span>
                    )}
                  </div>
                  <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No data extracted</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
