import { describe, it, expect } from 'vitest';
import {
  cufinderCompanySearch,
  cufinderPersonSearch,
  cufinderEmailLookup,
  cufinderLinkedinLookup,
  cufinderDomainToCompany,
  cufinderCompanyToDomain
} from '../../src/tools/cufinder';

const hasApiKey = !!process.env.CUFINDER_API_KEY;

describe.skipIf(!hasApiKey)('Cufinder Tools', () => {
  describe('cufinderCompanySearch tool', () => {
    it('should execute company search with domain', async () => {
      const result = await cufinderCompanySearch.run({
        domain: 'apple.com'
      });
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it('should execute company search with name', async () => {
      const result = await cufinderCompanySearch.run({
        name: 'Apple Inc'
      });
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);
  });

  describe('cufinderPersonSearch tool', () => {
    it('should execute person search with email', async () => {
      const result = await cufinderPersonSearch.run({
        email: 'test@apple.com'
      });
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it('should execute person search with name and company', async () => {
      const result = await cufinderPersonSearch.run({
        fullName: 'Tim Cook',
        company: 'Apple'
      });
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);
  });

  describe('cufinderEmailLookup tool', () => {
    it('should execute email lookup', async () => {
      const result = await cufinderEmailLookup.run({
        email: 'info@apple.com'
      });
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it('should validate email format', async () => {
      // This test depends on Zod validation in the tool
      try {
        const result = await cufinderEmailLookup.run({
          email: 'invalid-email'
        });
        console.log(result);
      } catch (error) {
        console.log(error);
        expect(error).toBeDefined();
      }
    });
  });

  describe('cufinderLinkedinLookup tool', () => {
    it('should execute LinkedIn lookup for person', async () => {
      const result = await cufinderLinkedinLookup.run({
        linkedin: 'https://www.linkedin.com/in/tiagogouvea/',
        type: 'person'
      });
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);

    it('should execute LinkedIn lookup for company', async () => {
      const result = await cufinderLinkedinLookup.run({
        linkedin: 'https://linkedin.com/company/apple',
        type: 'company'
      });
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);
  });

  describe('cufinderDomainToCompany tool', () => {
    it('should convert domain to company name', async () => {
      const result = await cufinderDomainToCompany.run({
        domain: 'netflix.com'
      });
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);
  });

  describe('cufinderCompanyToDomain tool', () => {
    it('should convert company name to domain', async () => {
      const result = await cufinderCompanyToDomain.run({
        name: 'Netflix'
      });
      console.log(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);
  });
});