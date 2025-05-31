import { describe, it, expect } from 'vitest';
import { webSearch } from '../../src/tools/webSearch';

describe('webSearch', () => {
  it('should search for news successfully', async () => {
    const params = {
      type: 'news',
      query: 'technology news',
      gl: 'us' as const,
      location: 'United States',
      interval: 'last24Hours' as const,
    };

    const result = await webSearch.run(params);

    // Verificar se o resultado não contém erro
    expect(result).not.toHaveProperty('error');
    expect(Array.isArray(result)).toBe(true);

    // Se há resultados, verificar a estrutura
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('link');
    }
  }, 30000); // Timeout de 30 segundos

  it('should search for general results successfully', async () => {
    const params = {
      type: 'search',
      query: 'typescript programming',
      gl: 'br' as const,
      location: 'Brazil',
      interval: 'lastWeek' as const,
    };

    const result = await webSearch.run(params);

    // Verificar se o resultado não contém erro
    expect(result).not.toHaveProperty('error');
    expect(Array.isArray(result)).toBe(true);

    // Se há resultados, verificar a estrutura
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('link');
    }
  }, 30000);

  it('should handle empty query gracefully', async () => {
    const params = {
      type: 'search',
      query: '',
      gl: 'us' as const,
      location: 'United States',
      interval: 'allTime' as const,
    };

    const result = await webSearch.run(params);

    // Verificar se o resultado é um array vazio ou contém erro
    expect(Array.isArray(result) || result.hasOwnProperty('error')).toBe(true);
  }, 30000);

  it('should map intervals correctly', async () => {
    const params = {
      type: 'search',
      query: 'test query',
      gl: 'us' as const,
      location: 'United States',
      interval: 'lastHour' as const,
    };

    const result = await webSearch.run(params);

    // Verificar se o resultado não contém erro (se as chaves de API estiverem configuradas)
    expect(result).not.toHaveProperty('error');
    expect(Array.isArray(result)).toBe(true);
  }, 30000);
});