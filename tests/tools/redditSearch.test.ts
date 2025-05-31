import { describe, it, expect } from 'vitest';
import { redditSearch } from '../../src/tools/redditSearch';

describe('redditSearch', () => {
  it('should search for posts successfully', async () => {
    const params = {
      query: 'typescript programming',
      sort: 'relevance' as const,
      time: 'week' as const,
      limit: 10,
    };

    const result = await redditSearch.run(params);

    // Verificar se o resultado não contém erro
    expect(result).not.toHaveProperty('error');
    expect(Array.isArray(result)).toBe(true);

    // Se há resultados, verificar a estrutura
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('url');
      expect(result[0]).toHaveProperty('permalink');
      expect(result[0]).toHaveProperty('subreddit');
      expect(result[0]).toHaveProperty('author');
      expect(result[0]).toHaveProperty('score');
    }
  }, 30000);

  it('should search in specific subreddit successfully', async () => {
    const params = {
      query: 'javascript',
      subreddit: 'programming',
      sort: 'hot' as const,
      time: 'day' as const,
      limit: 5,
    };

    const result = await redditSearch.run(params);

    // Verificar se o resultado não contém erro
    expect(result).not.toHaveProperty('error');
    expect(Array.isArray(result)).toBe(true);

    // Se há resultados, verificar se são do subreddit correto
    if (result.length > 0) {
      expect(result[0].subreddit).toBe('programming');
    }
  }, 30000);

  it('should handle empty query gracefully', async () => {
    const params = {
      query: '',
      sort: 'relevance' as const,
      time: 'all' as const,
      limit: 10,
    };

    const result = await redditSearch.run(params);

    // Verificar se o resultado é um array vazio ou contém erro
    expect(Array.isArray(result) || result.hasOwnProperty('error')).toBe(true);
  }, 30000);
});
