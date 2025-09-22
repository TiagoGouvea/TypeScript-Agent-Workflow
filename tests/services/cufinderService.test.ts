import { describe, it, expect, beforeAll } from 'vitest';
import { CufinderService } from '../../src/tools/cufinder';

const hasApiKey = !!process.env.CUFINDER_API_KEY;

describe.skipIf(!hasApiKey)('CufinderService', () => {
  beforeAll(() => {
    if (!hasApiKey) {
      console.warn('CUFINDER_API_KEY not set - tests will verify error handling only');
    }
  });

  describe('Company Search', () => {
    it.only('should search company by domain', async () => {
      const result = await CufinderService.searchCompanyByDomain('appmasters.io');
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it.skip('should search company by name', async () => {
      const result = await CufinderService.searchCompanyByName('App Masters');
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it.skip('should return error when no search parameters provided', async () => {
      const result = await CufinderService.enrichCompany({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('At least one search parameter is required (domain, linkedin, or name)');
    });
  });

  describe('Person Search', () => {
    it.skip('should search person by email', async () => {
      const result = await CufinderService.searchPersonByEmail('tiago@appmasters.io');
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it.skip('should search person by LinkedIn', async () => {
      const result = await CufinderService.searchPersonByLinkedin('https://linkedin.com/in/tiagogouvea');
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it.skip('should search person by name and company', async () => {
      const result = await CufinderService.searchPersonByNameAndCompany('Tiago Gouvêa', 'App Masters');
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it('should return error when no search parameters provided for person enrichment', async () => {
      const result = await CufinderService.enrichPerson({});
      console.log(result);

      expect(result.success).toBe(false);
      expect(result.error).toBe('At least one search parameter is required (fullName, linkedin, or email)');
    });
  });

  describe('Utility Methods', () => {
    it.skip('should convert company name to domain', async () => {
      const result = await CufinderService.getDomainFromCompanyName('App Masters');
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it.skip('should convert domain to company name', async () => {
      const result = await CufinderService.getCompanyNameFromDomain('appmasters.io');
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);
  });

  describe('Cache Management', () => {
    it('should clean up cache', () => {
      const cleanedCount = CufinderService.cleanupCache();
      expect(typeof cleanedCount).toBe('number');
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });
});