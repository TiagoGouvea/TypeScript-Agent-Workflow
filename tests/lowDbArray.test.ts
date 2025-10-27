import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LowDbArray } from '../src/utils/lowDb';
import fs from 'fs/promises';
import path from 'path';

interface TestItem {
  id: number;
  name: string;
  active: boolean;
}

describe('LowDbArray', () => {
  let db: LowDbArray<TestItem[]>;
  const testDbName = 'test-array-db';
  const databasePath = path.join(
    process.cwd(),
    'database',
    `${testDbName}.json`,
  );

  beforeEach(async () => {
    try {
      await fs.unlink(databasePath);
    } catch {}

    db = new LowDbArray<TestItem[]>(testDbName);
    // init() is now called automatically in constructor
  });

  afterEach(async () => {
    try {
      await fs.unlink(databasePath);
    } catch {}
  });

  it('should create empty array database', async () => {
    expect(await db.getLength()).toBe(0);
    expect(await db.getData()).toEqual([]);
  });

  it('should push items to array', async () => {
    const item1: TestItem = { id: 1, name: 'Item 1', active: true };
    const item2: TestItem = { id: 2, name: 'Item 2', active: false };

    await db.push(item1);
    await db.push(item2);

    expect(await db.getLength()).toBe(2);
    expect(await db.getByIndex(0)).toEqual(item1);
    expect(await db.getByIndex(1)).toEqual(item2);
  });

  it('should pop items from array', async () => {
    const item1: TestItem = { id: 1, name: 'Item 1', active: true };
    const item2: TestItem = { id: 2, name: 'Item 2', active: false };

    await db.push(item1);
    await db.push(item2);

    const popped = await db.pop();
    expect(popped).toEqual(item2);
    expect(await db.getLength()).toBe(1);
    expect(await db.getByIndex(0)).toEqual(item1);
  });

  it('should find items by where clause', async () => {
    const items: TestItem[] = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
      { id: 3, name: 'Charlie', active: true },
    ];

    for (const item of items) {
      await db.push(item);
    }

    const found = await db.find({ name: 'Bob' });
    expect(found).toEqual({ id: 2, name: 'Bob', active: false });

    const foundActive = await db.find({ active: true });
    expect(foundActive).toEqual({ id: 1, name: 'Alice', active: true });
  });

  it('should filter items in place using where clause', async () => {
    const items: TestItem[] = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
      { id: 3, name: 'Charlie', active: true },
    ];

    for (const item of items) {
      await db.push(item);
    }

    await db.filter({ active: true });

    expect(await db.getLength()).toBe(2);
    expect(await db.getByIndex(0)).toEqual({
      id: 1,
      name: 'Alice',
      active: true,
    });
    expect(await db.getByIndex(1)).toEqual({
      id: 3,
      name: 'Charlie',
      active: true,
    });
  });

  it('should remove items by index', async () => {
    const items: TestItem[] = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
      { id: 3, name: 'Charlie', active: true },
    ];

    for (const item of items) {
      await db.push(item);
    }

    const removed = await db.removeAt(1);
    expect(removed).toEqual({ id: 2, name: 'Bob', active: false });
    expect(await db.getLength()).toBe(2);
    expect(await db.getByIndex(0)).toEqual({
      id: 1,
      name: 'Alice',
      active: true,
    });
    expect(await db.getByIndex(1)).toEqual({
      id: 3,
      name: 'Charlie',
      active: true,
    });
  });

  it('should remove items by where clause', async () => {
    const items: TestItem[] = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
      { id: 3, name: 'Charlie', active: true },
    ];

    for (const item of items) {
      await db.push(item);
    }

    const removed = await db.remove({ name: 'Bob' });
    expect(removed).toEqual({ id: 2, name: 'Bob', active: false });
    expect(await db.getLength()).toBe(2);
  });

  it('should clear all items', async () => {
    const items: TestItem[] = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
    ];

    for (const item of items) {
      await db.push(item);
    }

    expect(await db.getLength()).toBe(2);

    await db.clear();
    expect(await db.getLength()).toBe(0);
    expect(await db.getData()).toEqual([]);
  });

  it('should work with unshift and shift', async () => {
    const item1: TestItem = { id: 1, name: 'Item 1', active: true };
    const item2: TestItem = { id: 2, name: 'Item 2', active: false };

    await db.unshift(item1);
    await db.unshift(item2);

    expect(await db.getLength()).toBe(2);
    expect(await db.getByIndex(0)).toEqual(item2); // Last unshifted should be first
    expect(await db.getByIndex(1)).toEqual(item1);

    const shifted = await db.shift();
    expect(shifted).toEqual(item2);
    expect(await db.getLength()).toBe(1);
    expect(await db.getByIndex(0)).toEqual(item1);
  });

  it('should convert to regular array', async () => {
    const items: TestItem[] = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
    ];

    for (const item of items) {
      await db.push(item);
    }

    const array = await db.toArray();
    expect(array).toEqual(items);
    expect(Array.isArray(array)).toBe(true);
  });

  it('should persist data between sessions', async () => {
    const item: TestItem = { id: 1, name: 'Persistent Item', active: true };
    const testDbPath = path.join(
      process.cwd(),
      'database',
      'persistence-test-array.json',
    );

    // Clean up any existing file first
    try {
      await fs.unlink(testDbPath);
    } catch {}

    const db1 = new LowDbArray<TestItem[]>('persistence-test-array');
    // init() is now automatic
    await db1.push(item);

    const db2 = new LowDbArray<TestItem[]>('persistence-test-array');
    // init() is now automatic

    expect(await db2.getLength()).toBe(1);
    expect(await db2.getByIndex(0)).toEqual(item);

    await db2.delete();
  });

  it('should handle multiple criteria in where clause', async () => {
    const items: TestItem[] = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
      { id: 3, name: 'Charlie', active: true },
      { id: 4, name: 'Alice', active: false },
    ];

    for (const item of items) {
      await db.push(item);
    }

    // Find Alice who is active
    const found = await db.find({ name: 'Alice', active: true });
    expect(found).toEqual({ id: 1, name: 'Alice', active: true });

    // Find index of Alice who is inactive
    const index = await db.findIndex({ name: 'Alice', active: false });
    expect(index).toBe(3);

    // Filter only active users
    await db.filter({ active: true });
    expect(await db.getLength()).toBe(2);
  });

  it('should handle partial matching correctly', async () => {
    const items: TestItem[] = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
    ];

    for (const item of items) {
      await db.push(item);
    }

    // Should find Bob even though we only specify name (partial match)
    const found = await db.find({ name: 'Bob' });
    expect(found).toEqual({ id: 2, name: 'Bob', active: false });

    // Should not find anything with non-existent values
    const notFound = await db.find({ name: 'NonExistent' });
    expect(notFound).toBeUndefined();
  });

  it('should find items using where clause', async () => {
    const items: TestItem[] = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
    ];

    for (const item of items) {
      await db.push(item);
    }

    const found = await db.find({ name: 'Alice' });
    expect(found).toEqual({ id: 1, name: 'Alice', active: true });

    const notFound = await db.find({ name: 'NonExistent' });
    expect(notFound).toBeUndefined();
  });

  it('should set (replace) items using where clause', async () => {
    const items: TestItem[] = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
    ];

    for (const item of items) {
      await db.push(item);
    }

    // Replace Bob with a new item
    const oldBob = await db.set(
      { name: 'Bob' },
      { id: 2, name: 'Robert', active: true },
    );
    expect(oldBob).toEqual({ id: 2, name: 'Bob', active: false });

    // Verify the replacement
    const newBob = await db.find({ name: 'Robert' });
    expect(newBob).toEqual({ id: 2, name: 'Robert', active: true });

    // Old Bob should not exist
    const notFound = await db.find({ name: 'Bob' });
    expect(notFound).toBeUndefined();
  });

  it('should update specific fields using where clause', async () => {
    const items: TestItem[] = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
    ];

    for (const item of items) {
      await db.push(item);
    }

    // Update only the active field for Bob
    const oldBob = await db.update({ name: 'Bob' }, { active: true });
    expect(oldBob).toEqual({ id: 2, name: 'Bob', active: false });

    // Verify the update (name should remain, active should change)
    const updatedBob = await db.find({ name: 'Bob' });
    expect(updatedBob).toEqual({ id: 2, name: 'Bob', active: true });

    // Update multiple fields
    await db.update({ name: 'Alice' }, { active: false, id: 10 });
    const updatedAlice = await db.find({ name: 'Alice' });
    expect(updatedAlice).toEqual({ id: 10, name: 'Alice', active: false });
  });

  it('should handle set and update for non-existent items', async () => {
    const items: TestItem[] = [{ id: 1, name: 'Alice', active: true }];

    for (const item of items) {
      await db.push(item);
    }

    // Try to set non-existent item
    const setResult = await db.set(
      { name: 'NonExistent' },
      { id: 999, name: 'New', active: true },
    );
    expect(setResult).toBeUndefined();

    // Try to update non-existent item
    const updateResult = await db.update(
      { name: 'NonExistent' },
      { active: false },
    );
    expect(updateResult).toBeUndefined();

    // Verify original data is unchanged
    expect(await db.getLength()).toBe(1);
    expect(await db.find({ name: 'Alice' })).toEqual({
      id: 1,
      name: 'Alice',
      active: true,
    });
  });
});
