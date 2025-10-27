import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join } from 'path';
import fs from 'fs/promises';

/**
 * Base class for LowDB operations with common functionality
 */
abstract class BaseLowDb<T> {
  protected db: Low<T>;
  protected databaseName: string;
  protected databasePath: string;
  private initPromise: Promise<void>;

  constructor(databaseName: string, defaultValue: T) {
    this.databaseName = databaseName;
    this.databasePath = join(process.cwd(), 'database', `${databaseName}.json`);

    const adapter = new JSONFile<T>(this.databasePath);
    this.db = new Low<T>(adapter, defaultValue);

    // Automatically initialize when constructed
    this.initPromise = this.init();
  }

  /**
   * Initialize the database and create directory if needed
   */
  private async init(): Promise<void> {
    const databaseDir = join(process.cwd(), 'database');
    try {
      await fs.mkdir(databaseDir, { recursive: true });
    } catch (error) {}

    await this.db.read();

    if (!this.db.data) {
      this.db.data = this.getDefaultValue();
      await this.db.write();
    }
  }

  /**
   * Ensure the database is initialized before any operation
   */
  protected async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  /**
   * Get the default value for initialization
   */
  protected abstract getDefaultValue(): T;

  /**
   * Get the current database data
   */
  async getData(): Promise<T> {
    await this.ensureInitialized();
    return this.db.data;
  }

  /**
   * Set data and save to file
   */
  async setData(data: T): Promise<void> {
    await this.ensureInitialized();
    this.db.data = data;
    await this.db.write();
  }

  /**
   * Save current data to file
   */
  async save(): Promise<void> {
    await this.ensureInitialized();
    await this.db.write();
  }

