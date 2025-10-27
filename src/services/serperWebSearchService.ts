import axios from 'axios';
import chalk from 'chalk';
import { BaseCache } from './BaseCache.ts';

export type SerperSearchType =
  | 'shopping'
  | 'news'
  | 'search'
  | 'images'
  | 'videos'
  | 'places'
  | 'maps'
  | 'reviews'
  | 'scholar'
  | 'webpage';

export type SerperSearchInterval =
  | 'lastHour'
  | 'last24Hours'
  | 'lastWeek'
  | 'lastMonth'
  | 'lastYear'
  | 'allTime';

export interface SerperSearchParams {
  type: SerperSearchType;
  query: string;
  gl: 'br' | 'us';
  hl: 'pt' | 'en';
  location: string;
  interval: SerperSearchInterval;
}

export interface SerperSearchSuccess {
  success: true;
  results: any[];
  relatedSearches?: any[];
}

export interface SerperSearchFailure {
  success: false;
  error: string;
  details?: string;
}

export type SerperSearchResponse = SerperSearchSuccess | SerperSearchFailure;

const intervalMapping: Record<SerperSearchInterval, string> = {
  lastHour: 'qdr:h',
  last24Hours: 'qdr:d',
  lastWeek: 'qdr:w',
  lastMonth: 'qdr:m',
  lastYear: 'qdr:y',
  allTime: '',
};

export class SerperCache extends BaseCache<SerperSearchParams, SerperSearchSuccess> {
  constructor() {
    super('Serper', './cache/serper', 72 * 60 * 60 * 1000); // 72 hours TTL
  }

  protected generateCacheKey(params: SerperSearchParams): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = (params as any)[key];
        return result;
      }, {} as Record<string, any>);

    const paramString = JSON.stringify(sortedParams);
    return Buffer.from(paramString).toString('base64url');
  }
}

export class SerperWebSearchService {
  private static readonly baseUrl = 'https://google.serper.dev';
  private static readonly apiKey = process.env.SERPER_API_KEY;
  private static cache = new SerperCache();

  static async search(params: SerperSearchParams): Promise<SerperSearchResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'SERPER_API_KEY not configured',
      };
    }

    if (!params.query || !params.query.trim()) {
      return {
        success: false,
        error: 'Query parameter is required',
      };
    }

    // Check cache first
    const cachedResult = this.cache.get(params);
    if (cachedResult) {
      return cachedResult;
    }

    const { type, query, interval, gl, hl, location } = params;

    console.log(
      chalk.bgCyan(' WEB SEARCH '),
      chalk.cyan(`Searching on Google for: ${query} [${location}/${gl}/${hl}] (${type})`),
    );

    const tbs = intervalMapping[interval];

    const payload = {
      q: query,
      num: 20,
      tbs: tbs !== '' ? tbs : undefined,
      gl,
      hl,
      location: location !== '-' ? location : undefined,
    };

    try {
      const response = await axios.request({
        method: 'post',
        url: `${this.baseUrl}/${type}`,
        data: payload,
        maxBodyLength: Infinity,
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      const results = response.data[type] || response.data.organic || [];
      const relatedSearches = response.data.relatedSearches;

      if (!results?.length) {
        console.log('Serper returned empty results for query:', query);
      }

      const successResult: SerperSearchSuccess = {
        success: true,
        results,
        relatedSearches,
      };

      // Cache successful results
      this.cache.set(params, successResult);

      return successResult;
    } catch (error: any) {
      const code = error?.status || error?.response?.status || error?.code;
      const message =
        error?.response?.message || error?.response?.data?.message || error?.message;

      console.error(
        'Error during Serper search - code:' + code + ' - message:' + message,
      );
      if (!code || !message) {
        console.error(error);
      }

      return {
        success: false,
        error: 'Failed to execute Serper search',
        details: message,
      };
    }
  }

  static cleanupCache(): number {
    return this.cache.cleanup();
  }
}
