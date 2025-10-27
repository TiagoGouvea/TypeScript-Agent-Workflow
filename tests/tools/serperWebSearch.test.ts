import { describe, it, expect } from 'vitest';
import { serperWebSearch } from '../../src/tools/serperWebSearch';

const hasApiKey = !!process.env.SERPER_API_KEY;

describe.skipIf(!hasApiKey)('serperWebSearch tool', () => {
  it('should search for news successfully', async () => {
    const params = {
      type: 'news',
      query: 'technology news',
      gl: 'us' as const,
      hl: 'en' as const,
      location: 'United States',
      interval: 'last24Hours' as const,
    };

    const result = await serperWebSearch.run(params);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results?.[0]).toHaveProperty('title');
  }, 30000); // Timeout de 30 segundos

  it('should search for general results successfully', async () => {
    const params = {
      type: 'search',
      query: 'typescript programming',
      gl: 'br' as const,
      hl: 'pt' as const,
      location: 'Brazil',
      interval: 'lastWeek' as const,
    };

    const result = await serperWebSearch.run(params);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.results)).toBe(true);
  }, 30000);
});
