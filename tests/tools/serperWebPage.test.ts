import { describe, it, expect } from 'vitest';
import { serperWebPage } from '../../src/tools/serperWebPage';

describe('serperWebPage', () => {
  it('should extract content from a webpage successfully', async () => {
    const params = {
      url: 'https://example.com',
    };

    const result = await serperWebPage.run(params);
    console.log(result);

    // Verificar se o resultado não contém erro
    expect(result).toBeTruthy();
  }, 30000); // Timeout de 30 segundos
});
