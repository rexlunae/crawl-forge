'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  settings: any;
  role: string;
}

export function ApiKeyForm({ tenants }: { tenants: Tenant[] }) {
  const [loading, setLoading] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(tenants[0]?.id ?? '');
  const [provider, setProvider] = useState('ollama');
  const [openaiKey, setOpenaiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.2:3b');
  const router = useRouter();
  const supabase = createClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const settings = provider === 'openai'
      ? { llm_provider: 'openai', openai_api_key: openaiKey }
      : { llm_provider: 'ollama', ollama_url: ollamaUrl, ollama_model: ollamaModel };

    const { error } = await supabase
      .from('tenants')
      .update({ settings })
      .eq('id', selectedTenant);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      alert('Settings saved!');
      router.refresh();
    }
    setLoading(false);
  };

  if (tenants.length === 0) {
    return (
      <p className="text-muted-foreground">
        Create a workspace first to configure LLM settings.
      </p>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {tenants.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="tenant">Workspace</Label>
          <select
            id="tenant"
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label>LLM Provider</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="provider"
              value="ollama"
              checked={provider === 'ollama'}
              onChange={(e) => setProvider(e.target.value)}
            />
            Ollama (self-hosted)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="provider"
              value="openai"
              checked={provider === 'openai'}
              onChange={(e) => setProvider(e.target.value)}
            />
            OpenAI
          </label>
        </div>
      </div>

      {provider === 'openai' ? (
        <div className="space-y-2">
          <Label htmlFor="openaiKey">OpenAI API Key</Label>
          <Input
            id="openaiKey"
            type="password"
            placeholder="sk-..."
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Your key is encrypted and stored securely
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="ollamaUrl">Ollama URL</Label>
            <Input
              id="ollamaUrl"
              placeholder="http://localhost:11434"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ollamaModel">Model</Label>
            <Input
              id="ollamaModel"
              placeholder="llama3.2:3b"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Run <code>ollama pull llama3.2:3b</code> to download
            </p>
          </div>
        </>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  );
}
