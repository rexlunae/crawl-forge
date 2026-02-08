# CrawlForge 🕷️🤖

AI-powered web crawler that extracts structured data using LLMs and stores it in Supabase.

## Features

- **Multi-tenant** - Isolated workspaces with team support
- **Visual Dashboard** - Configure crawlers without code
- **LLM-Powered Extraction** - Use natural language prompts to define what data to extract
- **Flexible Storage** - Results go directly to your Supabase tables
- **Scheduling** - Run crawlers on a schedule or manually
- **Self-Hostable** - Run on your own infrastructure with Ollama

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CrawlForge Dashboard                      │
│                    (Next.js + Supabase Auth)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Backend                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Tenants   │  │  Crawlers   │  │   Extraction Jobs   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Runs     │  │   Results   │  │   Custom Tables     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Crawler Worker                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Playwright │  │   Ollama    │  │   Result Writer     │  │
│  │  (fetching) │  │ (extraction)│  │   (to Supabase)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Postgres, Auth, Row Level Security)
- **Crawler**: Playwright (headless Chrome)
- **LLM**: Ollama (local) or OpenAI-compatible APIs
- **Queue**: pg_boss (Postgres-backed job queue)
- **Language**: TypeScript throughout

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Supabase CLI (or a Supabase cloud project)
- Ollama (for local LLM)

### Installation

```bash
# Clone the repo
git clone https://github.com/rexlunae/crawl-forge.git
cd crawl-forge

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Start Supabase locally (or use cloud)
pnpm supabase start

# Run database migrations
pnpm db:migrate

# Start the development server
pnpm dev
```

### Configuration

Edit `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Ollama (or OpenAI-compatible endpoint)
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434

# Optional: OpenAI
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-...
```

## Usage

1. **Create a Tenant** - Sign up and create your workspace
2. **Define a Crawler** - Set the URL pattern and extraction prompt
3. **Configure Output** - Choose or create a Supabase table for results
4. **Run** - Execute manually or set a schedule

### Example Extraction Prompt

```
Extract job postings from this page. For each job, return:
- title: The job title
- company: Company name
- location: Job location (city, state, or "Remote")
- salary_min: Minimum salary (number, null if not listed)
- salary_max: Maximum salary (number, null if not listed)
- url: Link to the full job posting
```

## Project Structure

```
crawl-forge/
├── apps/
│   ├── web/                 # Next.js dashboard
│   └── worker/              # Crawler worker service
├── packages/
│   ├── db/                  # Database schema & migrations
│   ├── crawler/             # Core crawling logic
│   ├── extractor/           # LLM extraction logic
│   └── shared/              # Shared types & utilities
├── supabase/
│   ├── migrations/          # SQL migrations
│   └── seed.sql             # Development seed data
└── docker/
    └── docker-compose.yml   # Local development stack
```

## License

MIT

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.