  /**
   * Reload data from file
   */
  async reload(): Promise<void> {
    await this.ensureInitialized();
    await this.db.read();
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

/**
 * LowDB wrapper for object-based databases
 * Usage: const db = new LowDbObject<MyInterface>('myDatabase')
 */
export class LowDbObject<
  T extends Record<string, any> = any,
> extends BaseLowDb<T> {
  constructor(databaseName: string) {
    super(databaseName, {} as T);
  }

  protected getDefaultValue(): T {
    return {} as T;
  }

  /**
   * Update specific field in the database
   */
  async update(updates: Partial<T>): Promise<void> {
    await this.ensureInitialized();
    this.db.data = { ...this.db.data, ...updates };
    await this.db.write();
  }

  /**
   * Get a specific field from the database
   */
  async getField<K extends keyof T>(key: K): Promise<T[K]> {
    await this.ensureInitialized();
    return this.db.data[key];
  }

  /**
   * Set a specific field in the database
   */
  async setField<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
    const stringValue =
      typeof value === 'string' ? value : JSON.stringify(value);
    this.db.data[key] = stringValue as T[K];
    await this.db.write();
  }

  /**
   * Safely retrieve and parse JSON content from a field
   */
  async getJsonField<K extends keyof T>(key: K): Promise<any> {
    await this.ensureInitialized();
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
}

/**
 * LowDB wrapper for array-based databases
 * Usage: const db = new LowDbArray<MyItem[]>('myDatabase')
 */
export class LowDbArray<T extends any[] = any[]> extends BaseLowDb<T> {
  constructor(databaseName: string) {
    super(databaseName, [] as unknown as T);
  }

  protected getDefaultValue(): T {
    return [] as unknown as T;
  }

  /**
   * Get the array data with proper typing
   */
  private get arrayData(): any[] {
    return this.db.data as any[];
  }

  /**
   * Check if an item matches the where clause
   */
  private matchesWhere(
    item: any,
    where: Partial<T extends Array<infer U> ? U : never>,
  ): boolean {
    return Object.keys(where).every((key) => {
      const whereValue = (where as any)[key];
      const itemValue = item[key];

      // Handle deep comparison for objects
      if (
        typeof whereValue === 'object' &&
        whereValue !== null &&
        !Array.isArray(whereValue)
      ) {
        return JSON.stringify(itemValue) === JSON.stringify(whereValue);
      }

      return itemValue === whereValue;
    });
  }

  /**
   * Get the length of the array
   */
  async getLength(): Promise<number> {
    await this.ensureInitialized();
    return this.db.data.length;
  }

  /**
   * Add an item to the end of the array
   */
  async push(item: T extends Array<infer U> ? U : never): Promise<void> {
    await this.ensureInitialized();
    this.arrayData.push(item);
    await this.db.write();
  }

  /**
   * Remove and return the last item from the array
   */
  async pop(): Promise<T extends Array<infer U> ? U | undefined : never> {
    await this.ensureInitialized();
    const item = this.arrayData.pop();
    await this.db.write();
    return item;
  }

  /**
   * Add an item to the beginning of the array
   */
  async unshift(item: T extends Array<infer U> ? U : never): Promise<void> {
    await this.ensureInitialized();
    this.arrayData.unshift(item);
    await this.db.write();
  }

  /**
   * Remove and return the first item from the array
   */
  async shift(): Promise<T extends Array<infer U> ? U | undefined : never> {
    await this.ensureInitialized();
    const item = this.arrayData.shift();
    await this.db.write();
    return item;
  }

  /**
   * Get an item by index
   */
  async getByIndex(
    index: number,
  ): Promise<T extends Array<infer U> ? U | undefined : never> {
    await this.ensureInitialized();
    return this.db.data[index];
  }

  /**
   * Set an item at specific index
   */
  async setByIndex(
    index: number,
    item: T extends Array<infer U> ? U : never,
  ): Promise<void> {
    await this.ensureInitialized();
    this.arrayData[index] = item;
    await this.db.write();
  }

  /**
   * Find an item using a partial object match (similar to Prisma's where clause)
   */
  async find(
    where: Partial<T extends Array<infer U> ? U : never>,
  ): Promise<T extends Array<infer U> ? U | undefined : never> {
    await this.ensureInitialized();
    return this.arrayData.find((item: any) => this.matchesWhere(item, where));
  }

  /**
   * Find the index of an item using a partial object match
   */
  async findIndex(
    where: Partial<T extends Array<infer U> ? U : never>,
  ): Promise<number> {
    await this.ensureInitialized();
    return this.arrayData.findIndex((item: any) =>
      this.matchesWhere(item, where),
    );
  }

  /**
   * Filter items using a partial object match and update the array in place
   */
  async filter(
    where: Partial<T extends Array<infer U> ? U : never>,
  ): Promise<void> {
    await this.ensureInitialized();
    this.db.data = this.arrayData.filter((item: any) =>
      this.matchesWhere(item, where),
    ) as T;
    await this.db.write();
  }

  /**
   * Remove an item at specific index
   */
  async removeAt(
    index: number,
  ): Promise<T extends Array<infer U> ? U | undefined : never> {
    await this.ensureInitialized();
    const removed = this.arrayData.splice(index, 1);
    await this.db.write();
    return removed[0];
  }

  /**
   * Remove the first item that matches the partial object
   */
  async remove(
    where: Partial<T extends Array<infer U> ? U : never>,
  ): Promise<T extends Array<infer U> ? U | undefined : never> {
    await this.ensureInitialized();
    const index = await this.findIndex(where);
    if (index !== -1) {
      return await this.removeAt(index);
    }
    return undefined as any;
  }

  /**
   * Set (replace) the first item that matches the where clause with a new item
   */
  async set(
    where: Partial<T extends Array<infer U> ? U : never>,
    newItem: T extends Array<infer U> ? U : never,
  ): Promise<T extends Array<infer U> ? U | undefined : never> {
    await this.ensureInitialized();
    const index = await this.findIndex(where);
    if (index !== -1) {
      const oldItem = this.db.data[index];
      this.arrayData[index] = newItem;
      await this.db.write();
      return oldItem as any;
    }
    return undefined as any;
  }

  /**
   * Update specific fields of the first item that matches the where clause
   */
  async update(
    where: Partial<T extends Array<infer U> ? U : never>,
    updates: Partial<T extends Array<infer U> ? U : never>,
  ): Promise<T extends Array<infer U> ? U | undefined : never> {
    await this.ensureInitialized();
    const index = await this.findIndex(where);
    if (index !== -1) {
      const oldItem = { ...this.db.data[index] };
      this.arrayData[index] = { ...this.db.data[index], ...updates };
      await this.db.write();
      return oldItem as any;
    }
    return undefined as any;
  }

  /**
   * Clear all items from the array
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();
    this.db.data = [] as unknown as T;
    await this.db.write();
  }

  /**
   * Get all items as a regular array
   */
  async toArray(): Promise<T extends Array<infer U> ? U[] : never> {
    await this.ensureInitialized();
    return [...this.arrayData] as any;
  }
}
