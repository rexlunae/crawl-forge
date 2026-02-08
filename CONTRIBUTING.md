# Contributing to CrawlForge

Thank you for your interest in contributing! 🎉

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local Supabase or Ollama)
- Supabase CLI

### Quick Start

```bash
# Clone the repo
git clone https://github.com/rexlunae/crawl-forge.git
cd crawl-forge

# Install dependencies
pnpm install

# Start Supabase locally
pnpm supabase start

# Run migrations
pnpm db:migrate

# Generate TypeScript types
pnpm db:types

# Start development
pnpm dev
```

### Project Structure

- `apps/web` - Next.js dashboard
- `apps/worker` - Background job processor
- `packages/shared` - Shared types and schemas
- `packages/crawler` - Web crawling logic (Playwright)
- `packages/extractor` - LLM integration (Ollama/OpenAI)
- `supabase/` - Database migrations

### Running Tests

```bash
pnpm test
```

### Code Style

- TypeScript everywhere
- Use Zod for runtime validation
- Follow existing patterns

### Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Reporting Issues

Please use GitHub Issues and include:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
