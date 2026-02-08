import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function RunsPage() {
  const supabase = createClient();
  
  const { data: runs } = await supabase
    .from('crawler_runs')
    .select('*, crawlers(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Run History</h1>
        <p className="text-muted-foreground">All crawler executions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
          <CardDescription>{runs?.length ?? 0} runs total</CardDescription>
        </CardHeader>
        <CardContent>
          {runs && runs.length > 0 ? (
            <div className="space-y-2">
              {runs.map((run) => (
                <Link
                  key={run.id}
                  href={`/dashboard/runs/${run.id}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      run.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                      run.status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                      run.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {run.status}
                    </span>
                    <div>
                      <p className="font-medium">{(run.crawlers as any)?.name ?? 'Unknown Crawler'}</p>
                      <p className="text-sm text-muted-foreground">
                        {run.pages_crawled ?? 0} pages · {run.items_extracted ?? 0} items
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{new Date(run.created_at).toLocaleDateString()}</p>
                    <p>{new Date(run.created_at).toLocaleTimeString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No runs yet. Create and run a crawler to see history here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
