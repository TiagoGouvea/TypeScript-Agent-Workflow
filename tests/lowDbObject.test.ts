import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LowDbObject } from '../src/utils/lowDb';
import fs from 'fs/promises';
import path from 'path';

interface TestData {
  users: Array<{ id: number; name: string; email: string }>;
  settings: { theme: string; notifications: boolean };
  metadata: string;
  lastUpdate: string;
}

describe('LowDbObject', () => {
  let db: LowDbObject<TestData>;
  const testDbName = 'test-lowdb';
  const databasePath = path.join(
    process.cwd(),
    'database',
    `${testDbName}.json`,
  );

  beforeEach(async () => {
    try {
      await fs.unlink(databasePath);
    } catch {}

    db = new LowDbObject<TestData>(testDbName);
    // init() is now called automatically in constructor
  });

  afterEach(async () => {
    try {
      await fs.unlink(databasePath);
    } catch {}
  });

  it('should create a new database with simple syntax', async () => {
    const dbInfo = db.getInfo();
    expect(dbInfo.name).toBe(testDbName);
    expect(dbInfo.path).toContain(`${testDbName}.json`);

    await db.setField('lastUpdate', 'test');

    const exists = await db.exists();
    expect(exists).toBe(true);
  });

  it('should save and retrieve basic data', async () => {
    const testData: TestData = {
      users: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      ],
      settings: { theme: 'dark', notifications: true },
      metadata: '',
      lastUpdate: new Date().toISOString(),
    };

    await db.setData(testData);

    await db.reload();
    const retrievedData = await db.getData();

    expect(retrievedData.users).toHaveLength(2);
    expect(retrievedData.users[0].name).toBe('John Doe');
    expect(retrievedData.settings.theme).toBe('dark');
  });

  it('should set and get individual fields', async () => {
    await db.setField('lastUpdate', '2025-01-01T00:00:00Z');

    const lastUpdate = await db.getField('lastUpdate');
    expect(lastUpdate).toBe('2025-01-01T00:00:00Z');
  });

  it('should append to array fields', async () => {
    await db.setField('users', []);

    await db.push('users', {
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
    });
    await db.push('users', { id: 2, name: 'Bob', email: 'bob@example.com' });

    const users = await db.getField('users');
    expect(users).toHaveLength(2);
    expect(users[0].name).toBe('Alice');
    expect(users[1].name).toBe('Bob');
  });

  it('should update specific fields', async () => {
    await db.setData({
      users: [],
      settings: { theme: 'light', notifications: false },
      metadata: '',
      lastUpdate: '2025-01-01',
    });

    await db.update({
      settings: { theme: 'dark', notifications: true },
      lastUpdate: '2025-01-02',
    });

    const data = await db.getData();
    expect(data.settings.theme).toBe('dark');
    expect(data.settings.notifications).toBe(true);
    expect(data.lastUpdate).toBe('2025-01-02');
    expect(data.users).toEqual([]);
  });

  it('should handle JSON content in fields (stringify/parse)', async () => {
    const complexObject = {
      nested: {
        array: [1, 2, 3],
        object: { key: 'value' },
        boolean: true,
      },
      timestamp: Date.now(),
    };

    await db.setJsonField('metadata', complexObject);

    const storedAsString = await db.getField('metadata');
    expect(typeof storedAsString).toBe('string');

    const retrievedObject = await db.getJsonField('metadata');
    expect(retrievedObject).toEqual(complexObject);
    expect(retrievedObject.nested.array).toEqual([1, 2, 3]);
    expect(retrievedObject.nested.object.key).toBe('value');
  });

  it('should handle invalid JSON gracefully', async () => {
    await db.setField('metadata', 'this is not json');

    const result = await db.getJsonField('metadata');
    expect(result).toBe('this is not json');
  });

  it('should work with multiple database instances', async () => {
    const db1 = new LowDbObject<{ counter: number }>('database1');
    const db2 = new LowDbObject<{ counter: number }>('database2');

    // init() is now automatic

    await db1.setField('counter', 10);
    await db2.setField('counter', 20);

    expect(await db1.getField('counter')).toBe(10);
    expect(await db2.getField('counter')).toBe(20);

    await db1.delete();
    await db2.delete();
  });

  it('should persist data between sessions', async () => {
    const db1 = new LowDbObject<{ message: string }>('persistence-test');
    await db1.setField('message', 'Hello from first session');

    const db2 = new LowDbObject<{ message: string }>('persistence-test');

    expect(await db2.getField('message')).toBe('Hello from first session');

    await db2.delete();
  });

  it('should handle complex real-world scenario', async () => {
    interface UserProfile {
      id: string;
      profile: {
        name: string;
        preferences: any;
      };
      history: string[];
      lastLogin: string;
    }

    const userDb = new LowDbObject<UserProfile>('user-profile');
    // init() is now automatic

    await userDb.update({
      id: 'user123',
      profile: {
        name: 'John Doe',
        preferences: '',
      },
      history: [],
      lastLogin: new Date().toISOString(),
    });

    const preferences = {
      ui: { theme: 'dark', language: 'en' },
      notifications: { email: true, push: false },
      features: ['feature1', 'feature2'],
    };

    await userDb.update({
      profile: {
        name: 'John Doe',
        preferences: JSON.stringify(preferences),
      },
    });

    await userDb.push('history', 'action-001');
    await userDb.push('history', 'action-002');

    const profile = await userDb.getField('profile');
    expect(profile.name).toBe('John Doe');

    const savedPrefs = JSON.parse(profile.preferences);
    expect(savedPrefs.ui.theme).toBe('dark');
    expect(savedPrefs.features).toContain('feature1');

    const history = await userDb.getField('history');
    expect(history).toHaveLength(2);
    expect(history).toContain('action-001');

    await userDb.delete();
  });
});
