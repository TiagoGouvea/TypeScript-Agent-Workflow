import { describe, it, expect, beforeAll } from 'vitest';
import { EnrichmentApiService } from '../../src/services/enrichmentApiService';

const hasApiKey = !!process.env.ENRICHMENT_API_KEY;

describe.skipIf(!hasApiKey)('EnrichmentApiService', () => {
  beforeAll(() => {
    if (!hasApiKey) {
      console.warn('ENRICHMENT_API_KEY not set - tests will verify error handling only');
    }
  });

  describe('Company Search', () => {
    it.skip('should search company by name', async () => {
      const result = await EnrichmentApiService.searchCompanyByName('App Masters');
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it.only('should search company by LinkedIn', async () => {
      const result = await EnrichmentApiService.searchCompanyByLinkedin('https://www.linkedin.com/company/appmasters.io/');
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it.skip('should return error when no search parameters provided', async () => {
      const result = await EnrichmentApiService.enrichCompany({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('At least one search parameter is required (name or linkedin)');
    });
  });

  describe('Person Search', () => {
    it.skip('should search person by email', async () => {
      const result = await EnrichmentApiService.searchPersonByEmail('tiago@appmasters.io');
      console.log(result);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email search not supported by EnrichmentAPI Person API. Only LinkedIn ID is accepted.');
    }, 30000);

    it.skip('should search person by LinkedIn', async () => {
      const result = await EnrichmentApiService.searchPersonByLinkedin('https://linkedin.com/in/tiagogouvea');
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it.skip('should search person by name and company', async () => {
      const result = await EnrichmentApiService.searchPersonByNameAndCompany('Tiago Gouvêa', 'App Masters');
      console.log(result);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Name and company search not supported by EnrichmentAPI Person API. Only LinkedIn ID is accepted.');
    }, 30000);

    it('should return error when no search parameters provided for person enrichment', async () => {
      const result = await EnrichmentApiService.enrichPerson({});
      console.log(result);

      expect(result.success).toBe(false);
      expect(result.error).toBe('LinkedIn ID is required for EnrichmentAPI Person API');
    });
  });

  describe('Bulk Operations', () => {
    it.skip('should bulk enrich companies', async () => {
      const result = await EnrichmentApiService.bulkEnrichCompanies([
        { name: 'App Masters' },
        { linkedin: 'https://www.linkedin.com/company/appmasters.io/' }
      ]);
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it.skip('should bulk enrich persons', async () => {
      const result = await EnrichmentApiService.bulkEnrichPersons([
        { linkedin: 'https://linkedin.com/in/tiagogouvea' }
      ]);
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);
  });

  describe('Cache Management', () => {
    it('should clean up cache', () => {
      const cleanedCount = EnrichmentApiService.cleanupCache();
      expect(typeof cleanedCount).toBe('number');
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });
});