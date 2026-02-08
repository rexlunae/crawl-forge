import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
    }

    const systemPrompt = `You are a web crawler configuration generator. Given a user's description of what they want to crawl, generate a JSON configuration.

Output ONLY valid JSON with this structure:
{
  "name": "descriptive crawler name",
  "description": "what this crawler does",
  "start_urls": ["https://..."],
  "url_patterns": ["regex patterns for URLs to follow"],
  "max_depth": 1,
  "max_pages": 100,
  "delay_ms": 1000,
  "wait_for_selector": null,
  "extraction_prompt": "detailed prompt for extracting data from each page"
}

Guidelines:
- Extract any URLs mentioned in the user's request
- If no URL given, use a placeholder like "https://example.com"
- Generate a clear extraction_prompt that describes what fields to extract
- Keep max_depth low (0-2) unless they want deep crawling
- Be conservative with max_pages (100 default)
- Use 1000ms delay to be respectful of servers
- Only set wait_for_selector if site likely uses heavy JavaScript`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `${systemPrompt}\n\nUser request: ${prompt}\n\nJSON config:`,
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    const generated = data.response;

    // Parse the JSON from the response
    const jsonMatch = generated.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const config = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!config.name) config.name = 'Web Crawler';
    if (!config.start_urls || !Array.isArray(config.start_urls)) {
      config.start_urls = ['https://example.com'];
    }
    if (!config.url_patterns) config.url_patterns = [];
    if (typeof config.max_depth !== 'number') config.max_depth = 1;
    if (typeof config.max_pages !== 'number') config.max_pages = 100;
    if (typeof config.delay_ms !== 'number') config.delay_ms = 1000;

    return NextResponse.json(config);
  } catch (error) {
    console.error('Generate crawler error:', error);
    return NextResponse.json(
      { error: 'Failed to generate config' },
      { status: 500 }
    );
  }
}
