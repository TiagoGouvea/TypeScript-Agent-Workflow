import axios from 'axios';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export class EnrichmentApiCache {
  private cacheDir: string;
  private defaultTtl: number;

  constructor(cacheDir = './cache/enrichmentapi', defaultTtl = 24 * 60 * 60 * 1000) {
    this.cacheDir = cacheDir;
    this.defaultTtl = defaultTtl;
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheKey(endpoint: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    const paramString = JSON.stringify(sortedParams);
    const hash = Buffer.from(`${endpoint}:${paramString}`).toString('base64url');
    return hash;
  }

  private getCachePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  get(endpoint: string, params: Record<string, any>): any | null {
    const key = this.getCacheKey(endpoint, params);
    const cachePath = this.getCachePath(key);

    try {
      if (!fs.existsSync(cachePath)) {
        return null;
      }

      const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as CacheEntry;
      const now = Date.now();

      if (now - cacheData.timestamp > cacheData.ttl) {
        fs.unlinkSync(cachePath);
        return null;
      }

      console.log(chalk.blue('📁 Cache hit for EnrichmentAPI'));
      return cacheData.data;
    } catch (error) {
      console.log(chalk.yellow('⚠️ Cache read error:', error));
      return null;
    }
  }

  set(endpoint: string, params: Record<string, any>, data: any, ttl?: number): void {
    const key = this.getCacheKey(endpoint, params);
    const cachePath = this.getCachePath(key);

    const cacheEntry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl
    };

    try {
      fs.writeFileSync(cachePath, JSON.stringify(cacheEntry, null, 2));
      console.log(chalk.green('💾 Cached EnrichmentAPI response'));
    } catch (error) {
      console.log(chalk.yellow('⚠️ Cache write error:', error));
    }
  }

  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    try {
      const files = fs.readdirSync(this.cacheDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.cacheDir, file);
        const cacheData = JSON.parse(fs.readFileSync(filePath, 'utf8')) as CacheEntry;

        if (now - cacheData.timestamp > cacheData.ttl) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️ Cache cleanup error:', error));
    }

    return cleanedCount;
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

    const cachedResult = this.cache.get(endpoint, params);
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

      this.cache.set(endpoint, params, response.data);

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