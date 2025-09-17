import { describe, it, expect } from 'vitest';
import { openAIWebSearch } from '../../src/tools/openAIWebSearch';

describe('openAIWebSearch', () => {
  it('should search for news successfully', async () => {
    const params = {
      // type: 'news',
      // query: 'generative ai news',
      // gl: 'us' as const,
      // location: 'United States',
      type: 'search',
      // query: 'app masters - juiz de fora',
      query: 'mari dos cachos - juiz de fora',
      query: 'mari dos cachos - juiz de fora',
      gl: 'br' as const,
      location: 'Brasil',
      interval: 'allTime' as const,
    };

    const result = await openAIWebSearch.run(params);

    // result should be an array of strings
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(typeof result[0]).toBe('object');
    expect(typeof result[0].title).toBe('string');
    expect(typeof result[0].url).toBe('string');
    expect(typeof result[0].description).toBe('string');
  }, 30000);

  // it('should search for general results successfully', async () => {
  //   const params = {
  //     type: 'search',
  //     query: 'openai news',
  //     gl: 'br' as const,
  //     location: 'Brazil',
  //     interval: 'lastWeek' as const,
  //   };

  //   const result = await openAIWebSearch.run(params);
  //   console.log(result);

  //   expect(Array.isArray(result)).toBe(true);
  //   expect(result.length).toBeGreaterThan(0);
  //   expect(typeof result[0]).toBe('object');
  //   expect(typeof result[0].title).toBe('string');
  //   expect(typeof result[0].url).toBe('string');
  //   expect(typeof result[0].description).toBe('string');
  // }, 30000);
});
