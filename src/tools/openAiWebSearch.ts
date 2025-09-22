import { z } from 'zod';
import { tool } from '../types/workflow/Tool.ts';
import { OpenAIWebSearchService } from '../services/openAiWebSearchService.ts';

export const openAIWebSearch = tool({
  name: 'openAIWebSearch',
  description: 'Search the web for news, articles, and other web results.',
  params: z.object({
    type: z.string().describe('Type of search, e.g. "news", "search", etc.'),
    query: z.string().describe('The search term to query the web for.'),
    gl: z.enum(['br', 'us']).describe('Country code for search localization.'),
    location: z.string().describe('Country name for search localization.'),
    interval: z
      .enum([
        'lastHour',
        'last24Hours',
        'lastWeek',
        'lastMonth',
        'lastYear',
        'allTime',
      ])
      .describe('Time interval for the search.'),
    prompt: z
      .string()
      .optional()
      .describe('Optional extra instructions to append to the search prompt'),
  }),
  run: async ({ type, query, gl, location, interval, prompt }) => {
    const response = await OpenAIWebSearchService.search({
      type,
      query,
      gl,
      location,
      interval,
      prompt,
    });

    if (!response.success) {
      return response;
    }

    return response.results ?? [];
  },
});
