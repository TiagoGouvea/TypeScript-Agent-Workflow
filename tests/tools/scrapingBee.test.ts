import { describe, it, expect } from 'vitest';
import { scrapingBee } from '../../src/tools/scrapingBee';

describe('scrapingBee', () => {
  it('should scrape a website successfully - fullHtmlContent', async () => {
    const params = {
      url: 'https://example.com',
      lookFor: 'company information and website purpose',
      returnMode: 'fullHtmlContent',
    };

    const result = await scrapingBee.run(params);

    // Verificar se o resultado não contém erro
    expect(result).not.toHaveProperty('error');
    expect(result).includes('coordination');

    // Podemos adicionar mais verificações depois, dependendo do que for retornado
    // quando a implementação estiver completa
  }, 30000); // Timeout de 30 segundos
  it('should scrape a website successfully - justText', async () => {
    const params = {
      url: 'https://example.com',
      lookFor: 'company information and website purpose',
      returnMode: 'justText',
    };

    const result = await scrapingBee.run(params);

    // Verificar se o resultado não contém erro
    expect(result).not.toHaveProperty('error');
    expect(result).includes('coordination');
    expect(result).not.includes('<p>');

    // Podemos adicionar mais verificações depois, dependendo do que for retornado
    // quando a implementação estiver completa
  }, 30000); // Timeout de 30 segundos
});
