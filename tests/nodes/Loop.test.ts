import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { CodeNode } from '../../src/nodes/Code';
import { LoopNode } from '../../src/nodes/Loop';
import { InputSource } from '../../src/types/workflow/Input';

describe('Nodes - Loop', () => {
  it('Should execute a CodeNode for each item in an array', async () => {
    // Create a CodeNode that doubles a number
    const doubleNode = new CodeNode({
      name: 'Double Number',
      inputSchema: z.number(),
      outputSchema: z.number(),
      run: async ({ stepInput }) => {
        return stepInput * 2;
      },
    });

    // Create a LoopNode that uses the doubleNode
    const loopNode = new LoopNode({
      name: 'Loop Double',
      childNode: doubleNode,
      outputSchema: z.array(z.number()),
    });

    // Test data: array of numbers
    const testData = [1, 2, 3, 4, 5];

    // Execute the loop
    const result = await loopNode.execute({
      step: loopNode,
      stepInput: testData,
    });

    // Verify results
    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(result).toHaveLength(5);
  });

  it('Should work with complex objects using arrayPath', async () => {
    // Create a CodeNode that processes user objects
    const processUserNode = new CodeNode({
      name: 'Process User',
      inputSchema: z.object({
        name: z.string(),
        age: z.number(),
      }),
      outputSchema: z.object({
        greeting: z.string(),
        isAdult: z.boolean(),
      }),
      run: async ({ stepInput }) => {
        return {
          greeting: `Hello, ${stepInput.name}!`,
          isAdult: stepInput.age >= 18,
        };
      },
    });

    // Create a LoopNode with arrayPath
    const loopNode = new LoopNode({
      name: 'Process Users',
      childNode: processUserNode,
      arrayPath: 'users',
      outputSchema: z.array(z.object({
        greeting: z.string(),
        isAdult: z.boolean(),
      })),
    });

    // Test data with nested array
    const testData = {
      users: [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 16 },
        { name: 'Charlie', age: 30 },
      ],
      metadata: { total: 3 },
    };

    // Execute the loop
    const result = await loopNode.execute({
      step: loopNode,
      stepInput: testData,
    });

    // Verify results
    expect(result).toEqual([
      { greeting: 'Hello, Alice!', isAdult: true },
      { greeting: 'Hello, Bob!', isAdult: false },
      { greeting: 'Hello, Charlie!', isAdult: true },
    ]);
    expect(result).toHaveLength(3);
  });

  it('Should handle empty arrays', async () => {
    const simpleNode = new CodeNode({
      name: 'Simple Node',
      inputSchema: z.any(),
      outputSchema: z.string(),
      run: async ({ stepInput }) => {
        return `Processed: ${stepInput}`;
      },
    });

    const loopNode = new LoopNode({
      name: 'Empty Loop',
      childNode: simpleNode,
      outputSchema: z.array(z.string()),
    });

    const result = await loopNode.execute({
      step: loopNode,
      stepInput: [],
    });

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('Should work with nested LoopNodes', async () => {
    // Inner CodeNode that adds 1 to a number
    const addOneNode = new CodeNode({
      name: 'Add One',
      inputSchema: z.number(),
      outputSchema: z.number(),
      run: async ({ stepInput }) => {
        return stepInput + 1;
      },
    });

    // Inner LoopNode that processes an array of numbers
    const innerLoopNode = new LoopNode({
      name: 'Inner Loop',
      childNode: addOneNode,
      outputSchema: z.array(z.number()),
    });

    // Outer LoopNode that processes an array of arrays
    const outerLoopNode = new LoopNode({
      name: 'Outer Loop',
      childNode: innerLoopNode,
      outputSchema: z.array(z.array(z.number())),
    });

    // Test data: array of arrays
    const testData = [
      [1, 2, 3],
      [4, 5],
      [6, 7, 8, 9],
    ];

    const result = await outerLoopNode.execute({
      step: outerLoopNode,
      stepInput: testData,
    });

    // Each inner array should have 1 added to each number
    expect(result).toEqual([
      [2, 3, 4],
      [5, 6],
      [7, 8, 9, 10],
    ]);
  });

  it('Should throw error if arrayPath does not exist', async () => {
    const simpleNode = new CodeNode({
      name: 'Simple Node',
      inputSchema: z.any(),
      outputSchema: z.string(),
      run: async ({ stepInput }) => {
        return `Processed: ${stepInput}`;
      },
    });

    const loopNode = new LoopNode({
      name: 'Invalid Path Loop',
      childNode: simpleNode,
      arrayPath: 'nonexistent.path',
      outputSchema: z.array(z.string()),
    });

    const testData = { other: 'data' };

    await expect(
      loopNode.execute({
        step: loopNode,
        stepInput: testData,
      })
    ).rejects.toThrow("Array path 'nonexistent.path' not found in input data");
  });

  it('Should throw error if data at arrayPath is not an array', async () => {
    const simpleNode = new CodeNode({
      name: 'Simple Node',
      inputSchema: z.any(),
      outputSchema: z.string(),
      run: async ({ stepInput }) => {
        return `Processed: ${stepInput}`;
      },
    });

    const loopNode = new LoopNode({
      name: 'Non-Array Loop',
      childNode: simpleNode,
      arrayPath: 'data',
      outputSchema: z.array(z.string()),
    });

    const testData = { data: 'not an array' };

    await expect(
      loopNode.execute({
        step: loopNode,
        stepInput: testData,
      })
    ).rejects.toThrow("Expected array but got string at path 'data'");
  });
});