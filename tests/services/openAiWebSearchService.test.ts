import { describe, it, expect } from 'vitest';
import { OpenAIWebSearchService } from '../../src/services/openAiWebSearchService';

const hasApiKey = !!process.env.OPENAI_API_KEY;

describe('OpenAIWebSearchService', () => {
  it('should validate missing query', async () => {
    const result = await OpenAIWebSearchService.search({
      type: 'search',
      query: '',
      gl: 'us',
      location: 'United States',
      interval: 'allTime',
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Query parameter is required');
  });
});

describe.skipIf(!hasApiKey)('OpenAIWebSearchService (integration)', () => {
  it('should search for results successfully', async () => {
    const result = await OpenAIWebSearchService.search({
      type: 'search',
      query: 'App Masters Juiz de Fora',
      gl: 'br',
      location: 'Brazil',
      interval: 'allTime',
      prompt: 'Focus on official company listings and recent news',
    });

    expect(result.success).toBe(true);
    expect(Array.isArray(result.results)).toBe(true);
  }, 30000);
});
