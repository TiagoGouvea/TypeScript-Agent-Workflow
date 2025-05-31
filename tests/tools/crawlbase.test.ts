import { describe, it, expect } from 'vitest';
import { crawlbase } from '../../src/tools/crawlbase';

describe('crawlbase', () => {
  it('should scrape a website successfully - fullHtmlContent', async () => {
    const params = {
      url: 'https://example.com',
      lookFor: 'company information and website purpose',
      returnMode: 'fullHtmlContent' as const,
    };

    const result = await crawlbase.run(params);

    // Verificar se o resultado não contém erro
    expect(result).not.toHaveProperty('error');
    expect(typeof result).toBe('string');
    expect(result).toContain('Example Domain');

    // Podemos adicionar mais verificações depois, dependendo do que for retornado
    // quando a implementação estiver completa
  }, 30000); // Timeout de 30 segundos

  it('should scrape a website successfully - lookFor', async () => {
    const params = {
      url: 'https://example.com',
      lookFor: 'company information and website purpose',
      returnMode: 'lookFor' as const,
    };

    const result = await crawlbase.run(params);

    // Verificar se o resultado não contém erro
    expect(result).not.toHaveProperty('error');
    expect(typeof result).toBe('string');

    // Podemos adicionar mais verificações depois, dependendo do que for retornado
    // quando a implementação estiver completa
  }, 30000); // Timeout de 30 segundos

  it('should handle invalid URL gracefully', async () => {
    const params = {
      url: 'invalid-url',
      lookFor: 'any information',
      returnMode: 'fullHtmlContent' as const,
    };

    const result = await crawlbase.run(params);

    // Verificar se o resultado contém erro para URL inválida
    expect(result).toHaveProperty('error');
  }, 30000);
});