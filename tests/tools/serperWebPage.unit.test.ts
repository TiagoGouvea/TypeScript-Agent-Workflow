import { describe, it, expect } from 'vitest';
import { serperWebPage } from '../../src/tools/serperWebPage';

describe('serperWebPage - AppMasters', () => {
  it('should extract content from appmasters.io successfully', async () => {
    const params = {
      url: 'https://appmasters.io',
    };

    const result = await serperWebPage.run(params);
    console.log('AppMasters.io content:', result);

    // Verificar se o resultado não contém erro
    expect(result).not.toHaveProperty('error');
    
    // Verificar se retornou dados do site
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    
    // Verificar se o conteúdo contém informações esperadas da AppMasters
    if (result.title) {
      expect(result.title.toLowerCase()).toContain('appmasters');
    }
    
    if (result.content) {
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(0);
    }
  }, 30000); // Timeout de 30 segundos
});