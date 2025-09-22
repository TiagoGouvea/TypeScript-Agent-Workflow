import { describe, it, expect } from 'vitest';
import { SerperWebSearchService } from '../../src/services/serperWebSearchService';

const hasApiKey = !!process.env.SERPER_API_KEY;

describe('SerperWebSearchService', () => {
  it('should validate missing query', async () => {
    const result = await SerperWebSearchService.search({
      type: 'search',
      query: '',
      gl: 'us',
      hl: 'en',
      location: 'United States',
      interval: 'allTime',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Query parameter is required');
  });
});

describe.skipIf(!hasApiKey)('SerperWebSearchService (integration)', () => {
  it('should search for news successfully', async () => {
    const result = await SerperWebSearchService.search({
      type: 'news',
      query: 'technology news',
      gl: 'us',
      hl: 'en',
      location: 'United States',
      interval: 'last24Hours',
    });
    console.log(result);

    expect(result.success).toBe(true);
    expect(Array.isArray(result.results)).toBe(true);
  }, 30000);

  it('should search for general results successfully', async () => {
    const result = await SerperWebSearchService.search({
      type: 'search',
      query: 'typescript programming',
      gl: 'br',
      hl: 'pt',
      location: 'Brazil',
      interval: 'lastWeek',
    });
    console.log(result);

    expect(result.success).toBe(true);
    expect(Array.isArray(result.results)).toBe(true);
  }, 30000);

  it('should search for places successfully', async () => {
    const result = await SerperWebSearchService.search({
      type: 'places',
      query: 'App Masters',
      gl: 'br',
      hl: 'pt',
      location: 'Juiz de Fora',
      interval: 'allTime',
    });
    console.log(result);

    expect(result.success).toBe(true);
    expect(Array.isArray(result.results)).toBe(true);
  }, 30000);
});
