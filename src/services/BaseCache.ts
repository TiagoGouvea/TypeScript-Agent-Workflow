import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

interface CacheEntry<TData> {
  data: TData;
  timestamp: number;
  ttl: number;
}

export abstract class BaseCache<TParams, TData> {
  protected cacheDir: string;
  protected defaultTtl: number;
  protected serviceName: string;

  constructor(serviceName: string, cacheDir?: string, defaultTtl: number = 24 * 60 * 60 * 1000) {
    this.serviceName = serviceName;
    this.cacheDir = cacheDir || `./cache/${serviceName.toLowerCase()}`;
    this.defaultTtl = defaultTtl;
    this.ensureCacheDir();
  }

  protected ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  protected abstract generateCacheKey(params: TParams): string;

  protected getCachePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  get(params: TParams): TData | null {
    const key = this.generateCacheKey(params);
    const cachePath = this.getCachePath(key);

    try {
      if (!fs.existsSync(cachePath)) {
        return null;
      }

      const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as CacheEntry<TData>;
      const now = Date.now();

      if (now - cacheData.timestamp > cacheData.ttl) {
        fs.unlinkSync(cachePath);
        return null;
      }

      console.log(chalk.blue(`📁 Cache hit for ${this.serviceName}`));
      return cacheData.data;
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Cache read error for ${this.serviceName}:`, error));
      return null;
    }
  }

  set(params: TParams, data: TData, ttl?: number): void {
    const key = this.generateCacheKey(params);
    const cachePath = this.getCachePath(key);

    const cacheEntry: CacheEntry<TData> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl
    };

    try {
      fs.writeFileSync(cachePath, JSON.stringify(cacheEntry, null, 2));
      console.log(chalk.green(`💾 Cached ${this.serviceName} response`));
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Cache write error for ${this.serviceName}:`, error));
    }
  }

  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    try {
      if (!fs.existsSync(this.cacheDir)) {
        return 0;
      }

      const files = fs.readdirSync(this.cacheDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.cacheDir, file);
        try {
          const cacheData = JSON.parse(fs.readFileSync(filePath, 'utf8')) as CacheEntry<TData>;

          if (now - cacheData.timestamp > cacheData.ttl) {
            fs.unlinkSync(filePath);
            cleanedCount++;
          }
        } catch {
          // Invalid cache file, remove it
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Cache cleanup error for ${this.serviceName}:`, error));
    }

    return cleanedCount;
  }
}