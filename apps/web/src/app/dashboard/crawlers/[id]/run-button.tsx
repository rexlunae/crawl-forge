'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function RunCrawlerButton({ 
  crawlerId, 
  tenantId 
}: { 
  crawlerId: string; 
  tenantId: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRun = async () => {
    setLoading(true);

    // Create a new run
    const { data: run, error } = await supabase
      .from('crawler_runs')
      .insert({
        crawler_id: crawlerId,
        tenant_id: tenantId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      alert(`Failed to start run: ${error.message}`);
      setLoading(false);
      return;
    }

    // Queue the job (in production, this would trigger the worker)
    const { error: jobError } = await supabase
      .from('job_queue')
      .insert({
        name: 'crawl',
        data: {
          crawler_id: crawlerId,
          run_id: run.id,
          tenant_id: tenantId,
        },
      });

    if (jobError) {
      console.error('Failed to queue job:', jobError);
    }

    setLoading(false);
    router.refresh();
  };

  return (
    <Button onClick={handleRun} disabled={loading}>
      {loading ? 'Starting...' : 'Run Now'}
    </Button>
  );
}
