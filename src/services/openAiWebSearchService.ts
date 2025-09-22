import OpenAI from 'openai';
import chalk from 'chalk';

export type OpenAIWebSearchInterval =
  | 'lastHour'
  | 'last24Hours'
  | 'lastWeek'
  | 'lastMonth'
  | 'lastYear'
  | 'allTime';

export interface OpenAIWebSearchParams {
  type: string;
  query: string;
  gl: 'br' | 'us';
  location: string;
  interval: OpenAIWebSearchInterval;
  prompt?: string;
}

export interface OpenAIWebSearchResult {
  title: string;
  url: string;
  description?: string;
}

export interface OpenAIWebSearchResponse {
  success: boolean;
  results?: OpenAIWebSearchResult[];
  error?: string;
  details?: unknown;
}

const intervalSuffixes: Record<OpenAIWebSearchInterval, string> = {
  lastHour: 'in the last hour',
  last24Hours: 'in the last 24 hours',
  lastWeek: 'in the last week',
  lastMonth: 'in the last month',
  lastYear: 'in the last year',
  allTime: '',
};

export class OpenAIWebSearchService {
  private static client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  static async search(params: OpenAIWebSearchParams): Promise<OpenAIWebSearchResponse> {
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        error: 'OPENAI_API_KEY not configured',
      };
    }

    if (!params.query || !params.query.trim()) {
      return {
        success: false,
        error: 'Query parameter is required',
      };
    }

    const { type, query, gl, location, interval, prompt } = params;

    console.log(
      chalk.bgCyan(' OPENAI WEB SEARCH '),
      chalk.cyan(`Searching via OpenAI for: ${query} (${type}) [${location}/${gl}]`),
    );

    const timeContext = intervalSuffixes[interval];
    const basePrompt = `${query}${timeContext ? ` ${timeContext}` : ''} - at least 10 results`;
    const fullPrompt = [basePrompt, prompt].filter(Boolean).join('\n');

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-search-preview',
        web_search_options: {
          // search_context_size: 'high',
        },
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'web_search_preview',
            schema: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      url: { type: 'string' },
                      description: { type: 'string' },
                    },
                    required: ['title', 'url'],
                  },
                },
              },
              required: ['results'],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
      });

      const results = JSON.parse(completion.choices[0].message.content);
      // console.dir(results.results, { depth: null });

      return {
        success: true,
        results: results.results,
      };
    } catch (error: any) {
      console.error('Error during OpenAI web search:', error.message || error);
      return {
        success: false,
        error: 'Failed to execute OpenAI web search',
        details: error.message || error,
      };
    }
  }
}
