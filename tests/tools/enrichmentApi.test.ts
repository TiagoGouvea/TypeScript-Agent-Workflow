import { describe, it, expect } from 'vitest';
import {
  enrichmentApiCompanySearch,
  enrichmentApiPersonSearch,
  enrichmentApiCompanyByName,
  enrichmentApiCompanyByLinkedin,
  enrichmentApiPersonByLinkedin,
  enrichmentApiBulkCompanySearch,
  enrichmentApiBulkPersonSearch
} from '../../src/tools/enrichmentApi';

const hasApiKey = !!process.env.ENRICHMENT_API_KEY;

describe.skipIf(!hasApiKey)('EnrichmentAPI Tools', () => {
  describe('enrichmentApiCompanySearch tool', () => {
    it('should execute company search with name', async () => {
      const result = await enrichmentApiCompanySearch.run({
        name: 'App Masters'
      });
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it('should execute company search with linkedin', async () => {
      const result = await enrichmentApiCompanySearch.run({
        linkedin: 'https://www.linkedin.com/company/appmasters.io/'
      });
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);
  });

  describe('enrichmentApiPersonSearch tool', () => {
    it('should execute person search with linkedin', async () => {
      const result = await enrichmentApiPersonSearch.run({
        linkedin: 'https://linkedin.com/in/tiagogouvea'
      });
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);
  });


  describe('enrichmentApiPersonByLinkedin tool', () => {
    it('should execute person search by linkedin', async () => {
      const result = await enrichmentApiPersonByLinkedin.run({
        linkedin: 'https://linkedin.com/in/tiagogouvea'
      });
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);
  });

  describe('enrichmentApiBulkCompanySearch tool', () => {
    it('should execute bulk company search', async () => {
      const result = await enrichmentApiBulkCompanySearch.run({
        companies: [
          { name: 'App Masters' },
          { linkedin: 'https://www.linkedin.com/company/appmasters.io/' }
        ]
      });
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);
  });

});