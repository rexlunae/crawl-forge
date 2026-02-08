import OpenAI from 'openai';
import type { LLMProvider, ExtractionResult } from '@crawl-forge/shared';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export class OllamaProvider implements LLMProvider {
  name = 'ollama';
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: OllamaConfig) {
    // Ollama exposes an OpenAI-compatible API
    this.client = new OpenAI({
      baseURL: `${config.baseUrl}/v1`,
      apiKey: 'ollama', // Required but not used by Ollama
    });
    this.model = config.model;
    this.temperature = config.temperature ?? 0.1;
    this.maxTokens = config.maxTokens ?? 4096;
  }

  async extract(
    prompt: string,
    content: string,
    schema: Record<string, unknown>
  ): Promise<ExtractionResult> {
    const systemPrompt = `You are a data extraction assistant. Extract structured data from the provided content according to the user's instructions.

Output ONLY valid JSON that matches this schema:
${JSON.stringify(schema, null, 2)}

If multiple items match, return an array. If no items match, return an empty array [].
Do not include any explanation or markdown - only the JSON data.`;

    const userPrompt = `${prompt}

---
CONTENT TO EXTRACT FROM:
---
${content}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

      const responseText = response.choices[0]?.message?.content?.trim() || '';
      
      // Try to parse JSON from response
      const data = this.parseJsonResponse(responseText);
      
      return {
        success: true,
        data: Array.isArray(data) ? data : [data],
        tokensUsed: response.usage?.total_tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private parseJsonResponse(text: string): Record<string, unknown>[] {
    // Try direct parse first
    try {
      return JSON.parse(text);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }
      
      // Try to find JSON array or object
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        return JSON.parse(arrayMatch[0]);
      }
      
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return [JSON.parse(objectMatch[0])];
      }
      
      throw new Error('Could not parse JSON from response');
    }
  }
}

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? 'gpt-4o-mini';
    this.temperature = config.temperature ?? 0.1;
    this.maxTokens = config.maxTokens ?? 4096;
  }

  async extract(
    prompt: string,
    content: string,
    schema: Record<string, unknown>
  ): Promise<ExtractionResult> {
    const systemPrompt = `You are a data extraction assistant. Extract structured data from the provided content.

Output ONLY valid JSON matching this schema:
${JSON.stringify(schema, null, 2)}

Return an array of items. If no items match, return [].`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${prompt}\n\n---\nCONTENT:\n---\n${content}` },
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' },
      });

      const responseText = response.choices[0]?.message?.content?.trim() || '[]';
      const parsed = JSON.parse(responseText);
      const data = parsed.items || parsed.data || (Array.isArray(parsed) ? parsed : [parsed]);
      
      return {
        success: true,
        data,
        tokensUsed: response.usage?.total_tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Factory function
export function createExtractor(provider: 'ollama' | 'openai', config: OllamaConfig | OpenAIConfig): LLMProvider {
  if (provider === 'ollama') {
    return new OllamaProvider(config as OllamaConfig);
  }
  return new OpenAIProvider(config as OpenAIConfig);
}
