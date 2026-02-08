import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-gray-900/50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🕷️</span>
            <span className="text-xl font-bold">CrawlForge</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            Extract Data from Any Website
            <span className="text-primary"> with AI</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 dark:text-gray-300">
            Tell CrawlForge what data you need in plain English. 
            Our AI-powered crawler extracts structured data and stores it directly in your database.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg">Start Crawling</Button>
            </Link>
            <Link href="https://github.com/rexlunae/crawl-forge" target="_blank">
              <Button variant="outline" size="lg">View on GitHub</Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid gap-8 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🤖</span> AI-Powered Extraction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Describe what you want to extract in plain English. 
                The LLM understands your intent and extracts exactly what you need.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🗄️</span> Direct to Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Results go straight into your Supabase tables. 
                Define your schema once, get structured data automatically.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>⏰</span> Scheduled Crawls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Set up recurring crawls with cron schedules. 
                Keep your data fresh without lifting a finger.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🔒</span> Multi-Tenant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create workspaces for different projects or teams. 
                Row-level security keeps your data isolated.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🏠</span> Self-Hostable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Run on your own infrastructure with Ollama for local LLMs. 
                Your data never leaves your servers.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📊</span> Full Visibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track every crawl run, see what was extracted, 
                and debug issues with detailed logs.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Example */}
        <div className="mt-24">
          <h2 className="text-center text-3xl font-bold">How It Works</h2>
          <div className="mt-8 mx-auto max-w-2xl rounded-lg border bg-gray-900 p-6 text-gray-100">
            <p className="text-sm text-gray-400 mb-2">Example extraction prompt:</p>
            <pre className="text-sm overflow-x-auto">
{`Extract job postings from this page.
For each job, return:
- title: Job title
- company: Company name  
- location: City or "Remote"
- salary_min: Minimum salary (number)
- salary_max: Maximum salary (number)
- url: Link to full posting`}
            </pre>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-24">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>Open source under MIT License</p>
        </div>
      </footer>
    </div>
  );
}
