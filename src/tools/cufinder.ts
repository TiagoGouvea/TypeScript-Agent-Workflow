import axios from 'axios';
import chalk from 'chalk';
import { z } from 'zod';
import { tool } from '../types/workflow/Tool.ts';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Types for better type safety
interface CompanySearchParams {
  domain?: string;
  linkedin?: string;
  name?: string;
}

interface PersonSearchParams {
  fullName?: string;
  company?: string;
  linkedin?: string;
  email?: string;
}

interface CompanyResult {
  id?: string;
  name?: string;
  domain?: string;
  website?: string;
  linkedin?: string;
  industry?: string;
  size?: string;
  location?: string;
  description?: string;
  phone?: string;
  revenue?: string;
  techStack?: string[];
  employees?: number;
}

interface PersonResult {
  id?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  linkedin?: string;
  company?: string;
  position?: string;
  jobTitle?: string;
  location?: string;
  phone?: string;
}

interface CufinderResponse<T> {
  success: boolean;
  data?: T | T[];
  error?: string;
  details?: string;
  totalResults?: number;
  fromCache?: boolean;
}

// Check for API key
if (!process.env.CUFINDER_API_KEY) {
  console.warn('CUFINDER_API_KEY environment variable not set. Cufinder tools will not work properly.');
}

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in seconds
  enabled: boolean;
}

interface CacheEntry<T> {
  timestamp: number;
  endpoint: string;
  params: Record<string, any>;
  data: T;
  ttl: number;
}

// Cache management class
class CufinderCache {
  private static readonly CACHE_DIR = path.join(process.cwd(), 'temp', 'cufinder');

  // TTL configurations for different endpoints
  private static readonly ENDPOINT_CONFIG: Record<string, CacheConfig> = {
    '/dtc': { ttl: 30 * 24 * 60 * 60, enabled: true }, // 30 days for domain to company
    '/cuf': { ttl: 30 * 24 * 60 * 60, enabled: true }, // 30 days for company to domain
    '/rel': { ttl: 7 * 24 * 60 * 60, enabled: true },  // 7 days for email lookup
    '/epp': { ttl: 24 * 60 * 60, enabled: true },      // 1 day for LinkedIn profiles
    '/lcuf': { ttl: 30 * 24 * 60 * 60, enabled: true }, // 30 days for company LinkedIn
    '/dte': { ttl: 7 * 24 * 60 * 60, enabled: true },  // 7 days for domain to email
    '/ntp': { ttl: 30 * 24 * 60 * 60, enabled: true }, // 30 days for company phone
  };

