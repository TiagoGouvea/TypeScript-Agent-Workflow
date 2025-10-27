import { z } from 'zod';
import { tool } from '../types/workflow/Tool.ts';
import { EnrichmentApiService } from '../services/enrichmentApiService.ts';

export const enrichmentApiCompanySearch = tool({
  name: 'enrichmentApiCompanySearch',
  description: 'Search and enrich company information using name or LinkedIn URL',
  params: z.object({
    name: z.string().optional().describe('Company name (e.g., "Apple Inc")'),
    linkedin: z.string().optional().describe('Company LinkedIn URL (e.g., "https://linkedin.com/company/apple")')
  }),
  run: async (params) => {
    return await EnrichmentApiService.enrichCompany(params);
  }
});

export const enrichmentApiPersonSearch = tool({
  name: 'enrichmentApiPersonSearch',
  description: 'Search and enrich person information using LinkedIn URL',
  params: z.object({
    linkedin: z.string().describe('Person LinkedIn URL (e.g., "https://linkedin.com/in/johndoe")')
  }),
  run: async (params) => {
    return await EnrichmentApiService.enrichPerson({
      linkedin: params.linkedin
    });
  }
});


export const enrichmentApiCompanyByName = tool({
  name: 'enrichmentApiCompanyByName',
  description: 'Search company information by company name',
  params: z.object({
    name: z.string().describe('Company name (e.g., "Apple Inc")')
  }),
  run: async (params) => {
    return await EnrichmentApiService.searchCompanyByName(params.name);
  }
});

export const enrichmentApiCompanyByLinkedin = tool({
  name: 'enrichmentApiCompanyByLinkedin',
  description: 'Search company information by LinkedIn URL',
  params: z.object({
    linkedin: z.string().describe('Company LinkedIn URL (e.g., "https://linkedin.com/company/apple")')
  }),
  run: async (params) => {
    return await EnrichmentApiService.searchCompanyByLinkedin(params.linkedin);
  }
});

export const enrichmentApiPersonByLinkedin = tool({
  name: 'enrichmentApiPersonByLinkedin',
  description: 'Search person information by LinkedIn URL',
  params: z.object({
    linkedin: z.string().describe('Person LinkedIn URL (e.g., "https://linkedin.com/in/johndoe")')
  }),
  run: async (params) => {
    return await EnrichmentApiService.searchPersonByLinkedin(params.linkedin);
  }
});

export const enrichmentApiBulkCompanySearch = tool({
  name: 'enrichmentApiBulkCompanySearch',
  description: 'Bulk search and enrich multiple companies',
  params: z.object({
    companies: z.array(z.object({
      name: z.string().optional().describe('Company name'),
      linkedin: z.string().optional().describe('Company LinkedIn URL')
    })).min(1).describe('Array of companies to enrich')
  }),
  run: async (params) => {
    return await EnrichmentApiService.bulkEnrichCompanies(params.companies);
  }
});

export const enrichmentApiBulkPersonSearch = tool({
  name: 'enrichmentApiBulkPersonSearch',
  description: 'Bulk search and enrich multiple persons using LinkedIn URLs',
  params: z.object({
    persons: z.array(z.object({
      linkedin: z.string().describe('Person LinkedIn URL')
    })).min(1).describe('Array of persons to enrich')
  }),
  run: async (params) => {
    return await EnrichmentApiService.bulkEnrichPersons(params.persons);
  }
});

