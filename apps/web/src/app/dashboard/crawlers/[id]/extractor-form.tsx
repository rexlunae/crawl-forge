'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const EXAMPLE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      url: { type: 'string' },
    },
  },
};

export function ExtractorForm({ crawlerId }: { crawlerId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    prompt: '',
    output_schema: JSON.stringify(EXAMPLE_SCHEMA, null, 2),
    content_selector: '',
    target_table: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let schema;
    try {
      schema = JSON.parse(formData.output_schema);
    } catch {
      alert('Invalid JSON schema');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('extractors').insert({
      crawler_id: crawlerId,
      name: formData.name,
      prompt: formData.prompt,
      output_schema: schema,
      content_selector: formData.content_selector || null,
      target_table: formData.target_table || null,
    });

    if (error) {
      alert(`Error: ${error.message}`);
      setLoading(false);
      return;
    }

    setIsOpen(false);
    setFormData({
      name: '',
      prompt: '',
      output_schema: JSON.stringify(EXAMPLE_SCHEMA, null, 2),
      content_selector: '',
      target_table: '',
    });
    setLoading(false);
    router.refresh();
  };

  if (!isOpen) {
    return (
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        Add Extractor
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4">
      <h4 className="font-medium">New Extractor</h4>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="Job Listing Extractor"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">Extraction Prompt</Label>
        <Textarea
          id="prompt"
          placeholder="Extract all job listings from this page. For each job, return the title, company name, location, and salary range..."
          value={formData.prompt}
          onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
          rows={5}
          required
        />
        <p className="text-xs text-muted-foreground">
          Describe in plain English what data you want to extract
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="schema">Output Schema (JSON Schema)</Label>
        <Textarea
          id="schema"
          value={formData.output_schema}
          onChange={(e) => setFormData({ ...formData, output_schema: e.target.value })}
          rows={10}
          className="font-mono text-sm"
          required
        />
        <p className="text-xs text-muted-foreground">
          Define the structure of extracted data
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="selector">Content Selector (optional)</Label>
        <Input
          id="selector"
          placeholder=".main-content, #article-body"
          value={formData.content_selector}
          onChange={(e) => setFormData({ ...formData, content_selector: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          CSS selector to limit extraction to specific page areas
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="table">Target Table (optional)</Label>
        <Input
          id="table"
          placeholder="job_listings"
          value={formData.target_table}
          onChange={(e) => setFormData({ ...formData, target_table: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Store results in a custom Supabase table (must exist)
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Add Extractor'}
        </Button>
      </div>
    </form>
  );
}
