import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join } from 'path';
import fs from 'fs/promises';

/**
 * Simplified LowDB wrapper for easy database operations
 * Usage: const db = new LowDb('myDatabase')
 */
export class LowDb<T = any> {
  private db: Low<T>;
  private databaseName: string;
  private databasePath: string;

  constructor(databaseName: string) {
    this.databaseName = databaseName;
    this.databasePath = join(process.cwd(), 'database', `${databaseName}.json`);

    const adapter = new JSONFile<T>(this.databasePath);
    this.db = new Low<T>(adapter, {} as T);
  }

  /**
   * Initialize the database and create directory if needed
   */
  async init(): Promise<void> {
    const databaseDir = join(process.cwd(), 'database');
    try {
      await fs.mkdir(databaseDir, { recursive: true });
    } catch (error) {}

    await this.db.read();

    if (!this.db.data) {
      this.db.data = {} as T;
      await this.db.write();
    }
  }

  /**
   * Get the current database data
   */
  get data(): T {
    return this.db.data;
  }

  /**
   * Set data and save to file
   */
  async setData(data: T): Promise<void> {
    this.db.data = data;
    await this.db.write();
  }

  /**
   * Update specific field in the database
   */
  async update(updates: Partial<T>): Promise<void> {
    this.db.data = { ...this.db.data, ...updates };
    await this.db.write();
  }

  /**
   * Save current data to file
   */
  async save(): Promise<void> {
    await this.db.write();
  }

  /**
   * Reload data from file
   */
  async reload(): Promise<void> {
    await this.db.read();
  }

  /**
   * Get a specific field from the database
   */
  get<K extends keyof T>(key: K): T[K] {
    return this.db.data[key];
  }

  /**
   * Set a specific field in the database
   */
  async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    this.db.data[key] = value;
    await this.db.write();
  }

  /**
   * Append to an array field in the database
   */
  async push<K extends keyof T>(
    key: K,
    value: T[K] extends Array<infer U> ? U : never,
  ): Promise<void> {
    if (!Array.isArray(this.db.data[key])) {
      this.db.data[key] = [] as any;
    }
    (this.db.data[key] as any[]).push(value);
    await this.db.write();
  }

  /**
   * Safely store JSON content as string in a field
   * Automatically stringifies objects when needed
   */
  async setJsonField<K extends keyof T>(key: K, value: any): Promise<void> {
    const stringValue =
      typeof value === 'string' ? value : JSON.stringify(value);
    this.db.data[key] = stringValue as T[K];
    await this.db.write();
  }

  /**
   * Safely retrieve and parse JSON content from a field
   * Returns parsed object or original value if not valid JSON
   */
  getJsonField<K extends keyof T>(key: K): any {
    const value = this.db.data[key];
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  /**
   * Check if database file exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.databasePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete the database file
   */
  async delete(): Promise<void> {
    try {
      await fs.unlink(this.databasePath);
    } catch (error) {}
  }

  /**
   * Get database info
   */
  getInfo(): { name: string; path: string } {
    return {
      name: this.databaseName,
      path: this.databasePath,
    };
  }
}