  private static generateCacheKey(endpoint: string, params: Record<string, any>): string {
    // Create a stable string representation of the request
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    const keyString = `${endpoint}_${JSON.stringify(sortedParams)}`;
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  private static getCacheFilePath(endpoint: string, params: Record<string, any>): string {
    const cacheKey = this.generateCacheKey(endpoint, params);
    const endpointDir = endpoint.replace(/[^a-zA-Z0-9]/g, '_');
    return path.join(this.CACHE_DIR, endpointDir, `${cacheKey}.json`);
  }

  private static ensureCacheDir(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  static async get<T>(endpoint: string, params: Record<string, any>): Promise<T | null> {
    try {
      const config = this.ENDPOINT_CONFIG[endpoint];
      if (!config || !config.enabled) {
        return null;
      }

      const filePath = this.getCacheFilePath(endpoint, params);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const cacheEntry: CacheEntry<T> = JSON.parse(fileContent);

      // Check if cache has expired
      const now = Date.now();
      const age = (now - cacheEntry.timestamp) / 1000; // age in seconds

      if (age > cacheEntry.ttl) {
        // Cache expired, remove file
        fs.unlinkSync(filePath);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.warn('Cache read error:', error);
      return null;
    }
  }

  static async set<T>(endpoint: string, params: Record<string, any>, data: T): Promise<void> {
    try {
      const config = this.ENDPOINT_CONFIG[endpoint];
      if (!config || !config.enabled) {
        return;
      }

      const filePath = this.getCacheFilePath(endpoint, params);
      this.ensureCacheDir(filePath);

      const cacheEntry: CacheEntry<T> = {
        timestamp: Date.now(),
        endpoint,
        params,
        data,
        ttl: config.ttl,
      };

      fs.writeFileSync(filePath, JSON.stringify(cacheEntry, null, 2), 'utf-8');
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  static async cleanup(): Promise<void> {
    try {
      if (!fs.existsSync(this.CACHE_DIR)) {
        return;
      }

      const cleanupDir = (dir: string) => {
        const entries = fs.readdirSync(dir);

        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            cleanupDir(fullPath);
            // Remove empty directories
            if (fs.readdirSync(fullPath).length === 0) {
              fs.rmdirSync(fullPath);
            }
          } else if (entry.endsWith('.json')) {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const cacheEntry = JSON.parse(content);
              const age = (Date.now() - cacheEntry.timestamp) / 1000;

              if (age > cacheEntry.ttl) {
                fs.unlinkSync(fullPath);
              }
            } catch {
              // Invalid cache file, remove it
              fs.unlinkSync(fullPath);
            }
          }
        }
      };

      cleanupDir(this.CACHE_DIR);
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }
}

// Service methods - separated from tool interface
export class CufinderService {
  private static readonly BASE_URL = 'https://api.cufinder.io/v2';
  private static readonly API_KEY = process.env.CUFINDER_API_KEY;

  // Initialize cache cleanup on first use
  private static initialized = false;
  private static async initialize() {
    if (!this.initialized) {
      await CufinderCache.cleanup();
      this.initialized = true;
    }
  }

  private static async makeRequest<T>(endpoint: string, params: Record<string, any>): Promise<CufinderResponse<T>> {
    // Initialize cache cleanup on first use
    await this.initialize();

    if (!this.API_KEY) {
      return {
        success: false,
        error: 'CUFINDER_API_KEY not configured',
        details: 'Please set CUFINDER_API_KEY environment variable'
      };
    }

    try {
      // 1. Try to get from cache first
      const cachedData = await CufinderCache.get<any>(endpoint, params);
      if (cachedData) {
        console.log(chalk.yellow('📁 Cache hit for'), chalk.cyan(endpoint), chalk.gray(JSON.stringify(params)));
        return {
          success: true,
          data: cachedData,
          totalResults: Array.isArray(cachedData) ? cachedData.length : 1,
          fromCache: true
        };
      }

      console.log(chalk.gray('🌐 Cache miss, calling API for'), chalk.cyan(endpoint));

      // 2. Convert params to URLSearchParams for form-urlencoded format
      const formData = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      // 3. Make API request
      const response = await axios.post(`${this.BASE_URL}${endpoint}`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-api-key': this.API_KEY,
          'User-Agent': 'TypeScript-Agent-Workflow/1.0',
        },
        timeout: 30000,
      });

      if (response.status === 200) {
        const responseData = response.data.data || response.data.results || response.data;

        console.log('-----------------');
        console.log(endpoint);
        console.dir(responseData, { depth: null });
        console.log('-----------------');

        // 4. Save to cache if successful
        await CufinderCache.set(endpoint, params, responseData);
        console.log(chalk.green('💾 Cached response for'), chalk.cyan(endpoint));

        return {
          success: true,
          data: responseData,
          totalResults: response.data.total || (Array.isArray(responseData) ? responseData.length : 1),
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: response.data?.message || response.data,
        };
      }
    } catch (error: any) {
      console.error('Cufinder API error:', error.message);
      return {
        success: false,
        error: 'Failed to execute Cufinder request',
        details: error.response?.data?.message || error.message,
      };
    }
  }

  // Company search methods
  static async searchCompanyByDomain(domain: string): Promise<CufinderResponse<CompanyResult>> {
    console.log(chalk.bgBlue(' CUFINDER COMPANY '), chalk.blue(`Getting company name from domain: ${domain}`));
    return this.makeRequest<CompanyResult>('/dtc', { company_website: domain });
  }

  static async searchCompanyByName(name: string): Promise<CufinderResponse<CompanyResult>> {
    console.log(chalk.bgBlue(' CUFINDER COMPANY '), chalk.blue(`Getting domain from company name: ${name}`));
    return this.makeRequest<CompanyResult>('/cuf', { company_name: name });
  }

  static async searchCompanyByLinkedin(linkedin: string): Promise<CufinderResponse<CompanyResult>> {
    console.log(chalk.bgBlue(' CUFINDER COMPANY '), chalk.blue(`Getting company LinkedIn: ${linkedin}`));
    return this.makeRequest<CompanyResult>('/lcuf', { company_name: linkedin });
  }

  static async enrichCompany(params: CompanySearchParams): Promise<CufinderResponse<CompanyResult>> {
    const { domain, linkedin, name } = params;

    if (!domain && !linkedin && !name) {
      return {
        success: false,
        error: 'At least one search parameter is required (domain, linkedin, or name)',
      };
    }

    console.log(
      chalk.bgBlue(' CUFINDER ENRICH '),
      chalk.blue(
        `Enriching company by ${domain ? `domain: ${domain}` : linkedin ? `LinkedIn: ${linkedin}` : `name: ${name}`}`,
      ),
    );

    const searchParams: Record<string, string> = {};
    if (domain) searchParams.domain = domain;
    if (linkedin) searchParams.linkedin = linkedin;
    if (name) searchParams.name = name;

    return this.makeRequest<CompanyResult>('/company/enrich', searchParams);
  }

  // Person search methods
  static async searchPersonByEmail(email: string): Promise<CufinderResponse<PersonResult>> {
    console.log(chalk.bgGreen(' CUFINDER PERSON '), chalk.green(`Reverse email lookup: ${email}`));
    return this.makeRequest<PersonResult>('/rel', { email: email });
  }

  static async searchPersonByLinkedin(linkedin: string): Promise<CufinderResponse<PersonResult>> {
    console.log(chalk.bgGreen(' CUFINDER PERSON '), chalk.green(`LinkedIn profile enrichment: ${linkedin}`));
    return this.makeRequest<PersonResult>('/epp', { linkedin_url: linkedin });
  }

  static async searchPersonByNameAndCompany(fullName: string, company: string): Promise<CufinderResponse<PersonResult>> {
    console.log(
      chalk.bgGreen(' CUFINDER PERSON '),
      chalk.green(`Person search: ${fullName} at company: ${company} (using email finder)`),
    );
    // CUFinder doesn't have direct name+company search, so we'll use company email finder
    return this.makeRequest<PersonResult>('/dte', {
      company_website: company
    });
  }

  static async enrichPerson(params: PersonSearchParams): Promise<CufinderResponse<PersonResult>> {
    const { fullName, company, linkedin, email } = params;

    if (!fullName && !linkedin && !email) {
      return {
        success: false,
        error: 'At least one search parameter is required (fullName, linkedin, or email)',
      };
    }

    console.log(
      chalk.bgGreen(' CUFINDER PERSON '),
      chalk.green(
        `Enriching person by ${fullName ? `name: ${fullName}` : linkedin ? `LinkedIn: ${linkedin}` : `email: ${email}`}${company ? ` at ${company}` : ''}`,
      ),
    );

    const searchParams: Record<string, string> = {};
    if (fullName) searchParams.full_name = fullName;
    if (company) searchParams.company = company;
    if (linkedin) searchParams.linkedin = linkedin;
    if (email) searchParams.email = email;

    return this.makeRequest<PersonResult>('/person/enrich', searchParams);
  }

  // Utility methods
  static async getDomainFromCompanyName(companyName: string): Promise<CufinderResponse<{ domain: string }>> {
    console.log(chalk.bgCyan(' CUFINDER UTIL '), chalk.cyan(`Getting domain for company: ${companyName}`));
    return this.makeRequest<{ domain: string }>('/cuf', { company_name: companyName });
  }

  static async getCompanyNameFromDomain(domain: string): Promise<CufinderResponse<{ name: string }>> {
    console.log(chalk.bgCyan(' CUFINDER UTIL '), chalk.cyan(`Getting company name for domain: ${domain}`));
    return this.makeRequest<{ name: string }>('/dtc', { company_website: domain });
  }

  // Additional utility methods based on available APIs
  static async getCompanyLinkedIn(companyName: string): Promise<CufinderResponse<{ linkedin: string }>> {
    console.log(chalk.bgCyan(' CUFINDER UTIL '), chalk.cyan(`Getting LinkedIn for company: ${companyName}`));
    return this.makeRequest<{ linkedin: string }>('/lcuf', { company_name: companyName });
  }

  static async getCompanyEmail(domain: string): Promise<CufinderResponse<{ email: string }>> {
    console.log(chalk.bgCyan(' CUFINDER UTIL '), chalk.cyan(`Getting company email for: ${domain}`));
    return this.makeRequest<{ email: string }>('/dte', { company_website: domain });
  }

  static async getCompanyPhone(companyName: string): Promise<CufinderResponse<{ phone: string }>> {
    console.log(chalk.bgCyan(' CUFINDER UTIL '), chalk.cyan(`Getting company phone for: ${companyName}`));
    return this.makeRequest<{ phone: string }>('/ntp', { company_name: companyName });
  }
}

// Tool interfaces for workflows
export const cufinderCompanySearch = tool({
  name: 'cufinderCompanySearch',
  description: 'Search for company information using domain, LinkedIn URL, or company name',
  params: z.object({
    domain: z
      .string()
      .optional()
      .describe('Company domain (e.g., "google.com")'),
    linkedin: z
      .string()
      .optional()
      .describe('Company LinkedIn URL or handle'),
    name: z
      .string()
      .optional()
      .describe('Company name to search for'),
  }),
  run: async (params) => {
    return CufinderService.enrichCompany(params);
  },
});

export const cufinderPersonSearch = tool({
  name: 'cufinderPersonSearch',
  description: 'Search for person information using name, company, LinkedIn, or email',
  params: z.object({
    fullName: z
      .string()
      .optional()
      .describe('Full name of the person to search'),
    company: z
      .string()
      .optional()
      .describe('Company name where the person works'),
    linkedin: z
      .string()
      .optional()
      .describe('Person LinkedIn URL or profile'),
    email: z
      .string()
      .optional()
      .describe('Email address of the person'),
  }),
  run: async (params) => {
    return CufinderService.enrichPerson(params);
  },
});

export const cufinderEmailLookup = tool({
  name: 'cufinderEmailLookup',
  description: 'Find person and company information from email address',
  params: z.object({
    email: z.string().email().describe('Email address to lookup'),
  }),
  run: async (params) => {
    return CufinderService.searchPersonByEmail(params.email);
  },
});

export const cufinderLinkedinLookup = tool({
  name: 'cufinderLinkedinLookup',
  description: 'Enrich LinkedIn profile with additional information',
  params: z.object({
    linkedin: z.string().describe('LinkedIn profile URL'),
    type: z.enum(['person', 'company']).describe('Type of LinkedIn profile (person or company)'),
  }),
  run: async (params) => {
    if (params.type === 'person') {
      return CufinderService.searchPersonByLinkedin(params.linkedin);
    } else {
      return CufinderService.searchCompanyByLinkedin(params.linkedin);
    }
  },
});

export const cufinderDomainToCompany = tool({
  name: 'cufinderDomainToCompany',
  description: 'Convert domain name to company name',
  params: z.object({
    domain: z.string().describe('Domain name (e.g., "google.com")'),
  }),
  run: async (params) => {
    return CufinderService.getCompanyNameFromDomain(params.domain);
  },
});

export const cufinderCompanyToDomain = tool({
  name: 'cufinderCompanyToDomain',
  description: 'Convert company name to domain name',
  params: z.object({
    name: z.string().describe('Company name'),
  }),
  run: async (params) => {
    return CufinderService.getDomainFromCompanyName(params.name);
  },
});

export const cufinderCompanyLinkedIn = tool({
  name: 'cufinderCompanyLinkedIn',
  description: 'Find company LinkedIn URL from company name',
  params: z.object({
    name: z.string().describe('Company name'),
  }),
  run: async (params) => {
    return CufinderService.getCompanyLinkedIn(params.name);
  },
});

export const cufinderCompanyEmail = tool({
  name: 'cufinderCompanyEmail',
  description: 'Find company email from domain',
  params: z.object({
    domain: z.string().describe('Company domain (e.g., "google.com")'),
  }),
  run: async (params) => {
    return CufinderService.getCompanyEmail(params.domain);
  },
});

export const cufinderCompanyPhone = tool({
  name: 'cufinderCompanyPhone',
  description: 'Find company phone number from company name',
  params: z.object({
    name: z.string().describe('Company name'),
  }),
  run: async (params) => {
    return CufinderService.getCompanyPhone(params.name);
  },
});