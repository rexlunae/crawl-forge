# 🕷️ CrawlForge

AI-powered web crawler with LLM data extraction. Crawl websites and extract structured data using natural language prompts.

![CrawlForge Dashboard](./docs/screenshot.png)

## Features

- **🌐 Smart Crawling** - Playwright-based crawling handles JavaScript-heavy sites
- **🤖 AI Extraction** - Extract structured data using natural language prompts
- **🏢 Multi-tenant** - Workspaces for teams with role-based access
- **📊 Dashboard** - Beautiful UI to manage crawlers and view results
- **⏰ Scheduling** - Cron-based recurring crawls
- **🔌 Flexible LLMs** - Use Ollama (local) or OpenAI

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Supabase local)
- Supabase CLI

### Installation

```bash
# Clone
git clone https://github.com/rexlunae/crawl-forge.git
cd crawl-forge

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local

# Start Supabase locally
pnpm supabase start

# Run migrations
pnpm supabase db push

# Start development servers
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

### Running the Worker

In a separate terminal:

```bash
pnpm --filter worker dev
```

### Using Docker

For a complete local setup with Ollama:

```bash
cd docker
docker-compose up -d
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Web Dashboard │     │   Worker        │
│   (Next.js)     │     │   (Node.js)     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    ┌──────────────────┤
         │    │                  │
         ▼    ▼                  ▼
┌─────────────────┐     ┌─────────────────┐
│   Supabase      │     │   Ollama/OpenAI │
│   (Postgres)    │     │   (LLM)         │
└─────────────────┘     └─────────────────┘
```

## Project Structure

```
crawl-forge/
├── apps/
│   ├── web/          # Next.js dashboard
│   └── worker/       # Background job processor
├── packages/
│   ├── shared/       # Shared types and schemas
│   ├── crawler/      # Playwright crawling logic
│   └── extractor/    # LLM integration
├── supabase/         # Database migrations
└── docker/           # Docker setup
```

## Configuration

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# LLM Provider (worker)
LLM_PROVIDER=ollama  # or 'openai'
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# OpenAI (if using)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### Extraction Prompts

Write natural language prompts to describe what data you want:

```
Extract all job listings from this page. For each job, return:
- title: The job title
- company: Company name
- location: Job location (remote, city, etc)
- salary: Salary range if mentioned
- url: Link to the full posting
```

The LLM will parse the page content and return structured JSON matching your description.

## API

CrawlForge uses Supabase as its backend. You can query data directly:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// Get all crawlers
const { data } = await supabase.from('crawlers').select('*');

// Get extraction results
const { data: results } = await supabase
  .from('extraction_results')
  .select('*, crawlers(name)')
  .order('created_at', { ascending: false });
```

## Deployment

### Supabase Cloud

1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations: `supabase db push --linked`
3. Update `.env` with production URLs

### Vercel (Dashboard)

```bash
cd apps/web
vercel
```

### Worker

Deploy the worker to any Node.js host (Railway, Render, Fly.io, etc).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT - see [LICENSE](./LICENSE)
