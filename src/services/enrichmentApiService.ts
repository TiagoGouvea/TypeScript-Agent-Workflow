import axios from 'axios';
import chalk from 'chalk';
import { BaseCache } from './BaseCache.ts';

interface EnrichmentCacheParams {
  endpoint: string;
  params: Record<string, any>;
}

export class EnrichmentApiCache extends BaseCache<EnrichmentCacheParams, any> {
  constructor() {
    super('EnrichmentAPI', './cache/enrichmentapi', 24 * 60 * 60 * 1000); // 24 hours TTL
  }

  protected generateCacheKey(cacheParams: EnrichmentCacheParams): string {
    const { endpoint, params } = cacheParams;
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    const paramString = JSON.stringify(sortedParams);
    return Buffer.from(`${endpoint}:${paramString}`).toString('base64url');
  }

  // Convenience methods to maintain API compatibility
  getByEndpoint(endpoint: string, params: Record<string, any>): any | null {
    return this.get({ endpoint, params });
  }

  setByEndpoint(endpoint: string, params: Record<string, any>, data: any, ttl?: number): void {
    this.set({ endpoint, params }, data, ttl);
  }
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class EnrichmentApiService {
  private static apiKey = process.env.ENRICHMENT_API_KEY;
  private static baseUrl = 'https://api.enrichmentapi.io';
  private static cache = new EnrichmentApiCache();

  private static async makeRequest(endpoint: string, params: Record<string, any>): Promise<ApiResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'ENRICHMENT_API_KEY not configured'
      };
    }

    const cachedResult = this.cache.getByEndpoint(endpoint, params);
    if (cachedResult) {
      return {
        success: true,
        data: cachedResult
      };
    }

    try {
      const queryParams = new URLSearchParams({ api_key: this.apiKey, ...params }).toString();
      console.log('get',`${this.baseUrl}${endpoint}?${queryParams}`);
      const response = await axios.get(`${this.baseUrl}${endpoint}?${queryParams}`, {
        timeout: 30000
      });

      console.log(chalk.green('✅ EnrichmentAPI request successful'));

      this.cache.setByEndpoint(endpoint, params, response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.log(chalk.red('❌ EnrichmentAPI request failed:'), error.response?.data || error.message);

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Request failed'
      };
    }
  }


  static async searchCompanyByName(name: string): Promise<ApiResponse> {
    return this.makeRequest('/company_to_domain', { company: name });
  }

  static async searchCompanyByLinkedin(linkedin: string): Promise<ApiResponse> {
    // Extract LinkedIn ID from URL if full URL provided
    const linkedinId = linkedin.includes('/company/')
      ? linkedin.split('/company/')[1].replace('/', '')
      : linkedin;

    return this.makeRequest('/company', { company: linkedinId });
  }

  static async enrichCompany(params: { name?: string; linkedin?: string }): Promise<ApiResponse> {
    if (!params.name && !params.linkedin) {
      return {
        success: false,
        error: 'At least one search parameter is required (name or linkedin)'
      };
    }

    // Priority: LinkedIn > Name
    if (params.linkedin) {
      return this.searchCompanyByLinkedin(params.linkedin);
    }

    if (params.name) {
      return this.searchCompanyByName(params.name);
    }

    return {
      success: false,
      error: 'No valid search parameter provided'
    };
  }

  static async searchPersonByEmail(email: string): Promise<ApiResponse> {
    return {
      success: false,
      error: 'Email search not supported by EnrichmentAPI Person API. Only LinkedIn ID is accepted.'
    };
  }

  static async searchPersonByLinkedin(linkedin: string): Promise<ApiResponse> {
    // Extract LinkedIn ID from URL if full URL provided
    const linkedinId = linkedin.includes('/in/')
      ? linkedin.split('/in/')[1].replace('/', '')
      : linkedin;

    return this.makeRequest('/person', { linkedin_id: linkedinId });
  }

  static async searchPersonByNameAndCompany(fullName: string, company: string): Promise<ApiResponse> {
    return {
      success: false,
      error: 'Name and company search not supported by EnrichmentAPI Person API. Only LinkedIn ID is accepted.'
    };
  }

  static async enrichPerson(params: { linkedin?: string }): Promise<ApiResponse> {
    if (!params.linkedin) {
      return {
        success: false,
        error: 'LinkedIn ID is required for EnrichmentAPI Person API'
      };
    }

    return this.searchPersonByLinkedin(params.linkedin);
  }

  static async bulkEnrichCompanies(companies: Array<{ name?: string; linkedin?: string }>): Promise<ApiResponse> {
    // EnrichmentAPI may not support bulk operations, implement as individual requests
    const results = [];
    for (const company of companies) {
      const result = await this.enrichCompany(company);
      results.push(result);
    }

    return {
      success: true,
      data: results
    };
  }

  static async bulkEnrichPersons(persons: Array<{ linkedin?: string }>): Promise<ApiResponse> {
    // EnrichmentAPI may not support bulk operations, implement as individual requests
    const results = [];
    for (const person of persons) {
      const result = await this.enrichPerson(person);
      results.push(result);
    }

    return {
      success: true,
      data: results
    };
  }

  static cleanupCache(): number {
    return this.cache.cleanup();
  }
}