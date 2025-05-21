import { describe, test, expect, vi, beforeEach } from 'vitest';
import { GitHubNode } from '../../src/nodes/GitHub';
import { z } from 'zod';

// Mock fetch
global.fetch = vi.fn();

describe('GitHubNode', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('should create a GitHubNode instance correctly', () => {
    const node = new GitHubNode({
      name: 'GitHub Test',
      resource: 'issue',
      operation: 'get',
      owner: 'testOwner',
      repository: 'testRepo',
      outputSchema: z.any(),
      credentials: {
        apiKey: 'test-api-key',
      },
    });

    expect(node).toBeInstanceOf(GitHubNode);
    expect(node.name).toBe('GitHub Test');
  });

  test('should throw error if required parameters are missing', async () => {
    const node = new GitHubNode({
      name: 'GitHub Test',
      resource: 'issue',
      operation: 'get',
      outputSchema: z.any(),
      credentials: {
        apiKey: 'test-api-key',
      },
    });

    await expect(node.execute({})).rejects.toThrow(
      /Owner and repository are required/,
    );
  });

  test('should throw error if credentials are missing', async () => {
    const node = new GitHubNode({
      name: 'GitHub Test',
      resource: 'issue',
      operation: 'get',
      owner: 'testOwner',
      repository: 'testRepo',
      outputSchema: z.any(),
    });

    await expect(node.execute({})).rejects.toThrow(
      /GitHub API credentials are required/,
    );
  });

  test('should make correct API call for issue.get operation', async () => {
    // Mock successful response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 123, title: 'Test Issue', body: 'Test body' }),
    });

    const node = new GitHubNode({
      name: 'GitHub Test',
      resource: 'issue',
      operation: 'get',
      owner: 'testOwner',
      repository: 'testRepo',
      outputSchema: z.any(),
      credentials: {
        apiKey: 'test-api-key',
      },
    });

    const result = await node.execute({
      parameters: {
        issueNumber: 123,
      },
    });

    console.log(result);

    // Verify fetch was called with correct params
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toContain(
      'https://api.github.com/repos/testOwner/testRepo/issues/123',
    );
    expect(options.method).toBe('GET');
    expect(options.headers).toHaveProperty(
      'Authorization',
      'token test-api-key',
    );

    // Verify the result
    expect(result).toEqual({ id: 123, title: 'Test Issue', body: 'Test body' });
  });

  test('should make correct API call for repository.getIssues operation', async () => {
    // Mock successful response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [
        { id: 1, title: 'Issue 1' },
        { id: 2, title: 'Issue 2' },
      ],
    });

    const node = new GitHubNode({
      name: 'GitHub Test',
      resource: 'repository',
      operation: 'getIssues',
      owner: 'testOwner',
      repository: 'testRepo',
      outputSchema: z.any(),
      credentials: {
        apiKey: 'test-api-key',
      },
    });

    const result = await node.execute({
      parameters: {
        state: 'open',
        sort: 'created',
        direction: 'desc',
      },
    });

    // Verify fetch was called with correct params
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toContain(
      'https://api.github.com/repos/testOwner/testRepo/issues',
    );
    expect(url).toContain('state=open');
    expect(url).toContain('sort=created');
    expect(url).toContain('direction=desc');
    expect(options.method).toBe('GET');

    // Verify the result format
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('count', 2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ id: 1, title: 'Issue 1' });
  });

  test('should make correct API call for issue.create operation', async () => {
    // Mock successful response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        id: 123,
        title: 'New Issue',
        body: 'Issue description',
      }),
    });

    const node = new GitHubNode({
      name: 'GitHub Test',
      resource: 'issue',
      operation: 'create',
      owner: 'testOwner',
      repository: 'testRepo',
      outputSchema: z.any(),
      credentials: {
        apiKey: 'test-api-key',
      },
    });

    const result = await node.execute({
      parameters: {
        title: 'New Issue',
        body: 'Issue description',
        labels: ['bug', 'high-priority'],
        assignees: ['user1', 'user2'],
      },
    });

    // Verify fetch was called with correct params
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toContain(
      'https://api.github.com/repos/testOwner/testRepo/issues',
    );
    expect(options.method).toBe('POST');
    expect(options.headers).toHaveProperty('Content-Type', 'application/json');

    // Parse body to check contents
    const sentBody = JSON.parse(options.body);
    expect(sentBody).toEqual({
      title: 'New Issue',
      body: 'Issue description',
      labels: ['bug', 'high-priority'],
      assignees: ['user1', 'user2'],
    });

    // Verify the result
    expect(result).toEqual({
      id: 123,
      title: 'New Issue',
      body: 'Issue description',
    });
  });

  test('should handle API errors correctly', async () => {
    // Mock error response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({
        message: 'Not Found',
        documentation_url: 'https://docs.github.com/rest',
      }),
    });

    const node = new GitHubNode({
      name: 'GitHub Test',
      resource: 'issue',
      operation: 'get',
      owner: 'testOwner',
      repository: 'testRepo',
      outputSchema: z.any(),
      credentials: {
        apiKey: 'test-api-key',
      },
    });

    await expect(
      node.execute({
        parameters: {
          issueNumber: 999,
        },
      }),
    ).rejects.toThrow(/GitHub API error: 404 Not Found/);
  });

  test('should handle network errors correctly', async () => {
    // Mock network error
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const node = new GitHubNode({
      name: 'GitHub Test',
      resource: 'issue',
      operation: 'get',
      owner: 'testOwner',
      repository: 'testRepo',
      outputSchema: z.any(),
      credentials: {
        apiKey: 'test-api-key',
      },
    });

    await expect(
      node.execute({
        parameters: {
          issueNumber: 123,
        },
      }),
    ).rejects.toThrow(/GitHub API request failed: Network error/);
  });

  test('should override parameters when provided in execute call', async () => {
    // Mock successful response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 456, title: 'Another Issue' }),
    });

    const node = new GitHubNode({
      name: 'GitHub Test',
      resource: 'issue',
      operation: 'get',
      owner: 'testOwner',
      repository: 'testRepo',
      outputSchema: z.any(),
      credentials: {
        apiKey: 'test-api-key',
      },
    });

    // Override resource, operation, owner, repository and parameters
    const result = await node.execute({
      resource: 'issue',
      operation: 'get',
      owner: 'otherOwner',
      repository: 'otherRepo',
      parameters: {
        issueNumber: 456,
      },
    });

    // Verify fetch was called with correct params
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toContain(
      'https://api.github.com/repos/otherOwner/otherRepo/issues/456',
    );

    // Verify the result
    expect(result).toEqual({ id: 456, title: 'Another Issue' });
  });
});
